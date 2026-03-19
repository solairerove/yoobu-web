import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { TelegramService } from '../telegram/telegram.service';
import { telegramInitDataInterceptor } from './telegram-init-data.interceptor';

describe('telegramInitDataInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let telegram: jasmine.SpyObj<TelegramService>;

  beforeEach(() => {
    telegram = jasmine.createSpyObj<TelegramService>('TelegramService', ['getInitData', 'getDevTelegramUserId']);
    telegram.getInitData.and.returnValue(null);
    telegram.getDevTelegramUserId.and.returnValue(null);

    TestBed.configureTestingModule({
      providers: [
        { provide: TelegramService, useValue: telegram },
        provideHttpClient(withInterceptors([telegramInitDataInterceptor])),
        provideHttpClientTesting()
      ]
    });

    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('adds X-Telegram-Init-Data when init data is available', () => {
    telegram.getInitData.and.returnValue('init-data-value');
    telegram.getDevTelegramUserId.and.returnValue('101');

    http.get('/api/demo').subscribe();
    const request = httpMock.expectOne('/api/demo');

    expect(request.request.headers.get('X-Telegram-Init-Data')).toBe('init-data-value');
    expect(request.request.headers.has('X-Telegram-User-Id')).toBeFalse();
    request.flush({});
  });

  it('adds X-Telegram-User-Id in local dev mode when init data is missing', () => {
    telegram.getInitData.and.returnValue(null);
    telegram.getDevTelegramUserId.and.returnValue('101');

    http.get('/api/demo').subscribe();
    const request = httpMock.expectOne('/api/demo');

    expect(request.request.headers.get('X-Telegram-User-Id')).toBe('101');
    expect(request.request.headers.has('X-Telegram-Init-Data')).toBeFalse();
    request.flush({});
  });

  it('does not add telegram headers when both init data and dev user id are missing', () => {
    telegram.getInitData.and.returnValue(null);
    telegram.getDevTelegramUserId.and.returnValue(null);

    http.get('/api/demo').subscribe();
    const request = httpMock.expectOne('/api/demo');

    expect(request.request.headers.has('X-Telegram-Init-Data')).toBeFalse();
    expect(request.request.headers.has('X-Telegram-User-Id')).toBeFalse();
    request.flush({});
  });
});

