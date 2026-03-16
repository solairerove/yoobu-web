import { CurrencyPipe, NgFor, NgIf } from '@angular/common';
import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { catchError, distinctUntilChanged, map, of, startWith, switchMap } from 'rxjs';
import { TenantConfig } from '../../core/models/tenant-config.model';
import { ServiceItem } from '../../core/models/service.model';
import { TenantApiService } from '../../core/services/tenant-api.service';

interface FoodOrderVm {
  services: ServiceItem[];
  loading: boolean;
  error: string | null;
}

@Component({
  selector: 'app-food-order-home',
  imports: [CurrencyPipe, NgFor, NgIf],
  template: `
    <section class="panel">
      <p class="eyebrow">Food ordering flow</p>
      <h2>{{ config().name }}</h2>
      <p class="copy">Choose dishes, set quantities, and we will use this state for checkout next.</p>

      <section class="status-card" *ngIf="vm().loading">
        <h3>Loading menu</h3>
        <p>Fetching active items for {{ config().slug }}.</p>
      </section>

      <section class="status-card error" *ngIf="vm().error as error">
        <h3>Menu unavailable</h3>
        <p>{{ error }}</p>
      </section>

      <section class="status-card" *ngIf="!vm().loading && !vm().error && !vm().services.length">
        <h3>No products yet</h3>
        <p>Add active services in the admin panel and they will appear here.</p>
      </section>

      <div class="catalog" *ngIf="vm().services.length">
        <article class="product-card" *ngFor="let service of vm().services; trackBy: trackByServiceId">
          <div class="product-copy">
            <div class="product-head">
              <h3>{{ service.name }}</h3>
              <p class="price">{{ service.price | currency: 'VND' : 'symbol-narrow' : '1.0-0' }}</p>
            </div>

            <p class="description" *ngIf="service.description">{{ service.description }}</p>

            <p class="unit">
              {{ service.unit || defaultUnit }}
            </p>
          </div>

          <div class="quantity">
            <button type="button" (click)="decrease(service.id)" [disabled]="quantityFor(service.id) === 0">
              -
            </button>
            <span>{{ quantityFor(service.id) }}</span>
            <button type="button" (click)="increase(service.id)">+</button>
          </div>
        </article>
      </div>

      <section class="summary" *ngIf="selectedCount() > 0">
        <div>
          <p class="summary-label">Cart preview</p>
          <strong>{{ selectedCount() }} items selected</strong>
        </div>
        <p>{{ selectedTotal() | currency: 'VND' : 'symbol-narrow' : '1.0-0' }}</p>
      </section>
    </section>
  `,
  styles: `
    .panel {
      display: grid;
      gap: 1rem;
      padding: 1.5rem;
      border-radius: 24px;
      background: rgba(255, 255, 255, 0.92);
      border: 1px solid var(--yoobu-border);
      box-shadow: var(--yoobu-shadow);
    }

    .eyebrow {
      margin: 0;
      text-transform: uppercase;
      letter-spacing: 0.16em;
      color: var(--yoobu-primary);
      font-size: 0.75rem;
      font-weight: 700;
    }

    h2,
    h3,
    p {
      margin: 0;
    }

    .copy {
      color: var(--yoobu-muted);
      line-height: 1.6;
    }

    .status-card {
      padding: 1rem 1.1rem;
      border-radius: 18px;
      background: rgba(255, 255, 255, 0.78);
      border: 1px solid var(--yoobu-border);
    }

    .status-card.error {
      border-color: rgba(165, 42, 42, 0.2);
      background: rgba(255, 246, 244, 0.95);
    }

    .status-card p,
    .description,
    .unit {
      margin-top: 0.45rem;
      color: var(--yoobu-muted);
      line-height: 1.5;
    }

    .catalog {
      display: grid;
      gap: 0.75rem;
    }

    .product-card {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 1rem;
      padding: 1rem;
      border-radius: 18px;
      background: var(--yoobu-surface);
      border: 1px solid rgba(36, 22, 15, 0.08);
    }

    .product-copy {
      min-width: 0;
    }

    .product-head {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      gap: 0.75rem;
      align-items: baseline;
    }

    .price {
      color: var(--yoobu-primary);
      font-weight: 700;
      white-space: nowrap;
    }

    .unit {
      font-size: 0.92rem;
    }

    .quantity {
      display: inline-flex;
      align-items: center;
      align-self: center;
      gap: 0.75rem;
      padding: 0.4rem;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.92);
      border: 1px solid var(--yoobu-border);
    }

    .quantity button {
      width: 2.25rem;
      height: 2.25rem;
      border: 0;
      border-radius: 999px;
      background: var(--yoobu-primary);
      color: white;
      font-size: 1.15rem;
      cursor: pointer;
    }

    .quantity button:disabled {
      opacity: 0.35;
      cursor: not-allowed;
    }

    .quantity span {
      min-width: 1.5rem;
      text-align: center;
      font-weight: 700;
    }

    .summary {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
      padding: 1rem 1.1rem;
      border-radius: 18px;
      background: linear-gradient(135deg, rgba(255, 107, 53, 0.12), rgba(255, 255, 255, 0.92));
      border: 1px solid rgba(255, 107, 53, 0.2);
    }

    .summary-label {
      margin-bottom: 0.2rem;
      color: var(--yoobu-muted);
      font-size: 0.85rem;
      text-transform: uppercase;
      letter-spacing: 0.12em;
    }

    @media (max-width: 640px) {
      .product-card {
        grid-template-columns: 1fr;
      }

      .quantity {
        justify-self: start;
      }

      .summary {
        flex-direction: column;
        align-items: flex-start;
      }
    }
  `
})
export class FoodOrderHomeComponent {
  private readonly tenantApi = inject(TenantApiService);

