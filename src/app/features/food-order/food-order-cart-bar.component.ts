import { CurrencyPipe } from '@angular/common';
import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-food-order-cart-bar',
  imports: [CurrencyPipe],
  template: `
    <button type="button" class="cart-bar" (click)="openRequested.emit()">
      <div class="cart-copy">
        <strong class="cart-count">
          {{ checkoutOpen() ? 'Checkout is open' : selectedCount() + ' item' + (selectedCount() > 1 ? 's' : '') }}
        </strong>
        <span class="cart-total">{{ selectedTotal() | currency: currencyCode() : 'symbol-narrow' : '1.0-0' }}</span>
      </div>

      <span class="cart-action">
        {{ checkoutOpen() ? 'Review' : 'Checkout' }} ›
      </span>
    </button>
  `,
  styles: `
    .cart-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
      width: min(688px, calc(100% - 1.5rem));
      position: fixed;
      left: 50%;
      bottom: max(0.75rem, env(safe-area-inset-bottom));
      transform: translateX(-50%);
      z-index: 5;
      padding: 0.75rem 0.75rem 0.75rem 1.1rem;
      border: none;
      border-radius: 18px;
      background: linear-gradient(135deg, var(--yoobu-primary), #ff8c5a);
      color: white;
      box-shadow: 0 8px 28px rgba(255, 107, 53, 0.38);
      text-align: left;
      cursor: pointer;
      font: inherit;
    }

    .cart-copy {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      min-width: 0;
    }

    .cart-count {
      font-size: 0.95rem;
      white-space: nowrap;
    }

    .cart-total {
      font-size: 0.88rem;
      color: rgba(255, 255, 255, 0.82);
      white-space: nowrap;
    }

    .cart-action {
      flex-shrink: 0;
      padding: 0.5rem 0.9rem;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.22);
      color: white;
      font-size: 0.88rem;
      font-weight: 700;
      letter-spacing: 0.01em;
    }
  `
})
export class FoodOrderCartBarComponent {
  readonly checkoutOpen = input.required<boolean>();
  readonly selectedCount = input.required<number>();
  readonly selectedTotal = input.required<number>();
  readonly currencyCode = input.required<string>();
  readonly openRequested = output<void>();
}
