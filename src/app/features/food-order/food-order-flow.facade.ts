import { computed, DestroyRef, effect, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { catchError, distinctUntilChanged, filter, firstValueFrom, map, of, startWith, switchMap, tap } from 'rxjs';
import { BookingResponse, CreateBookingRequest } from '../../core/models/booking.model';
import { TenantConfig } from '../../core/models/tenant-config.model';
import { ServiceItem } from '../../core/models/service.model';
import { TenantApiService } from '../../core/services/tenant-api.service';
import { TelegramService } from '../../core/telegram/telegram.service';
import { currencySymbolFor, normalizeCurrencyCode } from '../../core/utils/currency.util';
import { normalizeBookingStatus } from '../../core/utils/booking-status.util';
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
  deliveryAddress: string;
}

@Injectable()
export class FoodOrderFlowFacade {
  private readonly api = inject(TenantApiService);
  private readonly fb = inject(FormBuilder);
  private readonly telegram = inject(TelegramService);

  private readonly destroyRef = inject(DestroyRef);

  readonly store = inject(FoodOrderStore);
  readonly showLocalCheckoutButtons = this.telegram.isLocalhost();

  readonly checkoutForm = this.fb.nonNullable.group({
    customerName: ['', [Validators.required]],
    customerPhone: ['', [Validators.required, Validators.pattern(/^[+]?[\d\s\-\(\)\.]{6,20}$/)]],
    deliveryAddress: [''],
    deliveryDate: [this.defaultDeliveryDate(), [Validators.required]],
    note: ['']
  });

  readonly earliestDeliveryDate = computed<string>(() => this.configSignal()?.earliestDeliveryDate ?? this.todayIso());

  readonly bookingsReloadKey = signal(0);
  readonly selectedBookingId = signal<number | null>(null);
  readonly selectedBooking = signal<BookingResponse | null>(null);
  readonly activeView = signal<'menu' | 'orders'>('menu');
  readonly checkoutOpen = signal(false);
  readonly submitting = signal(false);
  readonly submitError = signal<string | null>(null);
  readonly repeatOrderBanner = signal<string | null>(null);
  readonly submittedBooking = signal<BookingResponse | null>(null);
  readonly confirmingPaymentBookingId = signal<number | null>(null);
  readonly paymentError = signal<string | null>(null);
  readonly cancellingBookingId = signal<number | null>(null);
  readonly cancelError = signal<string | null>(null);
  private readonly selectedBookingRequestVersion = signal(0);
  private readonly servicesRequestVersion = signal(0);
  private readonly customerDetailsDraft = signal<CustomerDetailsDraft>({
    customerName: '',
    customerPhone: '',
    deliveryAddress: ''
  });
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
                : null;
            const latestActiveBooking = this.findLatestActiveBooking(bookings);
            const currentSubmittedBooking = this.submittedBooking();
            const submittedBookingFromList = currentSubmittedBooking
              ? bookings.find((booking) => booking.id === currentSubmittedBooking.id) ?? null
              : null;

            this.selectedBookingId.set(nextSelectedId);
            this.selectedBooking.set(bookings.find((booking) => booking.id === nextSelectedId) ?? null);
            if (submittedBookingFromList) {
              this.submittedBooking.set(this.isActiveBooking(submittedBookingFromList) ? submittedBookingFromList : null);
            } else if (!currentSubmittedBooking) {
              this.submittedBooking.set(latestActiveBooking);
            } else if (!this.isActiveBooking(currentSubmittedBooking)) {
              this.submittedBooking.set(null);
            }
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
    // Keep bookings stream hot so booking-derived UI state (submitted booking, selection) stays in sync
    // even before any component explicitly reads bookingsVm().
    effect(() => {
      void this.bookingsVmSignal();
    });

