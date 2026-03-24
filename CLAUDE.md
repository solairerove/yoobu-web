# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm start              # Dev server (ng serve)
npm run build          # Production build
npm run typecheck      # Type-check without emit
npm run lint           # ESLint
npm run lint:fix       # Auto-fix lint issues
npm run test:ci        # Run all tests once (ChromeHeadless)
npm run test:watch     # Run tests in watch mode
npm run verify         # Full CI check: typecheck + lint + test:ci
```

To run a single test file, use Karma's `--include` flag or isolate with `fdescribe`/`fit` in the spec.

## Architecture

**Framework:** Angular 19 standalone components (no NgModules), Angular signals for state, RxJS for async.

**Routing:** Tenant-scoped. All routes go through `t/:slug` → `TenantShellComponent`, which loads tenant config and bootstraps the appropriate feature based on `TenantConfig.type`. Currently only `FOOD_ORDER` is implemented; other types fall through to `UnsupportedFlowComponent`.

**State pattern — Signals + Facade:**
- `FoodOrderStore` (`features/food-order/food-order.store.ts`) — pure reactive state using Angular signals. Owns the cart (service quantities), service list, and computed derived values (item count, total price).
- `FoodOrderFlowFacade` (`features/food-order/food-order-flow.facade.ts`) — orchestrates the entire feature: active view, checkout open/close, async order submission, booking reload, Telegram main button sync. Uses `effect()` for side effects. This is the single injectable that components receive.

**Telegram Web App integration:**
- The app runs inside the Telegram Mini Apps platform. `TelegramService` wraps the `window.Telegram.WebApp` API. On localhost it returns a fake user ID (`'101'`) for development.
- `TelegramInitDataInterceptor` attaches `X-Telegram-Init-Data` (or `X-Telegram-User-Id` on localhost) to outgoing HTTP requests. It polls for init data with a 1.5s timeout before sending.
- The Telegram SDK is loaded via `<script>` in `index.html`.

**API layer:** `TenantApiService` in `core/services/` makes all REST calls to `/api/t/:slug/...`. In dev the proxy (`proxy.conf.json`) forwards `/api/t` → `http://localhost:8080/t`.

**Models:** `ServiceItem`, `BookingResponse`, `TenantConfig` in `core/models/`. `BookingResponse.status` uses string values (`NEW`, `PAYMENT_PENDING`, `CONFIRMED`, `DELIVERING`, `DONE`, `CANCELLED`); a `normalizeStatus` utility handles casing variations from the API.

**Testing conventions:**
- Jasmine/Karma with `TestBed.configureTestingModule({ imports: [StandaloneComponent] })`.
- Components use `fixture.componentRef.setInput()` to set required inputs.
- Helper functions named `setRequiredInputs()` are used in spec files to reduce boilerplate.
- No mocked HTTP — services are either provided directly or stubbed via `jasmine.createSpyObj`.

**Theming:** CSS custom properties (`--yoobu-primary`, etc.) applied dynamically from `TenantConfig.primaryColor` in `TenantShellComponent`.
