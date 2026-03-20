export interface CreateBookingItem {
  serviceId: number;
  quantity: number;
}

export interface CreateBookingRequest {
  customerName: string;
  customerPhone: string;
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
  status: 'NEW' | 'CONFIRMED' | 'DONE' | 'CANCELLED' | string;
  customerName: string;
  customerPhone: string;
  totalPrice: number;
  currency: string;
  deliveryDate: string;
  note: string | null;
  items: BookingItem[];
  createdAt: string;
}
