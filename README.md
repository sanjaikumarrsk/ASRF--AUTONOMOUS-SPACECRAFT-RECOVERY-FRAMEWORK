# AUTONOMOUS SPACECRAFT RECOVERY FRAMEWORK frontend

This is the existing Vite/React mission-monitoring interface, connected to the FastAPI backend in `../backend`.

## Start

```powershell
npm install
Copy-Item .env.example .env.local
npm run dev
```

`VITE_API_BASE_URL` defaults to `http://localhost:8000/api`. Set it in `.env.local` when the backend is hosted elsewhere. Do not put provider API keys in this file or in any browser environment variable.

## Verification

```powershell
npm run lint
npm run build
```

The dashboard and records page display persisted API data, including explicit empty and backend-error states. Recovery strategies are shown as proposals. The UI does not claim that a command executed, that a PPO/LSTM artifact is deployed, or that a recovery succeeded without a recorded backend outcome.
