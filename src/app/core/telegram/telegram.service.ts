import { DOCUMENT } from '@angular/common';
import { DestroyRef, effect, inject, Injectable, signal } from '@angular/core';

interface TelegramWebApp {
  initData?: string;
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
}

interface TelegramWindow extends Window {
  Telegram?: {
    WebApp?: TelegramWebApp;
  };
}

@Injectable({ providedIn: 'root' })
export class TelegramService {
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);
  private readonly webAppSignal = signal<TelegramWebApp | null>(null);
  private readonly mainButtonHandler = signal<(() => void) | null>(null);

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
      const webApp = this.webAppSignal();
      const handler = this.mainButtonHandler();
      if (webApp?.MainButton && handler) {
        webApp.MainButton.offClick?.(handler);
      }
    });
  }

  init(): void {
    const win = this.document.defaultView as TelegramWindow | null;
    this.webAppSignal.set(win?.Telegram?.WebApp ?? null);
  }

  getInitData(): string | null {
    return this.webAppSignal()?.initData?.trim() || null;
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
    const mainButton = this.webAppSignal()?.MainButton;

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

  alert(message: string): Promise<void> {
    const webApp = this.webAppSignal();

    if (webApp?.showAlert) {
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
    const webApp = this.webAppSignal();

    if (webApp?.showConfirm) {
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
}
