import { FoodOrderStore } from './food-order.store';
import { ServiceItem } from '../../core/models/service.model';

describe('FoodOrderStore', () => {
  let store: FoodOrderStore;

  const serviceA: ServiceItem = {
    id: 1,
    name: 'Coffee',
    description: null,
    price: 30000,
    unit: 'cup',
    durationMinutes: null,
    sortOrder: 1,
    status: 'ACTIVE'
  };

  const serviceB: ServiceItem = {
    id: 2,
    name: 'Tea',
    description: null,
    price: 20000,
    unit: 'cup',
    durationMinutes: null,
    sortOrder: 2,
    status: 'ACTIVE'
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
});
