import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { TelegramService } from '../telegram/telegram.service';

export const telegramInitDataInterceptor: HttpInterceptorFn = (request, next) => {
  const telegram = inject(TelegramService);
  const initData = telegram.getInitData();
  const devTelegramUserId = telegram.getDevTelegramUserId();

  if (!initData) {
    if (!devTelegramUserId) {
      console.info('[telegram-auth] no auth header attached', {
        url: request.url
      });
      return next(request);
    }

    console.info('[telegram-auth] attaching dev user header', {
      url: request.url,
      userId: devTelegramUserId
    });

    return next(
      request.clone({
        setHeaders: {
          'X-Telegram-User-Id': devTelegramUserId
        }
      })
    );
  }

  console.info('[telegram-auth] attaching initData header', {
    url: request.url,
    initDataLength: initData.length
  });

  return next(
    request.clone({
      setHeaders: {
        'X-Telegram-Init-Data': initData
      }
    })
  );
};
