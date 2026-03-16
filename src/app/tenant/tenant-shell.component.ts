import { AsyncPipe, DOCUMENT, NgComponentOutlet, NgIf } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { catchError, distinctUntilChanged, map, of, shareReplay, switchMap, tap } from 'rxjs';
import { FoodOrderHomeComponent } from '../features/food-order/food-order-home.component';
import { UnsupportedFlowComponent } from '../features/unsupported/unsupported-flow.component';
import { TenantConfig } from '../core/models/tenant-config.model';
import { TenantApiService } from '../core/services/tenant-api.service';
import { TelegramService } from '../core/telegram/telegram.service';

interface TenantVm {
  config: TenantConfig | null;
  error: string | null;
}

@Component({
  selector: 'app-tenant-shell',
  imports: [AsyncPipe, NgComponentOutlet, NgIf],
  template: `
    <ng-container *ngIf="vm$ | async as vm">
      <main class="shell" [style.--yoobu-primary]="vm.config?.primaryColor || '#ff6b35'">
        <header class="hero" *ngIf="vm.config; else loadingOrError">
          <p class="kicker">Telegram Mini App</p>
          <h1>{{ vm.config.name }}</h1>
          <p class="welcome">{{ vm.config.welcomeMessage || defaultWelcome }}</p>
        </header>

        <ng-template #loadingOrError>
          <section class="status-card" *ngIf="vm.error; else loading">
            <h1>Tenant unavailable</h1>
            <p>{{ vm.error }}</p>
          </section>
        </ng-template>

        <ng-template #loading>
          <section class="status-card">
            <h1>Loading tenant</h1>
            <p>Fetching config and preparing Telegram WebApp state.</p>
          </section>
        </ng-template>

        <ng-container *ngIf="vm.config as config">
          <ng-container *ngComponentOutlet="resolveFeatureComponent(config.type); inputs: { config }" />
        </ng-container>
      </main>
    </ng-container>
  `,
  styles: `
    .shell {
      min-height: 100vh;
      padding: 1.25rem;
      display: grid;
      gap: 1rem;
      max-width: 760px;
      margin: 0 auto;
    }

    .hero,
    .status-card {
      padding: 1.5rem;
      border-radius: 28px;
      background: linear-gradient(145deg, rgba(255, 255, 255, 0.98), rgba(255, 248, 242, 0.92));
      border: 1px solid var(--yoobu-border);
      box-shadow: var(--yoobu-shadow);
    }

    .kicker {
      margin: 0 0 0.5rem;
      color: var(--yoobu-primary);
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.16em;
      font-size: 0.8rem;
    }

    h1,
    p {
      margin: 0;
    }

    .welcome,
    .status-card p {
      margin-top: 0.75rem;
      color: var(--yoobu-muted);
      line-height: 1.6;
    }
  `
})
export class TenantShellComponent {
  private readonly document = inject(DOCUMENT);
  private readonly route = inject(ActivatedRoute);
  private readonly tenantApi = inject(TenantApiService);
  private readonly telegram = inject(TelegramService);

  protected readonly defaultWelcome =
    'Tenant shell is ready. Next we will replace this placeholder with the catalog and cart flow.';

  protected readonly vm$ = this.route.paramMap.pipe(
    map((params) => params.get('slug')?.trim() ?? ''),
    distinctUntilChanged(),
    tap(() => {
      this.telegram.init();
      this.telegram.setMainButton(null);
    }),
    switchMap((slug) =>
      this.tenantApi.getConfig(slug).pipe(
        tap((config) => this.applyTheme(config)),
        map((config) => ({ config, error: null })),
        catchError(() =>
          of({
            config: null,
            error: 'Check the tenant slug or make sure the backend is running.'
          })
        )
      )
    ),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  protected resolveFeatureComponent(type: TenantConfig['type']) {
    if (type === 'FOOD_ORDER') {
      return FoodOrderHomeComponent;
    }

    return UnsupportedFlowComponent;
  }

  private applyTheme(config: TenantConfig): void {
    const primaryColor = config.primaryColor?.trim() || '#ff6b35';
    this.document.documentElement.style.setProperty('--yoobu-primary', primaryColor);
  }
}
