import { CurrencyPipe, DatePipe, NgFor, NgIf } from '@angular/common';
import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom, catchError, distinctUntilChanged, map, of, startWith, switchMap, tap } from 'rxjs';
import { BookingResponse, CreateBookingRequest } from '../../core/models/booking.model';
import { TenantConfig } from '../../core/models/tenant-config.model';
import { ServiceItem } from '../../core/models/service.model';
import { TenantApiService } from '../../core/services/tenant-api.service';
import { TelegramService } from '../../core/telegram/telegram.service';
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

@Component({
  selector: 'app-food-order-home',
  imports: [CurrencyPipe, DatePipe, NgFor, NgIf, ReactiveFormsModule],
  template: `
    <section class="panel">
      <p class="eyebrow">Food ordering flow</p>
      <h2>{{ config().name }}</h2>
      <p class="copy">Choose items, review the cart, place the order, and track it here.</p>

      <section class="status-card" *ngIf="vm().loading">
        <h3>Loading menu</h3>
        <p>Fetching active items for {{ config().slug }}.</p>
      </section>

      <section class="status-card error" *ngIf="vm().error as error">
        <h3>Menu unavailable</h3>
        <p>{{ error }}</p>
      </section>

      <section class="status-card" *ngIf="!vm().loading && !vm().error && !vm().services.length">
        <h3>No products yet</h3>
        <p>Add active services in the admin panel and they will appear here.</p>
      </section>

      <section class="success-card" *ngIf="submittedBooking() as booking">
        <p class="eyebrow">Order sent</p>
        <h3>Booking #{{ booking.id }}</h3>
        <p class="copy">
          {{ booking.customerName }}, your order for {{ booking.deliveryDate | date: 'mediumDate' }} is now
          in status <strong>{{ booking.status }}</strong>.
        </p>

        <div class="success-meta">
          <span>{{ booking.totalPrice | currency: 'VND' : 'symbol-narrow' : '1.0-0' }}</span>
          <span>{{ booking.items.length }} products</span>
          <span>{{ booking.createdAt | date: 'short' }}</span>
        </div>

        <button type="button" class="ghost-button" (click)="startNewOrder()">Create another order</button>
      </section>

      <div class="catalog" *ngIf="vm().services.length && !submittedBooking()">
        <article class="product-card" *ngFor="let service of vm().services; trackBy: trackByServiceId">
          <div class="product-copy">
            <div class="product-head">
              <h3>{{ service.name }}</h3>
              <p class="price">{{ service.price | currency: 'VND' : 'symbol-narrow' : '1.0-0' }}</p>
            </div>

            <p class="description" *ngIf="service.description">{{ service.description }}</p>
            <p class="unit">{{ service.unit || defaultUnit }}</p>
          </div>

          <div class="quantity">
            <button type="button" (click)="decrease(service.id)" [disabled]="store.quantityFor(service.id) === 0">
              -
            </button>
            <span>{{ store.quantityFor(service.id) }}</span>
            <button type="button" (click)="increase(service.id)">+</button>
          </div>
        </article>
      </div>

      <section class="summary" *ngIf="store.selectedCount() > 0 && !submittedBooking()">
        <div>
          <p class="summary-label">Cart</p>
          <strong>{{ store.selectedCount() }} items selected</strong>
          <p class="summary-total">{{ store.selectedTotal() | currency: 'VND' : 'symbol-narrow' : '1.0-0' }}</p>
        </div>

        <button type="button" class="primary-button" (click)="openCheckout()" *ngIf="!checkoutOpen()">
          Checkout
        </button>
      </section>

      <section class="checkout-card" *ngIf="checkoutOpen() && !submittedBooking()">
        <div class="checkout-head">
          <div>
            <p class="eyebrow">Checkout</p>
            <h3>Customer details</h3>
          </div>

          <button type="button" class="ghost-button" (click)="closeCheckout()" [disabled]="submitting()">
            Back to menu
          </button>
        </div>

        <div class="checkout-grid">
          <form class="checkout-form" [formGroup]="checkoutForm" (ngSubmit)="submitOrder()">
            <label>
              <span>Name</span>
              <input type="text" formControlName="customerName" placeholder="Alexey" />
            </label>

            <label>
              <span>Phone</span>
              <input type="tel" formControlName="customerPhone" placeholder="+84..." />
            </label>

            <label>
              <span>Delivery date</span>
              <input type="date" formControlName="deliveryDate" />
            </label>

            <label>
              <span>Note</span>
              <textarea rows="4" formControlName="note" placeholder="No onion, gate code, delivery note"></textarea>
            </label>

            <p class="form-error" *ngIf="submitError() as error">{{ error }}</p>
            <p class="form-hint" *ngIf="!submitError()">
              Telegram MainButton will submit this order. The local page button does the same action.
            </p>

            <button type="submit" class="primary-button" [disabled]="submitting()">
              {{ submitting() ? 'Submitting...' : 'Place order' }}
            </button>
          </form>

          <aside class="review-card">
            <h4>Order review</h4>

            <div class="review-list">
              <div class="review-row" *ngFor="let entry of store.selectedItems()">
                <div>
                  <strong>{{ entry.service.name }}</strong>
                  <p>{{ entry.quantity }} × {{ entry.service.price | currency: 'VND' : 'symbol-narrow' : '1.0-0' }}</p>
                </div>
                <span>{{ entry.service.price * entry.quantity | currency: 'VND' : 'symbol-narrow' : '1.0-0' }}</span>
              </div>
            </div>

            <div class="review-total">
              <span>Total</span>
              <strong>{{ store.selectedTotal() | currency: 'VND' : 'symbol-narrow' : '1.0-0' }}</strong>
            </div>
          </aside>
        </div>
      </section>

      <section class="bookings-card" *ngIf="!vm().loading">
        <div class="bookings-head">
          <div>
            <p class="eyebrow">My orders</p>
            <h3>Recent bookings</h3>
          </div>

          <button type="button" class="ghost-button" (click)="refreshBookings()" [disabled]="bookingsVm().loading">
            Refresh
          </button>
        </div>

        <section class="status-card" *ngIf="bookingsVm().loading">
          <h4>Loading bookings</h4>
          <p>Fetching orders for the current Telegram user.</p>
        </section>

        <section class="status-card error" *ngIf="bookingsVm().error as error">
          <h4>Bookings unavailable</h4>
          <p>{{ error }}</p>
        </section>

        <section class="status-card" *ngIf="!bookingsVm().loading && !bookingsVm().error && !bookingsVm().bookings.length">
          <h4>No bookings yet</h4>
          <p>Your submitted orders will appear here with status updates and cancellation controls.</p>
        </section>

        <div class="bookings-grid" *ngIf="bookingsVm().bookings.length">
          <div class="booking-list">
            <button
              type="button"
              class="booking-item"
              *ngFor="let booking of bookingsVm().bookings"
              [class.active]="selectedBookingId() === booking.id"
              (click)="selectBooking(booking.id)"
            >
              <div class="booking-item-top">
                <strong>#{{ booking.id }}</strong>
                <span class="booking-status" [class.cancelled]="booking.status === 'CANCELLED'">
                  {{ booking.status }}
                </span>
              </div>
              <p>{{ booking.deliveryDate | date: 'mediumDate' }}</p>
              <p>{{ booking.totalPrice | currency: 'VND' : 'symbol-narrow' : '1.0-0' }}</p>
            </button>
          </div>

          <section class="booking-detail" *ngIf="selectedBooking() as booking; else chooseBooking">
            <div class="booking-detail-head">
              <div>
                <p class="eyebrow">Booking #{{ booking.id }}</p>
                <h4>{{ booking.status }}</h4>
              </div>

              <button
                type="button"
                class="ghost-button"
                *ngIf="canCancel(booking)"
                (click)="cancelBooking(booking.id)"
                [disabled]="cancellingBookingId() === booking.id"
              >
                {{ cancellingBookingId() === booking.id ? 'Cancelling...' : 'Cancel order' }}
              </button>
            </div>

            <div class="booking-detail-meta">
              <span>{{ booking.deliveryDate | date: 'mediumDate' }}</span>
              <span>{{ booking.totalPrice | currency: 'VND' : 'symbol-narrow' : '1.0-0' }}</span>
              <span>{{ booking.createdAt | date: 'short' }}</span>
            </div>

            <p class="copy" *ngIf="booking.note">{{ booking.note }}</p>

            <div class="review-list">
              <div class="review-row" *ngFor="let item of booking.items">
                <div>
                  <strong>{{ item.serviceName }}</strong>
                  <p>{{ item.quantity }} × {{ item.unitPrice | currency: 'VND' : 'symbol-narrow' : '1.0-0' }}</p>
                </div>
                <span>{{ item.unitPrice * item.quantity | currency: 'VND' : 'symbol-narrow' : '1.0-0' }}</span>
              </div>
            </div>

            <p class="form-error" *ngIf="cancelError() as error">{{ error }}</p>
          </section>

          <ng-template #chooseBooking>
            <section class="status-card">
              <h4>Select a booking</h4>
              <p>Choose an order from the list to inspect items and status.</p>
            </section>
          </ng-template>
        </div>
      </section>
    </section>
  `,
  styles: `
    .panel {
      display: grid;
      gap: 1rem;
      padding: 1.5rem;
      border-radius: 24px;
      background: rgba(255, 255, 255, 0.92);
      border: 1px solid var(--yoobu-border);
      box-shadow: var(--yoobu-shadow);
    }

    .eyebrow {
      margin: 0;
      text-transform: uppercase;
      letter-spacing: 0.16em;
      color: var(--yoobu-primary);
      font-size: 0.75rem;
      font-weight: 700;
    }

    h2,
    h3,
    h4,
    p {
      margin: 0;
    }

    .copy {
      color: var(--yoobu-muted);
      line-height: 1.6;
    }

    .status-card,
    .success-card,
    .checkout-card,
    .bookings-card,
    .booking-detail {
      padding: 1rem 1.1rem;
      border-radius: 18px;
      background: rgba(255, 255, 255, 0.78);
      border: 1px solid var(--yoobu-border);
    }

    .status-card.error {
      border-color: rgba(165, 42, 42, 0.2);
      background: rgba(255, 246, 244, 0.95);
    }

    .success-card {
      background: linear-gradient(135deg, rgba(255, 107, 53, 0.1), rgba(255, 252, 249, 0.96));
      border-color: rgba(255, 107, 53, 0.22);
    }

    .status-card p,
    .description,
    .unit,
    .success-card p {
      margin-top: 0.45rem;
      color: var(--yoobu-muted);
      line-height: 1.5;
    }

    .success-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
      margin-top: 0.9rem;
      color: var(--yoobu-muted);
      font-size: 0.92rem;
    }

    .catalog {
      display: grid;
      gap: 0.75rem;
    }

    .product-card {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 1rem;
      padding: 1rem;
      border-radius: 18px;
      background: var(--yoobu-surface);
      border: 1px solid rgba(36, 22, 15, 0.08);
    }

    .product-copy {
      min-width: 0;
    }

    .product-head {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      gap: 0.75rem;
      align-items: baseline;
    }

    .price {
      color: var(--yoobu-primary);
      font-weight: 700;
      white-space: nowrap;
    }

    .unit {
      font-size: 0.92rem;
    }

    .quantity {
      display: inline-flex;
      align-items: center;
      align-self: center;
      gap: 0.75rem;
      padding: 0.4rem;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.92);
      border: 1px solid var(--yoobu-border);
    }

    .quantity button,
    .primary-button,
    .ghost-button,
    .booking-item {
      cursor: pointer;
      font: inherit;
    }

    .quantity button {
      width: 2.25rem;
      height: 2.25rem;
      border: 0;
      border-radius: 999px;
      background: var(--yoobu-primary);
      color: white;
      font-size: 1.15rem;
    }

    .quantity button:disabled,
    .primary-button:disabled,
    .ghost-button:disabled,
    .booking-item:disabled {
      opacity: 0.45;
      cursor: not-allowed;
    }

    .quantity span {
      min-width: 1.5rem;
      text-align: center;
      font-weight: 700;
    }

    .summary {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
      padding: 1rem 1.1rem;
      border-radius: 18px;
      background: linear-gradient(135deg, rgba(255, 107, 53, 0.12), rgba(255, 255, 255, 0.92));
      border: 1px solid rgba(255, 107, 53, 0.2);
    }

    .summary-label {
      color: var(--yoobu-muted);
      font-size: 0.85rem;
      text-transform: uppercase;
      letter-spacing: 0.12em;
    }

    .summary-total {
      margin-top: 0.2rem;
      font-weight: 700;
      color: var(--yoobu-primary);
    }

    .checkout-head,
    .bookings-head,
    .booking-detail-head {
      display: flex;
      justify-content: space-between;
      gap: 1rem;
      align-items: start;
    }

    .checkout-grid {
      display: grid;
      grid-template-columns: minmax(0, 1.4fr) minmax(260px, 1fr);
      gap: 1rem;
      margin-top: 1rem;
    }

    .bookings-grid {
      display: grid;
      grid-template-columns: minmax(220px, 0.8fr) minmax(0, 1.2fr);
      gap: 1rem;
      margin-top: 1rem;
    }

    .checkout-form,
    .review-card,
    .booking-list {
      display: grid;
      gap: 0.9rem;
    }

    .checkout-form label {
      display: grid;
      gap: 0.45rem;
      font-weight: 600;
    }

    .checkout-form span {
      font-size: 0.92rem;
    }

    .checkout-form input,
    .checkout-form textarea {
      width: 100%;
      padding: 0.85rem 0.95rem;
      border-radius: 14px;
      border: 1px solid var(--yoobu-border);
      background: rgba(255, 255, 255, 0.95);
      color: var(--yoobu-ink);
    }

    .checkout-form input.ng-invalid.ng-touched,
    .checkout-form textarea.ng-invalid.ng-touched {
      border-color: rgba(165, 42, 42, 0.35);
    }

    .review-card {
      align-content: start;
      padding: 1rem;
      border-radius: 18px;
      background: var(--yoobu-surface);
      border: 1px solid rgba(36, 22, 15, 0.08);
    }

    .review-list {
      display: grid;
      gap: 0.75rem;
    }

    .review-row {
      display: flex;
      justify-content: space-between;
      gap: 1rem;
      align-items: start;
    }

    .review-row p {
      margin-top: 0.2rem;
      color: var(--yoobu-muted);
      font-size: 0.9rem;
    }

    .review-total {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 0.85rem;
      border-top: 1px solid var(--yoobu-border);
    }

    .booking-item {
      display: grid;
      gap: 0.35rem;
      width: 100%;
      padding: 0.95rem 1rem;
      border-radius: 16px;
      border: 1px solid var(--yoobu-border);
      background: rgba(255, 255, 255, 0.96);
      text-align: left;
      color: inherit;
    }

    .booking-item.active {
      border-color: rgba(255, 107, 53, 0.35);
      background: rgba(255, 248, 242, 0.96);
    }

    .booking-item-top,
    .booking-detail-meta {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      gap: 0.75rem;
      align-items: center;
    }

    .booking-item p,
    .booking-detail-meta {
      color: var(--yoobu-muted);
      font-size: 0.92rem;
    }

    .booking-status {
      padding: 0.2rem 0.55rem;
      border-radius: 999px;
      background: rgba(255, 107, 53, 0.12);
      color: var(--yoobu-primary);
      font-size: 0.8rem;
      font-weight: 700;
    }

    .booking-status.cancelled {
      background: rgba(165, 42, 42, 0.12);
      color: brown;
    }

    .primary-button {
      border: 0;
      border-radius: 999px;
      padding: 0.85rem 1.2rem;
      background: var(--yoobu-primary);
      color: white;
      font-weight: 700;
    }

    .ghost-button {
      border: 1px solid var(--yoobu-border);
      border-radius: 999px;
      padding: 0.75rem 1rem;
      background: rgba(255, 255, 255, 0.92);
      color: var(--yoobu-ink);
    }

    .form-error,
    .form-hint {
      font-size: 0.92rem;
    }

    .form-error {
      color: brown;
    }

    .form-hint {
      color: var(--yoobu-muted);
      line-height: 1.5;
    }

    @media (max-width: 640px) {
      .product-card,
      .checkout-grid,
      .bookings-grid {
        grid-template-columns: 1fr;
      }

      .quantity {
        justify-self: start;
      }

      .summary,
      .checkout-head,
      .bookings-head,
      .booking-detail-head,
      .review-row {
        flex-direction: column;
        align-items: flex-start;
      }
    }
  `
})
export class FoodOrderHomeComponent {
  private readonly api = inject(TenantApiService);
  private readonly fb = inject(FormBuilder);
  private readonly telegram = inject(TelegramService);

