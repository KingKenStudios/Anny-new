# ANNY Forensic Repair Report

Date: 2026-09-03

This archive was inspected as source-of-truth rather than trusting previous phase summaries.

## Confirmed defects found and corrected

1. `src/AnnyWorkspace.tsx` referenced `generateRealProjectTitle` without importing it.
2. Normal ANNY had an unreachable forensic preview surface and legacy verification UI references. Those obsolete UI surfaces were removed.
3. Several message read-aloud paths directly called `window.speechSynthesis`, bypassing the canonical ANNY voice service. They now route through `AnnyVoiceService`, so the selected Female/Male role is respected by automatic speech and speaker playback.
4. `AnnyTopBar` exposed a browser-native voice picker that conflicted with the canonical Female/Male ANNY role model. The competing picker was removed from the top bar; voice role selection belongs to ANNY Settings.
5. Provider-specific chat branches were not all guaranteed to receive the universal natural-conversation system policy. The canonical policy is now attached to the effective system prompt used by the provider platform.
6. The server's project/session endpoints were passing raw SQL strings to a repository method designed around table names. They now use the repository's table-name interface.
7. The Keda control endpoint previously had no ANNY-user authentication or action allowlist. It now requires a valid ANNY session with the required permission and an explicit `KEDA_ALLOWED_ACTIONS` allowlist before the server-to-server Keda token is used.
8. Production environment configuration contained hardcoded secret defaults. Production now requires explicit security secrets; development retains non-production placeholders.
9. Voice STT failure was labelled as `MOCK_VOICE_ENGINE`. It now reports `UNAVAILABLE` so failure cannot be mistaken for real execution.
10. Unreferenced legacy verification UI files were removed.

## Important findings that remain architectural, not falsely certified as fixed

The project still contains infrastructure adapters that need live service verification before production certification. The Docker Compose file defines PostgreSQL, Redis, Qdrant, RabbitMQ, MinIO, ClickHouse and Ollama, but some older platform classes still contain in-memory compatibility implementations. These must not be reported as live database execution until their live connections are verified.

The current environment could not complete `npm ci` within the available execution window, so a full dependency-backed TypeScript/Vite production build could not honestly be certified from this container.

## Required deployment verification

After extracting the archive on a machine with network access:

```bash
npm ci
npm run lint
npm run build
```

Then start the infrastructure and application:

```bash
docker compose up -d postgres redis qdrant rabbitmq minio clickhouse ollama
npm start
```

Finally test the real browser flows: Normal ANNY chat, one response per message, camera capture, selected voice playback, fresh project generation, code-to-preview execution, project isolation, backend generation, Visual Editor changes, 3D generation, and Keda authorization.

No claim of 100% completion is made until those runtime tests pass against the actual deployed services.