    effect(() => {
      const booking = this.submittedBooking();
      const itemCount = this.store.selectedCount();
      const total = this.store.selectedTotal();
      const checkoutOpen = this.checkoutOpen();
      const submitting = this.submitting();

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
        !submitting
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
    this.repeatOrderBanner.set(null);
    this.store.increase(serviceId);
    this.telegram.hapticLight();
  }

  decrease(serviceId: number): void {
    this.submitError.set(null);
    this.repeatOrderBanner.set(null);
    this.store.decrease(serviceId);
    this.telegram.hapticLight();
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
    this.repeatOrderBanner.set(null);
    this.checkoutOpen.set(false);
    this.store.clearCart();
    this.checkoutForm.patchValue({
      deliveryAddress: this.customerDetailsDraft().deliveryAddress,
      deliveryDate: this.defaultDeliveryDate(),
      note: ''
    });
    this.checkoutForm.markAsUntouched();
  }

  refreshBookings(): void {
    this.paymentError.set(null);
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
    this.paymentError.set(null);
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

  async confirmPayment(bookingId: number): Promise<void> {
    const config = this.configSignal();

    if (!config || this.confirmingPaymentBookingId()) {
      return;
    }

    this.paymentError.set(null);
    this.confirmingPaymentBookingId.set(bookingId);

    try {
      const booking = await firstValueFrom(this.api.confirmBookingPayment(config.slug, bookingId));
      this.selectedBooking.set(booking);
      this.submittedBooking.update((current) => (current?.id === booking.id ? booking : current));
      this.refreshBookings();
    } catch (error) {
      if (error instanceof HttpErrorResponse && error.status === 409) {
        await this.telegram.alert('Payment can only be confirmed for orders still in NEW status. Refreshing status.');
        this.refreshBookings();
        if (this.selectedBookingId() === bookingId) {
          await this.selectBooking(bookingId);
        }
      } else {
        this.paymentError.set('Could not confirm your payment. Please try again.');
        await this.telegram.alert('Could not confirm your payment. Please try again.');
      }
    } finally {
      this.confirmingPaymentBookingId.set(null);
    }
  }

  async repeatBooking(bookingId: number): Promise<void> {
    if (this.vm().loading) {
      await this.telegram.alert('Menu is still loading. Please wait a moment and try again.');
      return;
    }

    if (this.store.selectedCount() > 0) {
      const replaceConfirmed = await this.telegram.confirm(
        `Replace your current cart with items from order #${bookingId}?`
      );

      if (!replaceConfirmed) {
        return;
      }
    }

    const sourceBooking =
      this.selectedBooking()?.id === bookingId
        ? this.selectedBooking()
        : this.bookingsVm().bookings.find((booking) => booking.id === bookingId) ?? null;

    if (!sourceBooking) {
      await this.telegram.alert('Could not repeat this order. Please refresh and try again.');
      return;
    }

    const servicesByName = new Map(
      this.vm().services.map((service) => [this.normalizeServiceName(service.name), service] as const)
    );
    const nextQuantities: Record<number, number> = {};
    let missingItemsCount = 0;

    for (const item of sourceBooking.items) {
      const matchedService = servicesByName.get(this.normalizeServiceName(item.serviceName));

      if (!matchedService) {
        missingItemsCount += 1;
        continue;
      }

      nextQuantities[matchedService.id] = (nextQuantities[matchedService.id] ?? 0) + item.quantity;
    }

    if (Object.keys(nextQuantities).length === 0) {
      await this.telegram.alert('None of the items from this order are available now.');
      return;
    }

    this.submittedBooking.set(null);
    this.activeView.set('menu');
    this.submitError.set(null);
    this.checkoutOpen.set(true);
    this.store.setQuantities(nextQuantities);
    this.checkoutForm.patchValue({
      customerName: sourceBooking.customerName.trim(),
      customerPhone: sourceBooking.customerPhone.trim(),
      deliveryAddress: sourceBooking.deliveryAddress?.trim() ?? '',
      deliveryDate: this.defaultDeliveryDate(),
      note: sourceBooking.note?.trim() ?? ''
    });
    this.repeatOrderBanner.set(`Cart prefilled from order #${sourceBooking.id}. Review details before placing.`);

    if (missingItemsCount > 0) {
      await this.telegram.alert('Some items from this order are no longer available and were skipped.');
    }
  }

  dismissRepeatOrderBanner(): void {
    this.repeatOrderBanner.set(null);
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
      this.submitError.set('Enter your name, phone number, and delivery date before placing the order.');
      await this.telegram.alert('Enter your name, phone number, and delivery date before placing the order.');
      return;
    }

    const formValue = this.checkoutForm.getRawValue();
    const earliest = this.earliestDeliveryDate();
    if (formValue.deliveryDate < earliest) {
      this.checkoutOpen.set(true);
      this.checkoutForm.markAllAsTouched();
      this.submitError.set(`Earliest delivery is ${earliest}. Please select a valid date.`);
      await this.telegram.alert(`Please choose ${earliest} or a later date for delivery.`);
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
      this.repeatOrderBanner.set(null);
      this.resetCheckoutForm();
      this.activeView.set('orders');
      this.refreshBookings();
    } catch {
      this.checkoutOpen.set(true);
      this.submitError.set('Could not place your order. Please try again.');
      await this.telegram.alert('Could not place your order. Please try again.');
    } finally {
      this.submitting.set(false);
    }
  }

  deselectBooking(): void {
    this.selectedBookingId.set(null);
    this.selectedBooking.set(null);
  }

  setActiveView(view: 'menu' | 'orders'): void {
    this.activeView.set(view);
    if (view === 'orders' || view === 'menu') {
      this.refreshBookings();
    }
  }

  private resetForTenant(slug: string): void {
    this.store.setTenant(slug);
    this.checkoutOpen.set(false);
    this.submitting.set(false);
    this.submitError.set(null);
    this.repeatOrderBanner.set(null);
    this.submittedBooking.set(null);
    this.confirmingPaymentBookingId.set(null);
    this.paymentError.set(null);
    this.cancellingBookingId.set(null);
    this.cancelError.set(null);
    this.selectedBookingRequestVersion.set(0);
    this.selectedBookingId.set(null);
    this.selectedBooking.set(null);
    this.activeView.set('menu');
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

    this.api.getServices(slug).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
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
    const { customerName, customerPhone, deliveryAddress } = this.checkoutForm.getRawValue();

    this.customerDetailsDraft.set({
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      deliveryAddress: deliveryAddress.trim()
    });
  }

  private resetCheckoutForm(): void {
    const customerDetails = this.customerDetailsDraft();

    this.checkoutForm.reset({
      customerName: customerDetails.customerName,
      customerPhone: customerDetails.customerPhone,
      deliveryAddress: customerDetails.deliveryAddress,
      deliveryDate: this.defaultDeliveryDate(),
      note: ''
    });
  }

  private findLatestBooking(bookings: BookingResponse[]): BookingResponse | null {
    if (bookings.length === 0) {
      return null;
    }

    return bookings.reduce((latest, booking) =>
      new Date(booking.createdAt).getTime() > new Date(latest.createdAt).getTime() ? booking : latest
    );
  }

  private findLatestActiveBooking(bookings: BookingResponse[]): BookingResponse | null {
    const activeBookings = bookings.filter((booking) => this.isActiveBooking(booking));
    if (activeBookings.length === 0) {
      return null;
    }

    return this.findLatestBooking(activeBookings);
  }

  private isActiveBooking(booking: BookingResponse): boolean {
    const normalizedStatus = normalizeBookingStatus(booking.status);
    return (
      normalizedStatus === 'NEW' ||
      normalizedStatus === 'PAYMENT_PENDING' ||
      normalizedStatus === 'CONFIRMED' ||
      normalizedStatus === 'DELIVERING'
    );
  }

  private defaultDeliveryDate(): string {
    // configSignal may not be initialized yet when checkoutForm fields are set up;
    // use optional chaining so the initial form value always falls back to today.
    return this.configSignal?.()?.earliestDeliveryDate ?? this.todayIso();
  }

  private todayIso(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  private normalizeServiceName(name: string): string {
    return name.trim().toLowerCase();
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
