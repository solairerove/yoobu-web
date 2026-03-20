import { computed, Injectable, signal } from '@angular/core';
import { ServiceItem } from '../../core/models/service.model';

@Injectable({ providedIn: 'root' })
export class FoodOrderStore {
  private readonly slugSignal = signal<string | null>(null);
  private readonly servicesSignal = signal<ServiceItem[]>([]);
  private readonly quantitiesSignal = signal<Record<number, number>>({});

  readonly services = computed(() => this.servicesSignal());
  readonly quantities = computed(() => this.quantitiesSignal());
  readonly selectedItems = computed(() =>
    this.servicesSignal()
      .map((service) => ({
        service,
        quantity: this.quantitiesSignal()[service.id] ?? 0
      }))
      .filter((entry) => entry.quantity > 0)
  );
  readonly selectedCount = computed(() =>
    this.selectedItems().reduce((sum, entry) => sum + entry.quantity, 0)
  );
  readonly selectedTotal = computed(() =>
    this.selectedItems().reduce((sum, entry) => sum + entry.service.price * entry.quantity, 0)
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
    const allowedIds = new Set(services.map((service) => service.id));

    this.quantitiesSignal.update((current) =>
      Object.fromEntries(
        Object.entries(current).filter(([serviceId, quantity]) => {
          return allowedIds.has(Number(serviceId)) && quantity > 0;
        })
      )
    );
  }

  quantityFor(serviceId: number): number {
    return this.quantitiesSignal()[serviceId] ?? 0;
  }

  increase(serviceId: number): void {
    this.quantitiesSignal.update((current) => ({
      ...current,
      [serviceId]: (current[serviceId] ?? 0) + 1
    }));
  }

  decrease(serviceId: number): void {
    this.quantitiesSignal.update((current) => {
      const nextQuantity = Math.max((current[serviceId] ?? 0) - 1, 0);

      if (nextQuantity === 0) {
        const rest = { ...current };
        delete rest[serviceId];
        return rest;
      }

      return {
        ...current,
        [serviceId]: nextQuantity
      };
    });
  }

  setQuantities(quantities: Record<number, number>): void {
    const allowedIds = new Set(this.servicesSignal().map((service) => service.id));
    this.quantitiesSignal.set(
      Object.fromEntries(
        Object.entries(quantities).filter(([serviceId, quantity]) => {
          return allowedIds.has(Number(serviceId)) && Number.isFinite(quantity) && quantity > 0;
        })
      )
    );
  }

  clearCart(): void {
    this.quantitiesSignal.set({});
  }
}
