# pido-dashboard

Admin web app (Vite + React) with an optional **Node notification API** in `server/` for FCM pushes.

**Production dashboard:** [https://pido-app.web.app/](https://pido-app.web.app/)

## Local development

1. **Frontend**
   ```bash
   npm install
   cp .env.local.example .env.local # if you maintain one; or create .env.local
   npm run dev
   ```
   Set Firebase `VITE_*` keys and, for notifications:

   ```bash
   VITE_API_BASE_URL=http://localhost:3000
   ```

2. **Notification API** (required for the Notifications page)
   ```bash
   cd server
   npm install
   cp .env.example .env
   # Add serviceAccount.json and FIREBASE_SERVICE_ACCOUNT_PATH
   npm run dev
   ```

   Defaults to `http://localhost:3000`. Restart Vite after changing `VITE_API_BASE_URL`.

## Production (notifications) — Firebase only (no Heroku)

**Cloud Functions** in `functions/` run the notification API on Firebase. **Hosting** rewrites `/health` and `/admin/notifications/**` to that function, so the app can use **`https://pido-app.web.app`** as `VITE_API_BASE_URL` (same site, no third-party host).

**You need the Blaze plan** to deploy Cloud Functions in production (Spark/free tier does not include this).

### One-time

1. `cd functions && npm install && cd ..`
2. Root **`.env.production`**: all `VITE_FIREBASE_*` plus  
   `VITE_API_BASE_URL=https://pido-app.web.app`  
   (see `.env.production.example`.)

### Deploy site + API

```bash
npm run deploy
```

This runs `npm run build` then `firebase deploy --only hosting,functions:dashboard`.

**Why `functions:dashboard`?** The same Firebase project already has your main app’s Cloud Functions. This repo uses a **separate codebase** named `dashboard` so deploys here **do not delete** those functions.

### Check

- [https://pido-app.web.app/health](https://pido-app.web.app/health) → `{"ok":true}`
- **Notifications** in the dashboard (signed in as admin from `adminUsers`)

### Local API only

The **`server/`** folder is still for **`cd server && npm run dev`** on your machine with `VITE_API_BASE_URL=http://localhost:3000`. Not required on Firebase if you use Functions.

## Deploy hosting only

```bash
npm run deploy:hosting
```

Use this when you only changed the React app, not `functions/`.
