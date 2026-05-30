import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, retry, TimeoutError, timeout, timer } from 'rxjs';
import { BookingResponse, CreateBookingRequest, CreateEcommerceOrderRequest } from '../models/booking.model';
import { ServiceItem } from '../models/service.model';
import { TenantConfig } from '../models/tenant-config.model';

@Injectable({ providedIn: 'root' })
export class TenantApiService {
  private static readonly REQUEST_TIMEOUT_MS = 10_000;
  private static readonly RETRY_COUNT = 2;

  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/t';

  getConfig(slug: string): Observable<TenantConfig> {
    return this.withRetry(this.http.get<TenantConfig>(`${this.baseUrl}/${slug}/config`));
  }

  getServices(slug: string): Observable<ServiceItem[]> {
    return this.withRetry(this.http.get<ServiceItem[]>(`${this.baseUrl}/${slug}/services`));
  }

  createBooking(slug: string, request: CreateBookingRequest): Observable<BookingResponse> {
    return this.http.post<BookingResponse>(`${this.baseUrl}/${slug}/bookings`, request);
  }

  createOrder(slug: string, request: CreateEcommerceOrderRequest): Observable<BookingResponse> {
    return this.http.post<BookingResponse>(`${this.baseUrl}/${slug}/orders`, request);
  }

  getMyBookings(slug: string): Observable<BookingResponse[]> {
    return this.withRetry(this.http.get<BookingResponse[]>(`${this.baseUrl}/${slug}/bookings/my`));
  }

  getBooking(slug: string, bookingId: number): Observable<BookingResponse> {
    return this.withRetry(this.http.get<BookingResponse>(`${this.baseUrl}/${slug}/bookings/${bookingId}`));
  }

  confirmBookingPayment(slug: string, bookingId: number): Observable<BookingResponse> {
    return this.http.post<BookingResponse>(`${this.baseUrl}/${slug}/bookings/${bookingId}/confirm-payment`, {});
  }

  cancelBooking(slug: string, bookingId: number): Observable<BookingResponse> {
    return this.http.post<BookingResponse>(`${this.baseUrl}/${slug}/bookings/${bookingId}/cancel`, {});
  }

  private withRetry<T>(source: Observable<T>): Observable<T> {
    return source.pipe(
      timeout(TenantApiService.REQUEST_TIMEOUT_MS),
      retry({
        count: TenantApiService.RETRY_COUNT,
        delay: (error, retryIndex) => {
          const retryable =
            error instanceof TimeoutError ||
            (error instanceof HttpErrorResponse && (error.status === 0 || error.status >= 500));
          if (!retryable) {
            throw error;
          }
          return timer(retryIndex * 2000);
        }
      })
    );
  }
}
