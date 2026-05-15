import { ChangeDetectionStrategy, Component, computed, effect, inject, input } from '@angular/core';
import { TenantConfig } from '../../core/models/tenant-config.model';
import { normalizeCurrencyCode } from '../../core/utils/currency.util';
import { FoodOrderBookingsComponent } from './food-order-bookings.component';
import { FoodOrderCartBarComponent } from './food-order-cart-bar.component';
import { FoodOrderCartComponent } from './food-order-cart.component';
import { FoodOrderCheckoutComponent } from './food-order-checkout.component';
import { FoodOrderFlowFacade } from './food-order-flow.facade';
import { FoodOrderMenuComponent } from './food-order-menu.component';
import { FoodOrderStore } from './food-order.store';

@Component({
  selector: 'app-food-order-home',
  imports: [
    FoodOrderBookingsComponent,
    FoodOrderCartBarComponent,
    FoodOrderCartComponent,
    FoodOrderCheckoutComponent,
    FoodOrderMenuComponent
  ],
  providers: [FoodOrderFlowFacade],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">

      <!-- MiniHero: banner + tab bar (hidden when in cart view) -->
      @if (activeView() !== 'cart') {
        <div class="mini-hero">
          <div class="banner">
            <div class="banner-grad"></div>
            <div class="banner-content">
              <div class="venue-row">
                <div class="venue-logo">
                  @if (config().logoUrl) {
                    <img class="venue-logo-img" [src]="config().logoUrl" [alt]="config().name" />
                  } @else {
                    <span>{{ nameInitial() }}</span>
                  }
                </div>
                <div class="venue-text">
                  <span class="venue-name">{{ config().name }}</span>
                  @if (config().welcomeMessage) {
                    <span class="venue-tagline">{{ config().welcomeMessage }}</span>
                  }
                </div>
              </div>
              <span class="ordering-badge">Ordering</span>
            </div>
          </div>

          <nav class="tab-bar" aria-label="Order sections">
            <button
              type="button"
              class="tab-btn view-switch-button"
              [class.active]="activeView() === 'menu'"
              (click)="setActiveView('menu')"
            >Menu</button>
            <button
              type="button"
              class="tab-btn view-switch-button"
              [class.active]="activeView() === 'orders'"
              (click)="setActiveView('orders')"
            >My orders</button>
          </nav>
        </div>
      }

      <!-- Cart view -->
      @if (activeView() === 'cart') {
        <app-food-order-cart
          [selectedItems]="store.selectedItems()"
          [selectedCount]="store.selectedCount()"
          [selectedTotal]="store.selectedTotal()"
          [currencyCode]="currencyCode()"
          [localMode]="showLocalCheckoutButtons"
          (backRequested)="closeCart()"
          (checkoutRequested)="openCheckout()"
          (increaseRequested)="increase($event)"
          (decreaseRequested)="decrease($event)"
        />
      }

      <!-- Menu / orders content -->
      @if (activeView() !== 'cart') {
        <div class="content" [class.has-cart]="store.selectedCount() > 0 && activeView() === 'menu'">

          @if (vm().loading) {
            <section class="status-section ui-status-card">
              <h3>Loading menu</h3>
              <p>Please wait while the menu loads.</p>
            </section>
          }

          @if (vm().error; as error) {
            <section class="status-section ui-status-card error">
              <h3>Menu unavailable</h3>
              <p>{{ error }}</p>
            </section>
          }

          @if (!vm().loading && !vm().error && !vm().services.length) {
            <section class="status-section ui-status-card">
              <h3>No items available</h3>
              <p>No items are available right now.</p>
            </section>
          }

          @if (activeView() === 'menu' && vm().services.length) {
            <app-food-order-menu
              [services]="vm().services"
              [selectedCount]="store.selectedCount()"
              [currencyCode]="currencyCode()"
              [defaultUnit]="'item'"
              [quantities]="selectedQuantities()"
              (increaseRequested)="increase($event)"
              (decreaseRequested)="decrease($event)"
            />
          }

          @if (activeView() === 'orders') {
            <app-food-order-bookings
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
              (newOrderRequested)="startNewOrder()"
              (bookingDeselected)="deselectBooking()"
            />
          }

        </div>
      }

      <!-- Checkout sheet (opens from cart view) -->
      @if (activeView() === 'cart' && checkoutOpen()) {
        <app-food-order-checkout
          [open]="checkoutOpen()"
          [localMode]="showLocalCheckoutButtons"
          [submitting]="submitting()"
          [submitError]="submitError()"
          [repeatOrderBanner]="repeatOrderBanner()"
          [form]="checkoutForm"
          [customerNameHint]="config().checkoutNameHint || null"
          [customerPhoneHint]="config().checkoutPhoneHint || null"
          [deliveryAddressHint]="config().checkoutDeliveryHint || null"
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
      }

      <!-- Cart bar (menu view only, local mode) -->
      @if (showLocalCheckoutButtons && activeView() === 'menu' && store.selectedCount() > 0) {
        <app-food-order-cart-bar
          [selectedCount]="store.selectedCount()"
          [selectedTotal]="store.selectedTotal()"
          [currencyCode]="currencyCode()"
          (openRequested)="openCart()"
        />
      }

    </div>
  `,
  styles: `
    .page {
      min-height: 100vh;
      background: oklch(92.5% 0.022 28);
      display: flex;
      flex-direction: column;
    }

    /* ── MiniHero ── */
    .mini-hero {
      flex-shrink: 0;
    }

    .banner {
      position: relative;
      height: 96px;
      background: repeating-linear-gradient(
        -45deg,
        oklch(72% 0.040 50) 0,
        oklch(72% 0.040 50) 14px,
        oklch(67% 0.048 46) 14px,
        oklch(67% 0.048 46) 28px
      );
    }

    .banner-grad {
      position: absolute;
      inset: 0;
      background: linear-gradient(to bottom, rgba(0, 0, 0, 0.08) 0%, rgba(0, 0, 0, 0.56) 100%);
    }

    .banner-content {
      position: absolute;
      bottom: 10px;
      left: 14px;
      right: 14px;
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
    }

    .venue-row {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .venue-logo {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: linear-gradient(135deg, #c9aa82 0%, #9b7e58 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      font-weight: 800;
      color: #fff;
      flex-shrink: 0;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
      overflow: hidden;
    }

    .venue-logo-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .venue-text {
      display: flex;
      flex-direction: column;
      gap: 1px;
    }

    .venue-name {
      font-size: 16px;
      font-weight: 800;
      color: #fff;
      letter-spacing: -0.2px;
      line-height: 1.1;
    }

    .venue-tagline {
      font-size: 10.5px;
      color: rgba(255, 255, 255, 0.75);
      line-height: 1.3;
    }

    .ordering-badge {
      background: oklch(90% 0.04 28);
      color: oklch(48% 0.07 28);
      padding: 4px 11px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 700;
      white-space: nowrap;
    }

    /* ── Tab bar ── */
    .tab-bar {
      background: #fff;
      padding: 8px 14px 0;
      border-bottom: 1px solid oklch(90% 0.010 28);
      display: flex;
    }

    .tab-btn {
      padding: 9px 16px;
      border: none;
      background: transparent;
      cursor: pointer;
      font-weight: 800;
      font-size: 14px;
      color: oklch(50% 0.01 30);
      border-bottom: 2.5px solid transparent;
      margin-bottom: -1px;
      transition: color 0.15s, border-color 0.15s;
    }

    .tab-btn.active {
      color: #1a1a1a;
      border-bottom-color: oklch(37% 0.07 82);
    }

    .tab-btn:active {
      transform: none;
    }

    /* ── Scrollable content ── */
    .content {
      flex: 1;
    }

    .content.has-cart {
      padding-bottom: 90px;
    }

    /* ── Status states ── */
    .status-section {
      margin: 16px 12px;
    }

    h3,
    p {
      margin: 0;
    }

    h3 {
      font-size: 1rem;
      font-weight: 700;
    }

    .status-section p {
      margin-top: 0.35rem;
      color: var(--yoobu-muted);
      line-height: 1.5;
      font-size: 0.9rem;
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
  protected readonly confirmingPaymentBookingId = this.facade.confirmingPaymentBookingId;
  protected readonly paymentError = this.facade.paymentError;
  protected readonly cancellingBookingId = this.facade.cancellingBookingId;
  protected readonly cancelError = this.facade.cancelError;
  protected readonly vm = this.facade.vm;
  protected readonly bookingsVm = this.facade.bookingsVm;
  protected readonly isFirstOrder = this.facade.isFirstOrder;
  protected readonly earliestDeliveryDate = this.facade.earliestDeliveryDate;
  protected readonly currencyCode = computed(() => normalizeCurrencyCode(this.config().currency));
  protected readonly nameInitial = computed(() => {
    const name = this.config().name.trim();
    return name ? name.charAt(0).toUpperCase() : '?';
  });
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

  protected openCart(): void {
    this.facade.openCart();
  }

  protected closeCart(): void {
    this.facade.closeCart();
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

  protected deselectBooking(): void {
    this.facade.deselectBooking();
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
