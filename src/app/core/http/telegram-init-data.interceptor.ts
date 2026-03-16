import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { TelegramService } from '../telegram/telegram.service';

export const telegramInitDataInterceptor: HttpInterceptorFn = (request, next) => {
  const telegram = inject(TelegramService);
  const initData = telegram.getInitData();

  if (!initData) {
    return next(request);
  }

  return next(
    request.clone({
      setHeaders: {
        'X-Telegram-Init-Data': initData
      }
    })
  );
};

