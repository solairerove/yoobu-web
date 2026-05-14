import { CurrencyPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { BookingResponse } from '../../core/models/booking.model';
import { normalizeBookingStatus } from '../../core/utils/booking-status.util';
import { normalizeCurrencyCode } from '../../core/utils/currency.util';
import { FoodOrderDetailSheetComponent } from './food-order-detail-sheet.component';

@Component({
  selector: 'app-food-order-bookings',
  imports: [CurrencyPipe, DatePipe, FoodOrderDetailSheetComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="orders-shell">

      <!-- ── State cards ── -->
      @if (loading()) {
        <section class="state-card ui-status-card">
          <h4>Loading orders</h4>
          <p>Please wait while your orders load.</p>
        </section>
      }
      @if (error(); as err) {
        <section class="state-card ui-status-card error">
          <h4>Orders unavailable</h4>
          <p>{{ err }}</p>
        </section>
      }

      <!-- ── Section header ── -->
      @if (!loading() && !error()) {
        <div class="section-head">
          <span class="section-eyebrow">
            {{ currentBookings().length ? 'ACTIVE ORDERS' : 'MY ORDERS' }}
          </span>
          <button type="button" class="refresh-btn" (click)="refreshRequested.emit()" [disabled]="loading()">
            ↺ Refresh
          </button>
        </div>
      }

      <!-- ── Active order cards (StageBar) ── -->
      @for (booking of currentBookings(); track booking.id) {
        <article class="active-card">
          <div class="card-top">
            <span class="order-num">#{{ booking.id }}</span>
            <span class="badge" [class]="badgeClass(booking.status)">{{ badgeLabel(booking.status) }}</span>
          </div>

          <!-- StageBar -->
          @let states = stageBarStates(booking.status);
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

          <button type="button" class="view-details-btn" (click)="bookingSelected.emit(booking.id)">
            View details
          </button>

          <div class="card-meta">
            {{ booking.deliveryDate | date: 'MMM d, y' }}
            @if (displayAddress(booking.deliveryAddress) !== 'N/A') {
              · {{ displayAddress(booking.deliveryAddress) }}
            }
          </div>
          <div class="card-items">{{ bookingItemsPreview(booking) }}</div>

        </article>
      }

      <!-- New order CTA -->
      @if (currentBookings().length) {
        <button type="button" class="new-order-btn" (click)="newOrderRequested.emit()">
          + New order
        </button>
      }

      <!-- ── History divider ── -->
      @if (currentBookings().length && previousBookings().length) {
        <div class="history-divider">
          <span>Order history</span>
        </div>
      }

      <!-- ── History cards ── -->
      @for (booking of previousBookings(); track booking.id) {
        <article class="history-card"
                 [class.history-cancelled]="isStatus(booking.status, 'CANCELLED')"
                 [class.history-done]="isStatus(booking.status, 'DONE')">
          <button type="button" class="history-summary" (click)="bookingSelected.emit(booking.id)">
            <div class="card-top">
              <span class="order-num">#{{ booking.id }}</span>
              <span class="badge" [class]="badgeClass(booking.status)">{{ badgeLabel(booking.status) }}</span>
            </div>
            <div class="history-date">{{ booking.deliveryDate | date: 'mediumDate' }}</div>
            <div class="history-address">{{ displayAddress(booking.deliveryAddress) }}</div>
            <div class="history-items">{{ bookingItemsPreview(booking) }}</div>
            <div class="history-total">
              {{ booking.totalPrice | currency: bookingCurrency(booking) : 'symbol-narrow' : '1.0-0' }}
            </div>
          </button>

        </article>
      }

      <!-- ── Empty state ── -->
      @if (!loading() && !error() && !bookings().length) {
        <section class="state-card ui-status-card">
          <h4>No orders yet</h4>
          <p>Your orders will appear here once you place one.</p>
        </section>
        <button type="button" class="new-order-btn" (click)="newOrderRequested.emit()">
          + New order
        </button>
      }

    </div>

    @if (selectedBooking()) {
      <app-food-order-detail-sheet
        [booking]="selectedBooking()!"
        [paymentQrUrl]="paymentQrUrl()"
        [currencyCodeFallback]="currencyCode()"
        [confirmingPaymentBookingId]="confirmingPaymentBookingId()"
        [paymentError]="paymentError()"
        [cancellingBookingId]="cancellingBookingId()"
        [cancelError]="cancelError()"
        (closeRequested)="bookingDeselected.emit()"
        (repeatRequested)="repeatRequested.emit($event)"
        (paymentConfirmRequested)="paymentConfirmRequested.emit($event)"
        (cancelRequested)="cancelRequested.emit($event)"
      />
    }
  `,
  styles: `
    h4, p { margin: 0; }

    .orders-shell {
      display: flex;
      flex-direction: column;
      gap: 0;
      padding: 12px 12px 24px;
    }

    /* ── State cards ── */
    .state-card {
      margin-bottom: 12px;
    }

    .state-card p {
      margin-top: 0.35rem;
      color: var(--yoobu-muted);
      font-size: 0.9rem;
      line-height: 1.5;
    }

    /* ── Section header ── */
    .section-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 4px 2px 10px;
    }

    .section-eyebrow {
      font-size: 11px;
      font-weight: 800;
      color: oklch(38% 0.11 145);
      letter-spacing: 1.1px;
    }

    .refresh-btn {
      background: #fff;
      border: 1px solid oklch(90% 0.010 28);
      border-radius: 999px;
      padding: 4px 12px;
      font-size: 12px;
      font-weight: 700;
      color: oklch(50% 0.01 30);
      cursor: pointer;
      font-family: inherit;
    }

    .refresh-btn:disabled {
      opacity: 0.45;
      cursor: not-allowed;
    }

    /* ── Active card ── */
    .active-card {
      background: #fff;
      border-radius: 16px;
      border: 1px solid oklch(90% 0.010 28);
      padding: 14px 16px;
      margin-bottom: 10px;
      box-shadow: 0 1px 6px rgba(0, 0, 0, 0.06);
    }

    .card-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 10px;
    }

    .order-num {
      font-weight: 800;
      font-size: 16px;
      color: #1a1a1a;
    }

    /* ── Status badges ── */
    .badge {
      padding: 4px 11px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 700;
      white-space: nowrap;
    }

    .badge-ordering {
      background: oklch(90% 0.04 28);
      color: oklch(48% 0.07 28);
    }

    .badge-paid, .badge-delivered {
      background: oklch(91% 0.055 145);
      color: oklch(38% 0.11 145);
    }

    .badge-confirmed, .badge-delivering {
      background: oklch(91% 0.055 72);
      color: oklch(48% 0.10 72);
    }

    .badge-cancelled {
      background: oklch(92% 0.04 22);
      color: oklch(38% 0.13 22);
    }

    /* ── StageBar ── */
    .stage-bar {
      margin-bottom: 4px;
    }

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

    .stage-dot-filled {
      background: oklch(48% 0.13 145);
    }

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

    .stage-line-filled {
      background: oklch(48% 0.13 145);
    }

    .stage-labels {
      display: flex;
    }

    .stage-lbl {
      flex: 1;
      text-align: center;
      font-size: 9.5px;
      font-weight: 500;
      color: oklch(65% 0.008 30);
      line-height: 1.2;
    }

    .stage-lbl-current {
      font-weight: 800;
      color: oklch(38% 0.11 145);
    }

    /* ── View details button ── */
    .view-details-btn {
      width: 100%;
      padding: 11px 20px;
      margin-top: 12px;
      background: #fff;
      border: 1px solid oklch(90% 0.010 28);
      border-radius: 999px;
      font-weight: 700;
      font-size: 14px;
      color: #1a1a1a;
      cursor: pointer;
      font-family: inherit;
    }

    /* ── Card meta ── */
    .card-meta {
      font-size: 13px;
      color: oklch(50% 0.01 30);
      margin-top: 8px;
      margin-bottom: 2px;
    }

    .card-items {
      font-size: 13px;
      color: oklch(50% 0.01 30);
      margin-bottom: 12px;
    }

    .view-details-btn {
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

    /* ── New order button ── */
    .new-order-btn {
      width: 100%;
      padding: 14px 20px;
      background: #2481cc;
      color: #fff;
      border: none;
      border-radius: 999px;
      font-weight: 700;
      font-size: 15px;
      cursor: pointer;
      font-family: inherit;
      box-shadow: 0 4px 16px rgba(36, 129, 204, 0.3);
      margin-bottom: 16px;
    }

    /* ── History divider ── */
    .history-divider {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 10px;
    }

    .history-divider span {
      font-size: 11px;
      font-weight: 800;
      color: oklch(65% 0.008 30);
      letter-spacing: 0.8px;
      text-transform: uppercase;
      white-space: nowrap;
    }

    .history-divider::after {
      content: '';
      flex: 1;
      height: 1px;
      background: oklch(90% 0.010 28);
    }

    /* ── History card ── */
    .history-card {
      border-radius: 16px;
      margin-bottom: 10px;
      border: 1px solid oklch(94% 0.006 28);
      overflow: hidden;
    }

    .history-card.history-cancelled {
      background: oklch(96% 0.016 20);
      border-color: oklch(92% 0.024 20);
    }

    .history-card.history-done {
      background: #fff;
      border-color: oklch(94% 0.006 28);
    }

    .history-summary {
      display: block;
      width: 100%;
      padding: 14px 16px;
      background: transparent;
      border: none;
      text-align: left;
      cursor: pointer;
      font-family: inherit;
    }

    .history-date,
    .history-address,
    .history-items {
      font-size: 13px;
      color: oklch(50% 0.01 30);
      margin-bottom: 1px;
    }

    .history-address,
    .history-items {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .history-total {
      font-weight: 800;
      font-size: 15px;
      color: #1a1a1a;
      margin-top: 6px;
    }

  `
})
export class FoodOrderBookingsComponent {
  protected readonly STAGE_LABELS = ['Placed', 'Paid', 'Confirmed', 'Delivering', 'Delivered'];

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
  readonly bookingDeselected = output<void>();
  readonly repeatRequested = output<number>();
  readonly paymentConfirmRequested = output<number>();
  readonly cancelRequested = output<number>();
  readonly newOrderRequested = output<void>();

  readonly currentBookings = computed(() =>
    this.sortedBookings().filter((b) => this.isCurrentBooking(b))
  );
  readonly previousBookings = computed(() =>
    this.sortedBookings().filter((b) => !this.isCurrentBooking(b))
  );

  protected stageBarStates(status: string): Array<'complete' | 'current' | 'pending'> {
    const idx = this.statusToStageIndex(status);
    return [0, 1, 2, 3, 4].map((i) =>
      i < idx ? 'complete' : i === idx ? 'current' : 'pending'
    );
  }

  protected badgeLabel(status: string): string {
    switch (this.normalizeStatus(status)) {
      case 'NEW': return 'Ordering';
      case 'PAYMENT_PENDING': return 'Paid';
      case 'CONFIRMED': return 'Confirmed';
      case 'DELIVERING': return 'Delivering';
      case 'DONE': return 'Delivered';
      case 'CANCELLED': return 'Cancelled';
      default: return status;
    }
  }

  protected badgeClass(status: string): string {
    switch (this.normalizeStatus(status)) {
      case 'NEW': return 'badge badge-ordering';
      case 'PAYMENT_PENDING': return 'badge badge-paid';
      case 'CONFIRMED': return 'badge badge-confirmed';
      case 'DELIVERING': return 'badge badge-delivering';
      case 'DONE': return 'badge badge-delivered';
      case 'CANCELLED': return 'badge badge-cancelled';
      default: return 'badge badge-ordering';
    }
  }

  protected isStatus(status: string, expected: string): boolean {
    return this.normalizeStatus(status) === expected;
  }

  protected bookingCurrency(booking: BookingResponse): string {
    return normalizeCurrencyCode(booking.currency || this.currencyCode());
  }

  protected displayAddress(address: string | null): string {
    return address?.trim() || 'N/A';
  }

  protected bookingItemsPreview(booking: BookingResponse): string {
    if (!booking.items.length) return 'No items';
    return booking.items
      .slice(0, 2)
      .map((i) => `${i.quantity}× ${i.serviceName}`)
      .join(', ');
  }

  private statusToStageIndex(status: string): number {
    switch (this.normalizeStatus(status)) {
      case 'NEW': return 0;
      case 'PAYMENT_PENDING': return 1;
      case 'CONFIRMED': return 2;
      case 'DELIVERING': return 3;
      case 'DONE': return 4;
      default: return 0;
    }
  }

  private isCurrentBooking(booking: BookingResponse): boolean {
    const s = this.normalizeStatus(booking.status);
    return s === 'NEW' || s === 'PAYMENT_PENDING' || s === 'CONFIRMED' || s === 'DELIVERING';
  }

  private sortedBookings(): BookingResponse[] {
    return [...this.bookings()].sort((a, b) => {
      const ca = this.isCurrentBooking(a);
      const cb = this.isCurrentBooking(b);
      if (ca !== cb) return ca ? -1 : 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }

  private normalizeStatus(status: string): string {
    return normalizeBookingStatus(status);
  }
}
