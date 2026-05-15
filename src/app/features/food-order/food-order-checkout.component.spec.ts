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

  function createForm(deliveryDate = '2026-03-19') {
    const fb = new FormBuilder();
    return fb.nonNullable.group({
      customerName: ['Alice'],
      customerPhone: ['0123456789'],
      deliveryAddress: ['123 Main St'],
      deliveryDate: [deliveryDate],
      note: ['']
    });
  }

  function setRequiredInputs(localMode: boolean, deliveryDate = '2026-03-19'): void {
    fixture.componentRef.setInput('localMode', localMode);
    fixture.componentRef.setInput('submitting', false);
    fixture.componentRef.setInput('submitError', null);
    fixture.componentRef.setInput('form', createForm(deliveryDate));
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

  it('disables back button while submitting', () => {
    setRequiredInputs(true);
    fixture.componentRef.setInput('submitting', true);
    fixture.detectChanges();

    const backButton = fixture.debugElement.query(By.css('.checkout-header .head-action')).nativeElement as HTMLButtonElement;

    expect(backButton.disabled).toBeTrue();
  });

  it('shows tenant hints whenever provided', () => {
    setRequiredInputs(true);
    fixture.componentRef.setInput('customerNameHint', 'Use full name');
    fixture.componentRef.setInput('customerPhoneHint', '+84...');
    fixture.componentRef.setInput('deliveryAddressHint', 'Street, house');
    fixture.componentRef.setInput('customerNoteHint', 'No onion');
    fixture.detectChanges();

    // name, phone, address hints are shown as .field-hint elements
    // customerNoteHint is used as textarea placeholder, not a .field-hint
    const fieldHints = fixture.debugElement.queryAll(By.css('.field-hint'));
    expect(fieldHints.length).toBe(3);
    expect(fieldHints[0].nativeElement.textContent).toContain('Use full name');
    expect(fieldHints[1].nativeElement.textContent).toContain('+84...');
    expect(fieldHints[2].nativeElement.textContent).toContain('Street, house');

    // Note hint is the textarea placeholder
    const textarea = fixture.debugElement.query(By.css('textarea')).nativeElement as HTMLTextAreaElement;
    expect(textarea.placeholder).toBe('No onion');
  });

  it('does not show tenant hints when not provided', () => {
    setRequiredInputs(true);
    expect(fixture.debugElement.queryAll(By.css('.field-hint')).length).toBe(0);
  });

  it('renders 7 day chips starting from earliestDeliveryDate', () => {
    setRequiredInputs(true);
    fixture.componentRef.setInput('earliestDeliveryDate', '2026-05-01');
    fixture.detectChanges();

    const chips = fixture.debugElement.queryAll(By.css('.day-chip'));
    expect(chips.length).toBe(7);

    // First chip should start from earliestDeliveryDate
    const firstChipSub = chips[0].query(By.css('.day-chip-sub'));
    expect(firstChipSub.nativeElement.textContent.trim()).toBe('May 1');
  });

  it('marks correct chip as active based on form deliveryDate', () => {
    setRequiredInputs(true, '2026-05-03');
    fixture.componentRef.setInput('earliestDeliveryDate', '2026-05-01');
    fixture.detectChanges();

    const activeChips = fixture.debugElement.queryAll(By.css('.day-chip.active'));
    expect(activeChips.length).toBe(1);

    const activeSub = activeChips[0].query(By.css('.day-chip-sub'));
    expect(activeSub.nativeElement.textContent.trim()).toBe('May 3');
  });

  it('updates form deliveryDate when chip is clicked', () => {
    setRequiredInputs(true);
    fixture.componentRef.setInput('earliestDeliveryDate', '2026-05-10');
    fixture.detectChanges();

    const chips = fixture.debugElement.queryAll(By.css('.day-chip'));
    const secondChip = chips[1]; // second day
    secondChip.nativeElement.click();
    fixture.detectChanges();

    const form = fixture.componentRef.instance['form']();
    const deliveryDateValue = form.get('deliveryDate')?.value as string;
    expect(deliveryDateValue).toBe('2026-05-11');
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
