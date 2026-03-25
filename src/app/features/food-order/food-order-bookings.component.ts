import { CurrencyPipe, DatePipe, NgFor, NgIf, NgTemplateOutlet } from '@angular/common';
import { Component, ElementRef, computed, inject, input, output } from '@angular/core';
import { BookingResponse } from '../../core/models/booking.model';
import { normalizeCurrencyCode } from '../../core/utils/currency.util';

@Component({
  selector: 'app-food-order-bookings',
  imports: [CurrencyPipe, DatePipe, NgFor, NgIf, NgTemplateOutlet],
  template: `
    <section class="bookings-card">
      <div class="bookings-head">
        <div>
          <p class="eyebrow">My orders</p>
          <h3>Order history</h3>
        </div>

        <button type="button" class="ghost-button" (click)="refreshRequested.emit()" [disabled]="loading()">
          Refresh
        </button>
      </div>

      <section class="status-card ui-status-card" *ngIf="loading()">
        <h4>Loading orders</h4>
        <p>Loading your orders.</p>
      </section>

      <section class="status-card ui-status-card error" *ngIf="error() as error">
        <h4>Orders unavailable</h4>
        <p>{{ error }}</p>
      </section>

      <section class="status-card ui-status-card" *ngIf="!loading() && !error() && !bookings().length">
        <h4>No orders yet</h4>
        <p>Your orders will appear here.</p>
      </section>

      <ng-container *ngIf="bookings().length">
        <section class="orders-section">
          <p class="booking-group-title">Open order</p>

          <section class="status-card ui-status-card" *ngIf="!currentBookings().length">
            <h4>No open orders</h4>
            <p>Active orders will appear here.</p>
          </section>

          <div class="booking-list" *ngIf="currentBookings().length">
            <button
              type="button"
              class="booking-item"
              *ngFor="let booking of currentBookings()"
              [class.active]="selectedBookingId() === booking.id"
              (click)="selectAndScroll(booking.id)"
            >
              <div class="booking-item-top">
                <strong>#{{ booking.id }}</strong>
                <span
                  class="booking-status"
                  [class.status-new]="isStatus(booking.status, 'NEW')"
                  [class.status-payment-pending]="isStatus(booking.status, 'PAYMENT_PENDING')"
                  [class.status-confirmed]="isStatus(booking.status, 'CONFIRMED')"
                  [class.status-delivering]="isStatus(booking.status, 'DELIVERING')"
                  [class.status-done]="isStatus(booking.status, 'DONE')"
                  [class.status-cancelled]="isStatus(booking.status, 'CANCELLED')"
                >
                  {{ bookingStatusLabel(booking.status) }}
                </span>
              </div>
              <p>{{ booking.deliveryDate | date: 'mediumDate' }}</p>
              <p class="booking-address" [title]="displayAddress(booking.deliveryAddress)">
                {{ displayAddress(booking.deliveryAddress) }}
              </p>
              <p class="booking-items" [title]="bookingItemsPreview(booking)">
                {{ bookingItemsPreview(booking) }}
              </p>
              <p>{{ booking.totalPrice | currency: bookingCurrency(booking) : 'symbol-narrow' : '1.0-0' }}</p>
            </button>
          </div>
        </section>

        <section class="orders-section">
          <p class="booking-group-title">Order history</p>

          <section class="status-card ui-status-card" *ngIf="!previousBookings().length">
            <h4>No previous orders</h4>
            <p>Completed and cancelled orders will appear here.</p>
          </section>

          <div class="booking-list" *ngIf="previousBookings().length">
            <button
              type="button"
              class="booking-item"
              *ngFor="let booking of previousBookings()"
              [class.active]="selectedBookingId() === booking.id"
              (click)="selectAndScroll(booking.id)"
            >
              <div class="booking-item-top">
                <strong>#{{ booking.id }}</strong>
                <span
                  class="booking-status"
                  [class.status-new]="isStatus(booking.status, 'NEW')"
                  [class.status-payment-pending]="isStatus(booking.status, 'PAYMENT_PENDING')"
                  [class.status-confirmed]="isStatus(booking.status, 'CONFIRMED')"
                  [class.status-delivering]="isStatus(booking.status, 'DELIVERING')"
                  [class.status-done]="isStatus(booking.status, 'DONE')"
                  [class.status-cancelled]="isStatus(booking.status, 'CANCELLED')"
                >
                  {{ bookingStatusLabel(booking.status) }}
                </span>
              </div>
              <p>{{ booking.deliveryDate | date: 'mediumDate' }}</p>
              <p class="booking-address" [title]="displayAddress(booking.deliveryAddress)">
                {{ displayAddress(booking.deliveryAddress) }}
              </p>
              <p class="booking-items" [title]="bookingItemsPreview(booking)">
                {{ bookingItemsPreview(booking) }}
              </p>
              <p>{{ booking.totalPrice | currency: bookingCurrency(booking) : 'symbol-narrow' : '1.0-0' }}</p>
            </button>
          </div>
        </section>

        <section class="booking-detail-anchor booking-detail-panel">
          <ng-container *ngIf="selectedDisplayBooking() as booking; else chooseBooking">
            <ng-container *ngTemplateOutlet="bookingDetailTemplate; context: { $implicit: booking }" />
          </ng-container>
        </section>
      </ng-container>

      <ng-template #bookingDetailTemplate let-booking>
        <section class="booking-detail">
          <div class="booking-detail-head">
            <div class="booking-summary">
              <p class="eyebrow">Order #{{ booking.id }}</p>
              <div class="booking-status-line">
                <h4>{{ bookingStatusTitle(booking.status) }}</h4>
                <span
                  class="booking-status large"
                  [class.status-new]="isStatus(booking.status, 'NEW')"
                  [class.status-payment-pending]="isStatus(booking.status, 'PAYMENT_PENDING')"
                  [class.status-confirmed]="isStatus(booking.status, 'CONFIRMED')"
                  [class.status-delivering]="isStatus(booking.status, 'DELIVERING')"
                  [class.status-done]="isStatus(booking.status, 'DONE')"
                  [class.status-cancelled]="isStatus(booking.status, 'CANCELLED')"
                >
                  {{ bookingStatusLabel(booking.status) }}
                </span>
              </div>
              <p class="copy ui-copy">{{ bookingStatusDescription(booking.status) }}</p>
            </div>

            <div class="booking-actions">
              <a
                class="ghost-button tracking-link"
                *ngIf="deliveryTrackingUrl(booking) as trackingUrl"
                [href]="trackingUrl"
                target="_blank"
                rel="noopener noreferrer"
              >
                Track delivery
              </a>

              <button
                type="button"
                class="ghost-button"
                *ngIf="canRepeat(booking)"
                (click)="repeatRequested.emit(booking.id)"
              >
                Repeat order
              </button>

              <button
                type="button"
                class="ghost-button"
                *ngIf="canConfirmPayment(booking)"
                (click)="paymentConfirmRequested.emit(booking.id)"
                [disabled]="confirmingPaymentBookingId() === booking.id"
              >
                {{ confirmingPaymentBookingId() === booking.id ? 'Confirming...' : 'I paid' }}
              </button>

              <button
                type="button"
                class="ghost-button"
                *ngIf="canCancel(booking)"
                (click)="cancelRequested.emit(booking.id)"
                [disabled]="cancellingBookingId() === booking.id"
              >
                {{ cancellingBookingId() === booking.id ? 'Cancelling...' : 'Cancel order' }}
              </button>
            </div>
          </div>

          <div class="booking-timeline" aria-label="Order progress">
            <div
              class="timeline-step"
              *ngFor="let step of bookingTimeline(booking.status)"
              [class.complete]="step.state === 'complete'"
              [class.current]="step.state === 'current'"
              [class.cancelled]="step.state === 'cancelled'"
            >
              <span class="timeline-dot"></span>
              <div>
                <strong>{{ step.label }}</strong>
                <p>{{ step.description }}</p>
              </div>
            </div>
          </div>

          <section class="payment-qr-card" *ngIf="shouldShowPaymentQr(booking) && paymentQrUrl() as paymentQrUrl">
            <h5>Payment QR</h5>
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

          <div class="receipt-card">
            <div class="receipt-head">
              <h5>Receipt</h5>
              <span>{{ booking.createdAt | date: 'short' }}</span>
            </div>

            <div class="receipt-meta">
              <div class="receipt-row">
                <span>Delivery date</span>
                <strong>{{ booking.deliveryDate | date: 'mediumDate' }}</strong>
              </div>
              <div class="receipt-row">
                <span>Contact</span>
                <strong>{{ booking.customerName }} · {{ booking.customerPhone }}</strong>
              </div>
              <div class="receipt-row">
                <span>Delivery address</span>
                <strong>{{ displayAddress(booking.deliveryAddress) }}</strong>
              </div>
            </div>

            <p class="receipt-note" *ngIf="booking.note">{{ booking.note }}</p>

            <div class="review-list">
              <div class="review-row" *ngFor="let item of receiptItems(booking)">
                <div>
                  <strong>{{ item.serviceName }}</strong>
                  <p>{{ item.quantity }} × {{ item.unitPrice | currency: itemCurrency(item, booking) : 'symbol-narrow' : '1.0-0' }}</p>
                </div>
                <span>{{ item.unitPrice * item.quantity | currency: itemCurrency(item, booking) : 'symbol-narrow' : '1.0-0' }}</span>
              </div>
              <p class="review-more" *ngIf="booking.items.length > receiptItemsLimit">
                +{{ booking.items.length - receiptItemsLimit }} more item{{ booking.items.length - receiptItemsLimit > 1 ? 's' : '' }}
              </p>
            </div>

            <div class="review-total">
              <span>Total</span>
              <strong>{{ booking.totalPrice | currency: bookingCurrency(booking) : 'symbol-narrow' : '1.0-0' }}</strong>
            </div>
          </div>

          <p class="form-error" *ngIf="paymentError() as error">{{ error }}</p>
          <p class="form-error" *ngIf="cancelError() as error">{{ error }}</p>
        </section>
      </ng-template>

      <ng-template #chooseBooking>
        <section class="status-card ui-status-card">
          <h4>Select an order</h4>
          <p>Choose any order to view full details.</p>
        </section>
      </ng-template>
    </section>
  `,
  styles: `
    h3,
    h4,
    h5,
    p {
      margin: 0;
    }

    .bookings-card,
    .booking-detail {
      padding: 0.95rem 1rem;
      border-radius: 18px;
      background: var(--yoobu-surface-card-soft);
      border: 1px solid var(--yoobu-border);
    }

    .status-card p {
      margin-top: 0.45rem;
      color: var(--yoobu-muted);
      line-height: 1.5;
    }

    .bookings-head,
    .booking-detail-head {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      gap: 1rem;
      align-items: start;
    }

    .orders-section {
      margin-top: 1rem;
      display: grid;
      gap: 0.75rem;
    }

    .booking-list {
      display: grid;
      gap: 0.65rem;
    }

    .booking-item {
      cursor: pointer;
      font: inherit;
    }

    .booking-item {
      display: grid;
      gap: 0.28rem;
      width: 100%;
      padding: 0.78rem 0.85rem;
      border-radius: 16px;
      border: 1px solid var(--yoobu-border);
      background: var(--yoobu-surface-card-strong);
      text-align: left;
      color: inherit;
      transition:
        border-color 160ms ease,
        background 160ms ease,
        box-shadow 160ms ease;
    }

    .booking-item:disabled {
      opacity: 0.45;
      cursor: not-allowed;
    }

    .booking-item.active {
      border-color: var(--yoobu-border-accent);
      background: var(--yoobu-surface-tint);
      box-shadow: var(--yoobu-shadow-xs);
    }

    .booking-item-top {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      gap: 0.75rem;
      align-items: center;
    }

    .booking-item p {
      color: var(--yoobu-muted);
      font-size: 0.88rem;
    }

    .booking-detail-panel {
      margin-top: 1rem;
    }

    .booking-group-title {
      margin: 0;
      font-size: 0.8rem;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      color: var(--yoobu-muted);
      font-weight: 700;
    }

    .booking-address {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .booking-items {
      font-size: 0.82rem;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .booking-status {
      padding: 0.2rem 0.55rem;
      border-radius: 999px;
      background: var(--yoobu-primary-soft);
      color: var(--yoobu-primary);
      font-size: 0.8rem;
      font-weight: 700;
    }

    .booking-status.large {
      padding: 0.35rem 0.8rem;
      font-size: 0.88rem;
    }

    .booking-status.status-new {
      background: var(--yoobu-primary-soft);
      color: var(--yoobu-primary);
    }

    .booking-status.status-payment-pending {
      background: rgba(13, 71, 161, 0.14);
      color: #0d47a1;
    }

    .booking-status.status-confirmed {
      background: rgba(181, 131, 0, 0.14);
      color: #9a6800;
    }

    .booking-status.status-delivering {
      background: rgba(126, 87, 194, 0.16);
      color: #5e35b1;
    }

    .booking-status.status-done {
      background: rgba(46, 125, 50, 0.14);
      color: #2e7d32;
    }

    .booking-status.status-cancelled {
      background: rgba(165, 42, 42, 0.12);
      color: brown;
    }

    .booking-detail {
      display: grid;
      gap: 1rem;
    }

    .booking-summary {
      display: grid;
      gap: 0.45rem;
    }

    .booking-status-line,
    .booking-actions,
    .receipt-head,
    .receipt-row {
      display: flex;
      justify-content: space-between;
      gap: 1rem;
      align-items: center;
    }

    .booking-timeline,
    .payment-qr-card,
    .receipt-meta,
    .review-list {
      display: grid;
      gap: 0.75rem;
    }

    .timeline-step {
      display: grid;
      grid-template-columns: auto minmax(0, 1fr);
      gap: 0.75rem;
      align-items: start;
      color: var(--yoobu-muted);
    }

    .timeline-dot {
      width: 0.8rem;
      height: 0.8rem;
      margin-top: 0.3rem;
      border-radius: 999px;
      border: 2px solid var(--yoobu-border-soft);
      background: var(--yoobu-surface-card);
      box-shadow: var(--yoobu-ring-soft);
    }

    .timeline-step strong {
      display: block;
      color: var(--yoobu-ink);
    }

    .timeline-step p {
      margin-top: 0.2rem;
      font-size: 0.9rem;
      line-height: 1.45;
    }

    .timeline-step.complete .timeline-dot,
    .timeline-step.current .timeline-dot {
      border-color: var(--yoobu-primary);
      background: var(--yoobu-primary);
      box-shadow: var(--yoobu-ring-accent);
    }

    .timeline-step.current strong {
      color: var(--yoobu-primary);
    }

    .timeline-step.cancelled .timeline-dot {
      border-color: brown;
      background: brown;
      box-shadow: 0 0 0 6px rgba(165, 42, 42, 0.12);
    }

    .timeline-step.cancelled strong {
      color: brown;
    }

    .payment-qr-card {
      padding: 1rem;
      border-radius: 18px;
      background: var(--yoobu-surface-tint);
      border: 1px solid var(--yoobu-border-soft);
    }

    .payment-qr-card p {
      color: var(--yoobu-muted);
      line-height: 1.5;
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

    .booking-actions {
      flex-wrap: wrap;
      justify-content: flex-end;
      margin-left: auto;
    }

    .booking-actions .ghost-button {
      max-width: 100%;
      white-space: normal;
    }

    .tracking-link {
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }

    .receipt-card {
      display: grid;
      gap: 0.9rem;
      padding: 1rem;
      border-radius: 18px;
      background: var(--yoobu-surface-tint);
      border: 1px solid var(--yoobu-border-soft);
    }

    .receipt-head span,
    .receipt-row span {
      color: var(--yoobu-muted);
      font-size: 0.92rem;
    }

    .receipt-row {
      align-items: baseline;
      padding-bottom: 0.65rem;
      border-bottom: 1px solid var(--yoobu-border-soft);
    }

    .receipt-note {
      padding: 0.85rem 0.95rem;
      border-radius: 14px;
      background: var(--yoobu-surface-card);
      color: var(--yoobu-muted);
      line-height: 1.5;
    }

    .review-row,
    .review-total {
      display: flex;
      justify-content: space-between;
      gap: 1rem;
      align-items: start;
    }

    .review-row p {
      margin-top: 0.2rem;
      color: var(--yoobu-muted);
      font-size: 0.9rem;
    }

    .review-more {
      margin: 0;
      color: var(--yoobu-muted);
      font-size: 0.86rem;
    }

    .review-total {
      align-items: center;
      padding-top: 0.85rem;
      border-top: 1px solid var(--yoobu-border);
    }

    .form-error {
      color: brown;
      font-size: 0.92rem;
    }

    @media (max-width: 640px) {
      .bookings-head,
      .booking-detail-head,
      .review-row,
      .booking-status-line,
      .booking-actions,
      .receipt-head,
      .receipt-row,
      .review-total {
        flex-direction: column;
        align-items: flex-start;
      }

      .booking-actions {
        width: 100%;
        margin-left: 0;
      }

      .booking-actions .ghost-button {
        width: 100%;
      }
    }
  `
})
export class FoodOrderBookingsComponent {
  private readonly el = inject(ElementRef);
  protected readonly receiptItemsLimit = 3;

