import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, Validators } from '@angular/forms';
import { catchError, distinctUntilChanged, filter, firstValueFrom, map, of, startWith, switchMap, tap } from 'rxjs';
import { BookingResponse, CreateBookingRequest } from '../../core/models/booking.model';
import { TenantConfig } from '../../core/models/tenant-config.model';
import { ServiceItem } from '../../core/models/service.model';
import { TenantApiService } from '../../core/services/tenant-api.service';
import { TelegramService } from '../../core/telegram/telegram.service';
import { currencySymbolFor, normalizeCurrencyCode } from '../../core/utils/currency.util';
import { FoodOrderStore } from './food-order.store';

interface FoodOrderVm {
  services: ServiceItem[];
  loading: boolean;
  error: string | null;
}

interface MyBookingsVm {
  bookings: BookingResponse[];
  loading: boolean;
  error: string | null;
}

interface CustomerDetailsDraft {
  customerName: string;
  customerPhone: string;
}

@Injectable()
export class FoodOrderFlowFacade {
  private readonly api = inject(TenantApiService);
  private readonly fb = inject(FormBuilder);
  private readonly telegram = inject(TelegramService);

  readonly store = inject(FoodOrderStore);
  readonly showLocalCheckoutButtons = this.telegram.isLocalhost();

  readonly checkoutForm = this.fb.nonNullable.group({
    customerName: ['', [Validators.required]],
    customerPhone: ['', [Validators.required]],
    deliveryAddress: ['', [Validators.required, Validators.pattern(/\S/)]],
    deliveryDate: [this.defaultDeliveryDate(), [Validators.required]],
    note: ['']
  });
  private readonly checkoutFormStatus = toSignal(
    this.checkoutForm.statusChanges.pipe(startWith(this.checkoutForm.status)),
    { initialValue: this.checkoutForm.status }
  );

  readonly bookingsReloadKey = signal(0);
  readonly selectedBookingId = signal<number | null>(null);
  readonly selectedBooking = signal<BookingResponse | null>(null);
  readonly activeView = signal<'menu' | 'orders'>('menu');
  readonly checkoutOpen = signal(false);
  readonly submitting = signal(false);
  readonly submitError = signal<string | null>(null);
  readonly submittedBooking = signal<BookingResponse | null>(null);
  readonly cancellingBookingId = signal<number | null>(null);
  readonly cancelError = signal<string | null>(null);
  private readonly selectedBookingRequestVersion = signal(0);
  private readonly servicesRequestVersion = signal(0);
  private readonly customerDetailsDraft = signal<CustomerDetailsDraft>({
    customerName: '',
    customerPhone: ''
  });
  private readonly customerDetailsHydrated = signal(false);
  private readonly configSignal = signal<TenantConfig | null>(null);
  private readonly vmSignal = signal<FoodOrderVm>({
    services: [],
    loading: true,
    error: null
  });

  private readonly bookingsVmSignal = toSignal(
    toObservable(
      computed(() => ({
        config: this.configSignal(),
        reloadKey: this.bookingsReloadKey()
      }))
    ).pipe(
      filter(
        (
          params
        ): params is {
          config: TenantConfig;
          reloadKey: number;
        } => params.config !== null
      ),
      map(({ config, reloadKey }) => ({
        slug: config.slug,
        reloadKey
      })),
      distinctUntilChanged(
        (previous, current) => previous.slug === current.slug && previous.reloadKey === current.reloadKey
      ),
      switchMap(({ slug }) =>
        this.api.getMyBookings(slug).pipe(
          tap((bookings) => {
            const nextSelectedId =
              bookings.some((booking) => booking.id === this.selectedBookingId())
                ? this.selectedBookingId()
                : bookings[0]?.id ?? null;
            const latestBooking = this.findLatestBooking(bookings);

            this.selectedBookingId.set(nextSelectedId);
            this.selectedBooking.set(bookings.find((booking) => booking.id === nextSelectedId) ?? null);
            this.hydrateCustomerDetails(latestBooking);
          }),
          map((bookings) => ({
            bookings,
            loading: false,
            error: null
          })),
          startWith({
            bookings: [],
            loading: true,
            error: null
          }),
          catchError(() =>
            of({
              bookings: [],
              loading: false,
              error: 'Could not load your orders.'
            })
          )
        )
      )
    ),
    {
      initialValue: {
        bookings: [],
        loading: true,
        error: null
      }
    }
  );

  readonly vm = computed<FoodOrderVm>(() => this.vmSignal());
  readonly bookingsVm = computed<MyBookingsVm>(() => this.bookingsVmSignal());
  readonly isFirstOrder = computed<boolean>(() => {
    const bookingsVm = this.bookingsVm();
    return !bookingsVm.loading && bookingsVm.bookings.length === 0 && this.submittedBooking() === null;
  });

