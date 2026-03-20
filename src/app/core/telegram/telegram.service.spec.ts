import { DOCUMENT } from '@angular/common';
import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { TelegramService } from './telegram.service';

describe('TelegramService', () => {
  it('initializes web app and exposes trimmed init data', fakeAsync(() => {
    const ready = jasmine.createSpy('ready');
    const expand = jasmine.createSpy('expand');
    const webApp = {
      initData: '  token=1  ',
      ready,
      expand
    };

    const service = setupService(webApp, 'localhost');
    service.init();
    tick();

    expect(ready).toHaveBeenCalledTimes(1);
    expect(expand).toHaveBeenCalledTimes(1);
    expect(service.getInitData()).toBe('token=1');
    expect(service.getDevTelegramUserId()).toBe('101');
  }));

  it('recovers init data when telegram web app appears after init call', () => {
    const service = setupService(null, 'example.com');
    service.init();

    const document = TestBed.inject(DOCUMENT) as {
      defaultView: {
        Telegram?: { WebApp?: { initData?: string; ready(): void; expand(): void } };
      };
    };
    document.defaultView.Telegram = {
      WebApp: {
        initData: ' late-token ',
        ready: jasmine.createSpy('ready'),
        expand: jasmine.createSpy('expand')
      }
    };

    expect(service.getInitData()).toBe('late-token');
  });

  it('hides main button when text is null', () => {
    const hide = jasmine.createSpy('hide');
    const webApp = {
      ready: jasmine.createSpy('ready'),
      expand: jasmine.createSpy('expand'),
      MainButton: {
        setText: jasmine.createSpy('setText'),
        show: jasmine.createSpy('show'),
        hide,
        enable: jasmine.createSpy('enable'),
        disable: jasmine.createSpy('disable')
      }
    };

    const service = setupService(webApp);
    service.init();
    service.setMainButton(null);

    expect(hide).toHaveBeenCalledTimes(1);
  });

  it('sets main button text, disable state, and visibility', () => {
    const setText = jasmine.createSpy('setText');
    const show = jasmine.createSpy('show');
    const disable = jasmine.createSpy('disable');
    const webApp = {
      ready: jasmine.createSpy('ready'),
      expand: jasmine.createSpy('expand'),
      MainButton: {
        setText,
        show,
        hide: jasmine.createSpy('hide'),
        enable: jasmine.createSpy('enable'),
        disable
      }
    };

    const service = setupService(webApp);
    service.init();
    service.setMainButton('Place order', false);

    expect(setText).toHaveBeenCalledWith('Place order');
    expect(disable).toHaveBeenCalledTimes(1);
    expect(show).toHaveBeenCalledTimes(1);
  });

  it('wires and unwires main button click handlers', fakeAsync(() => {
    const onClick = jasmine.createSpy('onClick');
    const offClick = jasmine.createSpy('offClick');
    const webApp = {
      ready: jasmine.createSpy('ready'),
      expand: jasmine.createSpy('expand'),
      MainButton: {
        setText: jasmine.createSpy('setText'),
        show: jasmine.createSpy('show'),
        hide: jasmine.createSpy('hide'),
        onClick,
        offClick
      }
    };

    const service = setupService(webApp);
    const firstHandler = jasmine.createSpy('firstHandler');
    const secondHandler = jasmine.createSpy('secondHandler');

    service.init();
    service.onMainButtonClick(firstHandler);
    tick();

    service.onMainButtonClick(secondHandler);
    tick();

    service.onMainButtonClick(null);
    tick();

    expect(onClick).toHaveBeenCalledWith(firstHandler);
    expect(offClick).toHaveBeenCalledWith(firstHandler);
    expect(onClick).toHaveBeenCalledWith(secondHandler);
    expect(offClick).toHaveBeenCalledWith(secondHandler);
  }));

  it('falls back to window alert when telegram showAlert throws', async () => {
    const fallbackAlert = jasmine.createSpy('fallbackAlert');
    const webApp = {
      ready: jasmine.createSpy('ready'),
      expand: jasmine.createSpy('expand'),
      showAlert: jasmine.createSpy('showAlert').and.throwError('not supported')
    };

    const service = setupService(webApp, 'example.com', fallbackAlert);
    service.init();

    await service.alert('hi');

    expect(fallbackAlert).toHaveBeenCalledWith('hi');
  });

  it('falls back to window confirm when telegram confirm is unavailable', async () => {
    const fallbackConfirm = jasmine.createSpy('fallbackConfirm').and.returnValue(false);
    const webApp = {
      ready: jasmine.createSpy('ready'),
      expand: jasmine.createSpy('expand')
    };

    const service = setupService(webApp, 'example.com', jasmine.createSpy('alert'), fallbackConfirm);
    service.init();

    const confirmed = await service.confirm('continue?');

    expect(confirmed).toBeFalse();
    expect(fallbackConfirm).toHaveBeenCalledWith('continue?');
  });

  it('uses browser dialogs when telegram runtime version is too old for popup api', async () => {
    const fallbackAlert = jasmine.createSpy('fallbackAlert');
    const fallbackConfirm = jasmine.createSpy('fallbackConfirm').and.returnValue(true);
    const showAlert = jasmine.createSpy('showAlert');
    const showConfirm = jasmine.createSpy('showConfirm');
    const webApp = {
      version: '6.0',
      ready: jasmine.createSpy('ready'),
      expand: jasmine.createSpy('expand'),
      showAlert,
      showConfirm
    };

    const service = setupService(webApp, 'example.com', fallbackAlert, fallbackConfirm);
    service.init();

    await service.alert('hi');
    const confirmed = await service.confirm('continue?');

    expect(showAlert).not.toHaveBeenCalled();
    expect(showConfirm).not.toHaveBeenCalled();
    expect(fallbackAlert).toHaveBeenCalledWith('hi');
    expect(fallbackConfirm).toHaveBeenCalledWith('continue?');
    expect(confirmed).toBeTrue();
  });
});

function setupService(
  webApp: object | null,
  locationConfig: string | { hostname?: string; search?: string; hash?: string } = 'example.com',
  alertSpy = jasmine.createSpy('alert'),
  confirmSpy = jasmine.createSpy('confirm').and.returnValue(true)
): TelegramService {
  const hostname = typeof locationConfig === 'string' ? locationConfig : (locationConfig.hostname ?? 'example.com');
  const search = typeof locationConfig === 'string' ? '' : (locationConfig.search ?? '');
  const hash = typeof locationConfig === 'string' ? '' : (locationConfig.hash ?? '');

  const defaultView: {
    location: { hostname: string; search: string; hash: string };
    alert: typeof alertSpy;
    confirm: typeof confirmSpy;
    Telegram?: { WebApp: object };
  } = {
    location: { hostname, search, hash },
    alert: alertSpy,
    confirm: confirmSpy
  };
  if (webApp) {
    defaultView.Telegram = {
      WebApp: webApp
    };
  }

  TestBed.configureTestingModule({
    providers: [TelegramService, { provide: DOCUMENT, useValue: { defaultView } }]
  });

  return TestBed.inject(TelegramService);
}
