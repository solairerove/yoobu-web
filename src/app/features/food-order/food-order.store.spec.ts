import { FoodOrderStore } from './food-order.store';
import { ServiceItem } from '../../core/models/service.model';

describe('FoodOrderStore', () => {
  let store: FoodOrderStore;

  const serviceA: ServiceItem = {
    id: 1,
    name: 'Coffee',
    description: null,
    imageUrl: null,
    price: 30000,
    unit: 'cup',
    durationMinutes: null,
    sortOrder: 1,
    status: 'ACTIVE',
    variants: []
  };

  const serviceB: ServiceItem = {
    id: 2,
    name: 'Tea',
    description: null,
    imageUrl: null,
    price: 20000,
    unit: 'cup',
    durationMinutes: null,
    sortOrder: 2,
    status: 'ACTIVE',
    variants: []
  };

  beforeEach(() => {
    store = new FoodOrderStore();
    store.setServices([serviceA, serviceB]);
  });

  it('computes selected count and total from item quantities', () => {
    store.increase(serviceA.id);
    store.increase(serviceA.id);
    store.increase(serviceB.id);

    expect(store.selectedCount()).toBe(3);
    expect(store.selectedTotal()).toBe(80000);
  });

  it('removes missing services from cart when catalog changes', () => {
    store.increase(serviceA.id);
    store.increase(serviceB.id);

    store.setServices([serviceA]);

    expect(store.quantityFor(serviceA.id)).toBe(1);
    expect(store.quantityFor(serviceB.id)).toBe(0);
    expect(store.selectedItems().map((entry) => entry.service.id)).toEqual([serviceA.id]);
  });

  it('sets cart quantities from a prepared snapshot and ignores unknown services', () => {
    store.setQuantities({
      [serviceA.id]: 2,
      [serviceB.id]: 1,
      99: 5
    });

    expect(store.quantityFor(serviceA.id)).toBe(2);
    expect(store.quantityFor(serviceB.id)).toBe(1);
    expect(store.quantityFor(99)).toBe(0);
    expect(store.selectedCount()).toBe(3);
  });

  it('clears tenant state when slug changes', () => {
    store.setTenant('demo');
    store.increase(serviceA.id);

    store.setTenant('another-tenant');

    expect(store.selectedCount()).toBe(0);
    expect(store.services()).toEqual([]);
  });

  it('caps item quantity at 9 when increasing repeatedly', () => {
    for (let i = 0; i < 20; i += 1) {
      store.increase(serviceA.id);
    }

    expect(store.quantityFor(serviceA.id)).toBe(9);
  });

  it('caps prepared snapshot quantities at 9', () => {
    store.setQuantities({
      [serviceA.id]: 12,
      [serviceB.id]: 10
    });

    expect(store.quantityFor(serviceA.id)).toBe(9);
    expect(store.quantityFor(serviceB.id)).toBe(9);
  });
});