  readonly bookings = input.required<BookingResponse[]>();
  readonly loading = input.required<boolean>();
  readonly error = input.required<string | null>();
  readonly paymentQrUrl = input<string | null>(null);
  readonly selectedBookingId = input.required<number | null>();
  readonly selectedBooking = input.required<BookingResponse | null>();
  readonly confirmingPaymentBookingId = input.required<number | null>();
  readonly paymentError = input.required<string | null>();
  readonly cancellingBookingId = input.required<number | null>();
  readonly cancelError = input.required<string | null>();
  readonly currencyCode = input<string>('VND');

  readonly refreshRequested = output<void>();
  readonly bookingSelected = output<number>();
  readonly repeatRequested = output<number>();
  readonly paymentConfirmRequested = output<number>();
  readonly cancelRequested = output<number>();
  readonly currentBookings = computed(() => this.sortedBookings().filter((booking) => this.isCurrentBooking(booking)));
  readonly previousBookings = computed(() => this.sortedBookings().filter((booking) => !this.isCurrentBooking(booking)));
  readonly selectedDisplayBooking = computed<BookingResponse | null>(() => {
    const selected = this.selectedBooking();
    if (selected) {
      return selected;
    }

    return this.currentBookings()[0] ?? this.previousBookings()[0] ?? null;
  });

