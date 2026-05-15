import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormBuilder } from '@angular/forms';
import { By } from '@angular/platform-browser';
import { BookingResponse } from '../../core/models/booking.model';
import { TenantConfig } from '../../core/models/tenant-config.model';
import { ServiceItem } from '../../core/models/service.model';
import { FoodOrderFlowFacade } from './food-order-flow.facade';
import { FoodOrderHomeComponent } from './food-order-home.component';
import { FoodOrderStore } from './food-order.store';

describe('FoodOrderHomeComponent', () => {
  let fixture: ComponentFixture<FoodOrderHomeComponent>;
  let facade: {
    setConfig: jasmine.Spy;
    increase: jasmine.Spy;
    decrease: jasmine.Spy;
    openCart: jasmine.Spy;
    closeCart: jasmine.Spy;
    openCheckout: jasmine.Spy;
    closeCheckout: jasmine.Spy;
    dismissRepeatOrderBanner: jasmine.Spy;
    startNewOrder: jasmine.Spy;
    refreshBookings: jasmine.Spy;
    selectBooking: jasmine.Spy;
    repeatBooking: jasmine.Spy;
    confirmPayment: jasmine.Spy;
    cancelBooking: jasmine.Spy;
    submitOrder: jasmine.Spy;
    setActiveView: jasmine.Spy;
    deselectBooking: jasmine.Spy;
    store: FoodOrderStore;
    showLocalCheckoutButtons: boolean;
    checkoutForm: unknown;
    selectedBookingId: ReturnType<typeof signal<number | null>>;
    selectedBooking: ReturnType<typeof signal<BookingResponse | null>>;
    activeView: ReturnType<typeof signal<'menu' | 'orders' | 'cart' | 'checkout'>>;
    submitting: ReturnType<typeof signal<boolean>>;
    submitError: ReturnType<typeof signal<string | null>>;
    repeatOrderBanner: ReturnType<typeof signal<string | null>>;
    submittedBooking: ReturnType<typeof signal<BookingResponse | null>>;
    confirmingPaymentBookingId: ReturnType<typeof signal<number | null>>;
    paymentError: ReturnType<typeof signal<string | null>>;
    cancellingBookingId: ReturnType<typeof signal<number | null>>;
    cancelError: ReturnType<typeof signal<string | null>>;
    isFirstOrder: ReturnType<typeof signal<boolean>>;
    earliestDeliveryDate: ReturnType<typeof signal<string>>;
    vm: ReturnType<typeof signal<{ services: ServiceItem[]; loading: boolean; error: string | null }>>;
    bookingsVm: ReturnType<typeof signal<{ bookings: BookingResponse[]; loading: boolean; error: string | null }>>;
  };

  const service: ServiceItem = {
    id: 10,
    name: 'Coffee',
    description: null,
    imageUrl: null,
    price: 30000,
    unit: 'cup',
    durationMinutes: null,
    sortOrder: 1,
    status: 'ACTIVE'
  };

  const config: TenantConfig = {
    slug: 'demo',
    name: 'Demo',
    type: 'FOOD_ORDER',
    primaryColor: '#ff6b35',
    logoUrl: null,
    welcomeMessage: null
  };

  beforeEach(() => {
    const store = new FoodOrderStore();
    store.setServices([service]);
    const fb = new FormBuilder();

    facade = {
      setConfig: jasmine.createSpy('setConfig'),
      increase: jasmine.createSpy('increase'),
      decrease: jasmine.createSpy('decrease'),
      openCart: jasmine.createSpy('openCart'),
      closeCart: jasmine.createSpy('closeCart'),
      openCheckout: jasmine.createSpy('openCheckout'),
      closeCheckout: jasmine.createSpy('closeCheckout'),
      dismissRepeatOrderBanner: jasmine.createSpy('dismissRepeatOrderBanner'),
      startNewOrder: jasmine.createSpy('startNewOrder'),
      refreshBookings: jasmine.createSpy('refreshBookings'),
      selectBooking: jasmine.createSpy('selectBooking'),
      repeatBooking: jasmine.createSpy('repeatBooking'),
      confirmPayment: jasmine.createSpy('confirmPayment'),
      cancelBooking: jasmine.createSpy('cancelBooking'),
      submitOrder: jasmine.createSpy('submitOrder'),
      setActiveView: jasmine.createSpy('setActiveView'),
      deselectBooking: jasmine.createSpy('deselectBooking'),
      store,
      showLocalCheckoutButtons: true,
      checkoutForm: fb.nonNullable.group({
        customerName: [''],
        customerPhone: [''],
        deliveryAddress: [''],
        deliveryDate: ['2026-03-19'],
        note: ['']
      }),
      selectedBookingId: signal<number | null>(null),
      selectedBooking: signal<BookingResponse | null>(null),
      activeView: signal<'menu' | 'orders' | 'cart' | 'checkout'>('menu'),
      submitting: signal(false),
      submitError: signal<string | null>(null),
      repeatOrderBanner: signal<string | null>(null),
      submittedBooking: signal<BookingResponse | null>(null),
      confirmingPaymentBookingId: signal<number | null>(null),
      paymentError: signal<string | null>(null),
      cancellingBookingId: signal<number | null>(null),
      cancelError: signal<string | null>(null),
      isFirstOrder: signal(true),
      earliestDeliveryDate: signal('2026-05-15'),
      vm: signal({
        services: [service],
        loading: false,
        error: null
      }),
      bookingsVm: signal({
        bookings: [],
        loading: false,
        error: null
      })
    };

    facade.increase.and.callFake((serviceId: number) => store.increase(serviceId));
    facade.decrease.and.callFake((serviceId: number) => store.decrease(serviceId));
    facade.openCart.and.callFake(() => facade.activeView.set('cart'));
    facade.closeCart.and.callFake(() => facade.activeView.set('menu'));
    facade.setActiveView.and.callFake((view: 'menu' | 'orders') => facade.activeView.set(view));
    facade.selectBooking.and.resolveTo();
    facade.repeatBooking.and.resolveTo();
    facade.confirmPayment.and.resolveTo();
    facade.cancelBooking.and.resolveTo();
    facade.submitOrder.and.resolveTo();

    TestBed.configureTestingModule({
      imports: [FoodOrderHomeComponent]
    }).overrideComponent(FoodOrderHomeComponent, {
      set: {
        providers: [{ provide: FoodOrderFlowFacade, useValue: facade as unknown as FoodOrderFlowFacade }]
      }
    });

    fixture = TestBed.createComponent(FoodOrderHomeComponent);
    fixture.componentRef.setInput('config', config);
    fixture.detectChanges();
  });

  it('passes config to facade when input is set', () => {
    expect(facade.setConfig).toHaveBeenCalledWith(config);
  });

  it('routes quantity controls to facade methods', () => {
    const increaseButton = fixture.debugElement.query(By.css('[aria-label="Add Coffee"]')).nativeElement as HTMLButtonElement;

    increaseButton.click();
    fixture.detectChanges();

    const decreaseButton = fixture.debugElement.query(By.css('[aria-label="Decrease Coffee"]')).nativeElement as HTMLButtonElement;
    decreaseButton.click();

    expect(facade.increase).toHaveBeenCalledWith(service.id);
    expect(facade.decrease).toHaveBeenCalledWith(service.id);
  });

  it('switches to orders view when My orders tab is clicked', () => {
    const buttons = fixture.debugElement.queryAll(By.css('.tab-btn'));
    const myOrdersButton = buttons[1];

    myOrdersButton.nativeElement.click();
    fixture.detectChanges();

    expect(facade.setActiveView).toHaveBeenCalledWith('orders');
    expect(facade.activeView()).toBe('orders');
  });

  it('renders bookings section even when menu vm is still loading', () => {
    facade.activeView.set('orders');
    facade.vm.set({
      services: [],
      loading: true,
      error: null
    });
    facade.bookingsVm.set({
      bookings: [],
      loading: true,
      error: null
    });

    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('app-food-order-bookings'))).not.toBeNull();
  });

  it('routes repeat order action to facade', () => {
    facade.activeView.set('orders');
    const booking: BookingResponse = {
      id: 1,
      type: 'ORDER',
      status: 'DONE',
      customerName: 'Alice',
      customerPhone: '0123456789',
      deliveryAddress: '123 Main St',
      totalPrice: 30000,
      currency: 'VND',
      deliveryDate: '2026-03-19',
      note: null,
      trackingUrl: null,
      paymentQrUrl: null,
      items: [{ serviceName: service.name, quantity: 1, unitPrice: service.price }],
      createdAt: '2026-03-19T10:00:00.000Z'
    };
    facade.bookingsVm.set({
      bookings: [booking],
      loading: false,
      error: null
    });
    facade.selectedBookingId.set(booking.id);
    facade.selectedBooking.set(booking);

    fixture.detectChanges();

    const repeatButton = fixture.debugElement
      .queryAll(By.css('.btn-ghost'))
      .find((button) => button.nativeElement.textContent.trim() === 'Repeat order');
    if (!repeatButton) {
      fail('Expected repeat order button to be present');
      return;
    }
    repeatButton.nativeElement.click();

    expect(facade.repeatBooking).toHaveBeenCalledWith(booking.id);
  });

  it('hides local cart bar when local checkout buttons are disabled', () => {
    fixture.destroy();
    facade.showLocalCheckoutButtons = false;
    facade.store.increase(service.id);

    fixture = TestBed.createComponent(FoodOrderHomeComponent);
    fixture.componentRef.setInput('config', config);
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('app-food-order-cart-bar'))).toBeNull();
  });
});
