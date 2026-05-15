import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { TelegramService } from '../telegram/telegram.service';

export const telegramInitDataInterceptor: HttpInterceptorFn = (request, next) => {
  const telegram = inject(TelegramService);
  telegram.init();

  const devTelegramUserId = telegram.getDevTelegramUserId();
  if (devTelegramUserId) {
    return next(request.clone({ setHeaders: { 'X-Telegram-User-Id': devTelegramUserId } }));
  }

  const initData = telegram.getInitData();
  if (!initData) {
    if (request.url.includes('/bookings')) {
      return throwError(() => new Error('Telegram session unavailable. Please reopen the app.'));
    }
    return next(request);
  }

  return next(request.clone({ setHeaders: { 'X-Telegram-Init-Data': initData } })).pipe(
    catchError((err) => {
      if (err instanceof HttpErrorResponse && (err.status === 401 || err.status === 403)) {
        telegram.clearCachedInitData();
      }
      return throwError(() => err);
    })
  );
};
