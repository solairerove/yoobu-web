import { CurrencyPipe, NgFor } from '@angular/common';
import { Component, input } from '@angular/core';
import { TenantConfig } from '../../core/models/tenant-config.model';

@Component({
  selector: 'app-food-order-home',
  imports: [CurrencyPipe, NgFor],
  template: `
    <section class="panel">
      <p class="eyebrow">Food ordering flow</p>
      <h2>First implementation slice</h2>
      <p class="copy">
        Next step is catalog fetch + cart state. For now this page confirms tenant bootstrap,
        theming, and Telegram wiring.
      </p>

      <div class="checklist">
        <article *ngFor="let item of nextSteps">
          <h3>{{ item.title }}</h3>
          <p>{{ item.description }}</p>
        </article>
      </div>

      <div class="meta">
        <span>Tenant type: {{ config().type }}</span>
        <span>Slug: {{ config().slug }}</span>
      </div>
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

    .checklist {
      display: grid;
      gap: 0.75rem;
    }

    article {
      padding: 1rem;
      border-radius: 18px;
      background: var(--yoobu-surface);
    }

    article p {
      margin-top: 0.35rem;
      color: var(--yoobu-muted);
      line-height: 1.5;
    }

    .meta {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
      color: var(--yoobu-muted);
      font-size: 0.95rem;
    }
  `
})
export class FoodOrderHomeComponent {
  readonly config = input.required<TenantConfig>();

  protected readonly nextSteps = [
    {
      title: 'Catalog API',
      description: 'Load /services and render product cards with quantity controls.'
    },
    {
      title: 'Cart state',
      description: 'Keep cart in a dedicated signal-based store and connect Telegram MainButton.'
    },
    {
      title: 'Checkout form',
      description: 'Submit customer name, phone, note, delivery date, and cart items.'
    }
  ];
}