  private readonly mainButtonAction = () => {
    void this.handlePrimaryAction();
  };

  constructor() {
    effect(() => {
      const booking = this.submittedBooking();
      const itemCount = this.store.selectedCount();
      const total = this.store.selectedTotal();
      const checkoutOpen = this.checkoutOpen();
      const submitting = this.submitting();
      const formStatus = this.checkoutFormStatus();

      if (booking || itemCount === 0) {
        this.telegram.setMainButton(null);
        this.telegram.onMainButtonClick(null);
        return;
      }

      if (!checkoutOpen) {
        this.telegram.setMainButton(`Checkout • ${this.formatCurrency(total)}`);
        this.telegram.onMainButtonClick(this.mainButtonAction);
        return;
      }

      this.telegram.setMainButton(
        submitting ? 'Submitting...' : `Place order • ${this.formatCurrency(total)}`,
        !submitting && formStatus === 'VALID'
      );
      this.telegram.onMainButtonClick(this.mainButtonAction);
    });
  }

  setConfig(config: TenantConfig): void {
    if (this.configSignal()?.slug === config.slug) {
      return;
    }

    this.configSignal.set(config);
    this.resetForTenant(config.slug);
    this.loadServices(config.slug);
  }

  increase(serviceId: number): void {
    this.submitError.set(null);
    this.store.increase(serviceId);
  }

  decrease(serviceId: number): void {
    this.submitError.set(null);
    this.store.decrease(serviceId);
    if (this.store.selectedCount() === 0) {
      this.checkoutOpen.set(false);
    }
  }

  openCheckout(): void {
    this.submitError.set(null);
    this.checkoutOpen.set(true);
  }

  closeCheckout(): void {
    this.submitError.set(null);
    this.checkoutOpen.set(false);
  }

  startNewOrder(): void {
    this.activeView.set('menu');
    this.submittedBooking.set(null);
    this.submitError.set(null);
    this.checkoutOpen.set(false);
    this.store.clearCart();
    this.checkoutForm.patchValue({
      deliveryAddress: '',
      deliveryDate: this.defaultDeliveryDate(),
      note: ''
    });
  }

  refreshBookings(): void {
    this.cancelError.set(null);
    this.bookingsReloadKey.update((value) => value + 1);
  }

  async selectBooking(bookingId: number): Promise<void> {
    const config = this.configSignal();

    if (!config) {
      return;
    }

    this.activeView.set('orders');
    this.selectedBookingId.set(bookingId);
    this.cancelError.set(null);
    const requestVersion = this.selectedBookingRequestVersion() + 1;
    this.selectedBookingRequestVersion.set(requestVersion);

    try {
      const booking = await firstValueFrom(this.api.getBooking(config.slug, bookingId));

      if (this.selectedBookingRequestVersion() !== requestVersion || this.selectedBookingId() !== bookingId) {
        return;
      }

      this.selectedBooking.set(booking);
    } catch {
      if (this.selectedBookingRequestVersion() !== requestVersion || this.selectedBookingId() !== bookingId) {
        return;
      }

      this.cancelError.set('Could not load the order details.');
    }
  }

  async cancelBooking(bookingId: number): Promise<void> {
    const config = this.configSignal();

    if (!config || this.cancellingBookingId()) {
      return;
    }

    const confirmed = await this.telegram.confirm(
      'Cancel this order? This can only be done while the booking is still active.'
    );

    if (!confirmed) {
      return;
    }

    this.cancelError.set(null);
    this.cancellingBookingId.set(bookingId);

    try {
      const booking = await firstValueFrom(this.api.cancelBooking(config.slug, bookingId));
      this.selectedBooking.set(booking);
      this.submittedBooking.update((current) => (current?.id === booking.id ? booking : current));
      this.refreshBookings();
    } catch {
      this.cancelError.set('Cancel request failed. The booking may already be done or unavailable.');
      await this.telegram.alert('Could not cancel this order. It may already be processed or unavailable.');
    } finally {
      this.cancellingBookingId.set(null);
    }
  }

  async submitOrder(): Promise<void> {
    const config = this.configSignal();

    if (!config || this.submitting()) {
      return;
    }

    if (this.store.selectedCount() === 0) {
      this.checkoutOpen.set(false);
      return;
    }

    if (this.checkoutForm.invalid) {
      this.checkoutOpen.set(true);
      this.checkoutForm.markAllAsTouched();
      this.submitError.set('Enter your name, phone number, delivery address, and delivery date before placing the order.');
      await this.telegram.alert(
        'Enter your name, phone number, delivery address, and delivery date before placing the order.'
      );
      return;
    }

    const confirmed = await this.telegram.confirm(
      `Submit this order for ${this.formatCurrency(this.store.selectedTotal())}?`
    );

    if (!confirmed) {
      return;
    }

    this.submitting.set(true);
    this.submitError.set(null);
    this.rememberCustomerDetails();

    try {
      const booking = await firstValueFrom(this.api.createBooking(config.slug, this.toBookingRequest()));

      this.submittedBooking.set(booking);
      this.selectedBookingId.set(booking.id);
      this.selectedBooking.set(booking);
      this.store.clearCart();
      this.checkoutOpen.set(false);
      this.resetCheckoutForm();
      this.refreshBookings();
    } catch {
      this.checkoutOpen.set(true);
      this.submitError.set('Could not place your order. Please try again.');
      await this.telegram.alert('Could not place your order. Please try again.');
    } finally {
      this.submitting.set(false);
    }
  }

