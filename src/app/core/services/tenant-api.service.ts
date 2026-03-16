import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BookingResponse, CreateBookingRequest } from '../models/booking.model';
import { ServiceItem } from '../models/service.model';
import { TenantConfig } from '../models/tenant-config.model';

@Injectable({ providedIn: 'root' })
export class TenantApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/t';

  getConfig(slug: string): Observable<TenantConfig> {
    return this.http.get<TenantConfig>(`${this.baseUrl}/${slug}/config`);
  }

  getServices(slug: string): Observable<ServiceItem[]> {
    return this.http.get<ServiceItem[]>(`${this.baseUrl}/${slug}/services`);
  }

  createBooking(slug: string, request: CreateBookingRequest): Observable<BookingResponse> {
    return this.http.post<BookingResponse>(`${this.baseUrl}/${slug}/bookings`, request);
  }

  getMyBookings(slug: string): Observable<BookingResponse[]> {
    return this.http.get<BookingResponse[]>(`${this.baseUrl}/${slug}/bookings/my`);
  }

  getBooking(slug: string, bookingId: number): Observable<BookingResponse> {
    return this.http.get<BookingResponse>(`${this.baseUrl}/${slug}/bookings/${bookingId}`);
  }

  cancelBooking(slug: string, bookingId: number): Observable<BookingResponse> {
    return this.http.post<BookingResponse>(`${this.baseUrl}/${slug}/bookings/${bookingId}/cancel`, {});
  }
}
