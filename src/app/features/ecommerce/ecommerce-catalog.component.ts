import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { ProductVariant, ServiceItem } from '../../core/models/service.model';
import { EcommerceStore } from './ecommerce.store';

@Component({
  selector: 'app-ecommerce-catalog',
  imports: [CurrencyPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="catalog-shell">
      <div class="category-header">
        <span class="category-label">All products</span>
        <div class="category-rule"></div>
      </div>

      <div class="product-list">
        @for (service of services(); track service.id) {
          <article class="product-card">
            <div class="product-thumb">
              @if (service.imageUrl) {
                <img class="product-img" [src]="service.imageUrl" [alt]="service.name" loading="lazy" />
              } @else {
                <div class="product-img-placeholder" aria-hidden="true"></div>
              }
              @if (isAllSoldOut(service)) {
                <div class="product-sold-out-overlay">
                  <span class="product-sold-out-label">Sold out</span>
                </div>
              }
            </div>

            <div class="product-info">
              <div class="product-name">{{ service.name }}</div>
              @if (service.description) {
                <div class="product-desc">{{ service.description }}</div>
              }

              <div class="variants-list">
                @for (variant of service.variants; track variant.id) {
                  @let qty = quantityFor(variant.id);
                  @let outOfStock = variant.stock === 0;
                  @let lowStock = !outOfStock && variant.stock <= 3;
                  @let images = variantImages(variant);
                  @let hasGallery = images.length > 0;

                  <div class="variant-row" [class.variant-out-of-stock]="outOfStock">
                    <div class="variant-left">
                      <div
                        class="variant-thumb"
                        [class.has-gallery]="hasGallery"
                        (click)="hasGallery ? openGallery(variant, service) : null"
                        [attr.role]="hasGallery ? 'button' : null"
                        [attr.aria-label]="hasGallery ? 'View images for ' + variantLabel(variant) : null"
                      >
                        @if (primaryImage(variant, service); as src) {
                          <img class="variant-img" [src]="src" [alt]="variantLabel(variant)" loading="lazy" />
                        } @else {
                          <div class="variant-img-placeholder" aria-hidden="true"></div>
                        }
                        @if (images.length > 1) {
                          <span class="gallery-badge">{{ images.length }}</span>
                        }
                      </div>
                      <div class="variant-meta">
                        <span class="variant-label">{{ variantLabel(variant) }}</span>
                        <span class="variant-price">
                          {{ variant.price | currency: currencyCode() : 'symbol-narrow' : '1.0-0' }}
                        </span>
                        @if (outOfStock) {
                          <span class="out-of-stock-badge">Out of stock</span>
                        } @else if (lowStock) {
                          <span class="low-stock-badge">Only {{ variant.stock }} left</span>
                        } @else {
                          <span class="stock-badge">{{ variant.stock }} left</span>
                        }
                      </div>
                    </div>

                    @if (!outOfStock) {
                      @if (qty === 0) {
                        <button
                          type="button"
                          class="qty-add"
                          (click)="increaseRequested.emit({ variantId: variant.id, stock: variant.stock })"
                          [attr.aria-label]="'Add ' + variantLabel(variant)"
                        >+</button>
                      } @else {
                        <div class="qty-pill">
                          <button
                            type="button"
                            class="qty-pill-btn"
                            (click)="decreaseRequested.emit(variant.id)"
                            [attr.aria-label]="'Decrease ' + variantLabel(variant)"
                          >−</button>
                          <span class="qty-pill-val">{{ qty }}</span>
                          <button
                            type="button"
                            class="qty-pill-btn"
                            (click)="increaseRequested.emit({ variantId: variant.id, stock: variant.stock })"
                            [disabled]="qty >= maxFor(variant)"
                            [attr.aria-label]="'Increase ' + variantLabel(variant)"
                          >+</button>
                        </div>
                      }
                    }
                  </div>
                }

                @if (!service.variants.length) {
                  <p class="no-variants">No variants available.</p>
                }
              </div>
            </div>
          </article>
        }
      </div>
    </div>

    @if (galleryOpen()) {
      <div
        class="gallery-overlay"
        (click)="closeGallery()"
        (touchstart)="onTouchStart($event)"
        (touchend)="onTouchEnd($event)"
      >
        <button type="button" class="gallery-x" (click)="closeGallery()" aria-label="Close gallery">&#x2715;</button>

        <div class="gallery-box" (click)="$event.stopPropagation()">
          @if (galleryImages().length > 1) {
            <button type="button" class="gallery-nav gallery-prev" (click)="prevImg()" aria-label="Previous image">
              &#x2039;
            </button>
          }
          <img
            class="gallery-img"
            [src]="galleryImages()[galleryIdx()]"
            [alt]="galleryAlt()"
            loading="eager"
          />
          @if (galleryImages().length > 1) {
            <button type="button" class="gallery-nav gallery-next" (click)="nextImg()" aria-label="Next image">
              &#x203a;
            </button>
          }
        </div>

        @if (galleryImages().length > 1) {
          <div class="gallery-dots" (click)="$event.stopPropagation()">
            @for (img of galleryImages(); track $index; let i = $index) {
              <button
                type="button"
                class="gallery-dot"
                [class.gallery-dot--active]="i === galleryIdx()"
                (click)="setImg(i)"
                [attr.aria-label]="'Image ' + (i + 1)"
              ></button>
            }
          </div>
        }

        <span class="gallery-hint">Tap outside to close</span>
      </div>
    }
  `,
  styles: `
    .catalog-shell {
      display: flex;
      flex-direction: column;
    }

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

    .product-list {
      padding-bottom: 8px;
    }

    /* ── Product card ── */
    .product-card {
      background: #fff;
      margin: 0 12px 10px;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 1px 6px rgba(0, 0, 0, 0.06);
      display: flex;
      flex-direction: column;
    }

    .product-thumb {
      width: 100%;
      height: 160px;
      position: relative;
      flex-shrink: 0;
    }

    .product-img,
    .product-img-placeholder {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      display: block;
      object-fit: cover;
    }

    .product-sold-out-overlay {
      position: absolute;
      inset: 0;
      background: rgba(0, 0, 0, 0.45);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .product-sold-out-label {
      background: rgba(0, 0, 0, 0.65);
      color: #fff;
      font-size: 13px;
      font-weight: 800;
      letter-spacing: 0.5px;
      padding: 5px 14px;
      border-radius: 999px;
      border: 1.5px solid rgba(255, 255, 255, 0.35);
    }

    .product-img-placeholder {
      background: repeating-linear-gradient(
        -45deg,
        oklch(86% 0.018 30) 0,
        oklch(86% 0.018 30) 9px,
        oklch(91% 0.010 30) 9px,
        oklch(91% 0.010 30) 18px
      );
    }

    .product-info {
      padding: 12px 14px 14px;
    }

    .product-name {
      font-weight: 800;
      font-size: 15px;
      color: #1a1a1a;
      margin-bottom: 4px;
    }

    .product-desc {
      font-size: 12.5px;
      color: oklch(50% 0.01 30);
      line-height: 1.5;
      margin-bottom: 10px;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    /* ── Variants ── */
    .variants-list {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .variant-row {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 10px;
      background: oklch(97% 0.006 30);
      border-radius: 12px;
      border: 1px solid oklch(92% 0.008 30);
      transition: opacity 0.18s;
    }

    .variant-row.variant-out-of-stock {
      opacity: 0.48;
    }

    .variant-left {
      flex: 1;
      display: flex;
      align-items: center;
      gap: 10px;
      min-width: 0;
    }

    .variant-thumb {
      width: 44px;
      height: 44px;
      border-radius: 10px;
      overflow: hidden;
      flex-shrink: 0;
      position: relative;
    }

    .variant-thumb.has-gallery {
      cursor: pointer;
    }

    .variant-thumb.has-gallery::after {
      content: '';
      position: absolute;
      inset: 0;
      border-radius: 10px;
      box-shadow: inset 0 0 0 1.5px rgba(255, 255, 255, 0.35);
      pointer-events: none;
    }

    .variant-img,
    .variant-img-placeholder {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .variant-img-placeholder {
      background: repeating-linear-gradient(
        -45deg,
        oklch(86% 0.018 30) 0,
        oklch(86% 0.018 30) 6px,
        oklch(91% 0.010 30) 6px,
        oklch(91% 0.010 30) 12px
      );
    }

    .gallery-badge {
      position: absolute;
      bottom: 3px;
      right: 3px;
      background: rgba(0, 0, 0, 0.62);
      color: #fff;
      font-size: 9px;
      font-weight: 800;
      line-height: 1;
      padding: 2px 4px;
      border-radius: 4px;
      pointer-events: none;
    }

    .variant-meta {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }

    .variant-label {
      font-weight: 700;
      font-size: 13px;
      color: #1a1a1a;
    }

    .variant-price {
      font-weight: 800;
      font-size: 14px;
      color: oklch(38% 0.11 145);
    }

    .out-of-stock-badge {
      font-size: 10px;
      font-weight: 700;
      color: oklch(38% 0.13 22);
      background: oklch(92% 0.04 22);
      padding: 1px 6px;
      border-radius: 4px;
      width: fit-content;
    }

    .stock-badge {
      font-size: 10px;
      color: oklch(50% 0.01 30);
    }

    .low-stock-badge {
      font-size: 10px;
      font-weight: 700;
      color: oklch(42% 0.14 55);
      background: oklch(94% 0.06 75);
      padding: 1px 6px;
      border-radius: 4px;
      width: fit-content;
    }

    .no-variants {
      margin: 0;
      font-size: 13px;
      color: oklch(65% 0.008 30);
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

    .qty-add:not(:disabled):active { transform: scale(0.92); }

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

    .qty-pill-btn:disabled { opacity: 0.5; cursor: not-allowed; }

    .qty-pill-val {
      font-weight: 800;
      font-size: 14px;
      color: #fff;
      min-width: 18px;
      text-align: center;
      font-variant-numeric: tabular-nums;
    }

    /* ── Image gallery overlay ── */
    .gallery-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.92);
      z-index: 200;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 16px;
    }

    .gallery-x {
      position: absolute;
      top: max(16px, env(safe-area-inset-top));
      right: 16px;
      width: 34px;
      height: 34px;
      background: rgba(255, 255, 255, 0.15);
      border: none;
      border-radius: 50%;
      color: #fff;
      font-size: 14px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .gallery-box {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      max-width: 100vw;
      max-height: 72vh;
      padding: 0 52px;
      box-sizing: border-box;
    }

    .gallery-img {
      max-width: 100%;
      max-height: 70vh;
      object-fit: contain;
      border-radius: 12px;
      display: block;
      user-select: none;
      pointer-events: none;
    }

    .gallery-nav {
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      width: 40px;
      height: 40px;
      background: rgba(255, 255, 255, 0.18);
      border: none;
      border-radius: 50%;
      color: #fff;
      font-size: 22px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .gallery-prev { left: 4px; }
    .gallery-next { right: 4px; }

    .gallery-dots {
      display: flex;
      gap: 7px;
      padding: 4px 0;
    }

    .gallery-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      border: none;
      background: rgba(255, 255, 255, 0.35);
      cursor: pointer;
      padding: 0;
      transition: background 0.15s, transform 0.15s;
    }

    .gallery-dot--active {
      background: #fff;
      transform: scale(1.25);
    }

    .gallery-hint {
      font-size: 12px;
      color: rgba(255, 255, 255, 0.35);
    }
  `
})
export class EcommerceCatalogComponent {
  readonly services = input.required<ServiceItem[]>();
  readonly currencyCode = input.required<string>();
  readonly quantities = input.required<Record<number, number>>();

  readonly increaseRequested = output<{ variantId: number; stock: number }>();
  readonly decreaseRequested = output<number>();

  private readonly _openVariant = signal<ProductVariant | null>(null);
  private readonly _openService = signal<ServiceItem | null>(null);
  private readonly _galleryIdx = signal(0);
  private touchStartX = 0;

  protected readonly galleryOpen = computed(() => this._openVariant() !== null);
  protected readonly galleryImages = computed(() => this.variantImages(this._openVariant()));
  protected readonly galleryIdx = this._galleryIdx.asReadonly();
  protected readonly galleryAlt = computed(
    () => this._openVariant() ? this.variantLabel(this._openVariant()!) : 'Product image'
  );

  protected isAllSoldOut(service: ServiceItem): boolean {
    return service.variants.length > 0 && service.variants.every((v) => v.stock === 0);
  }

  protected quantityFor(variantId: number): number {
    return this.quantities()[variantId] ?? 0;
  }

  protected maxFor(variant: ProductVariant): number {
    return Math.min(EcommerceStore.MAX_ITEM_QUANTITY, variant.stock);
  }

  protected variantLabel(variant: ProductVariant): string {
    const parts = [variant.color, variant.size].filter(Boolean);
    return parts.join(' · ') || 'Default';
  }

  protected variantImages(variant: ProductVariant | null): string[] {
    if (!variant) return [];
    return variant.imageUrls?.length ? variant.imageUrls : (variant.imageUrl ? [variant.imageUrl] : []);
  }

  protected primaryImage(variant: ProductVariant, service: ServiceItem): string | null {
    return this.variantImages(variant)[0] ?? service.imageUrl ?? null;
  }

  protected openGallery(variant: ProductVariant, service: ServiceItem): void {
    this._openVariant.set(variant);
    this._openService.set(service);
    this._galleryIdx.set(0);
  }

  protected closeGallery(): void {
    this._openVariant.set(null);
    this._openService.set(null);
  }

  protected prevImg(): void {
    const len = this.galleryImages().length;
    this._galleryIdx.update((i) => (i - 1 + len) % len);
  }

  protected nextImg(): void {
    const len = this.galleryImages().length;
    this._galleryIdx.update((i) => (i + 1) % len);
  }

  protected setImg(index: number): void {
    this._galleryIdx.set(index);
  }

  protected onTouchStart(e: TouchEvent): void {
    this.touchStartX = e.touches[0].clientX;
  }

  protected onTouchEnd(e: TouchEvent): void {
    const dx = e.changedTouches[0].clientX - this.touchStartX;
    if (Math.abs(dx) > 44) {
      dx < 0 ? this.nextImg() : this.prevImg();
    }
  }
}
