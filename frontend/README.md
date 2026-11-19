# RevoTask frontend

The Next.js 16 app for RevoTask. Setup, testing and deployment are described in the [main README](../README.md).

Quick start:

```bash
npm install
cp .env.example .env.local   # point NEXT_PUBLIC_API_BASE_URL and API_BASE_URL at the Flask API
npm run dev
npm test                     # Jest + React Testing Library
npx playwright test          # E2E (set PLAYWRIGHT_BASE_URL and PLAYWRIGHT_API_URL)
```
