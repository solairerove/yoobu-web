import { DOCUMENT } from '@angular/common';
import { DestroyRef, effect, inject, Injectable, signal } from '@angular/core';

interface TelegramWebApp {
  initData?: string;
  ready(): void;
  expand(): void;
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
    const hostname = this.document.defaultView?.location.hostname ?? '';
    if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
      return null;
    }

    return '101';
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
}
