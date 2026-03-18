import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { of, Subject } from 'rxjs';
import { BookingResponse } from '../../core/models/booking.model';
import { ServiceItem } from '../../core/models/service.model';
import { TenantConfig } from '../../core/models/tenant-config.model';
import { TenantApiService } from '../../core/services/tenant-api.service';
import { TelegramService } from '../../core/telegram/telegram.service';
import { FoodOrderFlowFacade } from './food-order-flow.facade';
import { FoodOrderStore } from './food-order.store';

describe('FoodOrderFlowFacade', () => {
  let facade: FoodOrderFlowFacade;
  let api: jasmine.SpyObj<TenantApiService>;

  const service: ServiceItem = {
    id: 1,
    name: 'Coffee',
    description: null,
    price: 30000,
    unit: 'cup',
    durationMinutes: null,
    sortOrder: 1,
    status: 'ACTIVE'
  };

  const tenantConfig: TenantConfig = {
    slug: 'demo',
    name: 'Demo Store',
    type: 'FOOD_ORDER',
    primaryColor: '#ff6b35',
    logoUrl: null,
    welcomeMessage: null
  };

  beforeEach(() => {
    api = jasmine.createSpyObj<TenantApiService>('TenantApiService', [
      'getServices',
      'getMyBookings',
      'getBooking',
      'createBooking',
      'cancelBooking'
    ]);

    const telegram = jasmine.createSpyObj<TelegramService>('TelegramService', [
      'isLocalhost',
      'setMainButton',
      'onMainButtonClick',
      'confirm',
      'alert'
    ]);

    api.getServices.and.returnValue(of([]));
    api.getMyBookings.and.returnValue(of([]));
    api.getBooking.and.returnValue(of(createBookingResponse(1)));
    api.createBooking.and.returnValue(of(createBookingResponse(1)));
    api.cancelBooking.and.returnValue(of(createBookingResponse(1)));

    telegram.isLocalhost.and.returnValue(false);
    telegram.confirm.and.resolveTo(true);
    telegram.alert.and.resolveTo();

    TestBed.configureTestingModule({
      providers: [
        FoodOrderFlowFacade,
        FoodOrderStore,
        { provide: TenantApiService, useValue: api },
        { provide: TelegramService, useValue: telegram }
      ]
    });

    facade = TestBed.inject(FoodOrderFlowFacade);
  });

  it('loads services for the active tenant config', fakeAsync(() => {
    api.getServices.and.returnValue(of([service]));

    // Ensure the vm signal is observed so the underlying stream is active in tests.
    void facade.vm();
    facade.setConfig(tenantConfig);
    tick();

    expect(api.getServices).toHaveBeenCalledWith('demo');
    expect(facade.vm().services).toEqual([service]);
    expect(facade.vm().error).toBeNull();
  }));

  it('ignores stale booking-detail responses when selection changes quickly', async () => {
    const bookingOne$ = new Subject<BookingResponse>();
    const bookingTwo$ = new Subject<BookingResponse>();

    api.getBooking.and.callFake((_slug, bookingId) => {
      if (bookingId === 1) {
        return bookingOne$.asObservable();
      }
      return bookingTwo$.asObservable();
    });

    facade.setConfig(tenantConfig);

    const firstRequest = facade.selectBooking(1);
    const secondRequest = facade.selectBooking(2);

    bookingTwo$.next(createBookingResponse(2));
    bookingTwo$.complete();

    bookingOne$.next(createBookingResponse(1));
    bookingOne$.complete();

    await Promise.all([firstRequest, secondRequest]);

    expect(facade.selectedBookingId()).toBe(2);
    expect(facade.selectedBooking()?.id).toBe(2);
  });
});

function createBookingResponse(id: number): BookingResponse {
  return {
    id,
    type: 'ORDER',
    status: 'NEW',
    customerName: 'Test User',
    customerPhone: '0123456789',
    totalPrice: 30000,
    deliveryDate: '2026-03-18',
    note: null,
    items: [
      {
        serviceName: 'Coffee',
        quantity: 1,
        unitPrice: 30000
      }
    ],
    createdAt: '2026-03-18T10:00:00.000Z'
  };
}
