import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { FoodOrderCartBarComponent } from './food-order-cart-bar.component';

describe('FoodOrderCartBarComponent', () => {
  let fixture: ComponentFixture<FoodOrderCartBarComponent>;
  let component: FoodOrderCartBarComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [FoodOrderCartBarComponent]
    });

    fixture = TestBed.createComponent(FoodOrderCartBarComponent);
    component = fixture.componentInstance;
  });

  function setRequiredInputs(overrides: Partial<{ checkoutOpen: boolean }> = {}): void {
    fixture.componentRef.setInput('checkoutOpen', overrides.checkoutOpen ?? false);
    fixture.componentRef.setInput('selectedCount', 2);
    fixture.componentRef.setInput('selectedTotal', 60000);
    fixture.componentRef.setInput('currencyCode', 'VND');
    fixture.detectChanges();
  }

  it('emits openRequested when cart bar is clicked', () => {
    setRequiredInputs();
    const openSpy = jasmine.createSpy('openSpy');
    component.openRequested.subscribe(openSpy);

    const cartBar = fixture.debugElement.query(By.css('.cart-bar'));
    cartBar.nativeElement.click();

    expect(openSpy).toHaveBeenCalledTimes(1);
  });

  it('renders open checkout action when checkout is closed', () => {
    setRequiredInputs({ checkoutOpen: false });

    const cartAction = fixture.debugElement.query(By.css('.cart-action')).nativeElement as HTMLElement;

    expect(cartAction.textContent).toContain('Open checkout');
  });

  it('renders review action when checkout is already open', () => {
    setRequiredInputs({ checkoutOpen: true });

    const cartAction = fixture.debugElement.query(By.css('.cart-action')).nativeElement as HTMLElement;

    expect(cartAction.textContent).toContain('Review order');
  });
});
