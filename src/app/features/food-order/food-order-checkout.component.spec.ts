import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormBuilder } from '@angular/forms';
import { By } from '@angular/platform-browser';
import { FoodOrderCheckoutComponent } from './food-order-checkout.component';

describe('FoodOrderCheckoutComponent', () => {
  let fixture: ComponentFixture<FoodOrderCheckoutComponent>;
  let component: FoodOrderCheckoutComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [FoodOrderCheckoutComponent]
    });

    fixture = TestBed.createComponent(FoodOrderCheckoutComponent);
    component = fixture.componentInstance;
  });

  function createForm() {
    const fb = new FormBuilder();
    return fb.nonNullable.group({
      customerName: ['Alice'],
      customerPhone: ['0123456789'],
      deliveryDate: ['2026-03-19'],
      note: ['']
    });
  }

  function setRequiredInputs(localMode: boolean): void {
    fixture.componentRef.setInput('open', true);
    fixture.componentRef.setInput('localMode', localMode);
    fixture.componentRef.setInput('submitting', false);
    fixture.componentRef.setInput('submitError', null);
    fixture.componentRef.setInput('form', createForm());
    fixture.componentRef.setInput('selectedItems', [
      {
        quantity: 1,
        service: {
          id: 1,
          name: 'Coffee',
          description: null,
          price: 30000,
          unit: 'cup',
          durationMinutes: null,
          sortOrder: 1,
          status: 'ACTIVE'
        }
      }
    ]);
    fixture.componentRef.setInput('selectedCount', 1);
    fixture.componentRef.setInput('selectedTotal', 30000);
    fixture.detectChanges();
  }

  it('emits submitRequested when local checkout form is submitted', () => {
    setRequiredInputs(true);
    const submitSpy = jasmine.createSpy('submitSpy');
    component.submitRequested.subscribe(submitSpy);

    const form = fixture.debugElement.query(By.css('.checkout-form')).nativeElement as HTMLFormElement;
    form.dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    expect(submitSpy).toHaveBeenCalledTimes(1);
  });

  it('emits closeRequested when scrim is clicked in telegram mode', () => {
    setRequiredInputs(false);
    const closeSpy = jasmine.createSpy('closeSpy');
    component.closeRequested.subscribe(closeSpy);

    const scrim = fixture.debugElement.query(By.css('.checkout-scrim'));
    scrim.nativeElement.click();

    expect(closeSpy).toHaveBeenCalledTimes(1);
  });

  it('disables back button while submitting', () => {
    setRequiredInputs(true);
    fixture.componentRef.setInput('submitting', true);
    fixture.detectChanges();

    const backButton = fixture.debugElement.query(By.css('.checkout-head .ghost-button')).nativeElement as HTMLButtonElement;

    expect(backButton.disabled).toBeTrue();
  });
});