  readonly config = input.required<TenantConfig>();
  readonly store = inject(FoodOrderStore);
  protected readonly defaultUnit = 'item';

  protected readonly checkoutForm = this.fb.nonNullable.group({
    customerName: ['', [Validators.required]],
    customerPhone: ['', [Validators.required]],
    deliveryDate: [this.defaultDeliveryDate(), [Validators.required]],
    note: ['']
  });
  private readonly checkoutFormStatus = toSignal(
    this.checkoutForm.statusChanges.pipe(startWith(this.checkoutForm.status)),
    { initialValue: this.checkoutForm.status }
  );

  protected readonly bookingsReloadKey = signal(0);
  protected readonly selectedBookingId = signal<number | null>(null);
  protected readonly selectedBooking = signal<BookingResponse | null>(null);
  protected readonly checkoutOpen = signal(false);
  protected readonly submitting = signal(false);
  protected readonly submitError = signal<string | null>(null);
  protected readonly submittedBooking = signal<BookingResponse | null>(null);
  protected readonly cancellingBookingId = signal<number | null>(null);
  protected readonly cancelError = signal<string | null>(null);

  private readonly vmSignal = toSignal(
    toObservable(this.config).pipe(
      distinctUntilChanged((previous, current) => previous.slug === current.slug),
      tap((config) => {
        this.store.setTenant(config.slug);
        this.checkoutOpen.set(false);
        this.submitting.set(false);
        this.submitError.set(null);
        this.submittedBooking.set(null);
        this.cancellingBookingId.set(null);
        this.cancelError.set(null);
        this.selectedBookingId.set(null);
        this.selectedBooking.set(null);
        this.checkoutForm.reset({
          customerName: '',
          customerPhone: '',
          deliveryDate: this.defaultDeliveryDate(),
          note: ''
        });
        this.bookingsReloadKey.update((value) => value + 1);
      }),
      switchMap((config) =>
        this.api.getServices(config.slug).pipe(
          tap((services) => this.store.setServices(services)),
          map((services) => ({
            services,
            loading: false,
            error: null
          })),
          startWith({
            services: [],
            loading: true,
            error: null
          }),
          catchError(() => {
            this.store.setServices([]);
            return of({
              services: [],
              loading: false,
              error: 'Check the backend service or tenant data and try again.'
            });
          })
        )
      )
    ),
    {
      initialValue: {
        services: [],
        loading: true,
        error: null
      }
    }
  );

