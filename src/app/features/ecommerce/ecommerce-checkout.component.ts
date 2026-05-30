import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { EcommerceCartEntry } from './ecommerce.store';

@Component({
  selector: 'app-ecommerce-checkout',
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

          <label class="field">
            <span class="field-label">Name</span>
            <input type="text" formControlName="customerName" autocomplete="name" />
            @if (customerNameHint(); as hint) {
              <small class="field-hint">{{ hint }}</small>
            }
          </label>

          <label class="field">
            <span class="field-label">Phone</span>
            <input type="tel" formControlName="customerPhone" autocomplete="tel" />
            @if (customerPhoneHint(); as hint) {
              <small class="field-hint">{{ hint }}</small>
            }
          </label>

          <label class="field">
            <span class="field-label">Delivery address</span>
            <input type="text" formControlName="deliveryAddress" autocomplete="street-address" />
            @if (deliveryAddressHint(); as hint) {
              <small class="field-hint">{{ hint }}</small>
            }
          </label>

          <label class="field">
            <span class="field-label">Note <span class="optional">(optional)</span></span>
            <textarea rows="3" formControlName="note" [placeholder]="customerNoteHint() ?? 'Optional'"></textarea>
          </label>

          @if (submitError(); as error) {
            <p class="form-error">{{ error }}</p>
          } @else {
            <p class="form-hint">Review your details, then place the order.</p>
          }

          <aside class="review-card">
            <div class="review-head">
              <h4>Order review</h4>
              <span>{{ selectedCount() }} items</span>
            </div>
            <div class="review-list">
              @for (entry of selectedItems(); track entry.variant.id) {
                <div class="review-row">
                  <div>
                    <strong>{{ entry.service.name }}</strong>
                    <p>{{ variantLabel(entry) }}</p>
                    <p>{{ entry.quantity }} × {{ entry.variant.price | currency: currencyCode() : 'symbol-narrow' : '1.0-0' }}</p>
                  </div>
                  <span>{{ entry.variant.price * entry.quantity | currency: currencyCode() : 'symbol-narrow' : '1.0-0' }}</span>
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
    h4, p { margin: 0; }

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

    .checkout-body { padding: 0 16px 24px; }

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

    .optional {
      font-weight: 500;
      color: oklch(65% 0.008 30);
      font-size: 12px;
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
      box-sizing: border-box;
      font-family: inherit;
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

    .review-head h4 { font-size: 1rem; font-weight: 700; }
    .review-head span { color: var(--yoobu-muted); font-size: 0.85rem; }

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
      margin-top: 0.15rem;
      color: var(--yoobu-muted);
      font-size: 0.88rem;
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
      font-family: inherit;
    }

    .primary-button:disabled { opacity: 0.45; cursor: not-allowed; }

    .form-error { color: brown; font-size: 0.92rem; margin: 0; }
    .form-hint { color: var(--yoobu-muted); font-size: 0.92rem; line-height: 1.5; margin: 0; }
  `
})
export class EcommerceCheckoutComponent {
  readonly showNativeButtons = input.required<boolean>();
  readonly submitting = input.required<boolean>();
  readonly submitError = input.required<string | null>();
  readonly form = input.required<FormGroup>();
  readonly customerNameHint = input<string | null>(null);
  readonly customerPhoneHint = input<string | null>(null);
  readonly deliveryAddressHint = input<string | null>(null);
  readonly customerNoteHint = input<string | null>(null);
  readonly currencyCode = input<string>('USD');
  readonly selectedItems = input.required<EcommerceCartEntry[]>();
  readonly selectedCount = input.required<number>();
  readonly selectedTotal = input.required<number>();

  readonly closeRequested = output<void>();
  readonly submitRequested = output<void>();

  protected variantLabel(entry: EcommerceCartEntry): string {
    const parts = [entry.variant.color, entry.variant.size].filter(Boolean);
    return parts.join(' · ');
  }
}
