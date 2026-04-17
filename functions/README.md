# Cloud Functions — admin notifications API

This is the **Firebase** replacement for running `server/` on Heroku. It exposes the same routes under `/admin/notifications` and is reached from the live site via Hosting rewrites.

- **Deploy:** from repo root, `npm run deploy` (builds the dashboard and deploys Hosting + `functions:dashboard` only — not your main app’s default Cloud Functions codebase).
- **Admin SDK:** uses default credentials in Cloud Functions (no `serviceAccount.json` in the bundle).
- **CORS:** allows `https://pido-app.web.app` and `http://localhost:5173`. Override with comma-separated `FRONTEND_ORIGIN` in [function environment config](https://firebase.google.com/docs/functions/config-env).
