import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { from, switchMap, throwError } from 'rxjs';
import { TelegramService } from '../telegram/telegram.service';

const TELEGRAM_INIT_DATA_WAIT_TIMEOUT_MS = 1500;
const TELEGRAM_INIT_DATA_POLL_INTERVAL_MS = 50;

export const telegramInitDataInterceptor: HttpInterceptorFn = (request, next) => {
  const telegram = inject(TelegramService);
  const devTelegramUserId = telegram.getDevTelegramUserId();
  const initDataWait =
    !devTelegramUserId && request.url.includes('/bookings')
      ? waitForInitData(telegram)
      : Promise.resolve(readInitDataNow(telegram));

  return from(initDataWait).pipe(
    switchMap((initData) => {
      if (devTelegramUserId) {
        return next(
          request.clone({
            setHeaders: {
              'X-Telegram-User-Id': devTelegramUserId
            }
          })
        );
      }

      if (!initData) {
        if (request.url.includes('/bookings')) {
          return throwError(() => new Error('Telegram session unavailable. Please reopen the app.'));
        }
        return next(request);
      }

      return next(
        request.clone({
          setHeaders: {
            'X-Telegram-Init-Data': initData
          }
        })
      );
    })
  );
};

function readInitDataNow(telegram: TelegramService): string | null {
  telegram.init();
  return telegram.getInitData();
}

function waitForInitData(telegram: TelegramService): Promise<string | null> {
  const startedAt = Date.now();

  return new Promise((resolve) => {
    const check = () => {
      const initData = readInitDataNow(telegram);
      if (initData) {
        resolve(initData);
        return;
      }

      if (Date.now() - startedAt >= TELEGRAM_INIT_DATA_WAIT_TIMEOUT_MS) {
        resolve(null);
        return;
      }

      setTimeout(check, TELEGRAM_INIT_DATA_POLL_INTERVAL_MS);
    };

    check();
  });
}