  private readonly bookingsVmSignal = toSignal(
    toObservable(
      computed(() => ({
        slug: this.config().slug,
        reloadKey: this.bookingsReloadKey()
      }))
    ).pipe(
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

            this.selectedBookingId.set(nextSelectedId);
            this.selectedBooking.set(bookings.find((booking) => booking.id === nextSelectedId) ?? null);
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
              error: 'Could not load bookings for this Telegram user.'
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

  protected readonly vm = computed<FoodOrderVm>(() => this.vmSignal());
  protected readonly bookingsVm = computed<MyBookingsVm>(() => this.bookingsVmSignal());

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

  protected trackByServiceId(_index: number, service: ServiceItem): number {
    return service.id;
  }

  protected increase(serviceId: number): void {
    this.submitError.set(null);
    this.store.increase(serviceId);
  }

  protected decrease(serviceId: number): void {
    this.submitError.set(null);
    this.store.decrease(serviceId);
    if (this.store.selectedCount() === 0) {
      this.checkoutOpen.set(false);
    }
  }

  protected openCheckout(): void {
    this.submitError.set(null);
    this.checkoutOpen.set(true);
  }

  protected closeCheckout(): void {
    this.submitError.set(null);
    this.checkoutOpen.set(false);
  }

  protected startNewOrder(): void {
    this.submittedBooking.set(null);
    this.submitError.set(null);
    this.checkoutOpen.set(false);
    this.store.clearCart();
    this.checkoutForm.patchValue({
      deliveryDate: this.defaultDeliveryDate(),
      note: ''
    });
  }

  protected refreshBookings(): void {
    this.cancelError.set(null);
    this.bookingsReloadKey.update((value) => value + 1);
  }

  protected async selectBooking(bookingId: number): Promise<void> {
    this.selectedBookingId.set(bookingId);
    this.cancelError.set(null);

    try {
      const booking = await firstValueFrom(this.api.getBooking(this.config().slug, bookingId));
      this.selectedBooking.set(booking);
    } catch {
      this.cancelError.set('Could not load booking details.');
    }
  }

  protected canCancel(booking: BookingResponse): boolean {
    return booking.status === 'NEW' || booking.status === 'CONFIRMED';
  }

  protected async cancelBooking(bookingId: number): Promise<void> {
    if (this.cancellingBookingId()) {
      return;
    }

    this.cancelError.set(null);
    this.cancellingBookingId.set(bookingId);

    try {
      const booking = await firstValueFrom(this.api.cancelBooking(this.config().slug, bookingId));
      this.selectedBooking.set(booking);
      this.submittedBooking.update((current) => (current?.id === booking.id ? booking : current));
      this.refreshBookings();
    } catch {
      this.cancelError.set('Cancel request failed. The booking may already be done or unavailable.');
    } finally {
      this.cancellingBookingId.set(null);
    }
  }

  protected async submitOrder(): Promise<void> {
    if (this.submitting()) {
      return;
    }

    if (this.store.selectedCount() === 0) {
      this.checkoutOpen.set(false);
      return;
    }

    if (this.checkoutForm.invalid) {
      this.checkoutOpen.set(true);
      this.checkoutForm.markAllAsTouched();
      this.submitError.set('Fill in name, phone, and delivery date before placing the order.');
      return;
    }

    this.submitting.set(true);
    this.submitError.set(null);

    try {
      const booking = await firstValueFrom(this.api.createBooking(this.config().slug, this.toBookingRequest()));

      this.submittedBooking.set(booking);
      this.selectedBookingId.set(booking.id);
      this.selectedBooking.set(booking);
      this.store.clearCart();
      this.checkoutOpen.set(false);
      this.checkoutForm.reset({
        customerName: '',
        customerPhone: '',
        deliveryDate: this.defaultDeliveryDate(),
        note: ''
      });
      this.refreshBookings();
    } catch {
      this.checkoutOpen.set(true);
      this.submitError.set('Booking request failed. Check tenant cutoff rules and Telegram auth headers.');
    } finally {
      this.submitting.set(false);
    }
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
      deliveryDate: formValue.deliveryDate,
      note: formValue.note.trim() || null,
      items: this.store.selectedItems().map((entry) => ({
        serviceId: entry.service.id,
        quantity: entry.quantity
      }))
    };
  }

  private defaultDeliveryDate(): string {
    const currentDate = new Date();
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const day = String(currentDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0
    }).format(amount);
  }
}
