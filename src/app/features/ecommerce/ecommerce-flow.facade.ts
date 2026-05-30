import { computed, DestroyRef, effect, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import {
  catchError,
  distinctUntilChanged,
  filter,
  firstValueFrom,
  map,
  of,
  startWith,
  switchMap,
  tap
} from 'rxjs';
import { BookingResponse, CreateEcommerceOrderRequest } from '../../core/models/booking.model';
import { TenantConfig } from '../../core/models/tenant-config.model';
import { ServiceItem } from '../../core/models/service.model';
import { TenantApiService } from '../../core/services/tenant-api.service';
import { TelegramService } from '../../core/telegram/telegram.service';
import { currencySymbolFor, normalizeCurrencyCode } from '../../core/utils/currency.util';
import { normalizeBookingStatus } from '../../core/utils/booking-status.util';
import { EcommerceStore } from './ecommerce.store';

interface EcommerceVm {
  services: ServiceItem[];
  loading: boolean;
  error: string | null;
}

interface MyOrdersVm {
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
export class EcommerceFlowFacade {
  private readonly api = inject(TenantApiService);
  private readonly fb = inject(FormBuilder);
  private readonly telegram = inject(TelegramService);
  private readonly destroyRef = inject(DestroyRef);

  readonly store = inject(EcommerceStore);
  readonly showNativeCheckoutButtons = computed(() => !this.telegram.isInsideTelegram());

  readonly checkoutForm = this.fb.nonNullable.group({
    customerName: ['', [Validators.required]],
    customerPhone: ['', [Validators.required, Validators.pattern(/^[+]?[\d\s\-\(\)\.]{6,20}$/)]],
    deliveryAddress: ['', [Validators.required]],
    note: ['']
  });

  readonly activeView = signal<'catalog' | 'cart' | 'checkout' | 'confirmation' | 'orders'>('catalog');
  readonly submitting = signal(false);
  readonly submitError = signal<string | null>(null);
  readonly submittedOrder = signal<BookingResponse | null>(null);
  readonly selectedBookingId = signal<number | null>(null);
  readonly selectedBooking = signal<BookingResponse | null>(null);
  readonly confirmingPaymentBookingId = signal<number | null>(null);
  readonly paymentError = signal<string | null>(null);
  readonly cancellingBookingId = signal<number | null>(null);
  readonly cancelError = signal<string | null>(null);
  readonly ordersReloadKey = signal(0);

  private readonly configSignal = signal<TenantConfig | null>(null);
  private readonly vmSignal = signal<EcommerceVm>({ services: [], loading: true, error: null });
  private readonly servicesRequestVersion = signal(0);
  private readonly selectedBookingRequestVersion = signal(0);
  private readonly customerDetailsDraft = signal<CustomerDetailsDraft>({
    customerName: '',
    customerPhone: '',
    deliveryAddress: ''
  });

  private readonly ordersVmSignal = toSignal(
    toObservable(
      computed(() => ({ config: this.configSignal(), reloadKey: this.ordersReloadKey() }))
    ).pipe(
      filter((p): p is { config: TenantConfig; reloadKey: number } => p.config !== null),
      map(({ config, reloadKey }) => ({ slug: config.slug, reloadKey })),
      distinctUntilChanged((a, b) => a.slug === b.slug && a.reloadKey === b.reloadKey),
      switchMap(({ slug }) =>
        this.api.getMyBookings(slug).pipe(
          tap((bookings) => {
            const nextSelectedId = bookings.some((b) => b.id === this.selectedBookingId())
              ? this.selectedBookingId()
              : null;
            this.selectedBookingId.set(nextSelectedId);
            this.selectedBooking.set(bookings.find((b) => b.id === nextSelectedId) ?? null);

            const draft = this.customerDetailsDraft();
            if (!draft.customerName && !draft.customerPhone) {
              const lastDone = this.findLatestDoneBooking(bookings);
              if (lastDone) {
                const prefill: CustomerDetailsDraft = {
                  customerName: lastDone.customerName.trim(),
                  customerPhone: lastDone.customerPhone.trim(),
                  deliveryAddress: lastDone.deliveryAddress?.trim() ?? ''
                };
                this.customerDetailsDraft.set(prefill);
                if (this.checkoutForm.pristine) {
                  this.checkoutForm.patchValue(prefill);
                }
              }
            }
          }),
          map((bookings) => ({ bookings, loading: false, error: null })),
          startWith({ bookings: [], loading: true, error: null }),
          catchError((err: unknown) => {
            let error = 'Could not load your orders.';
            if (err instanceof HttpErrorResponse && (err.status === 401 || err.status === 403)) {
              error = 'Session expired. Please close and reopen the app.';
            }
            return of({ bookings: [], loading: false, error });
          })
        )
      )
    ),
    { initialValue: { bookings: [], loading: true, error: null } }
  );

  readonly vm = computed<EcommerceVm>(() => this.vmSignal());
  readonly ordersVm = computed<MyOrdersVm>(() => this.ordersVmSignal());

  private readonly mainButtonAction = () => { void this.handlePrimaryAction(); };

  constructor() {
    effect(() => { void this.ordersVmSignal(); });

    effect(() => {
      const isInsideTelegram = this.telegram.isInsideTelegram();
      const itemCount = this.store.selectedCount();
      const total = this.store.selectedTotal();
      const activeView = this.activeView();
      const submitting = this.submitting();

      if (!isInsideTelegram) return;

      if (activeView === 'confirmation') {
        this.telegram.setMainButton('Back to shop');
        this.telegram.onMainButtonClick(this.mainButtonAction);
        return;
      }

      if (itemCount === 0) {
        this.telegram.setMainButton(null);
        this.telegram.onMainButtonClick(null);
        return;
      }

      if (activeView === 'catalog') {
        this.telegram.setMainButton(`View cart • ${this.formatCurrency(total)}`);
        this.telegram.onMainButtonClick(this.mainButtonAction);
        return;
      }

      if (activeView === 'cart') {
        this.telegram.setMainButton(`Checkout • ${this.formatCurrency(total)}`);
        this.telegram.onMainButtonClick(this.mainButtonAction);
        return;
      }

      if (activeView === 'checkout') {
        this.telegram.setMainButton(
          submitting ? 'Submitting...' : `Place order • ${this.formatCurrency(total)}`,
          !submitting
        );
        this.telegram.onMainButtonClick(this.mainButtonAction);
        return;
      }

      this.telegram.setMainButton(null);
      this.telegram.onMainButtonClick(null);
    });
  }

  setConfig(config: TenantConfig): void {
    if (this.configSignal()?.slug === config.slug) return;
    this.configSignal.set(config);
    this.resetForTenant(config.slug);
    this.loadServices(config.slug);
  }

  increase(variantId: number, stock: number): void {
    this.submitError.set(null);
    this.store.increase(variantId, stock);
    this.telegram.hapticLight();
  }

  decrease(variantId: number): void {
    this.submitError.set(null);
    this.store.decrease(variantId);
    this.telegram.hapticLight();
    if (this.store.selectedCount() === 0) {
      this.activeView.set('catalog');
    }
  }

  openCart(): void { this.activeView.set('cart'); }
  closeCart(): void { this.activeView.set('catalog'); }

  openCheckout(): void {
    this.submitError.set(null);
    this.activeView.set('checkout');
  }

  closeCheckout(): void { this.activeView.set('cart'); }

  startNewOrder(): void {
    this.activeView.set('catalog');
    this.submittedOrder.set(null);
    this.selectedBookingId.set(null);
    this.selectedBooking.set(null);
    this.submitError.set(null);
    this.store.clearCart();
    this.checkoutForm.patchValue({ deliveryAddress: this.customerDetailsDraft().deliveryAddress, note: '' });
    this.checkoutForm.markAsUntouched();
    const config = this.configSignal();
    if (config) { void this.reloadServices(config.slug); }
  }

  refreshOrders(): void {
    this.paymentError.set(null);
    this.cancelError.set(null);
    this.ordersReloadKey.update((v) => v + 1);
  }

  async selectBooking(bookingId: number): Promise<void> {
    const config = this.configSignal();
    if (!config) return;

    this.activeView.set('orders');
    this.selectedBookingId.set(bookingId);
    this.paymentError.set(null);
    this.cancelError.set(null);
    const requestVersion = this.selectedBookingRequestVersion() + 1;
    this.selectedBookingRequestVersion.set(requestVersion);

    try {
      const booking = await firstValueFrom(this.api.getBooking(config.slug, bookingId));
      if (this.selectedBookingRequestVersion() !== requestVersion || this.selectedBookingId() !== bookingId) return;
      this.selectedBooking.set(booking);
    } catch {
      if (this.selectedBookingRequestVersion() !== requestVersion || this.selectedBookingId() !== bookingId) return;
      this.cancelError.set('Could not load the order details.');
    }
  }

  deselectBooking(): void {
    this.selectedBookingId.set(null);
    this.selectedBooking.set(null);
  }

  async cancelBooking(bookingId: number): Promise<void> {
    const config = this.configSignal();
    if (!config || this.cancellingBookingId()) return;

    const confirmed = await this.telegram.confirm(
      'Cancel this order? This can only be done while the order is still active.'
    );
    if (!confirmed) return;

    this.cancelError.set(null);
    this.cancellingBookingId.set(bookingId);

    try {
      const booking = await firstValueFrom(this.api.cancelBooking(config.slug, bookingId));
      this.selectedBooking.set(booking);
      this.submittedOrder.update((current) => (current?.id === booking.id ? booking : current));
      this.refreshOrders();
      this.reloadServices(config.slug);
    } catch {
      this.cancelError.set('Cancel request failed. The order may already be done or unavailable.');
      await this.telegram.alert('Could not cancel this order. It may already be processed or unavailable.');
    } finally {
      this.cancellingBookingId.set(null);
    }
  }

  async confirmPayment(bookingId: number): Promise<void> {
    const config = this.configSignal();
    if (!config || this.confirmingPaymentBookingId()) return;

    this.paymentError.set(null);
    this.confirmingPaymentBookingId.set(bookingId);

    try {
      const booking = await firstValueFrom(this.api.confirmBookingPayment(config.slug, bookingId));
      this.selectedBooking.set(booking);
      this.submittedOrder.update((current) => (current?.id === booking.id ? booking : current));
      this.refreshOrders();
    } catch (error) {
      if (error instanceof HttpErrorResponse && error.status === 409) {
        await this.telegram.alert('Payment can only be confirmed for orders still in NEW status. Refreshing status.');
        this.refreshOrders();
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

  async submitOrder(): Promise<void> {
    const config = this.configSignal();
    if (!config || this.submitting()) return;

    if (this.store.selectedCount() === 0) {
      this.activeView.set('catalog');
      return;
    }

    if (this.checkoutForm.invalid) {
      this.activeView.set('checkout');
      this.checkoutForm.markAllAsTouched();
      this.submitError.set('Enter your name, phone number, and delivery address before placing the order.');
      await this.telegram.alert('Enter your name, phone number, and delivery address before placing the order.');
      return;
    }

    const confirmed = await this.telegram.confirm(
      `Submit this order for ${this.formatCurrency(this.store.selectedTotal())}?`
    );
    if (!confirmed) return;

    this.submitting.set(true);
    this.submitError.set(null);
    this.rememberCustomerDetails();

    try {
      const order = await firstValueFrom(this.api.createOrder(config.slug, this.toOrderRequest()));
      this.submittedOrder.set(order);
      this.selectedBookingId.set(order.id);
      this.selectedBooking.set(order);
      this.store.clearCart();
      this.resetCheckoutForm();
      this.activeView.set('confirmation');
      this.refreshOrders();
    } catch (error) {
      this.activeView.set('checkout');
      if (error instanceof HttpErrorResponse && error.status === 409) {
        this.submitError.set('Some items went out of stock while you were checking out. Please review your cart.');
        await this.telegram.alert('Some items went out of stock while you were checking out. Please review your cart.');
        await this.reloadServices(config.slug);
        this.store.purgeOutOfStock();
      } else {
        this.submitError.set('Could not place your order. Please try again.');
        await this.telegram.alert('Could not place your order. Please try again.');
      }
    } finally {
      this.submitting.set(false);
    }
  }

  setActiveView(view: 'catalog' | 'orders'): void {
    this.activeView.set(view);
    const config = this.configSignal();
    if (!config) return;
    if (view === 'catalog') {
      void this.reloadServices(config.slug);
    } else {
      this.refreshOrders();
    }
  }

  private async handlePrimaryAction(): Promise<void> {
    if (this.activeView() === 'confirmation') { this.startNewOrder(); return; }
    if (this.activeView() === 'catalog') { this.openCart(); return; }
    if (this.activeView() === 'cart') { this.openCheckout(); return; }
    await this.submitOrder();
  }

  private toOrderRequest(): CreateEcommerceOrderRequest {
    const form = this.checkoutForm.getRawValue();
    return {
      customerName: form.customerName.trim(),
      customerPhone: form.customerPhone.trim(),
      deliveryAddress: form.deliveryAddress.trim(),
      deliveryDate: null,
      note: form.note.trim() || null,
      items: this.store.selectedItems().map((e) => ({ variantId: e.variant.id, quantity: e.quantity }))
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
    const draft = this.customerDetailsDraft();
    this.checkoutForm.reset({
      customerName: draft.customerName,
      customerPhone: draft.customerPhone,
      deliveryAddress: draft.deliveryAddress,
      note: ''
    });
  }

  private resetForTenant(slug: string): void {
    this.store.setTenant(slug);
    this.submitting.set(false);
    this.submitError.set(null);
    this.submittedOrder.set(null);
    this.confirmingPaymentBookingId.set(null);
    this.paymentError.set(null);
    this.cancellingBookingId.set(null);
    this.cancelError.set(null);
    this.selectedBookingRequestVersion.set(0);
    this.selectedBookingId.set(null);
    this.selectedBooking.set(null);
    this.activeView.set('catalog');
    this.vmSignal.set({ services: [], loading: true, error: null });
    this.resetCheckoutForm();
    this.ordersReloadKey.update((v) => v + 1);
  }

  private loadServices(slug: string): void {
    const requestVersion = this.servicesRequestVersion() + 1;
    this.servicesRequestVersion.set(requestVersion);
    this.vmSignal.set({ services: [], loading: true, error: null });

    this.api.getServices(slug).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (services) => {
        if (this.servicesRequestVersion() !== requestVersion || this.configSignal()?.slug !== slug) return;
        this.store.setServices(services);
        this.vmSignal.set({ services, loading: false, error: null });
      },
      error: () => {
        if (this.servicesRequestVersion() !== requestVersion || this.configSignal()?.slug !== slug) return;
        this.store.setServices([]);
        this.vmSignal.set({ services: [], loading: false, error: 'Could not load products. Please try again.' });
      }
    });
  }

  private async reloadServices(slug: string): Promise<void> {
    try {
      const services = await firstValueFrom(this.api.getServices(slug));
      this.store.setServices(services);
      this.vmSignal.set({ services, loading: false, error: null });
    } catch {
      // ignore — already showing checkout error
    }
  }

  private findLatestDoneBooking(bookings: BookingResponse[]): BookingResponse | null {
    const done = bookings.filter((b) => normalizeBookingStatus(b.status) === 'DONE');
    if (!done.length) return null;
    return done.reduce((latest, b) =>
      new Date(b.createdAt).getTime() > new Date(latest.createdAt).getTime() ? b : latest
    );
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
