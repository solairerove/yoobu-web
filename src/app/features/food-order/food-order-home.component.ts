import { CurrencyPipe, DatePipe, NgFor, NgIf } from '@angular/common';
import { Component, computed, effect, inject, input } from '@angular/core';
import { TenantConfig } from '../../core/models/tenant-config.model';
import { ServiceItem } from '../../core/models/service.model';
import { normalizeCurrencyCode } from '../../core/utils/currency.util';
import { FoodOrderBookingsComponent } from './food-order-bookings.component';
import { FoodOrderCheckoutComponent } from './food-order-checkout.component';
import { FoodOrderFlowFacade } from './food-order-flow.facade';
import { FoodOrderStore } from './food-order.store';

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
  providers: [FoodOrderFlowFacade],
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

      <p class="copy ui-copy">Choose your items, add delivery details, and track your order.</p>

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

      <section class="status-card ui-status-card" *ngIf="vm().loading">
        <h3>Loading menu</h3>
        <p>Please wait while the menu loads.</p>
      </section>

      <section class="status-card ui-status-card error" *ngIf="vm().error as error">
        <h3>Menu unavailable</h3>
        <p>{{ error }}</p>
      </section>

      <section class="status-card ui-status-card" *ngIf="!vm().loading && !vm().error && !vm().services.length">
        <h3>No items available</h3>
        <p>No items are available right now.</p>
      </section>

      <ng-container *ngIf="activeView() === 'menu'">
        <section class="success-card" *ngIf="submittedBooking() as booking">
          <p class="eyebrow">Order sent</p>
          <h3>Order #{{ booking.id }}</h3>
          <p class="copy ui-copy">
            {{ booking.customerName }}, your order for {{ booking.deliveryDate | date: 'mediumDate' }} is now
            in status <strong>{{ booking.status }}</strong>.
          </p>

          <div class="success-meta">
            <span>{{ booking.totalPrice | currency: currencyCode() : 'symbol-narrow' : '1.0-0' }}</span>
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
              <p class="price">{{ service.price | currency: currencyCode() : 'symbol-narrow' : '1.0-0' }}</p>
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
          <p class="summary-total">{{ store.selectedTotal() | currency: currencyCode() : 'symbol-narrow' : '1.0-0' }}</p>
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
        [isFirstOrder]="isFirstOrder()"
        [customerNameHint]="config().checkoutNameHint || null"
        [customerPhoneHint]="config().checkoutPhoneHint || null"
        [customerNoteHint]="config().checkoutNoteHint || null"
        [currencyCode]="currencyCode()"
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
        [currencyCode]="currencyCode()"
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
      background: var(--yoobu-surface-card);
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
      background: var(--yoobu-primary-soft);
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

    .view-switch {
      display: inline-grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0.3rem;
      padding: 0.25rem;
      border-radius: 16px;
      background: var(--yoobu-surface-muted);
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
      background: var(--yoobu-surface-card-strong);
      color: var(--yoobu-ink);
      box-shadow: var(--yoobu-shadow-xs);
    }

    .success-card,
    .bookings-card,
    .booking-detail {
      padding: 0.95rem 1rem;
      border-radius: 18px;
      background: var(--yoobu-surface-card-soft);
      border: 1px solid var(--yoobu-border);
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
      background: var(--yoobu-surface-muted);
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
      background: var(--yoobu-surface-tint);
      border: 1px solid var(--yoobu-border-accent-soft);
    }

    .catalog-dot {
      width: 0.6rem;
      height: 0.6rem;
      border-radius: 999px;
      background: var(--yoobu-primary);
      flex-shrink: 0;
      box-shadow: var(--yoobu-ring-accent);
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
      background: var(--yoobu-surface-tint);
      border: 1px solid var(--yoobu-border-soft);
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
      border-color: var(--yoobu-border-accent);
      background: linear-gradient(135deg, rgba(255, 246, 240, 0.98), rgba(255, 252, 249, 0.92));
      box-shadow: var(--yoobu-shadow-accent);
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
      background: var(--yoobu-surface-muted);
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
      background: var(--yoobu-surface-muted);
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
      border: 1px solid var(--yoobu-border-accent-soft);
      box-shadow:
        inset 0 1px 0 rgba(255, 255, 255, 0.8),
        var(--yoobu-shadow-sm);
    }

    .quantity button,
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
      background: var(--yoobu-surface-card);
      border-color: var(--yoobu-border-soft);
      color: var(--yoobu-ink);
      box-shadow: var(--yoobu-shadow-sm);
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
      outline: 2px solid var(--yoobu-border-accent);
      outline-offset: 2px;
    }

    .quantity-button:disabled {
      opacity: 0.45;
      cursor: not-allowed;
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
      border: 1px solid var(--yoobu-border-accent);
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
      background: var(--yoobu-overlay-light);
      color: white;
      font-size: 0.82rem;
      font-weight: 700;
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
  readonly config = input.required<TenantConfig>();
  private readonly facade = inject(FoodOrderFlowFacade);
  readonly store: FoodOrderStore = this.facade.store;
  protected readonly defaultUnit = 'item';
  protected readonly showLocalCheckoutButtons = this.facade.showLocalCheckoutButtons;
  protected readonly checkoutForm = this.facade.checkoutForm;
  protected readonly selectedBookingId = this.facade.selectedBookingId;
  protected readonly selectedBooking = this.facade.selectedBooking;
  protected readonly activeView = this.facade.activeView;
  protected readonly checkoutOpen = this.facade.checkoutOpen;
  protected readonly submitting = this.facade.submitting;
  protected readonly submitError = this.facade.submitError;
  protected readonly submittedBooking = this.facade.submittedBooking;
  protected readonly cancellingBookingId = this.facade.cancellingBookingId;
  protected readonly cancelError = this.facade.cancelError;
  protected readonly vm = this.facade.vm;
  protected readonly bookingsVm = this.facade.bookingsVm;
  protected readonly isFirstOrder = this.facade.isFirstOrder;
  protected readonly currencyCode = computed(() => normalizeCurrencyCode(this.config().currency));

  constructor() {
    effect(() => {
      this.facade.setConfig(this.config());
    });
  }

  protected trackByServiceId(_index: number, service: ServiceItem): number {
    return service.id;
  }

  protected increase(serviceId: number): void {
    this.facade.increase(serviceId);
  }

  protected decrease(serviceId: number): void {
    this.facade.decrease(serviceId);
  }

  protected openCheckout(): void {
    this.facade.openCheckout();
  }

  protected closeCheckout(): void {
    this.facade.closeCheckout();
  }

  protected startNewOrder(): void {
    this.facade.startNewOrder();
  }

  protected refreshBookings(): void {
    this.facade.refreshBookings();
  }

  protected async selectBooking(bookingId: number): Promise<void> {
    await this.facade.selectBooking(bookingId);
  }

  protected async cancelBooking(bookingId: number): Promise<void> {
    await this.facade.cancelBooking(bookingId);
  }

  protected async submitOrder(): Promise<void> {
    await this.facade.submitOrder();
  }

  protected setActiveView(view: 'menu' | 'orders'): void {
    this.facade.setActiveView(view);
  }
}
