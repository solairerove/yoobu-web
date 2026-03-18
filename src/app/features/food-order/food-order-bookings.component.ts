import { CurrencyPipe, DatePipe, NgFor, NgIf } from '@angular/common';
import { Component, input, output } from '@angular/core';
import { BookingResponse } from '../../core/models/booking.model';

@Component({
  selector: 'app-food-order-bookings',
  imports: [CurrencyPipe, DatePipe, NgFor, NgIf],
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

      <div class="bookings-grid" *ngIf="bookings().length">
        <div class="booking-list">
          <button
            type="button"
            class="booking-item"
            *ngFor="let booking of bookings()"
            [class.active]="selectedBookingId() === booking.id"
            (click)="bookingSelected.emit(booking.id)"
          >
            <div class="booking-item-top">
              <strong>#{{ booking.id }}</strong>
              <span
                class="booking-status"
                [class.status-new]="booking.status === 'NEW'"
                [class.status-confirmed]="booking.status === 'CONFIRMED'"
                [class.status-done]="booking.status === 'DONE'"
                [class.status-cancelled]="booking.status === 'CANCELLED'"
              >
                {{ bookingStatusLabel(booking.status) }}
              </span>
            </div>
            <p>{{ booking.deliveryDate | date: 'mediumDate' }}</p>
            <p>{{ booking.totalPrice | currency: 'VND' : 'symbol-narrow' : '1.0-0' }}</p>
          </button>
        </div>

        <section class="booking-detail" *ngIf="selectedBooking() as booking; else chooseBooking">
          <div class="booking-detail-head">
            <div class="booking-summary">
              <p class="eyebrow">Order #{{ booking.id }}</p>
              <div class="booking-status-line">
                <h4>{{ bookingStatusTitle(booking.status) }}</h4>
                <span
                  class="booking-status large"
                  [class.status-new]="booking.status === 'NEW'"
                  [class.status-confirmed]="booking.status === 'CONFIRMED'"
                  [class.status-done]="booking.status === 'DONE'"
                  [class.status-cancelled]="booking.status === 'CANCELLED'"
                >
                  {{ bookingStatusLabel(booking.status) }}
                </span>
              </div>
              <p class="copy ui-copy">{{ bookingStatusDescription(booking.status) }}</p>
            </div>

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
                <span>Customer</span>
                <strong>{{ booking.customerName }}</strong>
              </div>
              <div class="receipt-row">
                <span>Phone</span>
                <strong>{{ booking.customerPhone }}</strong>
              </div>
              <div class="receipt-row">
                <span>Items</span>
                <strong>{{ booking.items.length }}</strong>
              </div>
            </div>

            <p class="receipt-note" *ngIf="booking.note">{{ booking.note }}</p>

            <div class="review-list">
              <div class="review-row" *ngFor="let item of booking.items">
                <div>
                  <strong>{{ item.serviceName }}</strong>
                  <p>{{ item.quantity }} × {{ item.unitPrice | currency: 'VND' : 'symbol-narrow' : '1.0-0' }}</p>
                </div>
                <span>{{ item.unitPrice * item.quantity | currency: 'VND' : 'symbol-narrow' : '1.0-0' }}</span>
              </div>
            </div>

            <div class="review-total">
              <span>Total</span>
              <strong>{{ booking.totalPrice | currency: 'VND' : 'symbol-narrow' : '1.0-0' }}</strong>
            </div>
          </div>

          <p class="form-error" *ngIf="cancelError() as error">{{ error }}</p>
        </section>

        <ng-template #chooseBooking>
          <section class="status-card ui-status-card">
            <h4>Select an order</h4>
            <p>Choose an order to view the details.</p>
          </section>
        </ng-template>
      </div>
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
      background: rgba(255, 255, 255, 0.82);
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
      justify-content: space-between;
      gap: 1rem;
      align-items: start;
    }

    .bookings-grid {
      display: grid;
      grid-template-columns: minmax(220px, 0.8fr) minmax(0, 1.2fr);
      gap: 1rem;
      margin-top: 1rem;
    }

    .booking-list {
      display: grid;
      gap: 0.9rem;
    }

    .booking-item {
      cursor: pointer;
      font: inherit;
    }

    .booking-item {
      display: grid;
      gap: 0.35rem;
      width: 100%;
      padding: 0.95rem 1rem;
      border-radius: 16px;
      border: 1px solid var(--yoobu-border);
      background: rgba(255, 255, 255, 0.96);
      text-align: left;
      color: inherit;
    }

    .booking-item:disabled {
      opacity: 0.45;
      cursor: not-allowed;
    }

    .booking-item.active {
      border-color: rgba(255, 107, 53, 0.35);
      background: rgba(255, 248, 242, 0.96);
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
      font-size: 0.92rem;
    }

    .booking-status {
      padding: 0.2rem 0.55rem;
      border-radius: 999px;
      background: rgba(255, 107, 53, 0.12);
      color: var(--yoobu-primary);
      font-size: 0.8rem;
      font-weight: 700;
    }

    .booking-status.large {
      padding: 0.35rem 0.8rem;
      font-size: 0.88rem;
    }

    .booking-status.status-new {
      background: rgba(255, 107, 53, 0.12);
      color: var(--yoobu-primary);
    }

    .booking-status.status-confirmed {
      background: rgba(181, 131, 0, 0.14);
      color: #9a6800;
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
    .receipt-head,
    .receipt-row {
      display: flex;
      justify-content: space-between;
      gap: 1rem;
      align-items: center;
    }

    .booking-timeline,
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
      border: 2px solid rgba(36, 22, 15, 0.14);
      background: rgba(255, 255, 255, 0.8);
      box-shadow: 0 0 0 6px rgba(36, 22, 15, 0.04);
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
      box-shadow: 0 0 0 6px rgba(255, 107, 53, 0.12);
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

    .receipt-card {
      display: grid;
      gap: 0.9rem;
      padding: 1rem;
      border-radius: 18px;
      background: rgba(255, 250, 246, 0.88);
      border: 1px solid rgba(36, 22, 15, 0.08);
    }

    .receipt-head span,
    .receipt-row span {
      color: var(--yoobu-muted);
      font-size: 0.92rem;
    }

    .receipt-row {
      align-items: baseline;
      padding-bottom: 0.65rem;
      border-bottom: 1px solid rgba(36, 22, 15, 0.08);
    }

    .receipt-note {
      padding: 0.85rem 0.95rem;
      border-radius: 14px;
      background: rgba(255, 255, 255, 0.92);
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
      .bookings-grid {
        grid-template-columns: 1fr;
      }

      .bookings-head,
      .booking-detail-head,
      .review-row,
      .booking-status-line,
      .receipt-head,
      .receipt-row,
      .review-total {
        flex-direction: column;
        align-items: flex-start;
      }
    }
  `
})
export class FoodOrderBookingsComponent {
  readonly bookings = input.required<BookingResponse[]>();
  readonly loading = input.required<boolean>();
  readonly error = input.required<string | null>();
  readonly selectedBookingId = input.required<number | null>();
  readonly selectedBooking = input.required<BookingResponse | null>();
  readonly cancellingBookingId = input.required<number | null>();
  readonly cancelError = input.required<string | null>();

  readonly refreshRequested = output<void>();
  readonly bookingSelected = output<number>();
  readonly cancelRequested = output<number>();

  protected canCancel(booking: BookingResponse): boolean {
    return booking.status === 'NEW' || booking.status === 'CONFIRMED';
  }

  protected bookingStatusLabel(status: BookingResponse['status']): string {
    switch (status) {
      case 'NEW':
        return 'New';
      case 'CONFIRMED':
        return 'Confirmed';
      case 'DONE':
        return 'Delivered';
      case 'CANCELLED':
        return 'Cancelled';
    }
  }

  protected bookingStatusTitle(status: BookingResponse['status']): string {
    switch (status) {
      case 'NEW':
        return 'Waiting for confirmation';
      case 'CONFIRMED':
        return 'Order confirmed';
      case 'DONE':
        return 'Order completed';
      case 'CANCELLED':
        return 'Order cancelled';
    }
  }

  protected bookingStatusDescription(status: BookingResponse['status']): string {
    switch (status) {
      case 'NEW':
        return 'Your order has been received and is waiting for confirmation.';
      case 'CONFIRMED':
        return 'Your order has been confirmed and is being prepared.';
      case 'DONE':
        return 'This order has been completed.';
      case 'CANCELLED':
        return 'This order was cancelled.';
    }
  }

  protected bookingTimeline(status: BookingResponse['status']): Array<{
    label: string;
    description: string;
    state: 'pending' | 'complete' | 'current' | 'cancelled';
  }> {
    if (status === 'CANCELLED') {
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
        state: status === 'NEW' ? 'current' : 'complete'
      },
      {
        label: 'Confirmed',
        description: 'Your order has been confirmed.',
        state: status === 'CONFIRMED' ? 'current' : status === 'DONE' ? 'complete' : 'pending'
      },
      {
        label: 'Delivered',
        description: 'The order has been completed.',
        state: status === 'DONE' ? 'current' : 'pending'
      }
    ];
  }
}