  protected selectAndScroll(bookingId: number): void {
    this.bookingSelected.emit(bookingId);
    setTimeout(() => {
      const detail = this.el.nativeElement.querySelector('.booking-detail-anchor .booking-detail');
      detail?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 50);
  }

  protected canRepeat(booking: BookingResponse): boolean {
    return booking.items.length > 0;
  }

  private sortedBookings(): BookingResponse[] {
    return [...this.bookings()].sort((left, right) => {
      const currentLeft = this.isCurrentBooking(left);
      const currentRight = this.isCurrentBooking(right);

      if (currentLeft !== currentRight) {
        return currentLeft ? -1 : 1;
      }

      return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
    });
  }

  private isCurrentBooking(booking: BookingResponse): boolean {
    const status = this.normalizeStatus(booking.status);
    return status === 'NEW' || status === 'PAYMENT_PENDING' || status === 'CONFIRMED' || status === 'DELIVERING';
  }

  protected canCancel(booking: BookingResponse): boolean {
    const status = this.normalizeStatus(booking.status);
    return status === 'NEW' || status === 'PAYMENT_PENDING' || status === 'CONFIRMED';
  }

  protected canConfirmPayment(booking: BookingResponse): boolean {
    return this.normalizeStatus(booking.status) === 'NEW';
  }

  protected shouldShowPaymentQr(booking: BookingResponse): boolean {
    const status = this.normalizeStatus(booking.status);
    return !!this.paymentQrUrl() && (status === 'NEW' || status === 'PAYMENT_PENDING');
  }

  protected isStatus(status: string, expected: string): boolean {
    return this.normalizeStatus(status) === expected;
  }

  private normalizeStatus(status: string): string {
    return status.trim().replace(/-/g, '_').toUpperCase();
  }

  protected bookingStatusLabel(status: BookingResponse['status']): string {
    switch (this.normalizeStatus(status)) {
      case 'NEW':
        return 'New';
      case 'PAYMENT_PENDING':
        return 'Awaiting verification';
      case 'CONFIRMED':
        return 'Confirmed';
      case 'DELIVERING':
        return 'Out for delivery';
      case 'DONE':
        return 'Delivered';
      case 'CANCELLED':
        return 'Cancelled';
      default:
        return status;
    }
  }

  protected bookingStatusTitle(status: BookingResponse['status']): string {
    switch (this.normalizeStatus(status)) {
      case 'NEW':
        return 'Waiting for confirmation';
      case 'PAYMENT_PENDING':
        return 'Awaiting admin verification';
      case 'CONFIRMED':
        return 'Order confirmed';
      case 'DELIVERING':
        return 'Out for delivery';
      case 'DONE':
        return 'Order completed';
      case 'CANCELLED':
        return 'Order cancelled';
      default:
        return 'Order status updated';
    }
  }

  protected bookingStatusDescription(status: BookingResponse['status']): string {
    switch (this.normalizeStatus(status)) {
      case 'NEW':
        return 'Your order has been received and is waiting for confirmation.';
      case 'PAYMENT_PENDING':
        return 'Payment was submitted and is waiting for admin verification.';
      case 'CONFIRMED':
        return 'Your order has been confirmed and is being prepared.';
      case 'DELIVERING':
        return 'Your order is on the way. Use tracking to follow delivery updates.';
      case 'DONE':
        return 'This order has been completed.';
      case 'CANCELLED':
        return 'This order was cancelled.';
      default:
        return 'Check this order for the latest status details.';
    }
  }

  protected bookingTimeline(status: BookingResponse['status']): Array<{
    label: string;
    description: string;
    state: 'pending' | 'complete' | 'current' | 'cancelled';
  }> {
    const normalizedStatus = this.normalizeStatus(status);

    if (normalizedStatus === 'CANCELLED') {
      return [
        {
          label: 'Order placed',
          description: 'Your order was placed successfully.',
          state: 'complete'
        },
        {
          label: 'Cancelled',
          description: 'The order was stopped before completion.',
          state: 'cancelled'
        }
      ];
    }

    return [
      {
        label: 'Order placed',
        description: 'Your order has been received.',
        state: normalizedStatus === 'NEW' ? 'current' : 'complete'
      },
      {
        label: 'Payment verification',
        description: 'Admin verifies your payment after you tap "I paid".',
        state:
          normalizedStatus === 'PAYMENT_PENDING'
            ? 'current'
            : normalizedStatus === 'CONFIRMED' || normalizedStatus === 'DELIVERING' || normalizedStatus === 'DONE'
              ? 'complete'
              : 'pending'
      },
      {
        label: 'Confirmed',
        description: 'Your order has been confirmed.',
        state:
          normalizedStatus === 'CONFIRMED'
            ? 'current'
            : normalizedStatus === 'DELIVERING' || normalizedStatus === 'DONE'
              ? 'complete'
              : 'pending'
      },
      {
        label: 'Delivering',
        description: 'Your order is currently on the way.',
        state: normalizedStatus === 'DELIVERING' ? 'current' : normalizedStatus === 'DONE' ? 'complete' : 'pending'
      },
      {
        label: 'Delivered',
        description: 'The order has been completed.',
        state: normalizedStatus === 'DONE' ? 'current' : 'pending'
      }
    ];
  }

  protected deliveryTrackingUrl(booking: BookingResponse): string | null {
    const trackingUrl = booking.trackingUrl?.trim();
    if (!trackingUrl || !/^https?:\/\//i.test(trackingUrl)) {
      return null;
    }

    return trackingUrl;
  }

  protected bookingCurrency(booking: BookingResponse): string {
    return normalizeCurrencyCode(booking.currency || this.currencyCode());
  }

  protected itemCurrency(item: BookingResponse['items'][number], booking: BookingResponse): string {
    return normalizeCurrencyCode(item.currency || booking.currency || this.currencyCode());
  }

  protected displayAddress(address: string | null): string {
    const normalizedAddress = address?.trim();
    return normalizedAddress ? normalizedAddress : 'N/A';
  }

  protected bookingItemsPreview(booking: BookingResponse): string {
    if (!booking.items.length) {
      return 'No items';
    }

    return booking.items
      .slice(0, 2)
      .map((item) => `${item.quantity}× ${item.serviceName}`)
      .join(', ');
  }

  protected receiptItems(booking: BookingResponse): BookingResponse['items'] {
    return booking.items.slice(0, this.receiptItemsLimit);
  }
}
