import { DOCUMENT } from '@angular/common';
import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { BehaviorSubject, of, throwError } from 'rxjs';
import { BookingResponse } from '../core/models/booking.model';
import { TenantConfig } from '../core/models/tenant-config.model';
import { TenantApiService } from '../core/services/tenant-api.service';
import { TelegramService } from '../core/telegram/telegram.service';
import { TenantShellComponent } from './tenant-shell.component';

describe('TenantShellComponent', () => {
  let api: jasmine.SpyObj<TenantApiService>;
  let telegram: jasmine.SpyObj<TelegramService>;
  let slugParamMap$: BehaviorSubject<ReturnType<typeof convertToParamMap>>;

  beforeEach(() => {
    api = jasmine.createSpyObj<TenantApiService>('TenantApiService', [
      'getConfig',
      'getServices',
      'getMyBookings',
      'getBooking',
      'createBooking',
      'confirmBookingPayment',
      'cancelBooking'
    ]);
    telegram = jasmine.createSpyObj<TelegramService>('TelegramService', [
      'init',
      'setMainButton',
      'onMainButtonClick',
      'isLocalhost',
      'confirm',
      'alert'
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
    slugParamMap$ = new BehaviorSubject(convertToParamMap({ slug: 'demo' }));

    TestBed.configureTestingModule({
      imports: [TenantShellComponent],
      providers: [
        { provide: TenantApiService, useValue: api },
        { provide: TelegramService, useValue: telegram },
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: slugParamMap$.asObservable()
          }
        }
      ]
    });
  });

  it('loads config per distinct slug and re-initializes telegram on slug changes', fakeAsync(() => {
    api.getConfig.and.callFake((slug: string) => of(createConfig(slug)));

    const fixture = TestBed.createComponent(TenantShellComponent);
    fixture.detectChanges();
    tick();

    expect(api.getConfig).toHaveBeenCalledTimes(1);
    expect(api.getConfig).toHaveBeenCalledWith('demo');
    expect(telegram.init).toHaveBeenCalledTimes(1);
    expect(telegram.setMainButton).toHaveBeenCalledWith(null);

    slugParamMap$.next(convertToParamMap({ slug: 'demo' }));
    tick();

    expect(api.getConfig).toHaveBeenCalledTimes(1);
    expect(telegram.init).toHaveBeenCalledTimes(1);

    slugParamMap$.next(convertToParamMap({ slug: 'second-shop' }));
    tick();

    expect(api.getConfig).toHaveBeenCalledTimes(2);
    expect(api.getConfig).toHaveBeenCalledWith('second-shop');
    expect(telegram.init).toHaveBeenCalledTimes(2);
    expect(telegram.setMainButton.calls.allArgs().filter(([value]) => value === null).length).toBeGreaterThanOrEqual(2);
  }));

  it('exposes fallback vm when config load fails', fakeAsync(() => {
    api.getConfig.and.returnValue(throwError(() => new Error('backend down')));

    const fixture = TestBed.createComponent(TenantShellComponent);
    const component = fixture.componentInstance as unknown as {
      vm$: {
        subscribe: (next: (value: { config: TenantConfig | null; component: unknown; error: string | null }) => void) => {
          unsubscribe(): void;
        };
      };
    };
    const emissions: Array<{ config: TenantConfig | null; component: unknown; error: string | null }> = [];

    const subscription = component.vm$.subscribe((vm) => emissions.push(vm));
    fixture.detectChanges();
    tick();

    expect(emissions.at(-1)).toEqual({
      config: null,
      component: null,
      error: 'This page is unavailable right now. Please try again later.'
    });

    subscription.unsubscribe();
  }));

  it('applies tenant primary color and falls back to default color', fakeAsync(() => {
    const document = TestBed.inject(DOCUMENT);
    const fixture = TestBed.createComponent(TenantShellComponent);

    api.getConfig.and.returnValues(
      of(createConfig('demo', '#123456')),
      of(createConfig('demo-2', null))
    );

    fixture.detectChanges();
    tick();
    expect(document.documentElement.style.getPropertyValue('--yoobu-primary')).toBe('#123456');

    slugParamMap$.next(convertToParamMap({ slug: 'demo-2' }));
    tick();
    expect(document.documentElement.style.getPropertyValue('--yoobu-primary')).toBe('#ff6b35');
  }));
});

function createConfig(slug: string, primaryColor: string | null = '#ff6b35'): TenantConfig {
  return {
    slug,
    name: `Store ${slug}`,
    type: 'FOOD_ORDER',
    primaryColor,
    logoUrl: null,
    welcomeMessage: null
  };
}

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
    deliveryDate: '2026-03-19',
    note: null,
    trackingUrl: null,
    paymentQrUrl: null,
    items: [
      {
        serviceName: 'Coffee',
        quantity: 1,
        unitPrice: 30000,
        currency: 'VND'
      }
    ],
    createdAt: '2026-03-19T10:00:00.000Z'
  };
}
