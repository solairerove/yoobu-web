import { AsyncPipe, DOCUMENT, NgComponentOutlet, NgIf } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { catchError, distinctUntilChanged, map, of, shareReplay, switchMap, tap } from 'rxjs';
import { FoodOrderHomeComponent } from '../features/food-order/food-order-home.component';
import { UnsupportedFlowComponent } from '../features/unsupported/unsupported-flow.component';
import { TenantConfig } from '../core/models/tenant-config.model';
import { TenantApiService } from '../core/services/tenant-api.service';
import { TelegramService } from '../core/telegram/telegram.service';

@Component({
  selector: 'app-tenant-shell',
  imports: [AsyncPipe, NgComponentOutlet, NgIf],
  template: `
    <ng-container *ngIf="vm$ | async as vm">
      <main class="shell" [style.--yoobu-primary]="vm.config?.primaryColor || '#ff6b35'">
        <section class="status-card" *ngIf="!vm.config && vm.error">
          <h1>Tenant unavailable</h1>
          <p>{{ vm.error }}</p>
        </section>

        <section class="status-card" *ngIf="!vm.config && !vm.error">
          <h1>Loading</h1>
          <p>Please wait while the page loads.</p>
        </section>

        <ng-container *ngIf="vm.config as config">
          <ng-container *ngComponentOutlet="resolveFeatureComponent(config.type); inputs: { config }" />
        </ng-container>
      </main>
    </ng-container>
  `,
  styles: `
    .shell {
      min-height: 100vh;
      padding: 0.9rem 0.9rem 1.5rem;
      display: grid;
      gap: 0.85rem;
      max-width: 720px;
      margin: 0 auto;
    }

    .status-card {
      padding: 0.75rem 1rem;
      border-radius: 16px;
      background: linear-gradient(145deg, var(--yoobu-surface-card-strong), var(--yoobu-surface-tint));
      border: 1px solid var(--yoobu-border);
      box-shadow: var(--yoobu-shadow);
    }

    h1,
    p {
      margin: 0;
    }

    h1 {
      font-size: 1.05rem;
      font-weight: 700;
      line-height: 1.2;
    }

    .status-card p {
      margin-top: 0.3rem;
      color: var(--yoobu-muted);
      line-height: 1.45;
      font-size: 0.95rem;
    }
  `
})
export class TenantShellComponent {
  private readonly document = inject(DOCUMENT);
  private readonly route = inject(ActivatedRoute);
  private readonly tenantApi = inject(TenantApiService);
  private readonly telegram = inject(TelegramService);

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
            error: 'This page is unavailable right now. Please try again later.'
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
