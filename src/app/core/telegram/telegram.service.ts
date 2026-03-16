import { DOCUMENT } from '@angular/common';
import { effect, inject, Injectable, signal } from '@angular/core';

interface TelegramWebApp {
  initData?: string;
  ready(): void;
  expand(): void;
  MainButton?: {
    setText(text: string): void;
    show(): void;
    hide(): void;
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
  private readonly webAppSignal = signal<TelegramWebApp | null>(null);

  constructor() {
    effect(() => {
      const webApp = this.webAppSignal();

      if (!webApp) {
        return;
      }

      webApp.ready();
      webApp.expand();
    });
  }

  init(): void {
    const win = this.document.defaultView as TelegramWindow | null;
    this.webAppSignal.set(win?.Telegram?.WebApp ?? null);
  }

  getInitData(): string | null {
    return this.webAppSignal()?.initData?.trim() || null;
  }

  setMainButton(text: string | null): void {
    const mainButton = this.webAppSignal()?.MainButton;

    if (!mainButton) {
      return;
    }

    if (!text) {
      mainButton.hide();
      return;
    }

    mainButton.setText(text);
    mainButton.show();
  }
}

