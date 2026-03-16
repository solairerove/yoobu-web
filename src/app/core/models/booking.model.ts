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
}

export interface BookingResponse {
  id: number;
  type: 'ORDER' | 'APPOINTMENT' | 'REQUEST';
  status: 'NEW' | 'CONFIRMED' | 'DONE' | 'CANCELLED';
  customerName: string;
  totalPrice: number;
  deliveryDate: string;
  note: string | null;
  items: BookingItem[];
  createdAt: string;
}
