# Yoobu Web

Angular frontend for the Yoobu Telegram Mini App.

## Current scope

- standalone Angular app with route pattern `t/:slug`
- tenant config loading and dynamic theming
- `FOOD_ORDER` flow:
  - services catalog
  - cart state via signal store
  - checkout form
  - booking creation and cancellation
  - my bookings history/details
- Telegram integration:
  - `X-Telegram-Init-Data` interceptor
  - localhost fallback user header
  - Telegram `MainButton` action wiring
- feature orchestration extracted into `FoodOrderFlowFacade`

## Run

```bash
npm install
npm start
```

The Angular dev server proxies `/api/*` to the backend defined in `proxy.conf.json`.
On localhost, the checkout and submit page buttons remain visible for manual testing. Outside localhost, the flow uses the Telegram `MainButton`.

## Quality checks

```bash
npm run typecheck
npm run lint
npm run test:ci
npm run verify
```

Useful options:

```bash
npm run lint:fix
npm run test:watch
```

Recommended for CI and AI agents:

```bash
npm run verify
```

## Test structure

- Unit tests are co-located with source files as `*.spec.ts`
- Current baseline specs:
  - `FoodOrderStore` cart/state behavior
  - `FoodOrderFlowFacade` orchestration behavior (including stale response protection)

## Railway deployment

This repo is prepared for Railway with a Dockerfile-based deploy.

### What the container does

- builds the Angular app in a Node image
- serves the static SPA from Nginx
- proxies `/api/*` to your backend using `BACKEND_URL`
- rewrites client-side routes like `/t/:slug` to `index.html`

### Required Railway variables

- `BACKEND_URL`: the public backend base URL without a trailing slash, for example `https://yoobu-api-production.up.railway.app`
- `PORT`: optional, Railway usually injects this automatically

### Deploy steps

1. Create a Railway service for this repo.
2. Make sure Railway uses the included `Dockerfile`.
3. Set `BACKEND_URL` on the frontend service to your backend public URL.
4. Deploy.

### Manual checks after deploy

1. Open `https://<your-frontend-domain>/t/<tenant-slug>` in a normal browser.
2. Confirm the tenant config loads and page refresh on `/t/<tenant-slug>` does not 404.
3. Confirm requests to `/api/t/...` succeed through the frontend domain.
4. Open the same Railway URL inside your Telegram Mini App and verify protected booking requests work with Telegram auth.

### Telegram setup you still need to do manually

1. In BotFather, update the Mini App URL to your Railway HTTPS domain.
2. Launch the app from Telegram, not just a normal browser, when testing the final auth flow.
3. If the backend validates Telegram origin or domains, add the Railway frontend domain there too.
