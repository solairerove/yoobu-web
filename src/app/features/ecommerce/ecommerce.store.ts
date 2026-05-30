import { computed, Injectable, signal } from '@angular/core';
import { ProductVariant, ServiceItem } from '../../core/models/service.model';

export interface EcommerceCartEntry {
  service: ServiceItem;
  variant: ProductVariant;
  quantity: number;
}

@Injectable({ providedIn: 'root' })
export class EcommerceStore {
  static readonly MAX_ITEM_QUANTITY = 9;

  private readonly slugSignal = signal<string | null>(null);
  private readonly servicesSignal = signal<ServiceItem[]>([]);
  private readonly quantitiesSignal = signal<Record<number, number>>({});

  readonly services = computed(() => this.servicesSignal());
  readonly quantities = computed(() => this.quantitiesSignal());

  readonly selectedItems = computed<EcommerceCartEntry[]>(() => {
    const quantities = this.quantitiesSignal();
    const entries: EcommerceCartEntry[] = [];
    for (const service of this.servicesSignal()) {
      for (const variant of service.variants) {
        const qty = quantities[variant.id] ?? 0;
        if (qty > 0) {
          entries.push({ service, variant, quantity: qty });
        }
      }
    }
    return entries;
  });

  readonly selectedCount = computed(() =>
    this.selectedItems().reduce((sum, e) => sum + e.quantity, 0)
  );

  readonly selectedTotal = computed(() =>
    this.selectedItems().reduce((sum, e) => sum + e.variant.price * e.quantity, 0)
  );

  setTenant(slug: string): void {
    if (this.slugSignal() === slug) {
      return;
    }
    this.slugSignal.set(slug);
    this.clearCart();
    this.servicesSignal.set([]);
  }

  setServices(services: ServiceItem[]): void {
    this.servicesSignal.set(services);
    const allowedVariantIds = new Set<number>();
    for (const s of services) {
      for (const v of s.variants) {
        allowedVariantIds.add(v.id);
      }
    }
    this.quantitiesSignal.update((current) =>
      Object.fromEntries(
        Object.entries(current).filter(([variantId, qty]) =>
          allowedVariantIds.has(Number(variantId)) && qty > 0
        )
      )
    );
  }

  quantityFor(variantId: number): number {
    return this.quantitiesSignal()[variantId] ?? 0;
  }

  increase(variantId: number, stock: number): void {
    const max = Math.min(EcommerceStore.MAX_ITEM_QUANTITY, stock);
    this.quantitiesSignal.update((current) => ({
      ...current,
      [variantId]: Math.min((current[variantId] ?? 0) + 1, max)
    }));
  }

  decrease(variantId: number): void {
    this.quantitiesSignal.update((current) => {
      const next = Math.max((current[variantId] ?? 0) - 1, 0);
      if (next === 0) {
        const rest = { ...current };
        delete rest[variantId];
        return rest;
      }
      return { ...current, [variantId]: next };
    });
  }

  purgeOutOfStock(): void {
    const stockByVariantId = new Map<number, number>();
    for (const s of this.servicesSignal()) {
      for (const v of s.variants) {
        stockByVariantId.set(v.id, v.stock);
      }
    }
    this.quantitiesSignal.update((current) =>
      Object.fromEntries(
        Object.entries(current).filter(([variantId, qty]) => {
          const stock = stockByVariantId.get(Number(variantId)) ?? 0;
          return stock > 0 && qty <= stock;
        })
      )
    );
  }

  clearCart(): void {
    this.quantitiesSignal.set({});
  }
}
