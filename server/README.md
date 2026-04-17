# Pido Dashboard Server

Express backend for sending FCM notifications via Firebase Admin SDK.

## Setup

1. Create `server/.env` (copy from `.env.example`).
2. Add a Firebase service account json:
   - Download from Firebase Console → Project Settings → Service Accounts → Generate new private key.
   - Save as `server/serviceAccount.json` (do not commit).
   - Set `FIREBASE_SERVICE_ACCOUNT_PATH=./serviceAccount.json`

## Run

```bash
npm install
npm run dev
```

Server defaults to `http://localhost:3000`.

## Frontend config

**Local:** in dashboard root `.env.local`:

```bash
VITE_API_BASE_URL=http://localhost:3000
```

Restart the Vite dev server after changes.

**Production:** set `VITE_API_BASE_URL` to this API’s **public HTTPS URL** when running `npm run build` for the dashboard (see root `README.md` → Production). Set `FRONTEND_ORIGIN=https://pido-app.web.app` on this server (no trailing slash) so CORS allows the live dashboard.

## Routes

All routes require `Authorization: Bearer <Firebase ID Token>` for an account that exists in Firestore `adminUsers`.

- `POST /admin/notifications/topic`
- `POST /admin/notifications/users`
- `POST /admin/notifications/test`

