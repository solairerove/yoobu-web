import { DOCUMENT } from '@angular/common';
import { computed, DestroyRef, effect, inject, Injectable, signal } from '@angular/core';

interface TelegramWebApp {
  initData?: string;
  version?: string;
  ready(): void;
  expand(): void;
  showAlert?(message: string, callback?: () => void): void;
  showConfirm?(message: string, callback?: (confirmed: boolean) => void): void;
  MainButton?: {
    setText(text: string): void;
    show(): void;
    hide(): void;
    enable?(): void;
    disable?(): void;
    onClick?(callback: () => void): void;
    offClick?(callback: () => void): void;
  };
  HapticFeedback?: {
    impactOccurred(style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft'): void;
    notificationOccurred(type: 'error' | 'success' | 'warning'): void;
    selectionChanged(): void;
  };
}

interface TelegramWindow extends Window {
  Telegram?: {
    WebApp?: TelegramWebApp;
  };
}

@Injectable({ providedIn: 'root' })
export class TelegramService {
  private static readonly POPUP_API_MIN_VERSION = '6.2';
  private static readonly INIT_POLL_INTERVAL_MS = 100;
  private static readonly INIT_POLL_TIMEOUT_MS = 15_000;

  private readonly INIT_DATA_SESSION_KEY = 'tg_init_data_cache';
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);
  private readonly webAppSignal = signal<TelegramWebApp | null>(null);
  private readonly mainButtonHandler = signal<(() => void) | null>(null);
  private readonly initDataAvailable = signal(false);
  private readonly initialized = signal(false);
  private readonly initErrorSignal = signal(false);
  private destroyed = false;
  private pollingStarted = false;

  readonly ready = computed(() => {
    if (!this.initialized()) return false;
    if (this.isLocalhost()) return true;
    const webApp = this.webAppSignal();
    if (!webApp) return true;
    return this.initDataAvailable();
  });

  readonly initError = this.initErrorSignal.asReadonly();

  readonly isInsideTelegram = computed(
    () => this.initDataAvailable() && !!(this.webAppSignal()?.MainButton)
  );

  constructor() {
    effect(() => {
      const webApp = this.webAppSignal();

      if (!webApp) {
        return;
      }

      webApp.ready();
      webApp.expand();
    });

    effect((onCleanup) => {
      const webApp = this.webAppSignal();
      const handler = this.mainButtonHandler();
      const mainButton = webApp?.MainButton;

      if (!mainButton || !handler || !mainButton.onClick) {
        return;
      }

      mainButton.onClick(handler);
      onCleanup(() => {
        mainButton.offClick?.(handler);
      });
    });

    this.destroyRef.onDestroy(() => {
      this.destroyed = true;
      const webApp = this.webAppSignal();
      const handler = this.mainButtonHandler();
      if (webApp?.MainButton && handler) {
        webApp.MainButton.offClick?.(handler);
      }
    });
  }

  init(): void {
    const webApp = this.resolveWebApp();
    if (webApp) {
      this.webAppSignal.set(webApp);
    }
    this.initialized.set(true);

    if (this.isLocalhost() || !webApp) {
      return;
    }

    if (this.initDataAvailable()) {
      return;
    }

    if (this.hasLiveInitData()) {
      this.initDataAvailable.set(true);
      return;
    }

    if (!this.pollingStarted) {
      this.pollingStarted = true;
      this.pollInitData(Date.now());
    }
  }

  private hasLiveInitData(): boolean {
    return !!(this.resolveWebApp()?.initData?.trim() || this.getInitDataFromLaunchParams());
  }

  private pollInitData(startedAt: number): void {
    if (this.destroyed) return;

    setTimeout(() => {
      if (this.destroyed) return;

      if (this.hasLiveInitData()) {
        this.initDataAvailable.set(true);
        return;
      }

      if (Date.now() - startedAt >= TelegramService.INIT_POLL_TIMEOUT_MS) {
        this.initErrorSignal.set(true);
        return;
      }

      this.pollInitData(startedAt);
    }, TelegramService.INIT_POLL_INTERVAL_MS);
  }

  getInitData(): string | null {
    const webAppInitData = this.resolveWebApp()?.initData?.trim();
    if (webAppInitData) {
      this.cacheInitData(webAppInitData);
      return webAppInitData;
    }

    const fromLaunchParams = this.getInitDataFromLaunchParams();
    if (fromLaunchParams) {
      this.cacheInitData(fromLaunchParams);
      return fromLaunchParams;
    }

    return this.readCachedInitData();
  }

  getDevTelegramUserId(): string | null {
    if (!this.isLocalhost()) {
      return null;
    }

    return '101';
  }

  isLocalhost(): boolean {
    const hostname = this.document.defaultView?.location.hostname ?? '';
    return hostname === 'localhost' || hostname === '127.0.0.1';
  }