  setActiveView(view: 'menu' | 'orders'): void {
    this.activeView.set(view);
  }

  private resetForTenant(slug: string): void {
    this.store.setTenant(slug);
    this.checkoutOpen.set(false);
    this.submitting.set(false);
    this.submitError.set(null);
    this.submittedBooking.set(null);
    this.cancellingBookingId.set(null);
    this.cancelError.set(null);
    this.selectedBookingRequestVersion.set(0);
    this.selectedBookingId.set(null);
    this.selectedBooking.set(null);
    this.activeView.set('menu');
    this.customerDetailsHydrated.set(false);
    this.vmSignal.set({
      services: [],
      loading: true,
      error: null
    });
    this.resetCheckoutForm();
    this.bookingsReloadKey.update((value) => value + 1);
  }

  private loadServices(slug: string): void {
    const requestVersion = this.servicesRequestVersion() + 1;
    this.servicesRequestVersion.set(requestVersion);
    this.vmSignal.set({
      services: [],
      loading: true,
      error: null
    });

    this.api.getServices(slug).subscribe({
      next: (services) => {
        if (this.servicesRequestVersion() !== requestVersion || this.configSignal()?.slug !== slug) {
          return;
        }

        this.store.setServices(services);
        this.vmSignal.set({
          services,
          loading: false,
          error: null
        });
      },
      error: () => {
        if (this.servicesRequestVersion() !== requestVersion || this.configSignal()?.slug !== slug) {
          return;
        }

        this.store.setServices([]);
        this.vmSignal.set({
          services: [],
          loading: false,
          error: 'Check the backend service or tenant data and try again.'
        });
      }
    });
  }

  private async handlePrimaryAction(): Promise<void> {
    if (!this.checkoutOpen()) {
      this.openCheckout();
      return;
    }

    await this.submitOrder();
  }

  private toBookingRequest(): CreateBookingRequest {
    const formValue = this.checkoutForm.getRawValue();

    return {
      customerName: formValue.customerName.trim(),
      customerPhone: formValue.customerPhone.trim(),
      deliveryAddress: formValue.deliveryAddress.trim(),
      deliveryDate: formValue.deliveryDate,
      note: formValue.note.trim() || null,
      items: this.store.selectedItems().map((entry) => ({
        serviceId: entry.service.id,
        quantity: entry.quantity
      }))
    };
  }

  private rememberCustomerDetails(): void {
    const { customerName, customerPhone } = this.checkoutForm.getRawValue();

    this.customerDetailsDraft.set({
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim()
    });
  }

  private resetCheckoutForm(): void {
    const customerDetails = this.customerDetailsDraft();

    this.checkoutForm.reset({
      customerName: customerDetails.customerName,
      customerPhone: customerDetails.customerPhone,
      deliveryAddress: '',
      deliveryDate: this.defaultDeliveryDate(),
      note: ''
    });
  }

  private hydrateCustomerDetails(booking: BookingResponse | null): void {
    if (this.customerDetailsHydrated()) {
      return;
    }

    this.customerDetailsHydrated.set(true);

    if (!booking) {
      return;
    }

    this.customerDetailsDraft.set({
      customerName: booking.customerName.trim(),
      customerPhone: booking.customerPhone.trim()
    });

    this.resetCheckoutForm();
  }

  private findLatestBooking(bookings: BookingResponse[]): BookingResponse | null {
    if (bookings.length === 0) {
      return null;
    }

    return bookings.reduce((latest, booking) =>
      new Date(booking.createdAt).getTime() > new Date(latest.createdAt).getTime() ? booking : latest
    );
  }

  private defaultDeliveryDate(): string {
    const currentDate = new Date();
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const day = String(currentDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private formatCurrency(amount: number): string {
    const currencyCode = normalizeCurrencyCode(this.configSignal()?.currency);

    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currencyCode,
        maximumFractionDigits: 0
      }).format(amount);
    } catch {
      const symbol = currencySymbolFor(currencyCode);
      return `${symbol}${Math.round(amount).toLocaleString('en-US')}`;
    }
  }
}
