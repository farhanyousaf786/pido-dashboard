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

Set in dashboard root `.env.local`:

```bash
VITE_API_BASE_URL=http://localhost:3000
```

Then restart the dashboard dev server.

## Routes

All routes require `Authorization: Bearer <Firebase ID Token>` for an account that exists in Firestore `adminUsers`.

- `POST /admin/notifications/topic`
- `POST /admin/notifications/users`
- `POST /admin/notifications/test`

