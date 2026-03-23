import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { of, Subject } from 'rxjs';
import { throwError } from 'rxjs';
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
  let telegram: jasmine.SpyObj<TelegramService>;

  const service: ServiceItem = {
    id: 1,
    name: 'Coffee',
    description: null,
    imageUrl: null,
    price: 30000,
    unit: 'cup',
    durationMinutes: null,
    sortOrder: 1,
    status: 'ACTIVE'
  };
  const teaService: ServiceItem = {
    id: 2,
    name: 'Tea',
    description: null,
    imageUrl: null,
    price: 20000,
    unit: 'cup',
    durationMinutes: null,
    sortOrder: 2,
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
      'confirmBookingPayment',
      'cancelBooking'
    ]);

    telegram = jasmine.createSpyObj<TelegramService>('TelegramService', [
      'isLocalhost',
      'setMainButton',
      'onMainButtonClick',
      'confirm',
      'alert',
      'hapticLight'
    ]);

    api.getServices.and.returnValue(of([]));
    api.getMyBookings.and.returnValue(of([]));
    api.getBooking.and.returnValue(of(createBookingResponse(1)));
    api.createBooking.and.returnValue(of(createBookingResponse(1)));
    api.confirmBookingPayment.and.returnValue(of(createBookingResponse(1)));
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

  it('shows an error when service loading fails', fakeAsync(() => {
    api.getServices.and.returnValue(throwError(() => new Error('failed')));

    void facade.vm();
    facade.setConfig(tenantConfig);
    tick();

    expect(facade.vm().services).toEqual([]);
    expect(facade.vm().loading).toBeFalse();
    expect(facade.vm().error).toBe('Check the backend service or tenant data and try again.');
  }));

  it('repeats a booking by restoring matching items in cart and opening checkout', async () => {
    const completedBooking: BookingResponse = {
      ...createBookingResponse(7),
      status: 'DONE',
      deliveryAddress: ' 456 Side St ',
      note: ' ring bell ',
      items: [
        { serviceName: 'Coffee', quantity: 2, unitPrice: 30000, currency: 'VND' },
        { serviceName: 'Tea', quantity: 1, unitPrice: 20000, currency: 'VND' }
      ]
    };
    api.getServices.and.returnValue(of([service, teaService]));
    facade.setConfig(tenantConfig);
    facade.selectedBookingId.set(completedBooking.id);
    facade.selectedBooking.set(completedBooking);
    await facade.repeatBooking(completedBooking.id);

    expect(facade.activeView()).toBe('menu');
    expect(facade.checkoutOpen()).toBeTrue();
    expect(facade.store.quantityFor(service.id)).toBe(2);
    expect(facade.store.quantityFor(teaService.id)).toBe(1);
    expect(facade.checkoutForm.getRawValue().customerName).toBe(completedBooking.customerName);
    expect(facade.checkoutForm.getRawValue().customerPhone).toBe(completedBooking.customerPhone);
    expect(facade.checkoutForm.getRawValue().deliveryAddress).toBe('456 Side St');
    expect(facade.checkoutForm.getRawValue().note).toBe('ring bell');
    expect(telegram.alert).not.toHaveBeenCalledWith('None of the items from this order are available now.');
  });

  it('shows an alert when repeated booking has no available items', async () => {
    const legacyBooking: BookingResponse = {
      ...createBookingResponse(9),
      status: 'DONE',
      items: [{ serviceName: 'Old item', quantity: 1, unitPrice: 15000, currency: 'VND' }]
    };
    api.getServices.and.returnValue(of([service]));
    facade.setConfig(tenantConfig);
    facade.selectedBookingId.set(legacyBooking.id);
    facade.selectedBooking.set(legacyBooking);

    await facade.repeatBooking(legacyBooking.id);

    expect(facade.store.selectedCount()).toBe(0);
    expect(facade.checkoutOpen()).toBeFalse();
    expect(telegram.alert).toHaveBeenCalledWith('None of the items from this order are available now.');
  });

  it('shows and dismisses repeat banner after restoring an order', async () => {
    const repeated: BookingResponse = {
      ...createBookingResponse(15),
      status: 'DONE',
      items: [{ serviceName: 'Coffee', quantity: 1, unitPrice: 30000, currency: 'VND' }]
    };
    api.getServices.and.returnValue(of([service]));
    facade.setConfig(tenantConfig);
    facade.selectedBookingId.set(repeated.id);
    facade.selectedBooking.set(repeated);

    await facade.repeatBooking(repeated.id);
    expect(facade.repeatOrderBanner()).toContain(`#${repeated.id}`);

    facade.dismissRepeatOrderBanner();
    expect(facade.repeatOrderBanner()).toBeNull();
  });

  it('does not replace an existing cart on repeat when confirmation is declined', async () => {
    const repeatBooking: BookingResponse = {
      ...createBookingResponse(11),
      status: 'DONE',
      customerName: 'Repeat User',
      items: [{ serviceName: 'Coffee', quantity: 3, unitPrice: 30000, currency: 'VND' }]
    };
    api.getServices.and.returnValue(of([service]));
    facade.setConfig(tenantConfig);
    facade.increase(service.id);
    telegram.confirm.and.resolveTo(false);
    facade.selectedBookingId.set(repeatBooking.id);
    facade.selectedBooking.set(repeatBooking);

    await facade.repeatBooking(repeatBooking.id);

    expect(facade.store.quantityFor(service.id)).toBe(1);
    expect(facade.checkoutForm.getRawValue().customerName).toBe('');
    expect(telegram.confirm).toHaveBeenCalledWith('Replace your current cart with items from order #11?');
  });

  it('shows an alert when trying to repeat while menu is loading', async () => {
    const loadingServices$ = new Subject<ServiceItem[]>();
    api.getServices.and.returnValue(loadingServices$.asObservable());
    facade.setConfig(tenantConfig);

    await facade.repeatBooking(1);

    expect(telegram.alert).toHaveBeenCalledWith('Menu is still loading. Please wait a moment and try again.');
  });

  it('does not submit an order when confirmation is declined', async () => {
    telegram.confirm.and.resolveTo(false);
    api.getServices.and.returnValue(of([service]));
    facade.setConfig(tenantConfig);
    facade.increase(service.id);
    facade.openCheckout();
    facade.checkoutForm.setValue({
      customerName: 'Alice',
      customerPhone: '0123456789',
      deliveryAddress: '123 Main St',
      deliveryDate: '2026-03-19',
      note: ''
    });

    await facade.submitOrder();

    expect(api.createBooking).not.toHaveBeenCalled();
    expect(facade.submitting()).toBeFalse();
    expect(facade.store.selectedCount()).toBe(1);
    expect(facade.checkoutOpen()).toBeTrue();
  });

  it('submits an order and resets checkout state on success', async () => {
    const createdBooking = createBookingResponse(42);
    api.getServices.and.returnValue(of([service]));
    api.createBooking.and.returnValue(of(createdBooking));

    facade.setConfig(tenantConfig);
    facade.increase(service.id);
    facade.openCheckout();
    facade.checkoutForm.setValue({
      customerName: ' Alice ',
      customerPhone: ' 0123456789 ',
      deliveryAddress: ' 123 Main St ',
      deliveryDate: '2026-03-19',
      note: ' no sugar '
    });

    const reloadKeyBefore = facade.bookingsReloadKey();

    await facade.submitOrder();

    expect(api.createBooking).toHaveBeenCalledWith('demo', {
      customerName: 'Alice',
      customerPhone: '0123456789',
      deliveryAddress: '123 Main St',
      deliveryDate: '2026-03-19',
      note: 'no sugar',
      items: [{ serviceId: service.id, quantity: 1 }]
    });
    expect(facade.submittedBooking()?.id).toBe(createdBooking.id);
    expect(facade.selectedBookingId()).toBe(createdBooking.id);
    expect(facade.store.selectedCount()).toBe(0);
    expect(facade.checkoutOpen()).toBeFalse();
    expect(facade.submitting()).toBeFalse();
    expect(facade.bookingsReloadKey()).toBe(reloadKeyBefore + 1);
    expect(facade.checkoutForm.getRawValue().customerName).toBe('Alice');
    expect(facade.checkoutForm.getRawValue().customerPhone).toBe('0123456789');
    expect(facade.checkoutForm.getRawValue().deliveryAddress).toBe('123 Main St');
    expect(facade.checkoutForm.getRawValue().note).toBe('');
  });

  it('keeps checkout open and shows validation errors when submit form is invalid', async () => {
    api.getServices.and.returnValue(of([service]));
    facade.setConfig(tenantConfig);
    facade.increase(service.id);
    facade.openCheckout();

    await facade.submitOrder();

    expect(api.createBooking).not.toHaveBeenCalled();
    expect(facade.checkoutOpen()).toBeTrue();
    expect(facade.submitError()).toBe(
      'Enter your name, phone number, delivery address, and delivery date before placing the order.'
    );
    expect(telegram.alert).toHaveBeenCalledWith(
      'Enter your name, phone number, delivery address, and delivery date before placing the order.'
    );
  });

  it('keeps saved delivery address when starting a new order', async () => {
    api.getServices.and.returnValue(of([service]));
    facade.setConfig(tenantConfig);
    facade.increase(service.id);
    facade.openCheckout();
    facade.checkoutForm.setValue({
      customerName: 'Alice',
      customerPhone: '0123456789',
      deliveryAddress: '123 Main St',
      deliveryDate: '2026-03-19',
      note: ''
    });

    await facade.submitOrder();
    facade.startNewOrder();

    expect(facade.checkoutForm.getRawValue().customerName).toBe('Alice');
    expect(facade.checkoutForm.getRawValue().customerPhone).toBe('0123456789');
    expect(facade.checkoutForm.getRawValue().deliveryAddress).toBe('123 Main St');
    expect(facade.checkoutForm.getRawValue().note).toBe('');
  });

  it('blocks submit when delivery address is blank', async () => {
    api.getServices.and.returnValue(of([service]));
    facade.setConfig(tenantConfig);
    facade.increase(service.id);
    facade.openCheckout();
    facade.checkoutForm.setValue({
      customerName: 'Alice',
      customerPhone: '0123456789',
      deliveryAddress: '   ',
      deliveryDate: '2026-03-19',
      note: ''
    });

    await facade.submitOrder();

    expect(api.createBooking).not.toHaveBeenCalled();
    expect(facade.checkoutOpen()).toBeTrue();
    expect(facade.submitError()).toBe(
      'Enter your name, phone number, delivery address, and delivery date before placing the order.'
    );
  });

  it('keeps telegram main button clickable and shows validation error on invalid checkout form', async () => {
    api.getServices.and.returnValue(of([service]));
    facade.setConfig(tenantConfig);
    facade.increase(service.id);

    (facade as unknown as { mainButtonAction: () => void }).mainButtonAction();
    await Promise.resolve();
    (facade as unknown as { mainButtonAction: () => void }).mainButtonAction();
    await Promise.resolve();

    expect(facade.checkoutOpen()).toBeTrue();
    expect(api.createBooking).not.toHaveBeenCalled();
    expect(facade.submitError()).toBe(
      'Enter your name, phone number, delivery address, and delivery date before placing the order.'
    );
    expect(telegram.alert).toHaveBeenCalledWith(
      'Enter your name, phone number, delivery address, and delivery date before placing the order.'
    );
  });

  it('closes checkout when trying to submit with an empty cart', async () => {
    facade.setConfig(tenantConfig);
    facade.openCheckout();

    await facade.submitOrder();

    expect(api.createBooking).not.toHaveBeenCalled();
    expect(facade.checkoutOpen()).toBeFalse();
  });

  it('refreshes bookings when switching to orders view', () => {
    const reloadBefore = facade.bookingsReloadKey();

    facade.setActiveView('orders');

    expect(facade.activeView()).toBe('orders');
    expect(facade.bookingsReloadKey()).toBe(reloadBefore + 1);
  });

  it('refreshes bookings when switching back to menu view', () => {
    const reloadBefore = facade.bookingsReloadKey();

    facade.setActiveView('menu');

    expect(facade.activeView()).toBe('menu');
    expect(facade.bookingsReloadKey()).toBe(reloadBefore + 1);
  });

  it('does not call cancel API when cancellation is not confirmed', async () => {
    telegram.confirm.and.resolveTo(false);
    facade.setConfig(tenantConfig);

    await facade.cancelBooking(1);

    expect(api.cancelBooking).not.toHaveBeenCalled();
    expect(facade.cancellingBookingId()).toBeNull();
  });

  it('updates selected booking and refreshes bookings after successful cancellation', async () => {
    const cancelledBooking: BookingResponse = {
      ...createBookingResponse(1),
      status: 'CANCELLED'
    };
    api.cancelBooking.and.returnValue(of(cancelledBooking));
    facade.setConfig(tenantConfig);
    const reloadKeyBefore = facade.bookingsReloadKey();

    await facade.cancelBooking(1);

    expect(api.cancelBooking).toHaveBeenCalledWith('demo', 1);
    expect(facade.selectedBooking()?.status).toBe('CANCELLED');
    expect(facade.bookingsReloadKey()).toBe(reloadKeyBefore + 1);
    expect(facade.cancellingBookingId()).toBeNull();
  });

  it('confirms payment and refreshes bookings after success', async () => {
    const pendingBooking: BookingResponse = {
      ...createBookingResponse(1),
      status: 'PAYMENT_PENDING'
    };
    api.confirmBookingPayment.and.returnValue(of(pendingBooking));
    facade.setConfig(tenantConfig);
    const reloadKeyBefore = facade.bookingsReloadKey();

    await facade.confirmPayment(1);

    expect(api.confirmBookingPayment).toHaveBeenCalledWith('demo', 1);
    expect(facade.selectedBooking()?.status).toBe('PAYMENT_PENDING');
    expect(facade.bookingsReloadKey()).toBe(reloadKeyBefore + 1);
    expect(facade.confirmingPaymentBookingId()).toBeNull();
    expect(facade.paymentError()).toBeNull();
  });

  it('handles payment confirmation conflicts by refreshing and reloading selected booking', async () => {
    api.confirmBookingPayment.and.returnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 409,
            error: {
              reason: 'Payment can only be confirmed for booking in NEW status'
            }
          })
      )
    );
    api.getBooking.and.returnValue(of(createBookingResponse(1)));
    facade.setConfig(tenantConfig);
    facade.selectedBookingId.set(1);
    const reloadKeyBefore = facade.bookingsReloadKey();

    await facade.confirmPayment(1);

    expect(telegram.alert).toHaveBeenCalledWith(
      'Payment can only be confirmed for orders still in NEW status. Refreshing status.'
    );
    expect(facade.paymentError()).toBeNull();
    expect(facade.bookingsReloadKey()).toBe(reloadKeyBefore + 1);
    expect(api.getBooking).toHaveBeenCalledWith('demo', 1);
    expect(facade.confirmingPaymentBookingId()).toBeNull();
  });

  it('shows error and alerts when cancellation fails', async () => {
    api.cancelBooking.and.returnValue(throwError(() => new Error('failed')));
    facade.setConfig(tenantConfig);

    await facade.cancelBooking(1);

    expect(facade.cancelError()).toBe('Cancel request failed. The booking may already be done or unavailable.');
    expect(telegram.alert).toHaveBeenCalledWith(
      'Could not cancel this order. It may already be processed or unavailable.'
    );
    expect(facade.cancellingBookingId()).toBeNull();
  });
});

function createBookingResponse(id: number): BookingResponse {
  return {
    id,
    type: 'ORDER',
    status: 'NEW',
    customerName: 'Test User',
    customerPhone: '0123456789',
    deliveryAddress: '123 Main St',
    totalPrice: 30000,
    currency: 'VND',
    deliveryDate: '2026-03-18',
    note: null,
    trackingUrl: null,
    items: [
      {
        serviceName: 'Coffee',
        quantity: 1,
        unitPrice: 30000,
        currency: 'VND'
      }
    ],
    createdAt: '2026-03-18T10:00:00.000Z'
  };
}
