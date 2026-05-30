import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { BookingResponse } from '../../core/models/booking.model';
import { FoodOrderSuccessCardComponent } from './food-order-success-card.component';

describe('FoodOrderSuccessCardComponent', () => {
  let fixture: ComponentFixture<FoodOrderSuccessCardComponent>;
  let component: FoodOrderSuccessCardComponent;

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
    note: null,
    trackingUrl: null,
    paymentQrUrl: null,
    items: [{ serviceName: 'Coffee', quantity: 1, unitPrice: 30000, variantSize: null, variantColor: null }],
    createdAt: '2026-03-19T10:00:00.000Z'
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [FoodOrderSuccessCardComponent]
    });

    fixture = TestBed.createComponent(FoodOrderSuccessCardComponent);
    component = fixture.componentInstance;
  });

  function setRequiredInputs(): void {
    fixture.componentRef.setInput('booking', booking);
    fixture.componentRef.setInput('fallbackCurrency', 'VND');
    fixture.componentRef.setInput('paymentQrUrl', 'https://example.com/qr.png');
    fixture.componentRef.setInput('confirmingPaymentBookingId', null);
    fixture.componentRef.setInput('paymentError', null);
    fixture.detectChanges();
  }

  it('renders booking id and customer name', () => {
    setRequiredInputs();

    const heading = fixture.debugElement.query(By.css('.eyebrow')).nativeElement as HTMLElement;
    const body = fixture.debugElement.query(By.css('.ui-copy')).nativeElement as HTMLElement;

    expect(heading.textContent).toContain('Order #1');
    expect(body.textContent).toContain('Alice');
  });

  it('emits newOrderRequested when New order is clicked', () => {
    setRequiredInputs();
    const newOrderSpy = jasmine.createSpy('newOrderSpy');
    component.newOrderRequested.subscribe(newOrderSpy);

    const button = fixture.debugElement
      .queryAll(By.css('.success-actions .ghost-button'))
      .find((item) => item.nativeElement.textContent.includes('New order'));
    if (!button) {
      fail('Expected New order button to be present');
      return;
    }
    button.nativeElement.click();

    expect(newOrderSpy).toHaveBeenCalledTimes(1);
  });

  it('emits ordersRequested when My orders is clicked', () => {
    setRequiredInputs();
    const ordersSpy = jasmine.createSpy('ordersSpy');
    component.ordersRequested.subscribe(ordersSpy);

    const button = fixture.debugElement
      .queryAll(By.css('.success-actions .ghost-button'))
      .find((item) => item.nativeElement.textContent.includes('My orders'));
    if (!button) {
      fail('Expected My orders button to be present');
      return;
    }
    button.nativeElement.click();

    expect(ordersSpy).toHaveBeenCalledTimes(1);
  });

  it('emits paymentConfirmRequested when I paid is clicked for NEW status', () => {
    setRequiredInputs();
    const confirmSpy = jasmine.createSpy('confirmSpy');
    component.paymentConfirmRequested.subscribe(confirmSpy);

    const paymentButton = fixture.debugElement
      .queryAll(By.css('.ghost-button'))
      .find((item) => item.nativeElement.textContent.includes('I paid'));
    if (!paymentButton) {
      fail('Expected I paid button to be present');
      return;
    }
    paymentButton.nativeElement.click();

    expect(confirmSpy).toHaveBeenCalledWith(booking.id);
  });

  it('shows QR from booking.paymentQrUrl when present, ignoring the fallback input', () => {
    fixture.componentRef.setInput('booking', { ...booking, paymentQrUrl: 'https://dynamic.example.com/qr.png' });
    fixture.componentRef.setInput('fallbackCurrency', 'VND');
    fixture.componentRef.setInput('paymentQrUrl', 'https://static.example.com/fallback-qr.png');
    fixture.componentRef.setInput('confirmingPaymentBookingId', null);
    fixture.componentRef.setInput('paymentError', null);
    fixture.detectChanges();

    const qrImg = fixture.debugElement.query(By.css('.payment-qr-card img'));
    expect(qrImg).not.toBeNull();
    expect(qrImg.nativeElement.getAttribute('src')).toBe('https://dynamic.example.com/qr.png');
  });

  it('falls back to paymentQrUrl input when booking.paymentQrUrl is null', () => {
    fixture.componentRef.setInput('booking', { ...booking, paymentQrUrl: null });
    fixture.componentRef.setInput('fallbackCurrency', 'VND');
    fixture.componentRef.setInput('paymentQrUrl', 'https://static.example.com/fallback-qr.png');
    fixture.componentRef.setInput('confirmingPaymentBookingId', null);
    fixture.componentRef.setInput('paymentError', null);
    fixture.detectChanges();

    const qrImg = fixture.debugElement.query(By.css('.payment-qr-card img'));
    expect(qrImg).not.toBeNull();
    expect(qrImg.nativeElement.getAttribute('src')).toBe('https://static.example.com/fallback-qr.png');
  });

  it('hides QR when both booking.paymentQrUrl and paymentQrUrl input are null', () => {
    fixture.componentRef.setInput('booking', { ...booking, paymentQrUrl: null });
    fixture.componentRef.setInput('fallbackCurrency', 'VND');
    fixture.componentRef.setInput('paymentQrUrl', null);
    fixture.componentRef.setInput('confirmingPaymentBookingId', null);
    fixture.componentRef.setInput('paymentError', null);
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('.payment-qr-card'))).toBeNull();
  });

  it('hides QR for non-payable status even when booking.paymentQrUrl is set', () => {
    fixture.componentRef.setInput('booking', {
      ...booking,
      status: 'CONFIRMED',
      paymentQrUrl: 'https://dynamic.example.com/qr.png'
    });
    fixture.componentRef.setInput('fallbackCurrency', 'VND');
    fixture.componentRef.setInput('paymentQrUrl', 'https://static.example.com/fallback-qr.png');
    fixture.componentRef.setInput('confirmingPaymentBookingId', null);
    fixture.componentRef.setInput('paymentError', null);
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('.payment-qr-card'))).toBeNull();
  });

  it('shows track delivery link for delivering booking with trackingUrl', () => {
    fixture.componentRef.setInput('booking', {
      ...booking,
      status: 'DELIVERING',
      trackingUrl: 'https://tracking.example.com/42'
    });
    fixture.componentRef.setInput('fallbackCurrency', 'VND');
    fixture.componentRef.setInput('paymentQrUrl', null);
    fixture.componentRef.setInput('confirmingPaymentBookingId', null);
    fixture.componentRef.setInput('paymentError', null);
    fixture.detectChanges();

    const trackingLink = fixture.debugElement.query(By.css('.tracking-link'));
    expect(trackingLink).not.toBeNull();
    expect(trackingLink.nativeElement.getAttribute('href')).toBe('https://tracking.example.com/42');
    expect(trackingLink.nativeElement.textContent).toContain('Track delivery');
  });
});
