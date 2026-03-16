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

This repo still needs a local Node.js runtime before Angular can be installed and started.

Expected commands after Node is available:

```bash
npm install
npm start
```
