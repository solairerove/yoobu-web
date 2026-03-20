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
    totalPrice: 30000,
    currency: 'VND',
    deliveryDate: '2026-03-19',
    note: null,
    items: [{ serviceName: 'Coffee', quantity: 1, unitPrice: 30000, currency: 'VND' }],
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
    fixture.detectChanges();
  }

  it('renders booking id and customer name', () => {
    setRequiredInputs();

    const heading = fixture.debugElement.query(By.css('h3')).nativeElement as HTMLElement;
    const body = fixture.debugElement.query(By.css('.ui-copy')).nativeElement as HTMLElement;

    expect(heading.textContent).toContain('Order #1');
    expect(body.textContent).toContain('Alice');
  });

  it('emits newOrderRequested when New order is clicked', () => {
    setRequiredInputs();
    const newOrderSpy = jasmine.createSpy('newOrderSpy');
    component.newOrderRequested.subscribe(newOrderSpy);

    const buttons = fixture.debugElement.queryAll(By.css('.ghost-button'));
    buttons[0].nativeElement.click();

    expect(newOrderSpy).toHaveBeenCalledTimes(1);
  });

  it('emits ordersRequested when My orders is clicked', () => {
    setRequiredInputs();
    const ordersSpy = jasmine.createSpy('ordersSpy');
    component.ordersRequested.subscribe(ordersSpy);

    const buttons = fixture.debugElement.queryAll(By.css('.ghost-button'));
    buttons[1].nativeElement.click();

    expect(ordersSpy).toHaveBeenCalledTimes(1);
  });
});
