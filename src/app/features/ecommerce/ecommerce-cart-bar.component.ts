import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'app-ecommerce-cart-bar',
  imports: [CurrencyPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="cart-bar">
      <button type="button" class="cart-bar-btn" (click)="openRequested.emit()">
        <span class="cart-bar-count">{{ selectedCount() }}</span>
        View cart ·
        {{ selectedTotal() | currency: currencyCode() : 'symbol-narrow' : '1.0-0' }}
      </button>
    </div>
  `,
  styles: `
    .cart-bar {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      padding: 10px 16px max(20px, env(safe-area-inset-bottom));
      background: linear-gradient(to top, oklch(92.5% 0.022 28) 70%, transparent);
      pointer-events: none;
    }

    .cart-bar-btn {
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
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      font-family: inherit;
    }

    .cart-bar-btn:active { transform: scale(0.98); }

    .cart-bar-count {
      background: rgba(255, 255, 255, 0.25);
      border-radius: 999px;
      padding: 2px 8px;
      font-weight: 800;
      font-size: 14px;
    }
  `
})
export class EcommerceCartBarComponent {
  readonly selectedCount = input.required<number>();
  readonly selectedTotal = input.required<number>();
  readonly currencyCode = input.required<string>();
  readonly openRequested = output<void>();
}
