---
apply: always
---

# Project Rules — yoobu-web

## Identity

- Angular frontend for Telegram Mini App.
- Runs inside Telegram WebView via Telegram JS SDK.
- Hosted on Railway as a separate service from `yoobu-api`.
- First module: `FoodOrderModule` (catalog → cart → checkout).
- Backend API base path: `/t/{slug}/...` for client operations.

## Non-Negotiable

### Fix root causes. Never suppress.

- Do not add `// @ts-ignore`, `// @ts-expect-error`, or `any` type to silence the compiler. Fix the type.
- Do not add `eslint-disable` comments. Fix the lint violation.
- If a type doesn't match the API response, update the type to match the actual API contract (see DTO contracts below). The backend is the source of truth.
- Do not use `setTimeout` to work around rendering or lifecycle timing issues. Find the actual cause — missing change detection, wrong lifecycle hook, or race condition.
- Do not hide errors in `catchError(() => EMPTY)`. Handle them: show user feedback, log, or rethrow.

### Always write tests.

- Every new component gets a spec file with at least: renders without error, handles loading state, handles error state.
- Every new service gets a spec file testing each public method with mocked HTTP responses.
- Every bug fix includes a regression test.
- Use `HttpClientTestingModule` for HTTP mocking. Do not mock service classes when testing HTTP interaction.
- Test user-visible behavior, not implementation details. Query by text/role, not by CSS class.
- If a component interacts with Telegram JS SDK (`window.Telegram.WebApp`), mock the global object in test setup.

## API Contract

The backend is the single source of truth. These are the actual DTOs — keep TypeScript interfaces synchronized.

### Tenant config — `GET /t/{slug}/config`

```typescript
interface TenantConfig {
  slug: string;
  name: string;
  type: 'FOOD_ORDER' | 'APPOINTMENT' | 'CATALOG_REQUEST';
  primaryColor: string | null;
  logoUrl: string | null;
  welcomeMessage: string | null;
}
```

### Service (catalog item) — `GET /t/{slug}/services`

```typescript
interface Service {
  id: number;
  name: string;
  description: string | null;
  price: number;       // BigDecimal serialized as number
  unit: string;        // default "шт" for FOOD_ORDER
  durationMinutes: number | null;  // only for APPOINTMENT tenants
  sortOrder: number;
  status: 'ACTIVE' | 'INACTIVE' | 'DELETED';
}
```

### Create booking — `POST /t/{slug}/bookings`

```typescript
interface CreateBookingRequest {
  customerName: string;
  customerPhone: string;
  deliveryDate: string;  // ISO date "2026-03-15"
  note?: string;
  items: { serviceId: number; quantity: number }[];
}
```

- `type` is NOT sent by client. Backend derives it from `tenant.type`.
- Non-FOOD_ORDER tenants get 400 before field validation.
- `deliveryDate` is validated server-side against tenant-local cutoff.

### Booking response — `GET /t/{slug}/bookings/{id}`, `/bookings/my`

```typescript
interface BookingResponse {
  id: number;
  type: 'ORDER' | 'APPOINTMENT' | 'REQUEST';
  status: 'NEW' | 'CONFIRMED' | 'DONE' | 'CANCELLED';
  customerName: string;
  totalPrice: number;
  deliveryDate: string;  // ISO date
  note: string | null;
  items: { serviceName: string; quantity: number; unitPrice: number }[];
  createdAt: string;     // ISO offset datetime
}
```

### Cancel booking — `POST /t/{slug}/bookings/{bookingId}/cancel`

- No request body.
- Returns `BookingResponse`.
- 409 if current status is `DONE`.

## Architecture Rules

### Telegram Mini App integration

```typescript
// Telegram JS SDK loaded from CDN, available as window.Telegram.WebApp
const tg = window.Telegram.WebApp;
tg.ready();
tg.expand();
```

- `tg.initData` is sent as `X-Telegram-Init-Data` header on every API request.
- Use an HTTP interceptor for this. Do not manually attach the header in each service.
- `tg.MainButton` is the primary action button (e.g., "Place Order"). Use it, do not create a custom floating button.
- `tg.showAlert()` / `tg.showConfirm()` for native dialogs.
- `tg.close()` after successful booking submission.
- For local dev without Telegram: send `X-Telegram-User-Id` header instead (backend dev profile accepts it).

### Tenant resolution

- Slug is read from URL path: `yoobu.io/t/{slug}`.
- On app init: `GET /t/{slug}/config` loads tenant metadata.
- Based on `TenantConfig.type`, lazy-load the correct feature module.
- Apply `primaryColor` from config to CSS custom properties for theming.

### Module structure

```
AppModule
├── TenantShellModule          -- resolves config, sets theme, guards route
├── FoodOrderModule            -- catalog, cart, checkout (FIRST TO BUILD)
├── AppointmentModule          -- services, staff, slots, confirm (DEFERRED)
└── CatalogRequestModule       -- service list, request form (DEFERRED)
```

- Shared: confirmation screen, my bookings list, booking detail.
- Do not build `AppointmentModule` or `CatalogRequestModule` yet. Backend flows do not exist.

### State management

- Cart state lives in a service with BehaviorSubject. No NgRx unless complexity demands it later.
- Tenant config is resolved once on init and stored in a service. Components inject it, do not re-fetch.
- Booking list is fetched on navigation to "my bookings", not cached aggressively — data changes server-side.

### Error handling

- HTTP errors from backend: display user-facing message. Do not show raw JSON or status codes.
- 400 from backend means validation failure — extract and show field-level errors if the backend provides them.
- 404 on tenant config means invalid slug or deactivated tenant — show "not found" screen, do not retry.
- Network errors: show retry option. Telegram users may have unstable connections.

### Prices and formatting

- Backend sends prices as `BigDecimal` (serialized as JSON number). These are in VND (Vietnamese Dong) for the first tenant — no decimal places needed in display.
- Format with locale-appropriate thousand separators.
- Currency symbol/label should be configurable per tenant in the future, but hardcode VND-style formatting for MVP.

## Code Style

- Standalone components preferred over NgModule-declared components if Angular version supports it.
- Reactive forms over template-driven forms for checkout.
- `async` pipe in templates over manual subscribe/unsubscribe.
- Do not use `any`. Define interfaces for all API responses and internal state.
- File naming: `kebab-case.component.ts`, `kebab-case.service.ts`, `kebab-case.spec.ts`.
- One component per file. No barrel exports (`index.ts`) unless the module is consumed externally.

## What NOT to implement

- `AppointmentModule` — backend APPOINTMENT flow does not exist.
- `CatalogRequestModule` — backend CATALOG_REQUEST flow does not exist.
- Online payment UI — out of scope.
- Multi-language / i18n — out of scope for MVP. UI language: Russian for first tenant.
- Push notifications in-app — all notifications go through Telegram Bot API server-side.

## When in doubt

- Check `RND_API_STATE.md` for actual backend API state.
- Check `yoobu-rnd.md` for product design, DTO contracts with examples, and Telegram integration details.
- If a field exists in the backend response but seems irrelevant (e.g., `durationMinutes` for FOOD_ORDER), ignore it in the UI. It is reserved for a different tenant type.
- If the backend returns an error you don't understand, check the endpoint notes in `RND_API_STATE.md` — validation rules and edge cases are documented there.