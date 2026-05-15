import { CurrencyPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { BookingResponse } from '../../core/models/booking.model';
import { normalizeBookingStatus } from '../../core/utils/booking-status.util';
import { normalizeCurrencyCode } from '../../core/utils/currency.util';

@Component({
  selector: 'app-food-order-confirmation',
  imports: [CurrencyPipe, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="confirmation-page">
      <div class="body">

        <!-- Success icon -->
        <div class="success-ring">
          <div class="success-dot">
            <span class="check-icon">✓</span>
          </div>
        </div>

        <h1 class="title">Order placed!</h1>
        <p class="subtitle">Order <strong>#{{ booking().id }}</strong> received.</p>
        <p class="delivery-line">
          Delivery: <strong>{{ booking().deliveryDate | date: 'mediumDate' }}</strong>
        </p>

        <!-- Payment card -->
        @if (showPaymentCard()) {
          <div class="payment-card">
            <p class="payment-warning">⚠ Payment required</p>
            <p class="payment-desc">
              Please pay
              {{ booking().totalPrice | currency: currency() : 'symbol-narrow' : '1.0-0' }}
              to confirm your order. Scan the QR code or use your bank app.
            </p>
            @if (effectiveQrUrl()) {
              <button type="button" class="qr-tap" (click)="qrFullscreen.set(true)">
                <div class="qr-thumb-wrap">
                  <img [src]="effectiveQrUrl()!" alt="Payment QR" class="qr-thumb-img" />
                </div>
                <span class="qr-scan-label">Tap to enlarge</span>
              </button>
            }
            <div class="payment-apps">
              <span class="pay-dot">·</span>
              <span>ByBit</span>
              <span class="pay-dot">·</span>
              <span>Bitget</span>
              <span class="pay-dot">·</span>
            </div>
            @if (canConfirmPayment()) {
              <button
                type="button"
                class="i-paid-btn"
                (click)="paymentConfirmRequested.emit(booking().id)"
                [disabled]="confirmingPaymentBookingId() === booking().id"
              >
                {{ confirmingPaymentBookingId() === booking().id
                    ? 'Confirming…'
                    : 'I paid · ' + (booking().totalPrice | currency: currency() : 'symbol-narrow' : '1.0-0') }}
              </button>
            }
          </div>
        }

        @if (paymentError()) {
          <p class="form-error">{{ paymentError() }}</p>
        }

        <!-- Mini receipt -->
        <div class="receipt">
          @for (item of booking().items; track item.serviceName) {
            <div class="receipt-item">
              <span class="receipt-item-name">{{ item.quantity }}× {{ item.serviceName }}</span>
              <span class="receipt-item-total">
                {{ item.unitPrice * item.quantity | currency: currency() : 'symbol-narrow' : '1.0-0' }}
              </span>
            </div>
          }
          <div class="receipt-total">
            <span>Total</span>
            <strong>{{ booking().totalPrice | currency: currency() : 'symbol-narrow' : '1.0-0' }}</strong>
          </div>
        </div>

        @if (showNativeButtons()) {
          <button type="button" class="back-btn" (click)="backToShopRequested.emit()">
            Back to shop
          </button>
        }

      </div>
    </div>

    <!-- QR fullscreen -->
    @if (qrFullscreen() && effectiveQrUrl()) {
      <div class="qr-fullscreen" (click)="qrFullscreen.set(false)">
        <img [src]="effectiveQrUrl()!" alt="Payment QR" class="qr-fullscreen-img" />
        <span class="qr-fullscreen-hint">Tap to close</span>
      </div>
    }
  `,
  styles: `
    h1,
    p {
      margin: 0;
    }

    .confirmation-page {
      min-height: 100vh;
      background: oklch(92.5% 0.022 28);
      padding-bottom: 100px;
    }

    .body {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 48px 24px 32px;
      text-align: center;
    }

    /* ── Success icon ── */
    .success-ring {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      background: oklch(91% 0.055 145);
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 20px;
    }

    .success-dot {
      width: 52px;
      height: 52px;
      border-radius: 50%;
      background: oklch(48% 0.13 145);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .check-icon {
      color: #fff;
      font-size: 26px;
      line-height: 1;
    }

    /* ── Text ── */
    .title {
      font-size: 26px;
      font-weight: 800;
      color: #1a1a1a;
      letter-spacing: -0.3px;
      margin-bottom: 6px;
    }

    .subtitle {
      font-size: 15px;
      color: oklch(50% 0.01 30);
      line-height: 1.6;
      margin-bottom: 4px;
    }

    .delivery-line {
      font-size: 13px;
      color: oklch(65% 0.008 30);
      margin-bottom: 24px;
    }

    /* ── Payment card ── */
    .payment-card {
      width: 100%;
      background: oklch(94% 0.03 70);
      border: 1px solid oklch(88% 0.05 70);
      border-radius: 16px;
      padding: 16px;
      margin-bottom: 16px;
      text-align: left;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
    }

    .payment-warning {
      width: 100%;
      font-weight: 800;
      font-size: 14px;
      color: oklch(48% 0.10 72);
    }

    .payment-desc {
      width: 100%;
      font-size: 13px;
      color: oklch(50% 0.01 30);
      line-height: 1.55;
    }

    .qr-tap {
      background: transparent;
      border: none;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      padding: 0;
    }

    .qr-thumb-wrap {
      width: 96px;
      height: 96px;
      background: #fff;
      border: 1px solid oklch(90% 0.010 28);
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }

    .qr-thumb-img {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }

    .qr-scan-label {
      font-size: 12px;
      font-weight: 700;
      color: oklch(48% 0.10 72);
    }

    .payment-apps {
      display: flex;
      align-items: center;
      gap: 5px;
      font-size: 13px;
      font-weight: 600;
      color: oklch(50% 0.01 30);
    }

    .pay-dot {
      font-size: 18px;
      color: oklch(75% 0.008 30);
      line-height: 1;
    }

    .i-paid-btn {
      width: 100%;
      padding: 13px 20px;
      background: oklch(48% 0.10 72);
      color: #fff;
      border: none;
      border-radius: 999px;
      font-weight: 800;
      font-size: 15px;
      cursor: pointer;
      font-family: inherit;
      box-shadow: 0 3px 12px rgba(0, 0, 0, 0.15);
    }

    .i-paid-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    /* ── Receipt ── */
    .receipt {
      width: 100%;
      background: oklch(95.5% 0.016 38);
      border-radius: 16px;
      padding: 14px 16px;
      margin-bottom: 20px;
      text-align: left;
    }

    .receipt-item {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 6px;
    }

    .receipt-item-name {
      font-size: 13px;
      color: oklch(50% 0.01 30);
    }

    .receipt-item-total {
      font-weight: 700;
      font-size: 13px;
      white-space: nowrap;
    }

    .receipt-total {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-top: 1px solid oklch(90% 0.010 28);
      padding-top: 10px;
      margin-top: 4px;
    }

    .receipt-total span {
      font-weight: 800;
      font-size: 15px;
      color: #1a1a1a;
    }

    .receipt-total strong {
      font-weight: 800;
      font-size: 15px;
      color: oklch(38% 0.11 145);
    }

    /* ── Back to shop (local mode) ── */
    .back-btn {
      width: 100%;
      padding: 11px 20px;
      background: #fff;
      border: 1px solid oklch(90% 0.010 28);
      border-radius: 999px;
      font-weight: 700;
      font-size: 14px;
      color: #1a1a1a;
      cursor: pointer;
      font-family: inherit;
    }

    /* ── Error ── */
    .form-error {
      margin: 0 0 12px;
      font-size: 13px;
      color: oklch(38% 0.13 22);
      text-align: left;
      width: 100%;
    }

    /* ── QR fullscreen ── */
    .qr-fullscreen {
      position: fixed;
      inset: 0;
      z-index: 200;
      background: rgba(0, 0, 0, 0.93);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 20px;
      cursor: pointer;
      animation: fadeIn 0.18s ease;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .qr-fullscreen-img {
      width: min(86vw, 86vh);
      height: min(86vw, 86vh);
      object-fit: contain;
      background: #fff;
      padding: 16px;
      border-radius: 16px;
    }

    .qr-fullscreen-hint {
      font-size: 13px;
      color: rgba(255, 255, 255, 0.45);
    }
  `
})
export class FoodOrderConfirmationComponent {
  readonly booking = input.required<BookingResponse>();
  readonly paymentQrUrl = input<string | null>(null);
  readonly currencyCodeFallback = input<string>('VND');
  readonly showNativeButtons = input.required<boolean>();
  readonly confirmingPaymentBookingId = input<number | null>(null);
  readonly paymentError = input<string | null>(null);

  readonly backToShopRequested = output<void>();
  readonly paymentConfirmRequested = output<number>();

  protected readonly qrFullscreen = signal(false);

  protected readonly currency = computed(() =>
    normalizeCurrencyCode(this.booking().currency || this.currencyCodeFallback())
  );

  protected readonly effectiveQrUrl = computed<string | null>(() =>
    this.booking().paymentQrUrl ?? this.paymentQrUrl()
  );

  protected readonly canConfirmPayment = computed(() =>
    normalizeBookingStatus(this.booking().status) === 'NEW'
  );

  protected readonly showPaymentCard = computed(() => {
    const s = normalizeBookingStatus(this.booking().status);
    return (s === 'NEW' || s === 'PAYMENT_PENDING') && !!this.effectiveQrUrl();
  });
}
