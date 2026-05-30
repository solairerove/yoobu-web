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
      imageUrl: 'https://media.yoobu.app/42/services/10-1719312000000.webp',
      price: 30000,
      unit: 'cup',
      durationMinutes: null,
      sortOrder: 1,
      status: 'ACTIVE',
      variants: []
    },
    {
      id: 20,
      name: 'Tea',
      description: 'Hot tea',
      imageUrl: null,
      price: 20000,
      unit: 'glass',
      durationMinutes: null,
      sortOrder: 2,
      status: 'ACTIVE',
      variants: []
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

    const button = fixture.debugElement.query(By.css('[aria-label="Increase Coffee"]'));
    button.nativeElement.click();

    expect(increaseSpy).toHaveBeenCalledWith(10);
  });

  it('emits decreaseRequested when decrease button is clicked', () => {
    setRequiredInputs({ quantities: { 10: 1, 20: 0 } });
    const decreaseSpy = jasmine.createSpy('decreaseSpy');
    component.decreaseRequested.subscribe(decreaseSpy);

    const button = fixture.debugElement.query(By.css('[aria-label="Decrease Coffee"]'));
    button.nativeElement.click();

    expect(decreaseSpy).toHaveBeenCalledWith(10);
  });

  it('keeps decrease button hidden when quantity is zero', () => {
    setRequiredInputs({ quantities: { 10: 0, 20: 0 } });

    const pillButtons = fixture.debugElement.queryAll(By.css('.qty-pill-btn'));
    const addButtons = fixture.debugElement.queryAll(By.css('.qty-add'));

    expect(pillButtons.length).toBe(0);
    expect(addButtons.length).toBe(2);
  });

  it('disables increase button when item quantity reaches cap', () => {
    setRequiredInputs({ quantities: { 10: 9, 20: 0 } });

    const increaseButtonCoffee = fixture.debugElement.query(By.css('[aria-label="Increase Coffee"]')).nativeElement as HTMLButtonElement;
    const addButtonTea = fixture.debugElement.query(By.css('[aria-label="Add Tea"]')).nativeElement as HTMLButtonElement;

    expect(increaseButtonCoffee.disabled).toBeTrue();
    expect(addButtonTea.disabled).toBeFalse();
  });

  it('shows qty pill for selected items and add button for unselected items', () => {
    setRequiredInputs({ quantities: { 10: 1, 20: 0 } });

    const rows = fixture.debugElement.queryAll(By.css('.item-row'));

    expect(rows[0].query(By.css('.qty-pill'))).not.toBeNull();
    expect(rows[0].query(By.css('.qty-add'))).toBeNull();
    expect(rows[1].query(By.css('.qty-add'))).not.toBeNull();
    expect(rows[1].query(By.css('.qty-pill'))).toBeNull();
  });

  it('renders product image when imageUrl exists', () => {
    setRequiredInputs();

    const image = fixture.debugElement.query(By.css('.item-row:first-child .item-img'))?.nativeElement as
      | HTMLImageElement
      | undefined;

    expect(image).toBeDefined();
    expect(image?.src).toContain('https://media.yoobu.app/42/services/10-1719312000000.webp');
    expect(image?.loading).toBe('lazy');
  });

  it('renders placeholder when imageUrl is missing', () => {
    setRequiredInputs();

    const placeholder = fixture.debugElement.query(
      By.css('.item-row:nth-child(2) .item-img-placeholder')
    )?.nativeElement as HTMLElement | undefined;

    expect(placeholder).toBeDefined();
  });
});
