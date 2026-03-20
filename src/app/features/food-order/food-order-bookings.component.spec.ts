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
    status: 'NEW',
    customerName: 'Alice',
    customerPhone: '0123456789',
    deliveryAddress: '123 Main St',
    totalPrice: 30000,
    currency: 'VND',
    deliveryDate: '2026-03-19',
    note: 'No sugar',
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

    const refreshButton = fixture.debugElement.query(By.css('.bookings-head .ghost-button'));
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
    setRequiredInputs({ selectedBooking: booking });
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

    expect(cancelSpy).toHaveBeenCalledWith(booking.id);
  });

  it('emits paymentConfirmRequested for new selected booking', () => {
    setRequiredInputs({ selectedBooking: booking });
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

    expect(confirmSpy).toHaveBeenCalledWith(booking.id);
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
});
