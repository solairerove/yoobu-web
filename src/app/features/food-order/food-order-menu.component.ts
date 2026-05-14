import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { ServiceItem } from '../../core/models/service.model';
import { FoodOrderStore } from './food-order.store';

@Component({
  selector: 'app-food-order-menu',
  imports: [CurrencyPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="menu-shell">
      <div class="category-header">
        <span class="category-label">All</span>
        <div class="category-rule"></div>
      </div>

      <div class="item-list">
        @for (service of services(); track service.id) {
          <article class="item-row" [class.sold-out]="isSoldOut(service)">
            <div class="item-thumb">
              @if (service.imageUrl) {
                <img
                  class="item-img"
                  [src]="service.imageUrl"
                  [alt]="service.name"
                  loading="lazy"
                />
              } @else {
                <div class="item-img-placeholder" aria-hidden="true"></div>
              }
              @if (isSoldOut(service)) {
                <div class="sold-out-overlay" aria-label="sold out">
                  <span class="sold-out-label">sold out</span>
                </div>
              }
            </div>

            <div class="item-content">
              <div class="item-top">
                <div class="item-name">{{ service.name }}</div>
                @if (service.description) {
                  <div class="item-desc">{{ service.description }}</div>
                }
              </div>
              <div class="item-footer">
                <span class="item-price">
                  {{ service.price | currency: currencyCode() : 'symbol-narrow' : '1.0-0' }}
                </span>
                @if (!isSoldOut(service)) {
                  @if (quantityFor(service.id) === 0) {
                    <button
                      type="button"
                      class="qty-add"
                      (click)="increaseRequested.emit(service.id)"
                      [disabled]="maxed(service.id)"
                      [attr.aria-label]="'Add ' + service.name"
                    >+</button>
                  } @else {
                    <div class="qty-pill">
                      <button
                        type="button"
                        class="qty-pill-btn"
                        (click)="decreaseRequested.emit(service.id)"
                        [attr.aria-label]="'Decrease ' + service.name"
                      >−</button>
                      <span class="qty-pill-val">{{ quantityFor(service.id) }}</span>
                      <button
                        type="button"
                        class="qty-pill-btn"
                        (click)="increaseRequested.emit(service.id)"
                        [disabled]="maxed(service.id)"
                        [attr.aria-label]="'Increase ' + service.name"
                      >+</button>
                    </div>
                  }
                }
              </div>
            </div>
          </article>
        }
      </div>
    </div>
  `,
  styles: `
    .menu-shell {
      display: flex;
      flex-direction: column;
    }

    /* ── Sticky category header ── */
    .category-header {
      position: sticky;
      top: 0;
      z-index: 10;
      background: oklch(92.5% 0.022 28);
      padding: 10px 14px 6px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .category-label {
      font-weight: 800;
      font-size: 12px;
      color: oklch(37% 0.07 82);
      letter-spacing: 0.8px;
      text-transform: uppercase;
      white-space: nowrap;
    }

    .category-rule {
      flex: 1;
      height: 1px;
      background: oklch(90% 0.010 28);
    }

    /* ── Item list ── */
    .item-list {
      padding-bottom: 8px;
    }

    /* ── Row card ── */
    .item-row {
      display: flex;
      align-items: stretch;
      background: #fff;
      margin: 0 12px 8px;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 1px 6px rgba(0, 0, 0, 0.06);
      transition: opacity 180ms ease;
    }

    .item-row.sold-out {
      opacity: 0.5;
    }

    /* ── Thumbnail ── */
    .item-thumb {
      width: 110px;
      flex-shrink: 0;
      position: relative;
    }

    .item-img,
    .item-img-placeholder {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      display: block;
      object-fit: cover;
      object-position: center;
    }

    .item-img-placeholder {
      background: repeating-linear-gradient(
        -45deg,
        oklch(86% 0.018 30) 0,
        oklch(86% 0.018 30) 9px,
        oklch(91% 0.010 30) 9px,
        oklch(91% 0.010 30) 18px
      );
    }

    .sold-out-overlay {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(255, 255, 255, 0.6);
    }

    .sold-out-label {
      font-family: monospace;
      font-size: 10px;
      color: oklch(65% 0.008 30);
      background: rgba(255, 255, 255, 0.8);
      padding: 2px 6px;
      border-radius: 4px;
    }

    /* ── Content ── */
    .item-content {
      flex: 1;
      padding: 12px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      min-width: 0;
    }

    .item-top {
      display: flex;
      flex-direction: column;
      gap: 3px;
    }

    .item-name {
      font-weight: 800;
      font-size: 14px;
      color: #1a1a1a;
      line-height: 1.3;
      letter-spacing: -0.1px;
    }

    .item-desc {
      font-size: 12px;
      color: oklch(50% 0.01 30);
      line-height: 1.5;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    /* ── Footer: price + qty ── */
    .item-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      margin-top: 4px;
    }

    .item-price {
      font-weight: 800;
      font-size: 18px;
      color: oklch(38% 0.11 145);
      letter-spacing: -0.3px;
      white-space: nowrap;
    }

    /* ── Qty add circle ── */
    .qty-add {
      width: 36px;
      height: 36px;
      background: oklch(37% 0.07 82);
      border: none;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fff;
      font-size: 22px;
      line-height: 1;
      cursor: pointer;
      flex-shrink: 0;
      box-shadow: 0 2px 8px rgba(55, 65, 28, 0.22);
      padding: 0;
    }

    .qty-add:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    .qty-add:not(:disabled):active {
      transform: scale(0.92);
    }

    /* ── Qty pill ── */
    .qty-pill {
      display: flex;
      align-items: center;
      background: oklch(37% 0.07 82);
      border-radius: 999px;
      overflow: hidden;
      flex-shrink: 0;
    }

    .qty-pill-btn {
      width: 32px;
      height: 36px;
      border: none;
      background: transparent;
      color: #fff;
      font-size: 20px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0;
    }

    .qty-pill-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .qty-pill-val {
      font-weight: 800;
      font-size: 14px;
      color: #fff;
      min-width: 18px;
      text-align: center;
      font-variant-numeric: tabular-nums;
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

  protected quantityFor(serviceId: number): number {
    return this.quantities()[serviceId] ?? 0;
  }

  protected maxed(serviceId: number): boolean {
    return this.quantityFor(serviceId) >= FoodOrderStore.MAX_ITEM_QUANTITY;
  }

  protected isSoldOut(service: ServiceItem): boolean {
    return service.status !== 'ACTIVE';
  }
}
