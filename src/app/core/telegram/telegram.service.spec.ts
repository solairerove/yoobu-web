import { DOCUMENT } from '@angular/common';
import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { TelegramService } from './telegram.service';

describe('TelegramService', () => {
  it('ready is false before init is called', () => {
    const service = setupService(null, 'example.com');

    expect(service.ready()).toBeFalse();
  });

  it('ready is true immediately on localhost regardless of init data', fakeAsync(() => {
    const service = setupService({ ready: jasmine.createSpy(), expand: jasmine.createSpy() }, 'localhost');
    service.init();
    tick();

    expect(service.ready()).toBeTrue();
  }));

  it('ready is true immediately when no Telegram WebApp present', fakeAsync(() => {
    const service = setupService(null, 'example.com');
    service.init();
    tick();

    expect(service.ready()).toBeTrue();
  }));

  it('ready is true immediately when init data is available on init', fakeAsync(() => {
    const service = setupService({ initData: 'token=1', ready: jasmine.createSpy(), expand: jasmine.createSpy() }, 'example.com');
    service.init();
    tick();

    expect(service.ready()).toBeTrue();
    expect(service.initError()).toBeFalse();
  }));

  it('ready becomes true when init data arrives after polling', fakeAsync(() => {
    const webApp: { initData: string; ready: jasmine.Spy; expand: jasmine.Spy } = {
      initData: '',
      ready: jasmine.createSpy(),
      expand: jasmine.createSpy()
    };
    const service = setupService(webApp, 'example.com');
    service.init();

    expect(service.ready()).toBeFalse();

    webApp.initData = 'token=late';
    tick(100);

    expect(service.ready()).toBeTrue();
    expect(service.initError()).toBeFalse();
  }));

  it('sets initError after polling timeout with no init data', fakeAsync(() => {
    const webApp = { initData: '', ready: jasmine.createSpy(), expand: jasmine.createSpy() };
    const service = setupService(webApp, 'example.com');
    service.init();

    tick(15_000);

    expect(service.ready()).toBeFalse();
    expect(service.initError()).toBeTrue();
  }));

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

  it('reads init data from tgWebAppData search param when web app init data is unavailable', () => {
    const webApp = {
      ready: jasmine.createSpy('ready'),
      expand: jasmine.createSpy('expand')
    };
    const service = setupService(webApp, {
      hostname: 'example.com',
      search: '?tgWebAppData=query-id%3Dabc123%26user%3Dxyz'
    });

    service.init();

    expect(service.getInitData()).toBe('query-id=abc123&user=xyz');
  });

  it('reads init data from tgWebAppData hash param when search param is missing', () => {
    const webApp = {
      ready: jasmine.createSpy('ready'),
      expand: jasmine.createSpy('expand')
    };
    const service = setupService(webApp, {
      hostname: 'example.com',
      hash: '#tgWebAppData=query-id%3DfromHash'
    });

    service.init();

    expect(service.getInitData()).toBe('query-id=fromHash');
  });

  it('preserves plus signs when reading tgWebAppData from launch params', () => {
    const webApp = {
      ready: jasmine.createSpy('ready'),
      expand: jasmine.createSpy('expand')
    };
    const service = setupService(webApp, {
      hostname: 'example.com',
      search: '?tgWebAppData=query_id%3D1%26hash%3Da+b%2Bc'
    });

    service.init();

    expect(service.getInitData()).toBe('query_id=1&hash=a+b+c');
  });

  it('caches init data in localStorage when reading from web app', () => {
    const localStorageMock = {
      getItem: jasmine.createSpy('getItem').and.returnValue(null),
      setItem: jasmine.createSpy('setItem')
    };
    const webApp = { initData: 'token=abc', ready: jasmine.createSpy('ready'), expand: jasmine.createSpy('expand') };
    const service = setupService(webApp, 'example.com', jasmine.createSpy('alert'), jasmine.createSpy('confirm').and.returnValue(true), localStorageMock);
    service.init();

    service.getInitData();

    expect(localStorageMock.setItem).toHaveBeenCalledWith('tg_init_data_cache', 'token=abc');
  });

  it('falls back to localStorage cache when web app init data and launch params are unavailable', () => {
    const localStorageMock = {
      getItem: jasmine.createSpy('getItem').and.returnValue('cached-token=123'),
      setItem: jasmine.createSpy('setItem')
    };
    const webApp = { initData: '', ready: jasmine.createSpy('ready'), expand: jasmine.createSpy('expand') };
    const service = setupService(webApp, 'example.com', jasmine.createSpy('alert'), jasmine.createSpy('confirm').and.returnValue(true), localStorageMock);
    service.init();

    expect(service.getInitData()).toBe('cached-token=123');
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
  confirmSpy = jasmine.createSpy('confirm').and.returnValue(true),
  localStorageMock?: { getItem: jasmine.Spy; setItem: jasmine.Spy }
): TelegramService {
  const hostname = typeof locationConfig === 'string' ? locationConfig : (locationConfig.hostname ?? 'example.com');
  const search = typeof locationConfig === 'string' ? '' : (locationConfig.search ?? '');
  const hash = typeof locationConfig === 'string' ? '' : (locationConfig.hash ?? '');

  const defaultView: {
    location: { hostname: string; search: string; hash: string };
    alert: typeof alertSpy;
    confirm: typeof confirmSpy;
    localStorage?: { getItem: jasmine.Spy; setItem: jasmine.Spy };
    Telegram?: { WebApp: object };
  } = {
    location: { hostname, search, hash },
    alert: alertSpy,
    confirm: confirmSpy,
    localStorage: localStorageMock
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
