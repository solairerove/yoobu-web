import { NgIf } from '@angular/common';
import { Component, computed, effect, inject, input } from '@angular/core';
import { TenantConfig } from '../../core/models/tenant-config.model';
import { normalizeCurrencyCode } from '../../core/utils/currency.util';
import { FoodOrderBookingsComponent } from './food-order-bookings.component';
import { FoodOrderCartBarComponent } from './food-order-cart-bar.component';
import { FoodOrderCheckoutComponent } from './food-order-checkout.component';
import { FoodOrderFlowFacade } from './food-order-flow.facade';
import { FoodOrderMenuComponent } from './food-order-menu.component';
import { FoodOrderSuccessCardComponent } from './food-order-success-card.component';
import { FoodOrderStore } from './food-order.store';

@Component({
  selector: 'app-food-order-home',
  imports: [
    NgIf,
    FoodOrderBookingsComponent,
    FoodOrderCartBarComponent,
    FoodOrderCheckoutComponent,
    FoodOrderMenuComponent,
    FoodOrderSuccessCardComponent
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

      <app-food-order-success-card
        *ngIf="activeView() === 'menu' && submittedBooking() as booking"
        [booking]="booking"
        [fallbackCurrency]="currencyCode()"
        [paymentQrUrl]="config().paymentQrUrl || null"
        [confirmingPaymentBookingId]="confirmingPaymentBookingId()"
        [paymentError]="paymentError()"
        (paymentConfirmRequested)="confirmPayment($event)"
        (newOrderRequested)="startNewOrder()"
        (ordersRequested)="setActiveView('orders')"
      />

      <app-food-order-menu
        *ngIf="activeView() === 'menu' && vm().services.length && !submittedBooking()"
        [services]="vm().services"
        [selectedCount]="store.selectedCount()"
        [currencyCode]="currencyCode()"
        [defaultUnit]="'item'"
        [quantities]="selectedQuantities()"
        (increaseRequested)="increase($event)"
        (decreaseRequested)="decrease($event)"
      />

      <app-food-order-cart-bar
        *ngIf="showLocalCheckoutButtons && activeView() === 'menu' && store.selectedCount() > 0 && !submittedBooking()"
        [checkoutOpen]="checkoutOpen()"
        [selectedCount]="store.selectedCount()"
        [selectedTotal]="store.selectedTotal()"
        [currencyCode]="currencyCode()"
        (openRequested)="openCheckout()"
      />

      <app-food-order-checkout
        *ngIf="activeView() === 'menu' && checkoutOpen() && !submittedBooking()"
        [open]="checkoutOpen()"
        [localMode]="showLocalCheckoutButtons"
        [submitting]="submitting()"
        [submitError]="submitError()"
        [repeatOrderBanner]="repeatOrderBanner()"
        [form]="checkoutForm"
        [isFirstOrder]="isFirstOrder()"
        [customerNameHint]="config().checkoutNameHint || null"
        [customerPhoneHint]="config().checkoutPhoneHint || null"
        [customerNoteHint]="config().checkoutNoteHint || null"
        [currencyCode]="currencyCode()"
        [earliestDeliveryDate]="earliestDeliveryDate()"
        [selectedItems]="store.selectedItems()"
        [selectedCount]="store.selectedCount()"
        [selectedTotal]="store.selectedTotal()"
        (closeRequested)="closeCheckout()"
        (repeatOrderBannerDismissed)="dismissRepeatOrderBanner()"
        (submitRequested)="submitOrder()"
      />

      <app-food-order-bookings
        *ngIf="activeView() === 'orders'"
        [bookings]="bookingsVm().bookings"
        [loading]="bookingsVm().loading"
        [error]="bookingsVm().error"
        [paymentQrUrl]="config().paymentQrUrl || null"
        [selectedBookingId]="selectedBookingId()"
        [selectedBooking]="selectedBooking()"
        [confirmingPaymentBookingId]="confirmingPaymentBookingId()"
        [paymentError]="paymentError()"
        [cancellingBookingId]="cancellingBookingId()"
        [cancelError]="cancelError()"
        [currencyCode]="currencyCode()"
        (refreshRequested)="refreshBookings()"
        (bookingSelected)="selectBooking($event)"
        (repeatRequested)="repeatBooking($event)"
        (paymentConfirmRequested)="confirmPayment($event)"
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
      padding-bottom: 5.5rem;
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

    .status-card p {
      margin-top: 0.45rem;
      color: var(--yoobu-muted);
      line-height: 1.5;
    }

    @media (max-width: 640px) {
      .view-switch {
        width: 100%;
      }

      .panel.has-cart {
        padding-bottom: 5.5rem;
      }
    }
  `
})
export class FoodOrderHomeComponent {
  readonly config = input.required<TenantConfig>();
  private readonly facade = inject(FoodOrderFlowFacade);
  readonly store: FoodOrderStore = this.facade.store;
  protected readonly showLocalCheckoutButtons = this.facade.showLocalCheckoutButtons;
  protected readonly checkoutForm = this.facade.checkoutForm;
  protected readonly selectedBookingId = this.facade.selectedBookingId;
  protected readonly selectedBooking = this.facade.selectedBooking;
  protected readonly activeView = this.facade.activeView;
  protected readonly checkoutOpen = this.facade.checkoutOpen;
  protected readonly submitting = this.facade.submitting;
  protected readonly submitError = this.facade.submitError;
  protected readonly repeatOrderBanner = this.facade.repeatOrderBanner;
  protected readonly submittedBooking = this.facade.submittedBooking;
  protected readonly confirmingPaymentBookingId = this.facade.confirmingPaymentBookingId;
  protected readonly paymentError = this.facade.paymentError;
  protected readonly cancellingBookingId = this.facade.cancellingBookingId;
  protected readonly cancelError = this.facade.cancelError;
  protected readonly vm = this.facade.vm;
  protected readonly bookingsVm = this.facade.bookingsVm;
  protected readonly isFirstOrder = this.facade.isFirstOrder;
  protected readonly earliestDeliveryDate = this.facade.earliestDeliveryDate;
  protected readonly currencyCode = computed(() => normalizeCurrencyCode(this.config().currency));
  protected readonly selectedQuantities = computed<Record<number, number>>(() => {
    const quantities: Record<number, number> = {};
    for (const service of this.vm().services) {
      quantities[service.id] = this.store.quantityFor(service.id);
    }
    return quantities;
  });

  constructor() {
    effect(() => {
      this.facade.setConfig(this.config());
    });
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

  protected dismissRepeatOrderBanner(): void {
    this.facade.dismissRepeatOrderBanner();
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

  protected async repeatBooking(bookingId: number): Promise<void> {
    await this.facade.repeatBooking(bookingId);
  }

  protected async cancelBooking(bookingId: number): Promise<void> {
    await this.facade.cancelBooking(bookingId);
  }

  protected async confirmPayment(bookingId: number): Promise<void> {
    await this.facade.confirmPayment(bookingId);
  }

  protected async submitOrder(): Promise<void> {
    await this.facade.submitOrder();
  }

  protected setActiveView(view: 'menu' | 'orders'): void {
    this.facade.setActiveView(view);
  }
}
