import { CurrencyPipe } from '@angular/common';
import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-food-order-cart-bar',
  imports: [CurrencyPipe],
  template: `
    <button type="button" class="cart-bar" (click)="openRequested.emit()">
      <div class="cart-copy">
        <p class="summary-label">Cart</p>
        <strong>
          {{ checkoutOpen() ? 'Checkout is open' : selectedCount() + ' item' + (selectedCount() > 1 ? 's' : '') }}
        </strong>
        <p class="summary-total">{{ selectedTotal() | currency: currencyCode() : 'symbol-narrow' : '1.0-0' }}</p>
      </div>

      <span class="cart-action">
        {{ checkoutOpen() ? 'Review order' : 'Open checkout' }}
      </span>
    </button>
  `,
  styles: `
    p {
      margin: 0;
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
      cursor: pointer;
      font: inherit;
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
      .cart-bar {
        width: calc(100% - 1.5rem);
        bottom: max(0.75rem, env(safe-area-inset-bottom));
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
export class FoodOrderCartBarComponent {
  readonly checkoutOpen = input.required<boolean>();
  readonly selectedCount = input.required<number>();
  readonly selectedTotal = input.required<number>();
  readonly currencyCode = input.required<string>();
  readonly openRequested = output<void>();
}
