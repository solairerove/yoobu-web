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
    openCheckout: jasmine.Spy;
    closeCheckout: jasmine.Spy;
    startNewOrder: jasmine.Spy;
    refreshBookings: jasmine.Spy;
    selectBooking: jasmine.Spy;
    cancelBooking: jasmine.Spy;
    submitOrder: jasmine.Spy;
    setActiveView: jasmine.Spy;
    store: FoodOrderStore;
    showLocalCheckoutButtons: boolean;
    checkoutForm: unknown;
    selectedBookingId: ReturnType<typeof signal<number | null>>;
    selectedBooking: ReturnType<typeof signal<BookingResponse | null>>;
    activeView: ReturnType<typeof signal<'menu' | 'orders'>>;
    checkoutOpen: ReturnType<typeof signal<boolean>>;
    submitting: ReturnType<typeof signal<boolean>>;
    submitError: ReturnType<typeof signal<string | null>>;
    submittedBooking: ReturnType<typeof signal<BookingResponse | null>>;
    cancellingBookingId: ReturnType<typeof signal<number | null>>;
    cancelError: ReturnType<typeof signal<string | null>>;
    isFirstOrder: ReturnType<typeof signal<boolean>>;
    vm: ReturnType<typeof signal<{ services: ServiceItem[]; loading: boolean; error: string | null }>>;
    bookingsVm: ReturnType<typeof signal<{ bookings: BookingResponse[]; loading: boolean; error: string | null }>>;
  };

  const service: ServiceItem = {
    id: 10,
    name: 'Coffee',
    description: null,
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
      openCheckout: jasmine.createSpy('openCheckout'),
      closeCheckout: jasmine.createSpy('closeCheckout'),
      startNewOrder: jasmine.createSpy('startNewOrder'),
      refreshBookings: jasmine.createSpy('refreshBookings'),
      selectBooking: jasmine.createSpy('selectBooking'),
      cancelBooking: jasmine.createSpy('cancelBooking'),
      submitOrder: jasmine.createSpy('submitOrder'),
      setActiveView: jasmine.createSpy('setActiveView'),
      store,
      showLocalCheckoutButtons: true,
      checkoutForm: fb.nonNullable.group({
        customerName: [''],
        customerPhone: [''],
        deliveryDate: ['2026-03-19'],
        note: ['']
      }),
      selectedBookingId: signal<number | null>(null),
      selectedBooking: signal<BookingResponse | null>(null),
      activeView: signal<'menu' | 'orders'>('menu'),
      checkoutOpen: signal(false),
      submitting: signal(false),
      submitError: signal<string | null>(null),
      submittedBooking: signal<BookingResponse | null>(null),
      cancellingBookingId: signal<number | null>(null),
      cancelError: signal<string | null>(null),
      isFirstOrder: signal(true),
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
    facade.setActiveView.and.callFake((view: 'menu' | 'orders') => facade.activeView.set(view));
    facade.selectBooking.and.resolveTo();
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
    const increaseButton = fixture.debugElement.query(By.css('.quantity-button-increase')).nativeElement as HTMLButtonElement;
    const decreaseButtonSelector = '.quantity-button-decrease';

    increaseButton.click();
    fixture.detectChanges();
    const decreaseButton = fixture.debugElement.query(By.css(decreaseButtonSelector)).nativeElement as HTMLButtonElement;
    decreaseButton.click();

    expect(facade.increase).toHaveBeenCalledWith(service.id);
    expect(facade.decrease).toHaveBeenCalledWith(service.id);
  });

  it('switches to orders view when My orders tab is clicked', () => {
    const buttons = fixture.debugElement.queryAll(By.css('.view-switch-button'));
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
});
