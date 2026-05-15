import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { BookingResponse } from '../../core/models/booking.model';
import { FoodOrderBookingsComponent } from './food-order-bookings.component';

describe('FoodOrderBookingsComponent', () => {
  let fixture: ComponentFixture<FoodOrderBookingsComponent>;
  let component: FoodOrderBookingsComponent;

  const booking: BookingResponse = {
    id: 1,
    type: 'ORDER',
    status: 'DONE',
    customerName: 'Alice',
    customerPhone: '0123456789',
    deliveryAddress: '123 Main St',
    totalPrice: 30000,
    currency: 'VND',
    deliveryDate: '2026-03-19',
    note: 'No sugar',
    trackingUrl: null,
    paymentQrUrl: null,
    items: [{ serviceName: 'Coffee', quantity: 1, unitPrice: 30000 }],
    createdAt: '2026-03-19T10:00:00.000Z'
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [FoodOrderBookingsComponent]
    });

    fixture = TestBed.createComponent(FoodOrderBookingsComponent);
    component = fixture.componentInstance;
  });

  function setRequiredInputs(overrides: Partial<{ selectedBooking: BookingResponse | null }> = {}): void {
    fixture.componentRef.setInput('bookings', [booking]);
    fixture.componentRef.setInput('loading', false);
    fixture.componentRef.setInput('error', null);
    fixture.componentRef.setInput('paymentQrUrl', 'https://example.com/qr.png');
    fixture.componentRef.setInput('selectedBookingId', booking.id);
    fixture.componentRef.setInput('selectedBooking', overrides.selectedBooking ?? booking);
    fixture.componentRef.setInput('confirmingPaymentBookingId', null);
    fixture.componentRef.setInput('paymentError', null);
    fixture.componentRef.setInput('cancellingBookingId', null);
    fixture.componentRef.setInput('cancelError', null);
    fixture.detectChanges();
  }

  it('emits refreshRequested when refresh button is clicked', () => {
    setRequiredInputs();
    const refreshSpy = jasmine.createSpy('refreshSpy');
    component.refreshRequested.subscribe(refreshSpy);

    const refreshButton = fixture.debugElement.query(By.css('.refresh-btn'));
    refreshButton.nativeElement.click();

    expect(refreshSpy).toHaveBeenCalledTimes(1);
  });

  it('emits bookingSelected when a booking row is clicked', () => {
    setRequiredInputs();
    const selectSpy = jasmine.createSpy('selectSpy');
    component.bookingSelected.subscribe(selectSpy);

    const bookingButton = fixture.debugElement.query(By.css('.history-summary'));
    bookingButton.nativeElement.click();

    expect(selectSpy).toHaveBeenCalledWith(booking.id);
  });

  it('emits cancelRequested for cancellable selected booking', () => {
    const activeBooking: BookingResponse = { ...booking, status: 'CONFIRMED' };
    fixture.componentRef.setInput('bookings', [activeBooking]);
    fixture.componentRef.setInput('loading', false);
    fixture.componentRef.setInput('error', null);
    fixture.componentRef.setInput('paymentQrUrl', 'https://example.com/qr.png');
    fixture.componentRef.setInput('selectedBookingId', activeBooking.id);
    fixture.componentRef.setInput('selectedBooking', activeBooking);
    fixture.componentRef.setInput('confirmingPaymentBookingId', null);
    fixture.componentRef.setInput('paymentError', null);
    fixture.componentRef.setInput('cancellingBookingId', null);
    fixture.componentRef.setInput('cancelError', null);
    fixture.detectChanges();
    const cancelSpy = jasmine.createSpy('cancelSpy');
    component.cancelRequested.subscribe(cancelSpy);

    const cancelButton = fixture.debugElement
      .queryAll(By.css('.btn-ghost'))
      .find((button) => button.nativeElement.textContent.trim() === 'Cancel order');
    if (!cancelButton) {
      fail('Expected cancel button to be present');
      return;
    }
    cancelButton.nativeElement.click();

    expect(cancelSpy).toHaveBeenCalledWith(activeBooking.id);
  });

  it('emits repeatRequested when repeat button is clicked', () => {
    setRequiredInputs({ selectedBooking: booking });
    const repeatSpy = jasmine.createSpy('repeatSpy');
    component.repeatRequested.subscribe(repeatSpy);

    const repeatButton = fixture.debugElement
      .queryAll(By.css('.btn-ghost'))
      .find((button) => button.nativeElement.textContent.trim() === 'Repeat order');
    if (!repeatButton) {
      fail('Expected repeat order button to be present');
      return;
    }
    repeatButton.nativeElement.click();

    expect(repeatSpy).toHaveBeenCalledWith(booking.id);
  });

  it('emits paymentConfirmRequested for new selected booking', () => {
    const activeBooking: BookingResponse = { ...booking, status: 'NEW' };
    fixture.componentRef.setInput('bookings', [activeBooking]);
    fixture.componentRef.setInput('loading', false);
    fixture.componentRef.setInput('error', null);
    fixture.componentRef.setInput('paymentQrUrl', 'https://example.com/qr.png');
    fixture.componentRef.setInput('selectedBookingId', activeBooking.id);
    fixture.componentRef.setInput('selectedBooking', activeBooking);
    fixture.componentRef.setInput('confirmingPaymentBookingId', null);
    fixture.componentRef.setInput('paymentError', null);
    fixture.componentRef.setInput('cancellingBookingId', null);
    fixture.componentRef.setInput('cancelError', null);
    fixture.detectChanges();
    const confirmSpy = jasmine.createSpy('confirmSpy');
    component.paymentConfirmRequested.subscribe(confirmSpy);

    const paymentButton = fixture.debugElement.query(By.css('.i-paid-btn'));
    if (!paymentButton) {
      fail('Expected payment confirmation button to be present');
      return;
    }
    paymentButton.nativeElement.click();

    expect(confirmSpy).toHaveBeenCalledWith(activeBooking.id);
  });

  it('hides delivery address row when address is missing', () => {
    const bookingWithoutAddress: BookingResponse = { ...booking, deliveryAddress: null };
    fixture.componentRef.setInput('bookings', [bookingWithoutAddress]);
    fixture.componentRef.setInput('loading', false);
    fixture.componentRef.setInput('error', null);
    fixture.componentRef.setInput('paymentQrUrl', null);
    fixture.componentRef.setInput('selectedBookingId', bookingWithoutAddress.id);
    fixture.componentRef.setInput('selectedBooking', bookingWithoutAddress);
    fixture.componentRef.setInput('confirmingPaymentBookingId', null);
    fixture.componentRef.setInput('paymentError', null);
    fixture.componentRef.setInput('cancellingBookingId', null);
    fixture.componentRef.setInput('cancelError', null);
    fixture.detectChanges();

    const allMetaRows = fixture.debugElement.queryAll(By.css('.receipt-row'));
    const rowText = allMetaRows.map((row) => row.nativeElement.textContent).join(' ');
    expect(rowText).not.toContain('Address');
    expect(rowText).toContain('Delivery date');
    expect(rowText).toContain('Contact');
  });

  it('renders active bookings before historical ones in a flat list', () => {
    const doneBooking: BookingResponse = {
      ...booking,
      id: 2,
      status: 'DONE',
      createdAt: '2026-03-20T10:00:00.000Z'
    };
    const currentBooking: BookingResponse = {
      ...booking,
      id: 3,
      status: 'CONFIRMED',
      createdAt: '2026-03-19T10:00:00.000Z'
    };

    fixture.componentRef.setInput('bookings', [doneBooking, currentBooking]);
    fixture.componentRef.setInput('loading', false);
    fixture.componentRef.setInput('error', null);
    fixture.componentRef.setInput('paymentQrUrl', null);
    fixture.componentRef.setInput('selectedBookingId', currentBooking.id);
    fixture.componentRef.setInput('selectedBooking', currentBooking);
    fixture.componentRef.setInput('confirmingPaymentBookingId', null);
    fixture.componentRef.setInput('paymentError', null);
    fixture.componentRef.setInput('cancellingBookingId', null);
    fixture.componentRef.setInput('cancelError', null);
    fixture.detectChanges();

    const activeCards = fixture.debugElement.queryAll(By.css('.active-card'));
    const historyCards = fixture.debugElement.queryAll(By.css('.history-card'));
    expect(activeCards.length).toBe(1);
    expect(historyCards.length).toBe(1);
    expect(activeCards[0].nativeElement.textContent).toContain('#3');
    expect(historyCards[0].nativeElement.textContent).toContain('#2');

    const detailLabel = fixture.debugElement.query(By.css('.order-label'));
    expect(detailLabel.nativeElement.textContent).toContain('#3');
  });

  it('treats PAYMENT_PENDING status as an active booking', () => {
    const pendingBooking: BookingResponse = {
      ...booking,
      id: 5,
      status: 'PAYMENT_PENDING',
      createdAt: '2026-03-21T10:00:00.000Z'
    };

    fixture.componentRef.setInput('bookings', [pendingBooking]);
    fixture.componentRef.setInput('loading', false);
    fixture.componentRef.setInput('error', null);
    fixture.componentRef.setInput('paymentQrUrl', null);
    fixture.componentRef.setInput('selectedBookingId', pendingBooking.id);
    fixture.componentRef.setInput('selectedBooking', pendingBooking);
    fixture.componentRef.setInput('confirmingPaymentBookingId', null);
    fixture.componentRef.setInput('paymentError', null);
    fixture.componentRef.setInput('cancellingBookingId', null);
    fixture.componentRef.setInput('cancelError', null);
    fixture.detectChanges();

    const activeCards = fixture.debugElement.queryAll(By.css('.active-card'));
    expect(activeCards.length).toBe(1);
    expect(activeCards[0].nativeElement.textContent).toContain('#5');

    const detailLabel = fixture.debugElement.query(By.css('.order-label'));
    expect(detailLabel.nativeElement.textContent).toContain('#5');
  });

  it('sorts active bookings before done ones in the flat list', () => {
    const pendingA: BookingResponse = {
      ...booking,
      id: 6,
      status: 'PAYMENT_PENDING',
      createdAt: '2026-03-22T10:00:00.000Z'
    };
    const pendingB: BookingResponse = {
      ...booking,
      id: 7,
      status: 'PAYMENT_PENDING',
      createdAt: '2026-03-21T10:00:00.000Z'
    };
    const doneBooking: BookingResponse = {
      ...booking,
      id: 8,
      status: 'DONE',
      createdAt: '2026-03-20T10:00:00.000Z'
    };

    fixture.componentRef.setInput('bookings', [doneBooking, pendingB, pendingA]);
    fixture.componentRef.setInput('loading', false);
    fixture.componentRef.setInput('error', null);
    fixture.componentRef.setInput('paymentQrUrl', null);
    fixture.componentRef.setInput('selectedBookingId', pendingA.id);
    fixture.componentRef.setInput('selectedBooking', pendingA);
    fixture.componentRef.setInput('confirmingPaymentBookingId', null);
    fixture.componentRef.setInput('paymentError', null);
    fixture.componentRef.setInput('cancellingBookingId', null);
    fixture.componentRef.setInput('cancelError', null);
    fixture.detectChanges();

    const activeCards = fixture.debugElement.queryAll(By.css('.active-card'));
    const historyCards = fixture.debugElement.queryAll(By.css('.history-card'));
    expect(activeCards.length).toBe(2);
    expect(historyCards.length).toBe(1);
    expect(activeCards[0].nativeElement.textContent).toContain('#6');
    expect(activeCards[1].nativeElement.textContent).toContain('#7');
    expect(historyCards[0].nativeElement.textContent).toContain('#8');
  });

  it('treats delivering status as active booking', () => {
    const deliveringBooking: BookingResponse = {
      ...booking,
      id: 9,
      status: 'DELIVERING',
      createdAt: '2026-03-23T10:00:00.000Z'
    };

    fixture.componentRef.setInput('bookings', [deliveringBooking]);
    fixture.componentRef.setInput('loading', false);
    fixture.componentRef.setInput('error', null);
    fixture.componentRef.setInput('paymentQrUrl', null);
    fixture.componentRef.setInput('selectedBookingId', deliveringBooking.id);
    fixture.componentRef.setInput('selectedBooking', deliveringBooking);
    fixture.componentRef.setInput('confirmingPaymentBookingId', null);
    fixture.componentRef.setInput('paymentError', null);
    fixture.componentRef.setInput('cancellingBookingId', null);
    fixture.componentRef.setInput('cancelError', null);
    fixture.detectChanges();

    const activeCards = fixture.debugElement.queryAll(By.css('.active-card'));
    expect(activeCards.length).toBe(1);
    expect(activeCards[0].nativeElement.textContent).toContain('#9');
  });

  it('shows QR from booking.paymentQrUrl when present, ignoring the fallback input', () => {
    const newBooking: BookingResponse = {
      ...booking,
      id: 11,
      status: 'NEW',
      paymentQrUrl: 'https://dynamic.example.com/qr.png'
    };

    fixture.componentRef.setInput('bookings', [newBooking]);
    fixture.componentRef.setInput('loading', false);
    fixture.componentRef.setInput('error', null);
    fixture.componentRef.setInput('paymentQrUrl', 'https://static.example.com/fallback-qr.png');
    fixture.componentRef.setInput('selectedBookingId', newBooking.id);
    fixture.componentRef.setInput('selectedBooking', newBooking);
    fixture.componentRef.setInput('confirmingPaymentBookingId', null);
    fixture.componentRef.setInput('paymentError', null);
    fixture.componentRef.setInput('cancellingBookingId', null);
    fixture.componentRef.setInput('cancelError', null);
    fixture.detectChanges();

    const qrImg = fixture.debugElement.query(By.css('.qr-thumb-img'));
    expect(qrImg).not.toBeNull();
    expect(qrImg.nativeElement.getAttribute('src')).toBe('https://dynamic.example.com/qr.png');
  });

  it('falls back to paymentQrUrl input when booking.paymentQrUrl is null', () => {
    const newBooking: BookingResponse = { ...booking, id: 12, status: 'NEW', paymentQrUrl: null };

    fixture.componentRef.setInput('bookings', [newBooking]);
    fixture.componentRef.setInput('loading', false);
    fixture.componentRef.setInput('error', null);
    fixture.componentRef.setInput('paymentQrUrl', 'https://static.example.com/fallback-qr.png');
    fixture.componentRef.setInput('selectedBookingId', newBooking.id);
    fixture.componentRef.setInput('selectedBooking', newBooking);
    fixture.componentRef.setInput('confirmingPaymentBookingId', null);
    fixture.componentRef.setInput('paymentError', null);
    fixture.componentRef.setInput('cancellingBookingId', null);
    fixture.componentRef.setInput('cancelError', null);
    fixture.detectChanges();

    const qrImg = fixture.debugElement.query(By.css('.qr-thumb-img'));
    expect(qrImg).not.toBeNull();
    expect(qrImg.nativeElement.getAttribute('src')).toBe('https://static.example.com/fallback-qr.png');
  });

  it('hides QR when both booking.paymentQrUrl and paymentQrUrl input are null', () => {
    const newBooking: BookingResponse = { ...booking, id: 13, status: 'NEW', paymentQrUrl: null };

    fixture.componentRef.setInput('bookings', [newBooking]);
    fixture.componentRef.setInput('loading', false);
    fixture.componentRef.setInput('error', null);
    fixture.componentRef.setInput('paymentQrUrl', null);
    fixture.componentRef.setInput('selectedBookingId', newBooking.id);
    fixture.componentRef.setInput('selectedBooking', newBooking);
    fixture.componentRef.setInput('confirmingPaymentBookingId', null);
    fixture.componentRef.setInput('paymentError', null);
    fixture.componentRef.setInput('cancellingBookingId', null);
    fixture.componentRef.setInput('cancelError', null);
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('.qr-thumb-img'))).toBeNull();
  });

  it('hides QR for non-payable status even when booking.paymentQrUrl is set', () => {
    const confirmedBooking: BookingResponse = {
      ...booking,
      id: 14,
      status: 'CONFIRMED',
      paymentQrUrl: 'https://dynamic.example.com/qr.png'
    };

    fixture.componentRef.setInput('bookings', [confirmedBooking]);
    fixture.componentRef.setInput('loading', false);
    fixture.componentRef.setInput('error', null);
    fixture.componentRef.setInput('paymentQrUrl', 'https://static.example.com/fallback-qr.png');
    fixture.componentRef.setInput('selectedBookingId', confirmedBooking.id);
    fixture.componentRef.setInput('selectedBooking', confirmedBooking);
    fixture.componentRef.setInput('confirmingPaymentBookingId', null);
    fixture.componentRef.setInput('paymentError', null);
    fixture.componentRef.setInput('cancellingBookingId', null);
    fixture.componentRef.setInput('cancelError', null);
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('.qr-thumb-img'))).toBeNull();
  });

  it('shows tracking link when trackingUrl is present', () => {
    const deliveringBooking: BookingResponse = {
      ...booking,
      id: 10,
      status: 'DELIVERING',
      trackingUrl: 'https://tracking.example.com/123'
    };

    fixture.componentRef.setInput('bookings', [deliveringBooking]);
    fixture.componentRef.setInput('loading', false);
    fixture.componentRef.setInput('error', null);
    fixture.componentRef.setInput('paymentQrUrl', null);
    fixture.componentRef.setInput('selectedBookingId', deliveringBooking.id);
    fixture.componentRef.setInput('selectedBooking', deliveringBooking);
    fixture.componentRef.setInput('confirmingPaymentBookingId', null);
    fixture.componentRef.setInput('paymentError', null);
    fixture.componentRef.setInput('cancellingBookingId', null);
    fixture.componentRef.setInput('cancelError', null);
    fixture.detectChanges();

    const trackingLink = fixture.debugElement.query(By.css('.track-btn'));
    expect(trackingLink).not.toBeNull();
    expect(trackingLink.nativeElement.getAttribute('href')).toBe('https://tracking.example.com/123');
    expect(trackingLink.nativeElement.textContent).toContain('Track delivery');
  });
});
