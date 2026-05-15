import { CurrencyPipe, NgFor, NgIf, NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ServiceItem } from '../../core/models/service.model';

interface CheckoutSelection {
  quantity: number;
  service: ServiceItem;
}

@Component({
  selector: 'app-food-order-checkout',
  imports: [CurrencyPipe, NgFor, NgIf, NgTemplateOutlet, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-container *ngIf="open()">
      <section class="checkout-card" *ngIf="localMode(); else telegramCheckout">
        <ng-container
          *ngTemplateOutlet="checkoutContent; context: { showSheetHandle: false, showSubmitButton: true }"
        />
      </section>

      <ng-template #telegramCheckout>
        <div class="checkout-overlay">
          <button
            type="button"
            class="checkout-scrim"
            aria-label="Close checkout"
            (click)="closeRequested.emit()"
          ></button>

          <section class="checkout-card checkout-sheet">
            <ng-container
              *ngTemplateOutlet="checkoutContent; context: { showSheetHandle: true, showSubmitButton: false }"
            />
          </section>
        </div>
      </ng-template>
    </ng-container>

    <ng-template #checkoutContent let-showSheetHandle="showSheetHandle" let-showSubmitButton="showSubmitButton">
      <div class="sheet-handle" aria-hidden="true" *ngIf="showSheetHandle"></div>

      <div class="checkout-head">
        <p class="eyebrow">Checkout</p>
        <button type="button" class="head-action" (click)="closeRequested.emit()" [disabled]="submitting()">
          ← Cart
        </button>
      </div>

      <div class="checkout-grid">
        <form class="checkout-form" [formGroup]="form()" (ngSubmit)="submitRequested.emit()">
          <section class="repeat-banner" *ngIf="repeatOrderBanner() as repeatOrderBanner">
            <p>{{ repeatOrderBanner }}</p>
            <button type="button" class="ghost-button" (click)="repeatOrderBannerDismissed.emit()">Dismiss</button>
          </section>

          <label>
            <span>Name</span>
            <input type="text" formControlName="customerName" />
            <small class="field-hint" *ngIf="customerNameHint() as customerNameHint">
              {{ customerNameHint }}
            </small>
          </label>

          <label>
            <span>Phone</span>
            <input type="tel" formControlName="customerPhone" />
            <small class="field-hint" *ngIf="customerPhoneHint() as customerPhoneHint">
              {{ customerPhoneHint }}
            </small>
          </label>

          <label>
            <span>Delivery address</span>
            <input type="text" formControlName="deliveryAddress" />
            <small class="field-hint" *ngIf="deliveryAddressHint() as deliveryAddressHint">
              {{ deliveryAddressHint }}
            </small>
          </label>

          <label>
            <span>Delivery date</span>
            <input type="date" formControlName="deliveryDate" [min]="earliestDeliveryDate() ?? ''" />
            <small class="field-hint cutoff-hint" *ngIf="isCutoffActive()">
              Orders for today are closed. Earliest delivery: {{ earliestDeliveryDate() }}
            </small>
          </label>

          <label>
            <span>Note</span>
            <textarea rows="4" formControlName="note"></textarea>
            <small class="field-hint" *ngIf="customerNoteHint() as customerNoteHint">
              {{ customerNoteHint }}
            </small>
          </label>

          <p class="form-error" *ngIf="submitError() as error">{{ error }}</p>
          <p class="form-hint" *ngIf="!submitError()">Review your details, then submit the order.</p>

          <button type="submit" class="primary-button" [disabled]="submitting()" *ngIf="showSubmitButton">
            {{ submitting() ? 'Submitting...' : 'Place order' }}
          </button>
        </form>

        <aside class="review-card">
          <div class="review-head">
            <h4>Order review</h4>
            <span>{{ selectedCount() }} items</span>
          </div>

          <div class="review-list">
            <div class="review-row" *ngFor="let entry of selectedItems(); trackBy: trackByServiceId">
              <div>
                <strong>{{ entry.service.name }}</strong>
                <p>{{ entry.quantity }} × {{ entry.service.price | currency: currencyCode() : 'symbol-narrow' : '1.0-0' }}</p>
              </div>
              <span>{{ entry.service.price * entry.quantity | currency: currencyCode() : 'symbol-narrow' : '1.0-0' }}</span>
            </div>
          </div>

          <div class="review-total">
            <span>Total</span>
            <strong>{{ selectedTotal() | currency: currencyCode() : 'symbol-narrow' : '1.0-0' }}</strong>
          </div>
        </aside>
      </div>
    </ng-template>
  `,
  styles: `
    h3,
    h4,
    p {
      margin: 0;
    }

    .checkout-card {
      padding: 0.95rem 1rem;
      border-radius: 18px;
      background: var(--yoobu-surface-card-soft);
      border: 1px solid var(--yoobu-border);
    }

    .checkout-overlay {
      position: fixed;
      inset: 0;
      z-index: 8;
      display: flex;
      align-items: flex-end;
      justify-content: center;
      pointer-events: none;
    }

    .checkout-scrim {
      position: absolute;
      inset: 0;
      border: 0;
      background: rgba(36, 22, 15, 0.32);
      pointer-events: auto;
      z-index: 0;
    }

    .checkout-sheet {
      position: relative;
      z-index: 1;
      width: min(720px, calc(100% - 1rem));
      max-height: min(85vh, 920px);
      margin: 0 0 max(0.5rem, env(safe-area-inset-bottom));
      border-radius: 24px 24px 0 0;
      box-shadow: var(--yoobu-shadow-modal);
      overflow: auto;
      overscroll-behavior: contain;
      -webkit-overflow-scrolling: touch;
      pointer-events: auto;
      background:
        linear-gradient(180deg, var(--yoobu-surface-card-strong), var(--yoobu-surface-tint));
    }

    .sheet-handle {
      width: 3rem;
      height: 0.32rem;
      margin: 0 auto 0.8rem;
      border-radius: 999px;
      background: var(--yoobu-border);
    }

    .checkout-head {
      display: flex;
      justify-content: space-between;
      gap: 1rem;
      align-items: center;
    }

    .checkout-grid {
      display: grid;
      grid-template-columns: minmax(0, 1.4fr) minmax(260px, 1fr);
      gap: 1rem;
      margin-top: 1rem;
    }

    .checkout-form,
    .review-card {
      display: grid;
      gap: 0.9rem;
      min-width: 0;
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

    .checkout-form label {
      display: grid;
      gap: 0.45rem;
      min-width: 0;
      font-weight: 600;
    }

    .checkout-form span {
      font-size: 0.92rem;
    }

    .checkout-form input,
    .checkout-form textarea {
      width: 100%;
      min-width: 0;
      max-width: 100%;
      padding: 0.85rem 0.95rem;
      border-radius: 14px;
      border: 1px solid var(--yoobu-border);
      background: var(--yoobu-surface-card-strong);
      color: var(--yoobu-ink);
    }

    .checkout-form input[type='date'] {
      display: block;
      inline-size: 100%;
      min-inline-size: 0;
      max-inline-size: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      -webkit-appearance: none;
      appearance: none;
    }

    .checkout-form input.ng-invalid.ng-touched,
    .checkout-form textarea.ng-invalid.ng-touched {
      border-color: rgba(165, 42, 42, 0.35);
    }

    .field-hint {
      color: var(--yoobu-muted);
      font-size: 0.84rem;
      line-height: 1.35;
      font-weight: 500;
    }

    .review-card {
      align-content: start;
      padding: 1rem;
      border-radius: 18px;
      background: var(--yoobu-surface-tint);
      border: 1px solid var(--yoobu-border-soft);
    }

    .review-head {
      display: flex;
      justify-content: space-between;
      gap: 0.75rem;
      align-items: baseline;
    }

    .review-head span {
      color: var(--yoobu-muted);
      font-size: 0.85rem;
    }

    .review-list {
      display: grid;
      gap: 0.75rem;
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
      padding-top: 0.85rem;
      border-top: 1px solid var(--yoobu-border);
    }

    .primary-button {
      cursor: pointer;
      border: 0;
      border-radius: 999px;
      padding: 0.85rem 1.2rem;
      background: linear-gradient(135deg, var(--yoobu-primary), #ff8c5a);
      color: white;
      font-weight: 700;
      box-shadow: 0 8px 28px rgba(255, 107, 53, 0.38);
    }

    .primary-button:disabled {
      opacity: 0.45;
      cursor: not-allowed;
    }

    .form-error,
    .form-hint {
      font-size: 0.92rem;
    }

    .form-error {
      color: brown;
    }

    .form-hint {
      color: var(--yoobu-muted);
      line-height: 1.5;
    }

    @media (max-width: 640px) {
      .checkout-grid {
        grid-template-columns: 1fr;
      }

      .checkout-sheet {
        width: 100%;
        max-height: calc(100vh - env(safe-area-inset-top));
        max-height: calc(100dvh - env(safe-area-inset-top));
        margin: 0;
        padding-bottom: max(0.5rem, env(safe-area-inset-bottom));
        border-radius: 24px 24px 0 0;
      }

      .review-row,
      .review-head,
      .review-total,
      .repeat-banner {
        flex-direction: column;
        align-items: flex-start;
      }
    }
  `
})
export class FoodOrderCheckoutComponent {
  readonly open = input.required<boolean>();
  readonly localMode = input.required<boolean>();
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
  protected readonly isCutoffActive = computed(() => {
    const earliest = this.earliestDeliveryDate();
    if (!earliest) return false;
    const d = new Date();
    const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return earliest > today;
  });

  readonly closeRequested = output<void>();
  readonly repeatOrderBannerDismissed = output<void>();
  readonly submitRequested = output<void>();

  protected trackByServiceId(_index: number, entry: CheckoutSelection): number {
    return entry.service.id;
  }
}
