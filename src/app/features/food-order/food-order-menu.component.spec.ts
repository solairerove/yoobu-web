import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ServiceItem } from '../../core/models/service.model';
import { FoodOrderMenuComponent } from './food-order-menu.component';

describe('FoodOrderMenuComponent', () => {
  let fixture: ComponentFixture<FoodOrderMenuComponent>;
  let component: FoodOrderMenuComponent;

  const services: ServiceItem[] = [
    {
      id: 10,
      name: 'Coffee',
      description: null,
      price: 30000,
      unit: 'cup',
      durationMinutes: null,
      sortOrder: 1,
      status: 'ACTIVE'
    },
    {
      id: 20,
      name: 'Tea',
      description: 'Hot tea',
      price: 20000,
      unit: 'glass',
      durationMinutes: null,
      sortOrder: 2,
      status: 'ACTIVE'
    }
  ];

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [FoodOrderMenuComponent]
    });

    fixture = TestBed.createComponent(FoodOrderMenuComponent);
    component = fixture.componentInstance;
  });

  function setRequiredInputs(
    overrides: Partial<{ selectedCount: number; quantities: Record<number, number> }> = {}
  ): void {
    fixture.componentRef.setInput('services', services);
    fixture.componentRef.setInput('selectedCount', overrides.selectedCount ?? 0);
    fixture.componentRef.setInput('currencyCode', 'VND');
    fixture.componentRef.setInput('quantities', overrides.quantities ?? { 10: 0, 20: 0 });
    fixture.detectChanges();
  }

  it('emits increaseRequested when increase button is clicked', () => {
    setRequiredInputs({ quantities: { 10: 1, 20: 0 } });
    const increaseSpy = jasmine.createSpy('increaseSpy');
    component.increaseRequested.subscribe(increaseSpy);

    const buttons = fixture.debugElement.queryAll(By.css('.quantity-button-increase'));
    buttons[0].nativeElement.click();

    expect(increaseSpy).toHaveBeenCalledWith(10);
  });

  it('emits decreaseRequested when decrease button is clicked', () => {
    setRequiredInputs({ quantities: { 10: 1, 20: 0 } });
    const decreaseSpy = jasmine.createSpy('decreaseSpy');
    component.decreaseRequested.subscribe(decreaseSpy);

    const buttons = fixture.debugElement.queryAll(By.css('.quantity-button-decrease'));
    buttons[0].nativeElement.click();

    expect(decreaseSpy).toHaveBeenCalledWith(10);
  });

  it('disables decrease button when quantity is zero', () => {
    setRequiredInputs({ quantities: { 10: 0, 20: 0 } });

    const buttons = fixture.debugElement.queryAll(By.css('.quantity-button-decrease'));
    const firstDecreaseButton = buttons[0].nativeElement as HTMLButtonElement;

    expect(firstDecreaseButton.disabled).toBeTrue();
  });

  it('marks selected product rows when quantity is greater than zero', () => {
    setRequiredInputs({ quantities: { 10: 1, 20: 0 } });

    const cards = fixture.debugElement.queryAll(By.css('.product-card'));

    expect(cards[0].nativeElement.classList.contains('selected')).toBeTrue();
    expect(cards[1].nativeElement.classList.contains('selected')).toBeFalse();
  });
});
