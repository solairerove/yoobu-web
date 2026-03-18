import { CurrencyPipe, DatePipe, NgFor, NgIf } from '@angular/common';
import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, Validators } from '@angular/forms';
import { firstValueFrom, catchError, distinctUntilChanged, map, of, startWith, switchMap, tap } from 'rxjs';
import { BookingResponse, CreateBookingRequest } from '../../core/models/booking.model';
import { TenantConfig } from '../../core/models/tenant-config.model';
import { ServiceItem } from '../../core/models/service.model';
import { TenantApiService } from '../../core/services/tenant-api.service';
import { TelegramService } from '../../core/telegram/telegram.service';
import { FoodOrderBookingsComponent } from './food-order-bookings.component';
import { FoodOrderCheckoutComponent } from './food-order-checkout.component';
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

@Component({
  selector: 'app-food-order-home',
  imports: [
    CurrencyPipe,
    DatePipe,
    NgFor,
    NgIf,
    FoodOrderBookingsComponent,
    FoodOrderCheckoutComponent
  ],
  template: `
    <section class="panel" [class.has-cart]="store.selectedCount() > 0 && !submittedBooking()">
      <header class="panel-header">
        <div>
          <p class="eyebrow">Menu</p>
          <h2>Place your order</h2>
        </div>
        <div class="header-stat" *ngIf="vm().services.length && !vm().loading && !vm().error">
          <strong>{{ vm().services.length }}</strong>
          <span>items</span>
        </div>
      </header>

      <p class="copy">Choose your items, add delivery details, and track your order.</p>

      <nav class="view-switch" aria-label="Order sections">
        <button
          type="button"
          class="view-switch-button"
          [class.active]="activeView() === 'menu'"
          (click)="setActiveView('menu')"
        >
          Menu
        </button>
        <button
          type="button"
          class="view-switch-button"
          [class.active]="activeView() === 'orders'"
          (click)="setActiveView('orders')"
        >
          My orders
        </button>
      </nav>

      <section class="status-card" *ngIf="vm().loading">
        <h3>Loading menu</h3>
        <p>Please wait while the menu loads.</p>
      </section>

      <section class="status-card error" *ngIf="vm().error as error">
        <h3>Menu unavailable</h3>
        <p>{{ error }}</p>
      </section>

      <section class="status-card" *ngIf="!vm().loading && !vm().error && !vm().services.length">
        <h3>No items available</h3>
        <p>No items are available right now.</p>
      </section>

      <ng-container *ngIf="activeView() === 'menu'">
        <section class="success-card" *ngIf="submittedBooking() as booking">
          <p class="eyebrow">Order sent</p>
          <h3>Order #{{ booking.id }}</h3>
          <p class="copy">
            {{ booking.customerName }}, your order for {{ booking.deliveryDate | date: 'mediumDate' }} is now
            in status <strong>{{ booking.status }}</strong>.
          </p>

          <div class="success-meta">
            <span>{{ booking.totalPrice | currency: 'VND' : 'symbol-narrow' : '1.0-0' }}</span>
            <span>{{ booking.items.length }} products</span>
            <span>{{ booking.createdAt | date: 'short' }}</span>
          </div>

          <div class="success-actions">
            <button type="button" class="ghost-button" (click)="startNewOrder()">New order</button>
            <button type="button" class="ghost-button" (click)="setActiveView('orders')">My orders</button>
          </div>
        </section>
      </ng-container>

      <section class="catalog-shell" *ngIf="activeView() === 'menu' && vm().services.length && !submittedBooking()">
        <div class="catalog-head">
          <div>
            <p class="eyebrow">Menu</p>
            <h3>Items</h3>
          </div>

          <div class="catalog-meta">
            <span class="catalog-pill">{{ vm().services.length }} items</span>
            <span class="catalog-pill" *ngIf="store.selectedCount() > 0">{{ store.selectedCount() }} in cart</span>
          </div>
        </div>

        <div class="catalog-note">
          <span class="catalog-dot"></span>
          <p>Add items to your cart to continue.</p>
        </div>

        <div class="catalog">
        <article
          class="product-card"
          *ngFor="let service of vm().services; trackBy: trackByServiceId"
          [class.selected]="store.quantityFor(service.id) > 0"
        >
          <div class="product-accent"></div>

          <div class="product-copy">
            <div class="product-topline">
              <span class="product-index">{{ service.id }}</span>
              <p class="unit">{{ service.unit || defaultUnit }}</p>
            </div>

            <div class="product-meta">
              <h3>{{ service.name }}</h3>
            </div>

            <p class="description" *ngIf="service.description">{{ service.description }}</p>
            <p class="selection-copy" *ngIf="store.quantityFor(service.id) > 0">
              {{ store.quantityFor(service.id) }} selected
            </p>
          </div>

          <div class="product-side">
            <div class="price-block">
              <p class="price-label">Price</p>
              <p class="price">{{ service.price | currency: 'VND' : 'symbol-narrow' : '1.0-0' }}</p>
            </div>
            <div class="quantity">
              <button
                type="button"
                class="quantity-button quantity-button-decrease"
                (click)="decrease(service.id)"
                [disabled]="store.quantityFor(service.id) === 0"
                [attr.aria-label]="'Decrease quantity for ' + service.name"
              >
                <span aria-hidden="true">-</span>
              </button>
              <span class="quantity-value" aria-live="polite">{{ store.quantityFor(service.id) }}</span>
              <button
                type="button"
                class="quantity-button quantity-button-increase"
                (click)="increase(service.id)"
                [attr.aria-label]="'Increase quantity for ' + service.name"
              >
                <span aria-hidden="true">+</span>
              </button>
            </div>
          </div>
        </article>
        </div>
      </section>

      <button
        type="button"
        class="cart-bar"
        *ngIf="activeView() === 'menu' && store.selectedCount() > 0 && !submittedBooking()"
        (click)="openCheckout()"
      >
        <div class="cart-copy">
          <p class="summary-label">Cart</p>
          <strong>
            {{ checkoutOpen() ? 'Checkout is open' : store.selectedCount() + ' item' + (store.selectedCount() > 1 ? 's' : '') }}
          </strong>
          <p class="summary-total">{{ store.selectedTotal() | currency: 'VND' : 'symbol-narrow' : '1.0-0' }}</p>
        </div>

        <span class="cart-action">
          {{ checkoutOpen() ? 'Review order' : 'Open checkout' }}
        </span>
      </button>

      <app-food-order-checkout
        *ngIf="activeView() === 'menu' && checkoutOpen() && !submittedBooking()"
        [open]="checkoutOpen()"
        [localMode]="showLocalCheckoutButtons"
        [submitting]="submitting()"
        [submitError]="submitError()"
        [form]="checkoutForm"
        [selectedItems]="store.selectedItems()"
        [selectedCount]="store.selectedCount()"
        [selectedTotal]="store.selectedTotal()"
        (closeRequested)="closeCheckout()"
        (submitRequested)="submitOrder()"
      />

      <app-food-order-bookings
        *ngIf="activeView() === 'orders' && !vm().loading"
        [bookings]="bookingsVm().bookings"
        [loading]="bookingsVm().loading"
        [error]="bookingsVm().error"
        [selectedBookingId]="selectedBookingId()"
        [selectedBooking]="selectedBooking()"
        [cancellingBookingId]="cancellingBookingId()"
        [cancelError]="cancelError()"
        (refreshRequested)="refreshBookings()"
        (bookingSelected)="selectBooking($event)"
        (cancelRequested)="cancelBooking($event)"
      />
    </section>
  `,
  styles: `
    .panel {
      display: grid;
      gap: 0.85rem;
      padding: 1rem;
      border-radius: 22px;
      background: rgba(255, 255, 255, 0.94);
      border: 1px solid var(--yoobu-border);
      box-shadow: var(--yoobu-shadow);
    }

    .panel.has-cart {
      padding-bottom: 6.5rem;
    }

    .panel-header {
      display: flex;
      justify-content: space-between;
      gap: 1rem;
      align-items: start;
    }

    .header-stat {
      min-width: 4.75rem;
      padding: 0.55rem 0.7rem;
      border-radius: 16px;
      background: rgba(255, 107, 53, 0.08);
      text-align: center;
    }

    .header-stat strong,
    .header-stat span {
      display: block;
    }

    .header-stat strong {
      font-size: 1.05rem;
    }

    .header-stat span {
      color: var(--yoobu-muted);
      font-size: 0.78rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }

    .eyebrow {
      margin: 0;
      text-transform: uppercase;
      letter-spacing: 0.14em;
      color: var(--yoobu-primary);
      font-size: 0.72rem;
      font-weight: 700;
    }

    h2,
    h3,
    h4,
    h5,
    p {
      margin: 0;
    }

    h2 {
      font-size: clamp(1.2rem, 3vw, 1.6rem);
      line-height: 1.15;
    }

    .copy {
      color: var(--yoobu-muted);
      line-height: 1.45;
      font-size: 0.95rem;
    }

    .view-switch {
      display: inline-grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0.3rem;
      padding: 0.25rem;
      border-radius: 16px;
      background: rgba(36, 22, 15, 0.05);
      width: fit-content;
    }

    .view-switch-button {
      border: 0;
      border-radius: 12px;
      padding: 0.7rem 1rem;
      background: transparent;
      color: var(--yoobu-muted);
      font: inherit;
      font-weight: 700;
      cursor: pointer;
    }

    .view-switch-button.active {
      background: rgba(255, 255, 255, 0.96);
      color: var(--yoobu-ink);
      box-shadow: 0 2px 10px rgba(36, 22, 15, 0.08);
    }

    .status-card,
    .success-card,
    .bookings-card,
    .booking-detail {
      padding: 0.95rem 1rem;
      border-radius: 18px;
      background: rgba(255, 255, 255, 0.82);
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

    .success-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.65rem;
      margin-top: 1rem;
    }

    .catalog-shell {
      display: grid;
      gap: 0.8rem;
    }

    .catalog-head {
      display: flex;
      justify-content: space-between;
      gap: 1rem;
      align-items: end;
    }

    .catalog-head h3 {
      margin-top: 0.2rem;
      font-size: 1.02rem;
    }

    .catalog-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 0.45rem;
      justify-content: flex-end;
    }

    .catalog-pill {
      padding: 0.35rem 0.6rem;
      border-radius: 999px;
      background: rgba(36, 22, 15, 0.05);
      color: var(--yoobu-muted);
      font-size: 0.8rem;
      font-weight: 700;
      white-space: nowrap;
    }

    .catalog-note {
      display: flex;
      gap: 0.55rem;
      align-items: center;
      padding: 0.8rem 0.9rem;
      border-radius: 16px;
      background: rgba(255, 248, 242, 0.9);
      border: 1px solid rgba(255, 107, 53, 0.12);
    }

    .catalog-dot {
      width: 0.6rem;
      height: 0.6rem;
      border-radius: 999px;
      background: var(--yoobu-primary);
      flex-shrink: 0;
      box-shadow: 0 0 0 6px rgba(255, 107, 53, 0.12);
    }

    .catalog-note p {
      color: var(--yoobu-muted);
      font-size: 0.9rem;
      line-height: 1.4;
    }

    .catalog {
      display: grid;
      gap: 0.6rem;
    }

    .product-card {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 0.9rem;
      padding: 0.9rem;
      border-radius: 16px;
      background: rgba(255, 250, 246, 0.88);
      border: 1px solid rgba(36, 22, 15, 0.08);
      align-items: center;
      position: relative;
      overflow: hidden;
      transition:
        transform 180ms ease,
        border-color 180ms ease,
        background 180ms ease,
        box-shadow 180ms ease;
    }

    .product-card.selected {
      border-color: rgba(255, 107, 53, 0.28);
      background: linear-gradient(135deg, rgba(255, 246, 240, 0.98), rgba(255, 252, 249, 0.92));
      box-shadow: 0 10px 24px rgba(255, 107, 53, 0.08);
    }

    .product-accent {
      position: absolute;
      inset: 0 auto 0 0;
      width: 0.3rem;
      background: linear-gradient(180deg, rgba(255, 107, 53, 0.85), rgba(255, 160, 122, 0.45));
      opacity: 0.55;
    }

    .product-card.selected .product-accent {
      opacity: 1;
    }

    .product-copy {
      min-width: 0;
      display: grid;
      gap: 0.34rem;
    }

    .product-topline {
      display: flex;
      flex-wrap: wrap;
      gap: 0.55rem;
      align-items: baseline;
    }

    .product-index {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 1.9rem;
      height: 1.9rem;
      padding: 0 0.45rem;
      border-radius: 999px;
      background: rgba(36, 22, 15, 0.05);
      color: var(--yoobu-muted);
      font-size: 0.78rem;
      font-weight: 800;
      line-height: 1;
    }

    .product-meta {
      display: grid;
      gap: 0.18rem;
    }

    .product-meta h3 {
      font-size: 1.04rem;
      line-height: 1.2;
      letter-spacing: -0.01em;
    }

    .product-side {
      display: grid;
      justify-items: end;
      gap: 0.6rem;
    }

    .price-block {
      display: grid;
      gap: 0.08rem;
      justify-items: end;
    }

    .price-label {
      color: var(--yoobu-muted);
      font-size: 0.72rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.12em;
    }

    .price {
      color: var(--yoobu-primary);
      font-weight: 800;
      white-space: nowrap;
      font-size: 1.02rem;
    }

    .unit {
      padding: 0.15rem 0.45rem;
      border-radius: 999px;
      background: rgba(36, 22, 15, 0.05);
      color: var(--yoobu-muted);
      font-size: 0.82rem;
    }

    .selection-copy {
      color: var(--yoobu-primary);
      font-size: 0.84rem;
      font-weight: 700;
    }

    .quantity {
      display: inline-flex;
      align-items: center;
      gap: 0.32rem;
      padding: 0.24rem;
      border-radius: 999px;
      background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(255, 246, 240, 0.94));
      border: 1px solid rgba(255, 107, 53, 0.16);
      box-shadow:
        inset 0 1px 0 rgba(255, 255, 255, 0.8),
        0 8px 16px rgba(36, 22, 15, 0.06);
    }

    .quantity button,
    .ghost-button,
    .cart-bar {
      cursor: pointer;
      font: inherit;
    }

    .quantity-button {
      width: 2.05rem;
      height: 2.05rem;
      border: 1px solid transparent;
      border-radius: 999px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      line-height: 1;
      font-size: 1.05rem;
      font-weight: 800;
      transition:
        transform 140ms ease,
        box-shadow 140ms ease,
        background 140ms ease,
        border-color 140ms ease,
        color 140ms ease,
        opacity 140ms ease;
    }

    .quantity-button span {
      transform: translateY(-0.03em);
    }

    .quantity-button-decrease {
      background: rgba(255, 255, 255, 0.92);
      border-color: rgba(36, 22, 15, 0.08);
      color: var(--yoobu-ink);
      box-shadow: 0 3px 10px rgba(36, 22, 15, 0.06);
    }

    .quantity-button-increase {
      background: linear-gradient(135deg, var(--yoobu-primary), #ff8753);
      color: white;
      box-shadow: 0 8px 16px rgba(255, 107, 53, 0.22);
    }

    .quantity-button:not(:disabled):hover {
      transform: translateY(-1px);
    }

    .quantity-button:not(:disabled):active {
      transform: translateY(0) scale(0.96);
      box-shadow: inset 0 2px 5px rgba(36, 22, 15, 0.14);
    }

    .quantity-button:focus-visible {
      outline: 2px solid rgba(255, 107, 53, 0.28);
      outline-offset: 2px;
    }

    .quantity-button:disabled,
    .ghost-button:disabled {
      opacity: 0.45;
      cursor: not-allowed;
    }

    .quantity-button:disabled {
      transform: none;
      box-shadow: none;
    }

    .quantity-value {
      min-width: 2rem;
      padding: 0 0.2rem;
      text-align: center;
      font-weight: 700;
      font-size: 0.96rem;
      color: var(--yoobu-ink);
    }

    .cart-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
      width: min(688px, calc(100% - 2rem));
      position: fixed;
      left: 50%;
      bottom: max(0.85rem, env(safe-area-inset-bottom));
      transform: translateX(-50%);
      z-index: 5;
      padding: 0.9rem 1rem;
      border: 1px solid rgba(255, 107, 53, 0.24);
      border-radius: 18px;
      background: linear-gradient(135deg, rgba(255, 107, 53, 0.96), rgba(255, 131, 84, 0.96));
      color: white;
      box-shadow: 0 18px 40px rgba(255, 107, 53, 0.24);
      text-align: left;
    }

    .summary-label {
      color: rgba(255, 255, 255, 0.8);
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.12em;
    }

    .cart-copy {
      display: grid;
      gap: 0.12rem;
    }

    .summary-total {
      margin-top: 0.2rem;
      font-weight: 700;
      color: white;
    }

    .cart-action {
      flex-shrink: 0;
      padding: 0.45rem 0.75rem;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.18);
      color: white;
      font-size: 0.82rem;
      font-weight: 700;
    }

    .ghost-button {
      border: 1px solid var(--yoobu-border);
      border-radius: 999px;
      padding: 0.75rem 1rem;
      background: rgba(255, 255, 255, 0.92);
      color: var(--yoobu-ink);
    }

    @media (max-width: 640px) {
      .product-card {
        grid-template-columns: 1fr;
      }

      .view-switch {
        width: 100%;
      }

      .catalog-head,
      .catalog-meta {
        align-items: flex-start;
        justify-content: flex-start;
      }

      .catalog-note {
        align-items: flex-start;
      }

      .product-side {
        width: 100%;
        grid-template-columns: minmax(0, 1fr) auto;
        align-items: center;
      }

      .quantity {
        justify-self: end;
      }

      .cart-bar {
        width: calc(100% - 1.5rem);
        bottom: max(0.75rem, env(safe-area-inset-bottom));
      }

      .cart-bar,
      .success-actions {
        flex-direction: column;
        align-items: flex-start;
      }

      .cart-action {
        width: 100%;
        text-align: center;
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
  protected readonly showLocalCheckoutButtons = this.telegram.isLocalhost();

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
  protected readonly activeView = signal<'menu' | 'orders'>('menu');
  protected readonly checkoutOpen = signal(false);
  protected readonly submitting = signal(false);
  protected readonly submitError = signal<string | null>(null);
  protected readonly submittedBooking = signal<BookingResponse | null>(null);
  protected readonly cancellingBookingId = signal<number | null>(null);
  protected readonly cancelError = signal<string | null>(null);
  private readonly customerDetailsDraft = signal<CustomerDetailsDraft>({
    customerName: '',
    customerPhone: ''
  });
  private readonly customerDetailsHydrated = signal(false);

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
        this.activeView.set('menu');
        this.customerDetailsHydrated.set(false);
        this.resetCheckoutForm();
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
    this.activeView.set('menu');
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
    this.activeView.set('orders');
    this.selectedBookingId.set(bookingId);
    this.cancelError.set(null);

    try {
      const booking = await firstValueFrom(this.api.getBooking(this.config().slug, bookingId));
      this.selectedBooking.set(booking);
    } catch {
      this.cancelError.set('Could not load the order details.');
    }
  }

  protected async cancelBooking(bookingId: number): Promise<void> {
    if (this.cancellingBookingId()) {
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
      const booking = await firstValueFrom(this.api.cancelBooking(this.config().slug, bookingId));
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
      this.submitError.set('Enter your name, phone number, and delivery date before placing the order.');
      await this.telegram.alert('Enter your name, phone number, and delivery date before placing the order.');
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
      const booking = await firstValueFrom(this.api.createBooking(this.config().slug, this.toBookingRequest()));

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

  private async handlePrimaryAction(): Promise<void> {
    if (!this.checkoutOpen()) {
      this.openCheckout();
      return;
    }

    await this.submitOrder();
  }

  protected setActiveView(view: 'menu' | 'orders'): void {
    this.activeView.set(view);
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
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0
    }).format(amount);
  }
}
