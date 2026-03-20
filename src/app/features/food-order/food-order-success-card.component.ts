import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, input, output } from '@angular/core';
import { BookingResponse } from '../../core/models/booking.model';
import { normalizeCurrencyCode } from '../../core/utils/currency.util';

@Component({
  selector: 'app-food-order-success-card',
  imports: [CurrencyPipe, DatePipe],
  template: `
    <section class="success-card">
      <p class="eyebrow">Order sent</p>
      <h3>Order #{{ booking().id }}</h3>
      <p class="copy ui-copy">
        {{ booking().customerName }}, your order for {{ booking().deliveryDate | date: 'mediumDate' }} is now in status
        <strong>{{ booking().status }}</strong>.
      </p>

      <div class="success-meta">
        <span>{{ booking().totalPrice | currency: bookingCurrency() : 'symbol-narrow' : '1.0-0' }}</span>
        <span>{{ booking().items.length }} products</span>
        <span>{{ booking().createdAt | date: 'short' }}</span>
      </div>

      <div class="success-actions">
        <button type="button" class="ghost-button" (click)="newOrderRequested.emit()">New order</button>
        <button type="button" class="ghost-button" (click)="ordersRequested.emit()">My orders</button>
      </div>
    </section>
  `,
  styles: `
    h3,
    p {
      margin: 0;
    }

    .success-card {
      padding: 0.95rem 1rem;
      border-radius: 18px;
      background: linear-gradient(135deg, rgba(255, 107, 53, 0.1), rgba(255, 252, 249, 0.96));
      border: 1px solid rgba(255, 107, 53, 0.22);
    }

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

    @media (max-width: 640px) {
      .success-actions {
        flex-direction: column;
        align-items: flex-start;
      }
    }
  `
})
export class FoodOrderSuccessCardComponent {
  readonly booking = input.required<BookingResponse>();
  readonly fallbackCurrency = input.required<string>();
  readonly newOrderRequested = output<void>();
  readonly ordersRequested = output<void>();

  protected bookingCurrency(): string {
    return normalizeCurrencyCode(this.booking().currency || this.fallbackCurrency());
  }
}
