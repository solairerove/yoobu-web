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
    items: [{ serviceName: 'Coffee', quantity: 1, unitPrice: 30000, currency: 'VND' }],
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

    const refreshButton = fixture.debugElement.query(By.css('.bookings-head .head-action'));
    refreshButton.nativeElement.click();

    expect(refreshSpy).toHaveBeenCalledTimes(1);
  });

  it('emits bookingSelected when a booking row is clicked', () => {
    setRequiredInputs();
    const selectSpy = jasmine.createSpy('selectSpy');
    component.bookingSelected.subscribe(selectSpy);

    const bookingButton = fixture.debugElement.query(By.css('.booking-item'));
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
      .queryAll(By.css('.booking-actions .ghost-button'))
      .find((button) => button.nativeElement.textContent.includes('Cancel order'));
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
      .queryAll(By.css('.booking-actions .ghost-button'))
      .find((button) => button.nativeElement.textContent.includes('Repeat order'));
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

    const paymentButton = fixture.debugElement
      .queryAll(By.css('.booking-actions .ghost-button'))
      .find((button) => button.nativeElement.textContent.includes('I paid'));
    if (!paymentButton) {
      fail('Expected payment confirmation button to be present');
      return;
    }
    paymentButton.nativeElement.click();

    expect(confirmSpy).toHaveBeenCalledWith(activeBooking.id);
  });

  it('renders delivery address and falls back to N/A when missing', () => {
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

    expect(fixture.debugElement.query(By.css('.booking-address')).nativeElement.textContent).toContain('N/A');
    const allMetaRows = fixture.debugElement.queryAll(By.css('.receipt-row'));
    expect(allMetaRows.map((row) => row.nativeElement.textContent).join(' ')).toContain('Delivery address');
    expect(allMetaRows.map((row) => row.nativeElement.textContent).join(' ')).toContain('N/A');
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

    const items = fixture.debugElement.queryAll(By.css('.booking-list .booking-item'));
    expect(items.length).toBe(2);
    expect(items[0].nativeElement.textContent).toContain('#3');
    expect(items[1].nativeElement.textContent).toContain('#2');

    const detailId = fixture.debugElement.query(By.css('.booking-summary .booking-id-row .eyebrow'));
    expect(detailId.nativeElement.textContent).toContain('#3');
  });

  it('treats payment-pending status variants as active bookings', () => {
    const pendingBooking: BookingResponse = {
      ...booking,
      id: 5,
      status: 'payment-pending',
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

    const items = fixture.debugElement.queryAll(By.css('.booking-list .booking-item'));
    expect(items.length).toBe(1);
    expect(items[0].nativeElement.textContent).toContain('#5');

    const detailId = fixture.debugElement.query(By.css('.booking-summary .booking-id-row .eyebrow'));
    expect(detailId.nativeElement.textContent).toContain('#5');
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

    const items = fixture.debugElement.queryAll(By.css('.booking-list .booking-item'));
    expect(items.length).toBe(3);
    expect(items[0].nativeElement.textContent).toContain('#6');
    expect(items[1].nativeElement.textContent).toContain('#7');
    expect(items[2].nativeElement.textContent).toContain('#8');
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

    const items = fixture.debugElement.queryAll(By.css('.booking-list .booking-item'));
    expect(items.length).toBe(1);
    expect(items[0].nativeElement.textContent).toContain('#9');
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

    const trackingLink = fixture.debugElement.query(By.css('.booking-actions .tracking-link'));
    expect(trackingLink).not.toBeNull();
    expect(trackingLink.nativeElement.getAttribute('href')).toBe('https://tracking.example.com/123');
    expect(trackingLink.nativeElement.textContent).toContain('Track delivery');
  });
});
