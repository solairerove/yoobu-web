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
      deliveryAddress: ['123 Main St'],
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
          imageUrl: null,
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

    const backButton = fixture.debugElement.query(By.css('.checkout-head .head-action')).nativeElement as HTMLButtonElement;

    expect(backButton.disabled).toBeTrue();
  });

  it('shows tenant hints whenever provided', () => {
    setRequiredInputs(true);
    fixture.componentRef.setInput('customerNameHint', 'Use full name');
    fixture.componentRef.setInput('customerPhoneHint', '+84...');
    fixture.componentRef.setInput('deliveryAddressHint', 'Street, house');
    fixture.componentRef.setInput('customerNoteHint', 'No onion');
    fixture.detectChanges();

    const fieldHints = fixture.debugElement.queryAll(By.css('.field-hint'));
    expect(fieldHints.length).toBe(4);
    expect(fieldHints[0].nativeElement.textContent).toContain('Use full name');
    expect(fieldHints[1].nativeElement.textContent).toContain('+84...');
    expect(fieldHints[2].nativeElement.textContent).toContain('Street, house');
    expect(fieldHints[3].nativeElement.textContent).toContain('No onion');
  });

  it('does not show tenant hints when not provided', () => {
    setRequiredInputs(true);
    expect(fixture.debugElement.queryAll(By.css('.field-hint')).length).toBe(0);
  });

  it('sets min attribute on date input from earliestDeliveryDate', () => {
    setRequiredInputs(true);
    fixture.componentRef.setInput('earliestDeliveryDate', '2026-03-25');
    fixture.detectChanges();

    const dateInput = fixture.debugElement.query(By.css('input[type="date"]')).nativeElement as HTMLInputElement;
    expect(dateInput.min).toBe('2026-03-25');
  });

  it('shows cutoff hint when earliestDeliveryDate is in the future', () => {
    setRequiredInputs(true);
    fixture.componentRef.setInput('earliestDeliveryDate', '9999-12-31');
    fixture.detectChanges();

    const hint = fixture.debugElement.query(By.css('.cutoff-hint'));
    expect(hint).not.toBeNull();
    expect(hint.nativeElement.textContent).toContain('9999-12-31');
  });

  it('does not show cutoff hint when earliestDeliveryDate is null', () => {
    setRequiredInputs(true);
    fixture.componentRef.setInput('earliestDeliveryDate', null);
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('.cutoff-hint'))).toBeNull();
  });

  it('renders and dismisses repeat-order banner', () => {
    setRequiredInputs(true);
    fixture.componentRef.setInput('repeatOrderBanner', 'Cart prefilled from order #12.');
    fixture.detectChanges();
    const dismissSpy = jasmine.createSpy('dismissSpy');
    component.repeatOrderBannerDismissed.subscribe(dismissSpy);

    const banner = fixture.debugElement.query(By.css('.repeat-banner'));
    expect(banner).not.toBeNull();
    expect(banner.nativeElement.textContent).toContain('Cart prefilled from order #12.');

    const dismissButton = banner.query(By.css('.ghost-button'));
    dismissButton.nativeElement.click();

    expect(dismissSpy).toHaveBeenCalledTimes(1);
  });
});
