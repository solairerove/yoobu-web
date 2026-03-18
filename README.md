# Yoobu Web

Initial Angular shell for the Telegram Mini App frontend.

## Current scope

- standalone Angular app structure
- route pattern `t/:slug`
- tenant config fetch from `GET /t/{slug}/config`
- Telegram `initData` header interceptor
- theme application from tenant config
- placeholder `FOOD_ORDER` screen

## Next slice

1. Load `GET /t/{slug}/services`
2. Build cart state with signals
3. Connect Telegram `MainButton` to checkout
4. Submit `POST /t/{slug}/bookings`

## Run

```bash
npm install
npm test
npm start
```

The Angular dev server proxies `/api/*` to the backend defined in `proxy.conf.json`.
On localhost, the checkout and submit page buttons remain visible for manual testing. Outside localhost, the flow uses the Telegram `MainButton`.

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
