export interface CreateBookingItem {
  serviceId: number;
  quantity: number;
}

export interface CreateBookingRequest {
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  deliveryDate: string;
  note: string | null;
  items: CreateBookingItem[];
}

export interface BookingItem {
  serviceName: string;
  quantity: number;
  unitPrice: number;
  currency: string;
}

export interface BookingResponse {
  id: number;
  type: 'ORDER' | 'APPOINTMENT' | 'REQUEST' | string;
  status: BookingStatus;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string | null;
  totalPrice: number;
  currency: string;
  deliveryDate: string;
  note: string | null;
  trackingUrl: string | null;
  paymentQrUrl: string | null;
  items: BookingItem[];
  createdAt: string;
}

export type BookingStatus = 'NEW' | 'PAYMENT_PENDING' | 'CONFIRMED' | 'DELIVERING' | 'DONE' | 'CANCELLED' | string;
