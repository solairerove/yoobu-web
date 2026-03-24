import { CurrencyPipe, NgFor, NgIf } from '@angular/common';
import { Component, input, output } from '@angular/core';
import { ServiceItem } from '../../core/models/service.model';

@Component({
  selector: 'app-food-order-menu',
  imports: [CurrencyPipe, NgFor, NgIf],
  template: `
    <section class="catalog-shell">
      <div class="catalog-note">
        <span class="catalog-dot"></span>
        <p>Tap + on any item to add it to your cart.</p>
      </div>

      <div class="catalog">
        <article
          class="product-card"
          *ngFor="let service of services(); trackBy: trackByServiceId"
          [class.selected]="quantityFor(service.id) > 0"
        >
          <div class="product-accent"></div>

          <figure class="product-image-shell">
            <img
              *ngIf="service.imageUrl; else productImagePlaceholder"
              class="product-image"
              [src]="service.imageUrl"
              [alt]="service.name"
              loading="lazy"
            />
            <ng-template #productImagePlaceholder>
              <div class="product-image-placeholder" aria-hidden="true">
                <span>{{ serviceInitial(service.name) }}</span>
              </div>
            </ng-template>
          </figure>

          <div class="product-copy">
            <div class="product-topline">
              <p class="unit">{{ service.unit || defaultUnit() }}</p>
            </div>

            <div class="product-meta">
              <h3>{{ service.name }}</h3>
            </div>

            <p class="description" *ngIf="service.description">{{ service.description }}</p>
            <p class="selection-copy" [class.selection-copy--visible]="quantityFor(service.id) > 0">
              {{ quantityFor(service.id) }} selected
            </p>
          </div>

          <div class="product-side">
            <div class="price-row">
              <p class="price">{{ service.price | currency: currencyCode() : 'symbol-narrow' : '1.0-0' }}</p>
              <button
                *ngIf="quantityFor(service.id) === 0"
                type="button"
                class="add-button"
                (click)="increaseRequested.emit(service.id)"
                [attr.aria-label]="'Add ' + service.name"
              >
                <span aria-hidden="true">+</span>
              </button>
            </div>
            <div class="quantity" *ngIf="quantityFor(service.id) > 0">
              <button
                type="button"
                class="quantity-button quantity-button-decrease"
                (click)="decreaseRequested.emit(service.id)"
                [attr.aria-label]="'Decrease quantity for ' + service.name"
              >
                <span aria-hidden="true">−</span>
              </button>
              <span class="quantity-value" aria-live="polite">{{ quantityFor(service.id) }}</span>
              <button
                type="button"
                class="quantity-button quantity-button-increase"
                (click)="increaseRequested.emit(service.id)"
                [attr.aria-label]="'Increase quantity for ' + service.name"
              >
                <span aria-hidden="true">+</span>
              </button>
            </div>
          </div>
        </article>
      </div>
    </section>
  `,
  styles: `
    h3,
    p {
      margin: 0;
    }

    .catalog-shell {
      display: grid;
      gap: 0.8rem;
    }

    .catalog-note {
      display: flex;
      gap: 0.55rem;
      align-items: center;
      padding: 0.65rem 0.85rem;
      border-radius: 14px;
      background: var(--yoobu-surface-tint);
      border: 1px solid var(--yoobu-border-accent-soft);
    }

    .catalog-dot {
      width: 0.5rem;
      height: 0.5rem;
      border-radius: 999px;
      background: var(--yoobu-primary);
      flex-shrink: 0;
      box-shadow: var(--yoobu-ring-accent);
    }

    .catalog-note p {
      color: var(--yoobu-muted);
      font-size: 0.85rem;
      line-height: 1.4;
    }

    /* ── 2-column grid ── */
    .catalog {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0.65rem;
    }

    /* ── Vertical card ── */
    .product-card {
      display: flex;
      flex-direction: column;
      border-radius: 16px;
      background: var(--yoobu-surface-tint);
      border: 1px solid var(--yoobu-border-soft);
      position: relative;
      overflow: hidden;
      transition:
        border-color 180ms ease,
        background 180ms ease,
        box-shadow 180ms ease;
    }

    .product-card.selected {
      border-color: var(--yoobu-border-accent);
      background: linear-gradient(160deg, rgba(255, 246, 240, 0.98), rgba(255, 252, 249, 0.95));
      box-shadow: var(--yoobu-shadow-accent);
    }

    /* Top accent stripe */
    .product-accent {
      position: absolute;
      inset: 0 0 auto 0;
      height: 0.2rem;
      background: linear-gradient(90deg, var(--yoobu-primary), rgba(255, 160, 122, 0.4));
      opacity: 0.28;
      z-index: 1;
    }

    .product-card.selected .product-accent {
      opacity: 1;
    }

    /* ── Image ── */
    .product-image-shell {
      margin: 0;
      width: 100%;
      aspect-ratio: 16 / 9;
      flex-shrink: 0;
      border-radius: 0;
      overflow: hidden;
      border: none;
      border-bottom: 1px solid var(--yoobu-border-soft);
      box-shadow: none;
      background: var(--yoobu-surface-card);
    }

    .product-image {
      display: block;
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: center;
    }

    .product-image-placeholder {
      width: 100%;
      height: 100%;
      display: grid;
      place-items: center;
      color: var(--yoobu-primary);
      background: linear-gradient(135deg, rgba(255, 246, 240, 0.95), rgba(255, 253, 249, 0.98));
      font-size: 1.75rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.02em;
    }

    /* ── Body ── */
    .product-copy {
      flex: 1;
      padding: 0.6rem 0.7rem 0.5rem;
      display: flex;
      flex-direction: column;
      gap: 0.28rem;
      min-width: 0;
    }

    .product-topline {
      display: flex;
      flex-wrap: wrap;
      gap: 0.3rem;
      align-items: baseline;
    }

    .unit {
      padding: 0.1rem 0.38rem;
      border-radius: 999px;
      background: var(--yoobu-surface-muted);
      color: var(--yoobu-muted);
      font-size: 0.7rem;
    }

    .product-meta {
      display: grid;
    }

    .product-meta h3 {
      font-size: 0.88rem;
      line-height: 1.25;
      letter-spacing: -0.01em;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .description {
      color: var(--yoobu-muted);
      font-size: 0.76rem;
      line-height: 1.4;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    /* Hidden, reserves no space — qty control shows the count */
    .selection-copy {
      display: none;
    }

    /* ── Footer: price row + stepper ── */
    .product-side {
      padding: 0.5rem 0.7rem 0.6rem;
      display: grid;
      gap: 0.4rem;
      border-top: 1px solid var(--yoobu-border-soft);
    }

    .price-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.25rem;
    }

    .price {
      color: var(--yoobu-primary);
      font-weight: 800;
      white-space: nowrap;
      font-size: 0.9rem;
    }

    .add-button {
      flex-shrink: 0;
      width: 2rem;
      height: 2rem;
      border: 0;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--yoobu-primary), #ff8753);
      color: white;
      font-size: 1.15rem;
      font-weight: 700;
      line-height: 1;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      box-shadow: 0 3px 10px rgba(255, 107, 53, 0.28);
      transition: transform 120ms ease, box-shadow 120ms ease;
    }

    .add-button span {
      transform: translateY(-0.05em);
    }

    .add-button:active {
      transform: scale(0.92);
      box-shadow: inset 0 2px 4px rgba(36, 22, 15, 0.18);
    }

    /* Stepper row: [–] [ n ] [+] */
    .quantity {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.3rem;
      padding: 0.2rem 0.28rem;
      border-radius: 999px;
      background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(255, 246, 240, 0.94));
      border: 1px solid var(--yoobu-border-accent-soft);
      box-shadow:
        inset 0 1px 0 rgba(255, 255, 255, 0.8),
        var(--yoobu-shadow-sm);
    }

    .quantity button {
      cursor: pointer;
      font: inherit;
    }

    .quantity-button {
      flex-shrink: 0;
      width: 1.95rem;
      height: 1.95rem;
      border: 1px solid transparent;
      border-radius: 999px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      line-height: 1;
      font-size: 1rem;
      font-weight: 800;
      transition:
        transform 140ms ease,
        box-shadow 140ms ease,
        background 140ms ease,
        border-color 140ms ease,
        color 140ms ease,
        opacity 140ms ease;
    }

    .quantity-button span {
      transform: translateY(-0.03em);
    }

    .quantity-button-decrease {
      background: var(--yoobu-surface-card);
      border-color: var(--yoobu-border-soft);
      color: var(--yoobu-ink);
      box-shadow: var(--yoobu-shadow-xs);
    }

    .quantity-button-increase {
      background: linear-gradient(135deg, var(--yoobu-primary), #ff8753);
      color: white;
      box-shadow: 0 6px 14px rgba(255, 107, 53, 0.22);
    }

    .quantity-button:not(:disabled):active {
      transform: scale(0.94);
      box-shadow: inset 0 2px 5px rgba(36, 22, 15, 0.14);
    }

    .quantity-button:focus-visible {
      outline: 2px solid var(--yoobu-border-accent);
      outline-offset: 2px;
    }

    .quantity-button:disabled {
      opacity: 0.35;
      cursor: not-allowed;
      transform: none;
      box-shadow: none;
    }

    .quantity-value {
      min-width: 1.6rem;
      text-align: center;
      font-weight: 700;
      font-size: 0.9rem;
      color: var(--yoobu-ink);
    }
  `
})
export class FoodOrderMenuComponent {
  readonly services = input.required<ServiceItem[]>();
  readonly selectedCount = input.required<number>();
  readonly currencyCode = input.required<string>();
  readonly quantities = input.required<Record<number, number>>();
  readonly defaultUnit = input('item');
  readonly increaseRequested = output<number>();
  readonly decreaseRequested = output<number>();

  protected trackByServiceId(_index: number, service: ServiceItem): number {
    return service.id;
  }

  protected quantityFor(serviceId: number): number {
    return this.quantities()[serviceId] ?? 0;
  }

  protected serviceInitial(name: string): string {
    const trimmedName = name.trim();
    return trimmedName ? trimmedName.charAt(0).toUpperCase() : '?';
  }
}
