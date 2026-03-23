import { CurrencyPipe, NgFor, NgIf } from '@angular/common';
import { Component, input, output } from '@angular/core';
import { ServiceItem } from '../../core/models/service.model';

@Component({
  selector: 'app-food-order-menu',
  imports: [CurrencyPipe, NgFor, NgIf],
  template: `
    <section class="catalog-shell">
      <div class="catalog-head">
        <div>
          <p class="eyebrow">Menu</p>
          <h3>Items</h3>
        </div>

        <div class="catalog-meta">
          <span class="catalog-pill">{{ services().length }} items</span>
          <span class="catalog-pill" *ngIf="selectedCount() > 0">{{ selectedCount() }} in cart</span>
        </div>
      </div>

      <div class="catalog-note">
        <span class="catalog-dot"></span>
        <p>Add items to your cart to continue.</p>
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
            <div class="price-block">
              <p class="price-label">Price</p>
              <p class="price">{{ service.price | currency: currencyCode() : 'symbol-narrow' : '1.0-0' }}</p>
            </div>
            <div class="quantity">
              <button
                type="button"
                class="quantity-button quantity-button-decrease"
                (click)="decreaseRequested.emit(service.id)"
                [disabled]="quantityFor(service.id) === 0"
                [attr.aria-label]="'Decrease quantity for ' + service.name"
              >
                <span aria-hidden="true">-</span>
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

    .catalog-head {
      display: flex;
      justify-content: space-between;
      gap: 1rem;
      align-items: end;
    }

    .catalog-head h3 {
      margin-top: 0.2rem;
      font-size: 1.02rem;
    }

    .catalog-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 0.45rem;
      justify-content: flex-end;
    }

    .catalog-pill {
      padding: 0.35rem 0.6rem;
      border-radius: 999px;
      background: var(--yoobu-surface-muted);
      color: var(--yoobu-muted);
      font-size: 0.8rem;
      font-weight: 700;
      white-space: nowrap;
    }

    .catalog-note {
      display: flex;
      gap: 0.55rem;
      align-items: center;
      padding: 0.8rem 0.9rem;
      border-radius: 16px;
      background: var(--yoobu-surface-tint);
      border: 1px solid var(--yoobu-border-accent-soft);
    }

    .catalog-dot {
      width: 0.6rem;
      height: 0.6rem;
      border-radius: 999px;
      background: var(--yoobu-primary);
      flex-shrink: 0;
      box-shadow: var(--yoobu-ring-accent);
    }

    .catalog-note p {
      color: var(--yoobu-muted);
      font-size: 0.9rem;
      line-height: 1.4;
    }

    .catalog {
      display: grid;
      gap: 0.6rem;
    }

    .product-card {
      display: grid;
      grid-template-columns: 5.6rem minmax(0, 1fr) auto;
      gap: 0.9rem;
      padding: 0.9rem;
      border-radius: 16px;
      background: var(--yoobu-surface-tint);
      border: 1px solid var(--yoobu-border-soft);
      align-items: center;
      position: relative;
      overflow: hidden;
      transition:
        transform 180ms ease,
        border-color 180ms ease,
        background 180ms ease,
        box-shadow 180ms ease;
    }

    .product-card.selected {
      border-color: var(--yoobu-border-accent);
      background: linear-gradient(135deg, rgba(255, 246, 240, 0.98), rgba(255, 252, 249, 0.92));
      box-shadow: var(--yoobu-shadow-accent);
    }

    .product-accent {
      position: absolute;
      inset: 0 auto 0 0;
      width: 0.3rem;
      background: linear-gradient(180deg, rgba(255, 107, 53, 0.85), rgba(255, 160, 122, 0.45));
      opacity: 0.55;
    }

    .product-card.selected .product-accent {
      opacity: 1;
    }

    .product-image-shell {
      margin: 0;
      width: 5.6rem;
      height: 4.2rem;
      border-radius: 12px;
      overflow: hidden;
      border: 1px solid var(--yoobu-border-soft);
      box-shadow: var(--yoobu-shadow-sm);
      background: var(--yoobu-surface-card);
      flex-shrink: 0;
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
      font-size: 1.4rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.02em;
    }

    .product-copy {
      min-width: 0;
      display: grid;
      gap: 0.34rem;
    }

    .product-topline {
      display: flex;
      flex-wrap: wrap;
      gap: 0.55rem;
      align-items: baseline;
    }

    .product-meta {
      display: grid;
      gap: 0.18rem;
    }

    .product-meta h3 {
      font-size: 1.04rem;
      line-height: 1.2;
      letter-spacing: -0.01em;
    }

    .product-side {
      display: grid;
      justify-items: end;
      gap: 0.6rem;
    }

    .price-block {
      display: grid;
      gap: 0.08rem;
      justify-items: end;
    }

    .price-label {
      color: var(--yoobu-muted);
      font-size: 0.72rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.12em;
    }

    .price {
      color: var(--yoobu-primary);
      font-weight: 800;
      white-space: nowrap;
      font-size: 1.02rem;
    }

    .unit {
      padding: 0.15rem 0.45rem;
      border-radius: 999px;
      background: var(--yoobu-surface-muted);
      color: var(--yoobu-muted);
      font-size: 0.82rem;
    }

    .description {
      margin-top: 0.45rem;
      color: var(--yoobu-muted);
      line-height: 1.5;
    }

    .selection-copy {
      visibility: hidden;
      font-size: 0.84rem;
      font-weight: 700;
    }

    .selection-copy--visible {
      visibility: visible;
      color: var(--yoobu-primary);
    }

    .quantity {
      display: inline-flex;
      align-items: center;
      gap: 0.32rem;
      padding: 0.24rem;
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
      width: 2.75rem;
      height: 2.75rem;
      border: 1px solid transparent;
      border-radius: 999px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      line-height: 1;
      font-size: 1.05rem;
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
      box-shadow: var(--yoobu-shadow-sm);
    }

    .quantity-button-increase {
      background: linear-gradient(135deg, var(--yoobu-primary), #ff8753);
      color: white;
      box-shadow: 0 8px 16px rgba(255, 107, 53, 0.22);
    }

    .quantity-button:not(:disabled):hover {
      transform: translateY(-1px);
    }

    .quantity-button:not(:disabled):active {
      transform: translateY(0) scale(0.96);
      box-shadow: inset 0 2px 5px rgba(36, 22, 15, 0.14);
    }

    .quantity-button:focus-visible {
      outline: 2px solid var(--yoobu-border-accent);
      outline-offset: 2px;
    }

    .quantity-button:disabled {
      opacity: 0.45;
      cursor: not-allowed;
      transform: none;
      box-shadow: none;
    }

    .quantity-value {
      min-width: 2rem;
      padding: 0 0.2rem;
      text-align: center;
      font-weight: 700;
      font-size: 0.96rem;
      color: var(--yoobu-ink);
    }

    @media (max-width: 640px) {
      .product-card {
        grid-template-columns: 4.8rem minmax(0, 1fr);
      }

      .product-image-shell {
        width: 4.8rem;
        height: 4.8rem;
        grid-row: span 2;
      }

      .catalog-head,
      .catalog-meta {
        align-items: flex-start;
        justify-content: flex-start;
      }

      .catalog-note {
        align-items: flex-start;
      }

      .product-side {
        width: 100%;
        grid-template-columns: minmax(0, 1fr) auto;
        grid-column: 1 / -1;
        align-items: center;
      }

      .quantity {
        justify-self: end;
      }
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
