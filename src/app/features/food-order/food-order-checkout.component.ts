import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, input, output, signal } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ServiceItem } from '../../core/models/service.model';

interface CheckoutSelection {
  quantity: number;
  service: ServiceItem;
}

interface DeliveryDay {
  iso: string;
  label: string;
  sublabel: string;
  disabled: boolean;
}

@Component({
  selector: 'app-food-order-checkout',
  imports: [CurrencyPipe, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="checkout-page">
      <header class="checkout-header">
        <button type="button" class="head-action checkout-back" [disabled]="submitting()" (click)="closeRequested.emit()">← Cart</button>
        <p class="eyebrow">Checkout</p>
      </header>

      <div class="checkout-body">
        <form class="checkout-form" [formGroup]="form()" (ngSubmit)="submitRequested.emit()">

          @if (repeatOrderBanner(); as banner) {
            <section class="repeat-banner">
              <p>{{ banner }}</p>
              <button type="button" class="ghost-button" (click)="repeatOrderBannerDismissed.emit()">Dismiss</button>
            </section>
          }

          <label class="field">
            <span class="field-label">Name</span>
            <input type="text" formControlName="customerName" />
            @if (customerNameHint(); as hint) {
              <small class="field-hint">{{ hint }}</small>
            }
          </label>

          <label class="field">
            <span class="field-label">Phone</span>
            <input type="tel" formControlName="customerPhone" />
            @if (customerPhoneHint(); as hint) {
              <small class="field-hint">{{ hint }}</small>
            }
          </label>

          <label class="field">
            <span class="field-label">Delivery address</span>
            <input type="text" formControlName="deliveryAddress" />
            @if (deliveryAddressHint(); as hint) {
              <small class="field-hint">{{ hint }}</small>
            }
          </label>

          <div class="field">
            <span class="field-label">Delivery date</span>
            <div class="day-chips">
              @for (day of deliveryDays(); track day.iso) {
                <button
                  type="button"
                  class="day-chip"
                  [class.active]="selectedDate() === day.iso"
                  [disabled]="day.disabled"
                  (click)="selectDay(day.iso)"
                >
                  <span class="day-chip-label">{{ day.label }}</span>
                  <span class="day-chip-sub">{{ day.sublabel }}</span>
                </button>
              }
            </div>
          </div>

          <label class="field">
            <span class="field-label">Note</span>
            <textarea rows="3" formControlName="note" [placeholder]="customerNoteHint() ?? 'Optional'"></textarea>
          </label>

          @if (submitError(); as error) {
            <p class="form-error">{{ error }}</p>
          } @else {
            <p class="form-hint">Review your details, then submit the order.</p>
          }

          <aside class="review-card">
            <div class="review-head">
              <h4>Order review</h4>
              <span>{{ selectedCount() }} items</span>
            </div>
            <div class="review-list">
              @for (entry of selectedItems(); track entry.service.id) {
                <div class="review-row">
                  <div>
                    <strong>{{ entry.service.name }}</strong>
                    <p>{{ entry.quantity }} × {{ entry.service.price | currency: currencyCode() : 'symbol-narrow' : '1.0-0' }}</p>
                  </div>
                  <span>{{ (entry.service.price ?? 0) * entry.quantity | currency: currencyCode() : 'symbol-narrow' : '1.0-0' }}</span>
                </div>
              }
            </div>
            <div class="review-total">
              <span>Total</span>
              <strong>{{ selectedTotal() | currency: currencyCode() : 'symbol-narrow' : '1.0-0' }}</strong>
            </div>
          </aside>

          @if (showNativeButtons()) {
            <button type="submit" class="primary-button" [disabled]="submitting()">
              {{ submitting() ? 'Submitting...' : 'Place order' }}
            </button>
          }

        </form>
      </div>
    </div>
  `,
  styles: `
    h4,
    p {
      margin: 0;
    }

    .checkout-page {
      min-height: 100vh;
      background: oklch(92.5% 0.022 28);
      padding-bottom: 100px;
    }

    .checkout-header {
      background: #fff;
      border-bottom: 1px solid var(--yoobu-border);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 10px 14px;
    }

    .checkout-back {
      flex-shrink: 0;
    }

    .checkout-body {
      padding: 0 16px 24px;
    }

    .checkout-form {
      display: flex;
      flex-direction: column;
      gap: 18px;
      padding-top: 16px;
    }

    .field {
      display: flex;
      flex-direction: column;
      gap: 7px;
    }

    .field-label {
      font-weight: 800;
      font-size: 14px;
      color: #1a1a1a;
    }

    .field input,
    .field textarea {
      width: 100%;
      padding: 11px 13px;
      border-radius: 12px;
      border: 1.5px solid var(--yoobu-border);
      background: #fff;
      color: var(--yoobu-ink);
      font-size: 15px;
    }

    .field input.ng-invalid.ng-touched,
    .field textarea.ng-invalid.ng-touched {
      border-color: rgba(165, 42, 42, 0.35);
    }

    .field-hint {
      color: var(--yoobu-muted);
      font-size: 0.84rem;
      line-height: 1.35;
      font-weight: 500;
    }

    .day-chips {
      display: flex;
      gap: 6px;
      overflow-x: auto;
      padding-bottom: 4px;
      scrollbar-width: none;
    }

    .day-chips::-webkit-scrollbar {
      display: none;
    }

    .day-chip {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: #fff;
      border: 1.5px solid oklch(90% 0.010 28);
      border-radius: 10px;
      cursor: pointer;
      min-width: 50px;
      padding: 7px 6px;
      gap: 2px;
      flex-shrink: 0;
      transition: background 0.15s, border-color 0.15s, color 0.15s;
    }

    .day-chip.active {
      background: var(--yoobu-primary);
      border-color: var(--yoobu-primary);
      color: #fff;
      box-shadow: 0 3px 10px rgba(255, 107, 53, 0.32);
    }

    .day-chip:disabled {
      opacity: 0.38;
      cursor: not-allowed;
    }

    .day-chip-label {
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      color: oklch(65% 0.008 30);
    }

    .day-chip.active .day-chip-label {
      color: rgba(255, 255, 255, 0.8);
    }

    .day-chip-sub {
      font-size: 11px;
      font-weight: 800;
    }

    .repeat-banner {
      display: flex;
      justify-content: space-between;
      gap: 0.75rem;
      align-items: center;
      padding: 0.75rem 0.85rem;
      border-radius: 12px;
      border: 1px solid var(--yoobu-border-accent);
      background: var(--yoobu-primary-soft);
    }

    .repeat-banner p {
      font-size: 0.88rem;
      line-height: 1.4;
    }

    .review-card {
      background: var(--yoobu-surface-tint);
      border-radius: 16px;
      border: 1px solid var(--yoobu-border-soft);
      padding: 14px 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .review-head {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      gap: 0.75rem;
    }

    .review-head h4 {
      font-size: 1rem;
      font-weight: 700;
    }

    .review-head span {
      color: var(--yoobu-muted);
      font-size: 0.85rem;
    }

    .review-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .review-row {
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
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 10px;
      border-top: 1px solid var(--yoobu-border);
    }

    .primary-button {
      background: linear-gradient(135deg, var(--yoobu-primary), #ff8c5a);
      color: #fff;
      border: 0;
      border-radius: 999px;
      padding: 14px 24px;
      font-weight: 700;
      font-size: 16px;
      cursor: pointer;
      box-shadow: 0 8px 28px rgba(255, 107, 53, 0.38);
      width: 100%;
    }

    .primary-button:disabled {
      opacity: 0.45;
      cursor: not-allowed;
    }

    .form-error {
      color: brown;
      font-size: 0.92rem;
      margin: 0;
    }

    .form-hint {
      color: var(--yoobu-muted);
      font-size: 0.92rem;
      line-height: 1.5;
      margin: 0;
    }
  `
})
export class FoodOrderCheckoutComponent {
  readonly showNativeButtons = input.required<boolean>();
  readonly submitting = input.required<boolean>();
  readonly submitError = input.required<string | null>();
  readonly repeatOrderBanner = input<string | null>(null);
  readonly form = input.required<FormGroup>();
  readonly customerNameHint = input<string | null>(null);
  readonly customerPhoneHint = input<string | null>(null);
  readonly deliveryAddressHint = input<string | null>(null);
  readonly customerNoteHint = input<string | null>(null);
  readonly currencyCode = input<string>('VND');
  readonly selectedItems = input.required<CheckoutSelection[]>();
  readonly selectedCount = input.required<number>();
  readonly selectedTotal = input.required<number>();
  readonly earliestDeliveryDate = input<string | null>(null);

  readonly closeRequested = output<void>();
  readonly repeatOrderBannerDismissed = output<void>();
  readonly submitRequested = output<void>();

  private static readonly DAY_ABBREVS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  private static readonly MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  protected readonly selectedDate = signal<string>('');

  protected readonly deliveryDays = computed<DeliveryDay[]>(() => {
    const earliest = this.earliestDeliveryDate();
    const startIso = earliest ?? this.todayIso();
    const todayStr = this.todayIso();
    const start = new Date(startIso + 'T00:00:00');
    const days: DeliveryDay[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const iso = this.toIso(d);
      days.push({
        iso,
        label: iso === todayStr ? 'Today' : FoodOrderCheckoutComponent.DAY_ABBREVS[d.getDay()],
        sublabel: `${FoodOrderCheckoutComponent.MONTH_NAMES[d.getMonth()]} ${d.getDate()}`,
        disabled: false
      });
    }
    return days;
  });

  constructor() {
    effect(() => {
      const date = (this.form().get('deliveryDate')?.value as string) ?? '';
      this.selectedDate.set(date);
    });
  }

  protected selectDay(iso: string): void {
    this.selectedDate.set(iso);
    this.form().get('deliveryDate')?.setValue(iso);
    this.form().get('deliveryDate')?.markAsTouched();
  }

  private todayIso(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  private toIso(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
}
