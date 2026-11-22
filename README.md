# ANNY — Intelligence by Akinwumi Group

**One AI. One Brain. Unlimited Applications.**

ANNY is an offline-first, online-capable, local-model-capable, provider-independent AI Operating System and Engineering Platform.

## Repository Layout

- `/` — Root Node.js / npm workspace compatible with Google AI Studio Build (`package.json`, `index.html`, `src/main.tsx`, `vite.config.ts`, `tsconfig.json`, `metadata.json`, `.env.example`)
- `/primary-anny/` — Primary ANNY application (frontend shell, backend Express server in `primary-anny/Anny/server.ts`, services, core intelligence modules, static assets, Firebase rules, and Docker Compose stack)
- `/reference-anny/` — Preserved read-only reference archive for comparison and audit traceability
- `/documentation/` — Architecture baselines, consolidation runbooks, and security review records

## Requirements

- **Node.js 20+** (tested on Node.js 22)
- **npm 10+** (Bun is not required)

## Quick Start (From Repository Root)

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment variables:**
   ```bash
   cp .env.example .env
   ```
   - For development (`NODE_ENV=development`), ANNY generates ephemeral CSPRNG secrets in memory automatically if `JWT_SECRET`, `JWT_REFRESH_SECRET`, `SESSION_SECRET`, and `ENCRYPTION_KEY` are unset.
   - For production (`NODE_ENV=production`), you **must** supply strong 32+ character random values for `JWT_SECRET`, `JWT_REFRESH_SECRET`, `SESSION_SECRET`, and `ENCRYPTION_KEY`.
   - Cloud AI provider keys (`GEMINI_API_KEY`, `GROQ_API_KEY`, `OPENAI_API_KEY`, etc.) remain strictly server-side. Never expose private keys to browser bundles.
   - Optional self-hosted infrastructure (`OLLAMA_BASE_URL`, `DATABASE_URL`, `REDIS_URL`, `MINIO_ENDPOINT`, `QDRANT_URL`, `RABBITMQ_URL`, `CLICKHOUSE_URL`) is not mandatory to boot ANNY and is reported accurately as `not_configured` unless enabled.

3. **Start development server (unified frontend + backend on port 3000):**
   ```bash
   npm run dev
   ```

4. **Run tests and type-checking:**
   ```bash
   npm test
   npm run lint
   ```

5. **Build and run production server:**
   ```bash
   npm run build
   NODE_ENV=production npm start
   ```

## S3 / MinIO Object Storage

ANNY uses the official AWS SDK for JavaScript v3 (`@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner`) with `forcePathStyle: true` for MinIO and S3-compatible storage backends.

- Explicit `MINIO_ENDPOINT`, `MINIO_ACCESS_KEY`, and `MINIO_SECRET_KEY` are required.
- Default `minioadmin` credentials are rejected by policy.
- Run storage tests (including live MinIO integration when `MINIO_ENDPOINT` is configured):
  ```bash
  npm run test:storage
  ```

## Offline & Capability Transparency

Inspect `/api/health` and `/api/system/capabilities` for live, honest runtime capability states:
- `available_offline` — Core UI workspace, session auth, upload sanitization, and reachable local Ollama models
- `available_online` — Configured cloud AI providers or live external infrastructure
- `requires_optional_provider` — Feature requires an optional provider key or local runtime
- `not_configured` — Optional self-hosted service not configured
- `unavailable` — Configured service or provider currently unreachable or disabled by `ANNY_EXECUTION_MODE=OFFLINE_ONLY`