  setMainButton(text: string | null, enabled = true): void {
    const mainButton = this.resolveWebApp()?.MainButton;

    if (!mainButton) {
      return;
    }

    if (!text) {
      mainButton.hide();
      return;
    }

    mainButton.setText(text);
    if (enabled) {
      mainButton.enable?.();
    } else {
      mainButton.disable?.();
    }
    mainButton.show();
  }

  onMainButtonClick(handler: (() => void) | null): void {
    this.mainButtonHandler.set(handler);
  }

  hapticLight(): void {
    this.resolveWebApp()?.HapticFeedback?.impactOccurred('light');
  }

  hapticSelection(): void {
    this.resolveWebApp()?.HapticFeedback?.selectionChanged();
  }

  alert(message: string): Promise<void> {
    const webApp = this.resolveWebApp();

    if (webApp?.showAlert && this.supportsPopupApi(webApp)) {
      return new Promise<void>((resolve) => {
        try {
          webApp.showAlert?.(message, resolve);
          return;
        } catch {
          // Some Telegram runtimes expose the method but reject it at call time.
        }

        this.document.defaultView?.alert(message);
        resolve();
      });
    }

    this.document.defaultView?.alert(message);
    return Promise.resolve();
  }

  confirm(message: string): Promise<boolean> {
    const webApp = this.resolveWebApp();

    if (webApp?.showConfirm && this.supportsPopupApi(webApp)) {
      return new Promise<boolean>((resolve) => {
        try {
          webApp.showConfirm?.(message, resolve);
          return;
        } catch {
          // Fall back when the runtime is too old for Telegram popup support.
        }

        resolve(this.document.defaultView?.confirm(message) ?? false);
      });
    }

    return Promise.resolve(this.document.defaultView?.confirm(message) ?? false);
  }

  private supportsPopupApi(webApp: TelegramWebApp): boolean {
    const version = webApp.version?.trim();
    if (!version) {
      return true;
    }

    return this.isVersionAtLeast(version, TelegramService.POPUP_API_MIN_VERSION);
  }

  private isVersionAtLeast(current: string, minimum: string): boolean {
    const currentParts = this.parseVersionParts(current);
    const minimumParts = this.parseVersionParts(minimum);
    const length = Math.max(currentParts.length, minimumParts.length);

    for (let index = 0; index < length; index += 1) {
      const currentPart = currentParts[index] ?? 0;
      const minimumPart = minimumParts[index] ?? 0;

      if (currentPart > minimumPart) {
        return true;
      }

      if (currentPart < minimumPart) {
        return false;
      }
    }

    return true;
  }

  private parseVersionParts(version: string): number[] {
    return version
      .split('.')
      .map((part) => Number.parseInt(part, 10))
      .filter((part) => Number.isFinite(part));
  }

  clearCachedInitData(): void {
    try {
      this.document.defaultView?.localStorage?.removeItem(this.INIT_DATA_SESSION_KEY);
    } catch {
      // ignore
    }
  }

  private cacheInitData(initData: string): void {
    try {
      this.document.defaultView?.localStorage?.setItem(this.INIT_DATA_SESSION_KEY, initData);
    } catch {
      // localStorage unavailable (e.g. iOS WKWebView security restrictions)
    }
  }

  private readCachedInitData(): string | null {
    try {
      const cached = this.document.defaultView?.localStorage?.getItem(this.INIT_DATA_SESSION_KEY);
      return cached?.trim() || null;
    } catch {
      return null;
    }
  }

  private getInitDataFromLaunchParams(): string | null {
    const location = this.document.defaultView?.location;

    if (!location) {
      return null;
    }

    const fromSearch = this.readInitDataFromParams(location.search ?? '');
    if (fromSearch) {
      return fromSearch;
    }

    const hash = location.hash ?? '';
    const hashValue = hash.startsWith('#') ? hash.slice(1) : hash;
    return this.readInitDataFromParams(hashValue);
  }

  private readInitDataFromParams(paramsSource: string): string | null {
    if (!paramsSource) {
      return null;
    }

    const normalizedSource = paramsSource.startsWith('?') ? paramsSource.slice(1) : paramsSource;
    const match = normalizedSource.match(/(?:^|&)tgWebAppData=([^&]*)/);
    const rawValue = match?.[1];

    if (!rawValue) {
      return null;
    }

    try {
      const decodedValue = decodeURIComponent(rawValue).trim();
      return decodedValue || null;
    } catch {
      const fallbackValue = rawValue.trim();
      return fallbackValue || null;
    }
  }

  private resolveWebApp(): TelegramWebApp | null {
    const current = this.webAppSignal();
    if (current) {
      return current;
    }

    const win = this.document.defaultView as TelegramWindow | null;
    const webApp = win?.Telegram?.WebApp ?? null;
    if (webApp) {
      this.webAppSignal.set(webApp);
    }

    return webApp;
  }
}