  readonly config = input.required<TenantConfig>();
  protected readonly defaultUnit = 'item';

  private readonly vmSignal = toSignal(
    toObservable(this.config).pipe(
      distinctUntilChanged((previous, current) => previous.slug === current.slug),
      switchMap((config) =>
        this.tenantApi.getServices(config.slug).pipe(
          map((services) => ({
            services,
            loading: false,
            error: null
          })),
          startWith({
            services: [],
            loading: true,
            error: null
          }),
          catchError(() =>
            of({
              services: [],
              loading: false,
              error: 'Check the backend service or tenant data and try again.'
            })
          )
        )
      )
    ),
    {
      initialValue: {
        services: [],
        loading: true,
        error: null
      }
    }
  );

  protected readonly vm = computed<FoodOrderVm>(() => this.vmSignal());
  protected readonly quantities = signal<Record<number, number>>({});
  protected readonly selectedCount = computed(() =>
    Object.values(this.quantities()).reduce((sum, quantity) => sum + quantity, 0)
  );
  protected readonly selectedTotal = computed(() => {
    const quantities = this.quantities();

    return this.vm().services.reduce(
      (sum, service) => sum + service.price * (quantities[service.id] ?? 0),
      0
    );
  });

  constructor() {
    effect(() => {
      this.config().slug;
      this.quantities.set({});
    });
  }

  protected trackByServiceId(_index: number, service: ServiceItem): number {
    return service.id;
  }

  protected quantityFor(serviceId: number): number {
    return this.quantities()[serviceId] ?? 0;
  }

  protected increase(serviceId: number): void {
    this.quantities.update((current) => ({
      ...current,
      [serviceId]: (current[serviceId] ?? 0) + 1
    }));
  }

  protected decrease(serviceId: number): void {
    this.quantities.update((current) => {
      const nextQuantity = Math.max((current[serviceId] ?? 0) - 1, 0);

      if (nextQuantity === 0) {
        const { [serviceId]: _removed, ...rest } = current;
        return rest;
      }

      return {
        ...current,
        [serviceId]: nextQuantity
      };
    });
  }
}
