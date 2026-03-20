import { CurrencyPipe, DatePipe, NgIf } from '@angular/common';
import { Component, input, output } from '@angular/core';
import { BookingResponse } from '../../core/models/booking.model';
import { normalizeCurrencyCode } from '../../core/utils/currency.util';

@Component({
  selector: 'app-food-order-success-card',
  imports: [CurrencyPipe, DatePipe, NgIf],
  template: `
    <section class="success-card">
      <p class="eyebrow">Order sent</p>
      <h3>Order #{{ booking().id }}</h3>
      <p class="copy ui-copy">
        {{ booking().customerName }}, your order for {{ booking().deliveryDate | date: 'mediumDate' }} is now in status
        <strong>{{ statusLabel(booking().status) }}</strong>.
      </p>

      <div class="success-meta">
        <span>{{ booking().totalPrice | currency: bookingCurrency() : 'symbol-narrow' : '1.0-0' }}</span>
        <span>{{ booking().items.length }} products</span>
        <span>{{ booking().createdAt | date: 'short' }}</span>
      </div>

      <section class="payment-qr-card" *ngIf="shouldShowPaymentQr() && paymentQrUrl() as paymentQrUrl">
        <h4>Payment QR</h4>
        <p class="copy ui-copy">Scan this QR to pay, then tap "I paid" so the admin can verify your payment.</p>
        <a
          class="payment-qr-link"
          [href]="paymentQrUrl"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Open payment QR code in a new tab"
        >
          <img [src]="paymentQrUrl" alt="Payment QR code" loading="lazy" />
        </a>
        <a class="qr-open-link" [href]="paymentQrUrl" target="_blank" rel="noopener noreferrer">Open full size</a>
      </section>

      <button
        type="button"
        class="ghost-button"
        *ngIf="canConfirmPayment()"
        (click)="paymentConfirmRequested.emit(booking().id)"
        [disabled]="confirmingPaymentBookingId() === booking().id"
      >
        {{ confirmingPaymentBookingId() === booking().id ? 'Confirming...' : 'I paid' }}
      </button>

      <div class="success-actions">
        <button type="button" class="ghost-button" (click)="newOrderRequested.emit()">New order</button>
        <button type="button" class="ghost-button" (click)="ordersRequested.emit()">My orders</button>
      </div>

      <p class="form-error" *ngIf="paymentError() as error">{{ error }}</p>
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

    .payment-qr-card {
      display: grid;
      gap: 0.75rem;
      margin-top: 1rem;
      padding: 1rem;
      border-radius: 18px;
      background: var(--yoobu-surface-card);
      border: 1px solid var(--yoobu-border-soft);
    }

    .payment-qr-card img {
      width: min(260px, 100%);
      border-radius: 14px;
      border: 1px solid var(--yoobu-border);
      background: white;
    }

    .payment-qr-link {
      width: fit-content;
      max-width: 100%;
      display: block;
    }

    .qr-open-link {
      width: fit-content;
      color: var(--yoobu-primary);
      font-size: 0.9rem;
      font-weight: 600;
      text-decoration: none;
    }

    .qr-open-link:hover {
      text-decoration: underline;
    }

    .success-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.65rem;
      margin-top: 1rem;
    }

    .success-actions .ghost-button {
      max-width: 100%;
      white-space: normal;
    }

    .success-card > .ghost-button {
      margin-top: 1rem;
      max-width: 100%;
      white-space: normal;
    }

    .form-error {
      margin-top: 0.8rem;
      color: brown;
      font-size: 0.92rem;
    }

    @media (max-width: 640px) {
      .success-actions {
        flex-direction: column;
        align-items: flex-start;
      }

      .success-actions .ghost-button,
      .success-card > .ghost-button {
        width: 100%;
      }
    }
  `
})
export class FoodOrderSuccessCardComponent {
  readonly booking = input.required<BookingResponse>();
  readonly fallbackCurrency = input.required<string>();
  readonly paymentQrUrl = input<string | null>(null);
  readonly confirmingPaymentBookingId = input<number | null>(null);
  readonly paymentError = input<string | null>(null);
  readonly paymentConfirmRequested = output<number>();
  readonly newOrderRequested = output<void>();
  readonly ordersRequested = output<void>();

  protected bookingCurrency(): string {
    return normalizeCurrencyCode(this.booking().currency || this.fallbackCurrency());
  }

  protected statusLabel(status: BookingResponse['status']): string {
    if (status === 'PAYMENT_PENDING') {
      return 'Awaiting admin verification';
    }

    return status;
  }

  protected canConfirmPayment(): boolean {
    return this.booking().status === 'NEW';
  }

  protected shouldShowPaymentQr(): boolean {
    const status = this.booking().status;
    return !!this.paymentQrUrl() && (status === 'NEW' || status === 'PAYMENT_PENDING');
  }
}
