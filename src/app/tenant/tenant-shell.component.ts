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
        <header class="hero" *ngIf="vm.config; else loadingOrError">
          <div class="hero-top">
            <p class="kicker">Yoobu</p>
            <span class="hero-badge">{{ vm.config.type === 'FOOD_ORDER' ? 'Ordering' : vm.config.type }}</span>
          </div>

          <div class="hero-content">
            <div>
              <h1>{{ vm.config.name }}</h1>
              <p class="welcome">{{ vm.config.welcomeMessage || defaultWelcome }}</p>
            </div>

            <div class="hero-aside">
              <div class="hero-chip">
                <strong>{{ vm.config.slug }}</strong>
                <span>store</span>
              </div>
            </div>
          </div>
        </header>

        <ng-template #loadingOrError>
          <section class="status-card" *ngIf="vm.error; else loading">
            <h1>Tenant unavailable</h1>
            <p>{{ vm.error }}</p>
          </section>
        </ng-template>

        <ng-template #loading>
          <section class="status-card">
            <h1>Loading</h1>
            <p>Please wait while the page loads.</p>
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
      padding: 0.9rem 0.9rem 1.5rem;
      display: grid;
      gap: 0.85rem;
      max-width: 720px;
      margin: 0 auto;
    }

    .hero,
    .status-card {
      padding: 1rem 1rem 1.1rem;
      border-radius: 22px;
      background: linear-gradient(145deg, var(--yoobu-surface-card-strong), var(--yoobu-surface-tint));
      border: 1px solid var(--yoobu-border);
      box-shadow: var(--yoobu-shadow);
    }

    .hero {
      display: grid;
      gap: 0.8rem;
      position: relative;
      overflow: hidden;
      background:
        radial-gradient(circle at top right, color-mix(in srgb, var(--yoobu-primary) 18%, transparent), transparent 34%),
        linear-gradient(145deg, var(--yoobu-surface-card-strong), var(--yoobu-surface-tint));
    }

    .hero::after {
      content: '';
      position: absolute;
      inset: auto -3rem -3rem auto;
      width: 10rem;
      height: 10rem;
      border-radius: 999px;
      background: color-mix(in srgb, var(--yoobu-primary) 10%, transparent);
      filter: blur(2px);
      pointer-events: none;
    }

    .hero-top {
      display: flex;
      justify-content: space-between;
      gap: 0.75rem;
      align-items: center;
    }

    .kicker {
      margin: 0;
      color: var(--yoobu-primary);
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.14em;
      font-size: 0.72rem;
    }

    .hero-badge {
      padding: 0.32rem 0.68rem;
      border-radius: 999px;
      background: color-mix(in srgb, var(--yoobu-primary) 12%, white);
      color: var(--yoobu-primary);
      font-size: 0.78rem;
      font-weight: 700;
    }

    .hero-content {
      display: flex;
      justify-content: space-between;
      gap: 1rem;
      align-items: end;
      position: relative;
      z-index: 1;
    }

    .hero-aside {
      display: flex;
      align-items: center;
    }

    .hero-chip {
      min-width: 6rem;
      padding: 0.7rem 0.85rem;
      border-radius: 18px;
      background: var(--yoobu-surface-card);
      border: 1px solid var(--yoobu-border-soft);
      box-shadow: var(--yoobu-shadow-soft);
      backdrop-filter: blur(10px);
    }

    .hero-chip strong,
    .hero-chip span {
      display: block;
    }

    .hero-chip strong {
      font-size: 0.96rem;
      line-height: 1.1;
      word-break: break-word;
    }

    .hero-chip span {
      margin-top: 0.18rem;
      color: var(--yoobu-muted);
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }

    h1,
    p {
      margin: 0;
    }

    h1 {
      font-size: clamp(1.4rem, 4vw, 2rem);
      line-height: 1.08;
    }

    .welcome,
    .status-card p {
      color: var(--yoobu-muted);
      line-height: 1.45;
      font-size: 0.95rem;
    }

    .welcome {
      margin-top: 0.45rem;
      max-width: 38rem;
    }

    @media (max-width: 640px) {
      .hero-content {
        flex-direction: column;
        align-items: flex-start;
      }

      .hero-aside {
        width: 100%;
      }
    }
  `
})
export class TenantShellComponent {
  private readonly document = inject(DOCUMENT);
  private readonly route = inject(ActivatedRoute);
  private readonly tenantApi = inject(TenantApiService);
  private readonly telegram = inject(TelegramService);

  protected readonly defaultWelcome = 'Browse the menu and place your order here.';

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
