import { Component, input } from '@angular/core';
import { TenantConfig } from '../../core/models/tenant-config.model';

@Component({
  selector: 'app-unsupported-flow',
  template: `
    <section class="unsupported">
      <p class="label">Planned module</p>
      <h2>{{ config().type }}</h2>
      <p>
        Backend support for this tenant type is not ready yet. The frontend shell already knows
        which module should be loaded here.
      </p>
    </section>
  `,
  styles: `
    .unsupported {
      padding: 1.5rem;
      border-radius: 24px;
      border: 1px dashed var(--yoobu-border);
      background: rgba(255, 255, 255, 0.75);
    }

    .label {
      margin: 0 0 0.5rem;
      color: var(--yoobu-primary);
      font-size: 0.8rem;
      text-transform: uppercase;
      letter-spacing: 0.16em;
    }

    h2,
    p {
      margin: 0;
    }

    p:last-child {
      margin-top: 0.75rem;
      color: var(--yoobu-muted);
      line-height: 1.6;
    }
  `
})
export class UnsupportedFlowComponent {
  readonly config = input.required<TenantConfig>();
}

