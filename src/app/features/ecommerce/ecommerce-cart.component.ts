import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { EcommerceCartEntry, EcommerceStore } from './ecommerce.store';

@Component({
  selector: 'app-ecommerce-cart',
  imports: [CurrencyPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="cart-page">

      <header class="cart-header">
        <button type="button" class="head-action cart-back" (click)="backRequested.emit()">← Shop</button>
        <p class="eyebrow">Cart</p>
      </header>

      <div class="cart-items">
        @for (entry of selectedItems(); track entry.variant.id) {
          <div class="cart-row">
            <div class="cart-thumb">
              @if ((entry.variant.imageUrl ?? entry.service.imageUrl); as imgUrl) {
                <img class="cart-img" [src]="imgUrl" [alt]="entry.service.name" loading="lazy" />
              } @else {
                <div class="cart-img-placeholder" aria-hidden="true"></div>
              }
            </div>

            <div class="cart-info">
              <span class="cart-name">{{ entry.service.name }}</span>
              <span class="cart-variant">{{ variantLabel(entry) }}</span>
              <span class="cart-price">
                {{ entry.variant.price | currency: currencyCode() : 'symbol-narrow' : '1.0-0' }}
              </span>
            </div>

            <div class="qty-pill">
              <button
                type="button"
                class="qty-pill-btn"
                (click)="decreaseRequested.emit(entry.variant.id)"
                [attr.aria-label]="'Decrease ' + entry.service.name"
              >−</button>
              <span class="qty-pill-val">{{ entry.quantity }}</span>
              <button
                type="button"
                class="qty-pill-btn"
                (click)="increaseRequested.emit({ variantId: entry.variant.id, stock: entry.variant.stock })"
                [disabled]="entry.quantity >= maxFor(entry)"
                [attr.aria-label]="'Increase ' + entry.service.name"
              >+</button>
            </div>
          </div>
        }
      </div>

      <div class="summary-card">
        <div class="summary-row">
          <span class="summary-label">Subtotal</span>
          <span class="summary-value">
            {{ selectedTotal() | currency: currencyCode() : 'symbol-narrow' : '1.0-0' }}
          </span>
        </div>
        <div class="summary-divider"></div>
        <div class="summary-row total-row">
          <span class="total-label">Total</span>
          <strong class="total-value">
            {{ selectedTotal() | currency: currencyCode() : 'symbol-narrow' : '1.0-0' }}
          </strong>
        </div>
      </div>

      @if (showNativeButtons()) {
        <div class="checkout-bar">
          <button type="button" class="checkout-btn" (click)="checkoutRequested.emit()">
            Checkout →
            {{ selectedTotal() | currency: currencyCode() : 'symbol-narrow' : '1.0-0' }}
          </button>
        </div>
      }

    </div>
  `,
  styles: `
    .cart-page {
      min-height: 100vh;
      background: oklch(92.5% 0.022 28);
      display: flex;
      flex-direction: column;
      padding-bottom: 100px;
    }

    .cart-header {
      background: #fff;
      padding: 10px 14px;
      border-bottom: 1px solid oklch(90% 0.010 28);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }

    .cart-items {
      background: #fff;
      margin: 10px 12px 0;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 1px 6px rgba(0, 0, 0, 0.06);
    }

    .cart-row {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      border-bottom: 1px solid oklch(90% 0.010 28);
    }

    .cart-row:last-child { border-bottom: none; }

    .cart-thumb {
      width: 64px;
      height: 64px;
      border-radius: 12px;
      overflow: hidden;
      flex-shrink: 0;
      position: relative;
    }

    .cart-img,
    .cart-img-placeholder {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      display: block;
      object-fit: cover;
    }

    .cart-img-placeholder {
      background: repeating-linear-gradient(
        -45deg,
        oklch(86% 0.018 30) 0,
        oklch(86% 0.018 30) 9px,
        oklch(91% 0.010 30) 9px,
        oklch(91% 0.010 30) 18px
      );
    }

    .cart-info {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .cart-name {
      font-weight: 700;
      font-size: 14px;
      color: #1a1a1a;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .cart-variant {
      font-size: 11.5px;
      color: oklch(50% 0.01 30);
    }

    .cart-price {
      font-weight: 800;
      font-size: 15px;
      color: oklch(38% 0.11 145);
    }

    .qty-pill {
      display: flex;
      align-items: center;
      background: oklch(37% 0.07 82);
      border-radius: 999px;
      overflow: hidden;
      flex-shrink: 0;
    }

    .qty-pill-btn {
      width: 32px;
      height: 36px;
      border: none;
      background: transparent;
      color: #fff;
      font-size: 20px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0;
    }

    .qty-pill-btn:disabled { opacity: 0.5; cursor: not-allowed; }

    .qty-pill-val {
      font-weight: 800;
      font-size: 14px;
      color: #fff;
      min-width: 18px;
      text-align: center;
      font-variant-numeric: tabular-nums;
    }

    .summary-card {
      margin: 10px 12px 0;
      background: #fff;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 1px 6px rgba(0, 0, 0, 0.06);
      padding: 14px 16px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .summary-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .summary-label { font-size: 14px; color: oklch(50% 0.01 30); }
    .summary-value { font-size: 14px; font-weight: 700; color: #1a1a1a; }

    .summary-divider { height: 1px; background: oklch(90% 0.010 28); }

    .total-label { font-size: 16px; font-weight: 800; color: #1a1a1a; }
    .total-value { font-size: 16px; color: oklch(38% 0.11 145); }

    .checkout-bar {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      padding: 10px 16px max(20px, env(safe-area-inset-bottom));
      background: linear-gradient(to top, oklch(92.5% 0.022 28) 70%, transparent);
      pointer-events: none;
    }

    .checkout-btn {
      width: 100%;
      padding: 14px 24px;
      background: linear-gradient(135deg, var(--yoobu-primary), #ff8c5a);
      color: #fff;
      border: none;
      border-radius: 999px;
      font-weight: 700;
      font-size: 16px;
      cursor: pointer;
      box-shadow: 0 8px 28px rgba(255, 107, 53, 0.38);
      pointer-events: all;
    }

    .checkout-btn:active { transform: scale(0.98); }
  `
})
export class EcommerceCartComponent {
  protected readonly maxQty = EcommerceStore.MAX_ITEM_QUANTITY;

  readonly selectedItems = input.required<EcommerceCartEntry[]>();
  readonly selectedTotal = input.required<number>();
  readonly currencyCode = input.required<string>();
  readonly showNativeButtons = input.required<boolean>();

  readonly backRequested = output<void>();
  readonly checkoutRequested = output<void>();
  readonly increaseRequested = output<{ variantId: number; stock: number }>();
  readonly decreaseRequested = output<number>();

  protected variantLabel(entry: EcommerceCartEntry): string {
    const parts = [entry.variant.color, entry.variant.size].filter(Boolean);
    return parts.join(' · ') || 'Default';
  }

  protected maxFor(entry: EcommerceCartEntry): number {
    return Math.min(EcommerceStore.MAX_ITEM_QUANTITY, entry.variant.stock);
  }
}
