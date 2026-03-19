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
    totalPrice: 30000,
    deliveryDate: '2026-03-19',
    note: 'No sugar',
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
    fixture.componentRef.setInput('selectedBookingId', booking.id);
    fixture.componentRef.setInput('selectedBooking', overrides.selectedBooking ?? booking);
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

    const cancelButton = fixture.debugElement.query(By.css('.booking-detail-head .ghost-button'));
    cancelButton.nativeElement.click();

    expect(cancelSpy).toHaveBeenCalledWith(booking.id);
  });
});

