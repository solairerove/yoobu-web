import { ChangeDetectionStrategy, Component, computed, effect, inject, input } from '@angular/core';
import { TenantConfig } from '../../core/models/tenant-config.model';
import { normalizeCurrencyCode } from '../../core/utils/currency.util';
import { EcommerceCatalogComponent } from './ecommerce-catalog.component';
import { EcommerceCartBarComponent } from './ecommerce-cart-bar.component';
import { EcommerceCartComponent } from './ecommerce-cart.component';
import { EcommerceCheckoutComponent } from './ecommerce-checkout.component';
import { EcommerceConfirmationComponent } from './ecommerce-confirmation.component';
import { EcommerceFlowFacade } from './ecommerce-flow.facade';
import { EcommerceOrdersComponent } from './ecommerce-orders.component';
import { EcommerceStore } from './ecommerce.store';

@Component({
  selector: 'app-ecommerce-home',
  imports: [
    EcommerceCatalogComponent,
    EcommerceCartBarComponent,
    EcommerceCartComponent,
    EcommerceCheckoutComponent,
    EcommerceConfirmationComponent,
    EcommerceOrdersComponent
  ],
  providers: [EcommerceFlowFacade],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">

      @if (activeView() !== 'cart' && activeView() !== 'checkout' && activeView() !== 'confirmation') {
        <div class="mini-hero">
          <div class="banner">
            @if (config().bannerUrl) {
              <img class="banner-img" [src]="config().bannerUrl" alt="" aria-hidden="true" />
            }
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
              <span class="shop-badge">Shop</span>
            </div>
          </div>

          <nav class="tab-bar" aria-label="Shop sections">
            <button
              type="button"
              class="tab-btn"
              [class.active]="activeView() === 'catalog'"
              (click)="setActiveView('catalog')"
            >Products</button>
            <button
              type="button"
              class="tab-btn"
              [class.active]="activeView() === 'orders'"
              (click)="setActiveView('orders')"
            >My orders</button>
          </nav>
        </div>
      }

      @if (activeView() === 'cart') {
        <app-ecommerce-cart
          [selectedItems]="store.selectedItems()"
          [selectedTotal]="store.selectedTotal()"
          [currencyCode]="currencyCode()"
          [showNativeButtons]="showNativeCheckoutButtons()"
          (backRequested)="closeCart()"
          (checkoutRequested)="openCheckout()"
          (increaseRequested)="increase($event.variantId, $event.stock)"
          (decreaseRequested)="decrease($event)"
        />
      }

      @if (activeView() !== 'cart' && activeView() !== 'checkout' && activeView() !== 'confirmation') {
        <div class="content" [class.has-cart]="store.selectedCount() > 0 && activeView() === 'catalog'">

          @if (vm().loading) {
            <section class="status-section ui-status-card">
              <h3>Loading products</h3>
              <p>Please wait while the catalog loads.</p>
            </section>
          }

          @if (vm().error; as error) {
            <section class="status-section ui-status-card error">
              <h3>Catalog unavailable</h3>
              <p>{{ error }}</p>
            </section>
          }

          @if (!vm().loading && !vm().error && !vm().services.length) {
            <section class="status-section ui-status-card">
              <h3>No products available</h3>
              <p>No products are available right now.</p>
            </section>
          }

          @if (activeView() === 'catalog' && vm().services.length) {
            <app-ecommerce-catalog
              [services]="vm().services"
              [currencyCode]="currencyCode()"
              [quantities]="selectedQuantities()"
              (increaseRequested)="increase($event.variantId, $event.stock)"
              (decreaseRequested)="decrease($event)"
            />
          }

          @if (activeView() === 'orders') {
            <app-ecommerce-orders
              [bookings]="ordersVm().bookings"
              [loading]="ordersVm().loading"
              [error]="ordersVm().error"
              [paymentQrUrl]="config().paymentQrUrl || null"
              [selectedBookingId]="selectedBookingId()"
              [selectedBooking]="selectedBooking()"
              [confirmingPaymentBookingId]="confirmingPaymentBookingId()"
              [paymentError]="paymentError()"
              [cancellingBookingId]="cancellingBookingId()"
              [cancelError]="cancelError()"
              [currencyCode]="currencyCode()"
              (refreshRequested)="refreshOrders()"
              (bookingSelected)="selectBooking($event)"
              (bookingDeselected)="deselectBooking()"
              (paymentConfirmRequested)="confirmPayment($event)"
              (cancelRequested)="cancelBooking($event)"
              (newOrderRequested)="startNewOrder()"
            />
          }

        </div>
      }

      @if (activeView() === 'checkout') {
        <app-ecommerce-checkout
          [showNativeButtons]="showNativeCheckoutButtons()"
          [submitting]="submitting()"
          [submitError]="submitError()"
          [form]="checkoutForm"
          [customerNameHint]="config().checkoutNameHint || null"
          [customerPhoneHint]="config().checkoutPhoneHint || null"
          [deliveryAddressHint]="config().checkoutDeliveryHint || null"
          [customerNoteHint]="config().checkoutNoteHint || null"
          [currencyCode]="currencyCode()"
          [selectedItems]="store.selectedItems()"
          [selectedCount]="store.selectedCount()"
          [selectedTotal]="store.selectedTotal()"
          (closeRequested)="closeCheckout()"
          (submitRequested)="submitOrder()"
        />
      }

      @if (activeView() === 'confirmation' && submittedOrder()) {
        <app-ecommerce-confirmation
          [booking]="submittedOrder()!"
          [paymentQrUrl]="config().paymentQrUrl || null"
          [currencyCodeFallback]="currencyCode()"
          [showNativeButtons]="showNativeCheckoutButtons()"
          [confirmingPaymentBookingId]="confirmingPaymentBookingId()"
          [paymentError]="paymentError()"
          (backToShopRequested)="startNewOrder()"
          (paymentConfirmRequested)="confirmPayment($event)"
        />
      }

      @if (showNativeCheckoutButtons() && activeView() === 'catalog' && store.selectedCount() > 0) {
        <app-ecommerce-cart-bar
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

    .mini-hero { flex-shrink: 0; }

    .banner {
      position: relative;
      height: 96px;
      background: repeating-linear-gradient(
        -45deg,
        oklch(72% 0.040 250) 0,
        oklch(72% 0.040 250) 14px,
        oklch(67% 0.048 250) 14px,
        oklch(67% 0.048 250) 28px
      );
    }

    .banner-img {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: center;
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

    .venue-row { display: flex; align-items: center; gap: 8px; }

    .venue-logo {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: linear-gradient(135deg, #7b9ee8 0%, #4a6fb5 100%);
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

    .venue-logo-img { width: 100%; height: 100%; object-fit: cover; }
    .venue-text { display: flex; flex-direction: column; gap: 1px; }

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

    .shop-badge {
      background: oklch(90% 0.04 250);
      color: oklch(38% 0.12 250);
      padding: 4px 11px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 700;
      white-space: nowrap;
    }

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
      font-family: inherit;
    }

    .tab-btn.active {
      color: #1a1a1a;
      border-bottom-color: oklch(37% 0.12 250);
    }

    .content { flex: 1; }
    .content.has-cart { padding-bottom: 90px; }

    .status-section { margin: 16px 12px; }

    h3, p { margin: 0; }
    h3 { font-size: 1rem; font-weight: 700; }
    .status-section p { margin-top: 0.35rem; color: var(--yoobu-muted); line-height: 1.5; font-size: 0.9rem; }
  `
})
export class EcommerceHomeComponent {
  readonly config = input.required<TenantConfig>();
  private readonly facade = inject(EcommerceFlowFacade);
  readonly store: EcommerceStore = this.facade.store;

  protected readonly showNativeCheckoutButtons = this.facade.showNativeCheckoutButtons;
  protected readonly checkoutForm = this.facade.checkoutForm;
  protected readonly selectedBookingId = this.facade.selectedBookingId;
  protected readonly selectedBooking = this.facade.selectedBooking;
  protected readonly activeView = this.facade.activeView;
  protected readonly submitting = this.facade.submitting;
  protected readonly submitError = this.facade.submitError;
  protected readonly submittedOrder = this.facade.submittedOrder;
  protected readonly confirmingPaymentBookingId = this.facade.confirmingPaymentBookingId;
  protected readonly paymentError = this.facade.paymentError;
  protected readonly cancellingBookingId = this.facade.cancellingBookingId;
  protected readonly cancelError = this.facade.cancelError;
  protected readonly vm = this.facade.vm;
  protected readonly ordersVm = this.facade.ordersVm;

  protected readonly currencyCode = computed(() => normalizeCurrencyCode(this.config().currency));
  protected readonly nameInitial = computed(() => {
    const name = this.config().name.trim();
    return name ? name.charAt(0).toUpperCase() : '?';
  });
  protected readonly selectedQuantities = computed<Record<number, number>>(() => {
    const quantities: Record<number, number> = {};
    for (const service of this.vm().services) {
      for (const variant of service.variants) {
        quantities[variant.id] = this.store.quantityFor(variant.id);
      }
    }
    return quantities;
  });

  constructor() {
    effect(() => { this.facade.setConfig(this.config()); });
  }

  protected increase(variantId: number, stock: number): void { this.facade.increase(variantId, stock); }
  protected decrease(variantId: number): void { this.facade.decrease(variantId); }
  protected openCart(): void { this.facade.openCart(); }
  protected closeCart(): void { this.facade.closeCart(); }
  protected openCheckout(): void { this.facade.openCheckout(); }
  protected closeCheckout(): void { this.facade.closeCheckout(); }
  protected startNewOrder(): void { this.facade.startNewOrder(); }
  protected refreshOrders(): void { this.facade.refreshOrders(); }

  protected async selectBooking(bookingId: number): Promise<void> {
    await this.facade.selectBooking(bookingId);
  }

  protected deselectBooking(): void { this.facade.deselectBooking(); }

  protected async cancelBooking(bookingId: number): Promise<void> {
    await this.facade.cancelBooking(bookingId);
  }

  protected async confirmPayment(bookingId: number): Promise<void> {
    await this.facade.confirmPayment(bookingId);
  }

  protected async submitOrder(): Promise<void> {
    await this.facade.submitOrder();
  }

  protected setActiveView(view: 'catalog' | 'orders'): void {
    this.facade.setActiveView(view);
  }
}
