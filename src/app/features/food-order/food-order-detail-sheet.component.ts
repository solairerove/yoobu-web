import { CurrencyPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { BookingResponse } from '../../core/models/booking.model';
import { normalizeBookingStatus } from '../../core/utils/booking-status.util';
import { normalizeCurrencyCode } from '../../core/utils/currency.util';

type StepState = 'done' | 'current' | 'pending' | 'cancelled';
interface TimelineStep { label: string; desc: string; state: StepState; }

@Component({
  selector: 'app-food-order-detail-sheet',
  imports: [CurrencyPipe, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'detail-sheet-host' },
  template: `
    <!-- Overlay / backdrop -->
    <div class="overlay" (click)="closeRequested.emit()">
      <div class="sheet" (click)="$event.stopPropagation()">

        <!-- Handle -->
        <div class="handle-row"><div class="handle"></div></div>

        <!-- Scrollable body -->
        <div class="body">

          <!-- Header -->
          <div class="header-row">
            <span class="order-label">ORDER #{{ booking().id }}</span>
            <span class="badge" [class]="badgeClass()">{{ badgeLabel() }}</span>
          </div>
          <div class="sub-date">{{ booking().deliveryDate | date: 'MMM d, y' }}</div>

          <!-- StageBar (active orders only) -->
          @if (isActive()) {
            @let states = stageBarStates();
            <div class="stage-bar">
              <div class="stage-track">
                @for (state of states; track $index; let last = $last) {
                  <div class="stage-dot"
                       [class.stage-dot-filled]="state !== 'pending'"
                       [class.stage-dot-current]="state === 'current'"></div>
                  @if (!last) {
                    <div class="stage-line" [class.stage-line-filled]="state === 'complete'"></div>
                  }
                }
              </div>
              <div class="stage-labels">
                @for (label of STAGE_LABELS; track label; let i = $index) {
                  <span class="stage-lbl" [class.stage-lbl-current]="states[i] === 'current'">{{ label }}</span>
                }
              </div>
            </div>
          }

          <!-- Action buttons -->
          <div class="actions">
            <button type="button" class="btn-ghost" (click)="repeatRequested.emit(booking().id)">
              Repeat order
            </button>
            @if (canCancel()) {
              <button type="button" class="btn-ghost btn-danger"
                      (click)="cancelRequested.emit(booking().id)"
                      [disabled]="cancellingBookingId() === booking().id">
                {{ cancellingBookingId() === booking().id ? 'Cancelling…' : 'Cancel order' }}
              </button>
            }
          </div>

          <!-- Vertical timeline -->
          <div class="timeline">
            @for (step of timeline(); track step.label; let last = $last) {
              <div class="tl-item">
                <div class="tl-dot-col">
                  <div class="tl-dot"
                       [class.tl-dot-done]="step.state === 'done' || step.state === 'current'"
                       [class.tl-dot-current]="step.state === 'current'"
                       [class.tl-dot-cancelled]="step.state === 'cancelled'"></div>
                  @if (!last) { <div class="tl-connector"></div> }
                </div>
                <div class="tl-body">
                  <div class="tl-label"
                       [class.tl-label-done]="step.state === 'done'"
                       [class.tl-label-current]="step.state === 'current'"
                       [class.tl-label-cancelled]="step.state === 'cancelled'">
                    {{ step.label }}
                  </div>
                  <div class="tl-desc">{{ step.desc }}</div>

                  <!-- Tracking card — shown on the Delivering step when a tracking link exists -->
                  @if (step.label === 'Delivering' && trackingUrl()) {
                    <div class="tracking-card">
                      <div class="tracking-icon">📦</div>
                      <div class="tracking-text">Your order is on its way</div>
                      <a class="track-btn" [href]="trackingUrl()!" target="_blank" rel="noopener noreferrer">
                        Track delivery
                      </a>
                    </div>
                  }

                  <!-- Payment card — shown on the Payment step when payment is expected -->
                  @if (step.label === 'Payment' && showPaymentCard()) {
                    <div class="payment-card">
                      @if (effectiveQrUrl()) {
                        <button type="button" class="qr-tap" (click)="qrFullscreen.set(true)">
                          <div class="qr-thumb-wrap">
                            <img [src]="effectiveQrUrl()!" alt="Payment QR" class="qr-thumb-img" />
                          </div>
                          <span class="qr-scan-label">Scan QR</span>
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
                        <button type="button" class="i-paid-btn"
                                (click)="paymentConfirmRequested.emit(booking().id)"
                                [disabled]="confirmingPaymentBookingId() === booking().id">
                          {{ confirmingPaymentBookingId() === booking().id
                              ? 'Confirming…'
                              : 'I paid · ' + (booking().totalPrice | currency: currency() : 'symbol-narrow' : '1.0-0') }}
                        </button>
                      }
                    </div>
                  }
                </div>
              </div>
            }
          </div>

          <!-- Receipt -->
          <div class="receipt">
            <div class="receipt-head">
              <span class="receipt-title">Receipt</span>
              <span class="receipt-ts">{{ booking().createdAt | date: 'short' }}</span>
            </div>
            <div class="receipt-rows">
              <div class="receipt-row">
                <span>Delivery date</span>
                <strong>{{ booking().deliveryDate | date: 'mediumDate' }}</strong>
              </div>
              <div class="receipt-row">
                <span>Contact</span>
                <strong>{{ booking().customerName }} · {{ booking().customerPhone }}</strong>
              </div>
              @if (deliveryAddress()) {
                <div class="receipt-row">
                  <span>Address</span>
                  <strong>{{ deliveryAddress() }}</strong>
                </div>
              }
              @if (booking().note) {
                <div class="receipt-row">
                  <span>Note</span>
                  <strong>{{ booking().note }}</strong>
                </div>
              }
            </div>
            <div class="receipt-items-label">Items</div>
            @for (item of booking().items; track item.serviceName) {
              <div class="receipt-item">
                <div>
                  <div class="receipt-item-name">{{ item.serviceName }}</div>
                  <div class="receipt-item-sub">
                    {{ item.quantity }} × {{ item.unitPrice | currency: currency() : 'symbol-narrow' : '1.0-0' }}
                  </div>
                </div>
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

          @if (paymentError()) {
            <p class="form-error">{{ paymentError() }}</p>
          }
          @if (cancelError()) {
            <p class="form-error">{{ cancelError() }}</p>
          }

        </div>
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
    :host.detail-sheet-host {
      position: fixed;
      inset: 0;
      z-index: 100;
      display: block;
    }

    p { margin: 0; }

    /* ── Overlay ── */
    .overlay {
      position: absolute;
      inset: 0;
      background: rgba(0, 0, 0, 0.42);
      display: flex;
      align-items: flex-end;
      animation: fadeIn 0.22s ease;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    /* ── Sheet ── */
    .sheet {
      width: 100%;
      max-height: 88vh;
      background: #fff;
      border-radius: 24px 24px 0 0;
      box-shadow: 0 -8px 40px rgba(0, 0, 0, 0.18);
      display: flex;
      flex-direction: column;
      animation: slideUp 0.3s cubic-bezier(0.32, 0.72, 0, 1);
      overflow: hidden;
    }

    @keyframes slideUp {
      from { transform: translateY(100%); }
      to { transform: translateY(0); }
    }

    /* ── Handle ── */
    .handle-row {
      padding: 10px 0 6px;
      text-align: center;
      flex-shrink: 0;
    }

    .handle {
      width: 36px;
      height: 4px;
      background: oklch(90% 0.010 28);
      border-radius: 2px;
      display: inline-block;
    }

    /* ── Scrollable body ── */
    .body {
      flex: 1;
      overflow-y: auto;
      padding: 4px 20px 36px;
      overscroll-behavior: contain;
    }

    /* ── Header ── */
    .header-row {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 3px;
    }

    .order-label {
      font-size: 12px;
      font-weight: 800;
      color: oklch(38% 0.11 145);
      letter-spacing: 0.5px;
    }

    .badge {
      padding: 3px 10px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 700;
    }

    .badge-ordering { background: oklch(90% 0.04 28); color: oklch(48% 0.07 28); }
    .badge-paid, .badge-delivered { background: oklch(91% 0.055 145); color: oklch(38% 0.11 145); }
    .badge-confirmed, .badge-delivering { background: oklch(91% 0.055 72); color: oklch(48% 0.10 72); }
    .badge-cancelled { background: oklch(92% 0.04 22); color: oklch(38% 0.13 22); }

    .sub-date {
      font-size: 13px;
      color: oklch(50% 0.01 30);
      margin-bottom: 14px;
    }

    /* ── StageBar ── */
    .stage-bar { margin-bottom: 4px; }

    .stage-track {
      display: flex;
      align-items: center;
      margin-bottom: 7px;
    }

    .stage-dot {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      flex-shrink: 0;
      background: oklch(90% 0.010 28);
      transition: all 0.25s;
    }

    .stage-dot-filled { background: oklch(48% 0.13 145); }

    .stage-dot-current {
      background: oklch(48% 0.13 145);
      box-shadow: 0 0 0 3px oklch(91% 0.055 145);
    }

    .stage-line {
      flex: 1;
      height: 2.5px;
      border-radius: 2px;
      background: oklch(90% 0.010 28);
    }

    .stage-line-filled { background: oklch(48% 0.13 145); }

    .stage-labels { display: flex; }

    .stage-lbl {
      flex: 1;
      text-align: center;
      font-size: 9.5px;
      font-weight: 500;
      color: oklch(65% 0.008 30);
    }

    .stage-lbl-current { font-weight: 800; color: oklch(38% 0.11 145); }

    /* ── Actions ── */
    .actions {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin: 18px 0 22px;
    }

    .btn-ghost {
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

    .btn-danger {
      border-color: oklch(88% 0.04 22);
      color: oklch(38% 0.13 22);
    }

    .btn-ghost:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    /* ── Timeline ── */
    .timeline { margin-bottom: 20px; }

    .tl-item {
      display: flex;
      gap: 14px;
      align-items: stretch;
    }

    .tl-dot-col {
      display: flex;
      flex-direction: column;
      align-items: center;
      flex-shrink: 0;
      width: 14px;
    }

    .tl-dot {
      width: 14px;
      height: 14px;
      border-radius: 50%;
      flex-shrink: 0;
      margin-top: 2px;
      background: transparent;
      border: 2px solid oklch(90% 0.010 28);
      transition: all 0.25s;
    }

    .tl-dot-done { background: oklch(48% 0.13 145); border-color: oklch(48% 0.13 145); }
    .tl-dot-current { box-shadow: 0 0 0 3px oklch(91% 0.055 145); }
    .tl-dot-cancelled { background: oklch(38% 0.13 22); border-color: oklch(38% 0.13 22); }

    .tl-connector {
      flex: 1;
      width: 2px;
      min-height: 12px;
      background: oklch(90% 0.010 28);
      border-radius: 1px;
      margin: 4px 0;
    }

    .tl-body {
      flex: 1;
      padding-bottom: 16px;
      min-width: 0;
    }

    .tl-label {
      font-weight: 800;
      font-size: 14px;
      color: oklch(65% 0.008 30);
      margin-bottom: 2px;
    }

    .tl-label-done { color: #1a1a1a; }
    .tl-label-current { color: oklch(38% 0.11 145); }
    .tl-label-cancelled { color: oklch(38% 0.13 22); }

    .tl-desc {
      font-size: 12px;
      color: oklch(50% 0.01 30);
      line-height: 1.5;
    }

    /* ── Payment card ── */
    .payment-card {
      background: oklch(95.5% 0.016 38);
      border-radius: 12px;
      padding: 14px 12px 12px;
      margin-top: 10px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
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
      color: oklch(38% 0.11 145);
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

    /* ── Tracking card ── */
    .tracking-card {
      background: oklch(91% 0.055 72);
      border-radius: 12px;
      padding: 14px 12px 12px;
      margin-top: 10px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
    }

    .tracking-icon {
      font-size: 28px;
      line-height: 1;
    }

    .tracking-text {
      font-size: 13px;
      font-weight: 600;
      color: oklch(38% 0.10 72);
      text-align: center;
    }

    .track-btn {
      display: block;
      width: 100%;
      box-sizing: border-box;
      padding: 13px 20px;
      background: oklch(48% 0.10 72);
      color: #fff;
      border: none;
      border-radius: 999px;
      font-weight: 800;
      font-size: 15px;
      font-family: inherit;
      text-align: center;
      text-decoration: none;
      box-shadow: 0 3px 12px rgba(0, 0, 0, 0.15);
      cursor: pointer;
    }

    /* ── Receipt ── */
    .receipt {
      background: oklch(95.5% 0.016 38);
      border-radius: 16px;
      padding: 14px 16px 10px;
    }

    .receipt-head {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      margin-bottom: 12px;
    }

    .receipt-title {
      font-weight: 800;
      font-size: 15px;
      color: #1a1a1a;
    }

    .receipt-ts {
      font-size: 12px;
      color: oklch(50% 0.01 30);
    }

    .receipt-rows { margin-bottom: 12px; }

    .receipt-row {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      padding-bottom: 10px;
      margin-bottom: 10px;
      border-bottom: 1px solid oklch(90% 0.010 28);
    }

    .receipt-row span {
      font-size: 12px;
      color: oklch(65% 0.008 30);
      flex-shrink: 0;
    }

    .receipt-row strong {
      font-size: 13px;
      color: #1a1a1a;
      font-weight: 700;
      text-align: right;
    }

    .receipt-items-label {
      font-size: 12px;
      color: oklch(65% 0.008 30);
      margin-bottom: 8px;
    }

    .receipt-item {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      align-items: flex-start;
      margin-bottom: 8px;
    }

    .receipt-item-name {
      font-weight: 700;
      font-size: 14px;
      color: #1a1a1a;
    }

    .receipt-item-sub {
      font-size: 12px;
      color: oklch(50% 0.01 30);
    }

    .receipt-item-total {
      font-weight: 700;
      font-size: 14px;
      color: #1a1a1a;
      white-space: nowrap;
    }

    .receipt-total {
      display: flex;
      justify-content: space-between;
      padding: 10px 0 4px;
      border-top: 1px solid oklch(90% 0.010 28);
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

    .form-error {
      margin-top: 10px;
      font-size: 13px;
      color: oklch(38% 0.13 22);
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
export class FoodOrderDetailSheetComponent {
  protected readonly STAGE_LABELS = ['Placed', 'Paid', 'Confirmed', 'Delivering', 'Delivered'];

  readonly booking = input.required<BookingResponse>();
  readonly paymentQrUrl = input<string | null>(null);
  readonly currencyCodeFallback = input<string>('VND');
  readonly confirmingPaymentBookingId = input<number | null>(null);
  readonly paymentError = input<string | null>(null);
  readonly cancellingBookingId = input<number | null>(null);
  readonly cancelError = input<string | null>(null);

  readonly closeRequested = output<void>();
  readonly repeatRequested = output<number>();
  readonly paymentConfirmRequested = output<number>();
  readonly cancelRequested = output<number>();

  protected readonly qrFullscreen = signal(false);

  protected readonly currency = computed(() =>
    normalizeCurrencyCode(this.booking().currency || this.currencyCodeFallback())
  );

  protected readonly effectiveQrUrl = computed<string | null>(() =>
    this.booking().paymentQrUrl ?? this.paymentQrUrl()
  );

  protected readonly isActive = computed(() => {
    const s = this.normalizeStatus(this.booking().status);
    return s === 'NEW' || s === 'PAYMENT_PENDING' || s === 'CONFIRMED' || s === 'DELIVERING';
  });

  protected readonly canCancel = computed(() => {
    const s = this.normalizeStatus(this.booking().status);
    return s === 'NEW' || s === 'PAYMENT_PENDING' || s === 'CONFIRMED';
  });

  protected readonly canConfirmPayment = computed(() =>
    this.normalizeStatus(this.booking().status) === 'NEW'
  );

  protected readonly showPaymentCard = computed(() => {
    const s = this.normalizeStatus(this.booking().status);
    return (s === 'NEW' || s === 'PAYMENT_PENDING') && !!this.effectiveQrUrl();
  });

  protected readonly deliveryAddress = computed(() =>
    this.booking().deliveryAddress?.trim() || null
  );

  protected readonly trackingUrl = computed<string | null>(() => {
    const url = this.booking().trackingUrl?.trim();
    return url && /^https?:\/\//i.test(url) ? url : null;
  });

  protected readonly stageBarStates = computed<Array<'complete' | 'current' | 'pending'>>(() => {
    const idx = this.statusToStageIndex(this.normalizeStatus(this.booking().status));
    return [0, 1, 2, 3, 4].map((i) =>
      i < idx ? 'complete' : i === idx ? 'current' : 'pending'
    );
  });

  protected readonly timeline = computed<TimelineStep[]>(() => {
    const s = this.normalizeStatus(this.booking().status);
    if (s === 'CANCELLED') {
      return [
        { label: 'Order placed', desc: 'Your order was placed.', state: 'done' },
        { label: 'Cancelled', desc: 'The order was stopped before completion.', state: 'cancelled' }
      ];
    }
    const idx = this.statusToStageIndex(s);
    const STEPS = [
      { label: 'Order placed', desc: 'Your order has been received.' },
      { label: 'Payment', desc: 'Scan the QR or use your bank app to pay, then tap "I paid".' },
      { label: 'Confirmed', desc: 'Admin confirmed your payment.' },
      { label: 'Delivering', desc: 'Your order is on the way.' },
      { label: 'Delivered', desc: 'The order has been completed.' }
    ];
    return STEPS.map((step, i) => ({
      ...step,
      state: (i < idx ? 'done' : i === idx ? 'current' : 'pending') as StepState
    }));
  });

  protected badgeLabel(): string {
    switch (this.normalizeStatus(this.booking().status)) {
      case 'NEW': return 'Ordering';
      case 'PAYMENT_PENDING': return 'Paid';
      case 'CONFIRMED': return 'Confirmed';
      case 'DELIVERING': return 'Delivering';
      case 'DONE': return 'Delivered';
      case 'CANCELLED': return 'Cancelled';
      default: return this.booking().status;
    }
  }

  protected badgeClass(): string {
    switch (this.normalizeStatus(this.booking().status)) {
      case 'NEW': return 'badge badge-ordering';
      case 'PAYMENT_PENDING': return 'badge badge-paid';
      case 'CONFIRMED': return 'badge badge-confirmed';
      case 'DELIVERING': return 'badge badge-delivering';
      case 'DONE': return 'badge badge-delivered';
      case 'CANCELLED': return 'badge badge-cancelled';
      default: return 'badge badge-ordering';
    }
  }

  private statusToStageIndex(s: string): number {
    switch (s) {
      case 'NEW': return 0;
      case 'PAYMENT_PENDING': return 1;
      case 'CONFIRMED': return 2;
      case 'DELIVERING': return 3;
      case 'DONE': return 4;
      default: return 0;
    }
  }

  private normalizeStatus(status: string): string {
    return normalizeBookingStatus(status);
  }
}
