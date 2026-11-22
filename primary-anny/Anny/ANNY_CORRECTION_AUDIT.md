# ANNY Corrected Project Audit

This archive was corrected from the supplied `anny_corrected.zip` baseline.

## Applied corrections

- Fixed a TypeScript compile blocker in `server.ts`: duplicate `HUGGINGFACE_API_KEY` declaration in the Nigerian TTS endpoint.
- Unified ANNY voice selection: the persisted selected voice is now used for automatic conversation, the speaker button, and build-context speech. The speaker button no longer silently forces the male voice.
- Kept Nigerian language routing isolated to Nigerian speech requests so other languages continue through the universal voice path.
- Added a server-side ANNY → Keda bridge with `KEDA_API_URL` and `KEDA_API_TOKEN`; credentials are never exposed to the browser.
- Added Keda integration status and command endpoints.
- Added self-hosted/free-stack Docker services for PostgreSQL, Redis, Qdrant, RabbitMQ, MinIO, ClickHouse, and Ollama. Analytics remain assigned to ClickHouse, not PostgreSQL.
- Added Keda environment variables to `.env.example`.
- Removed one exact duplicate runtime asset that was not referenced by the application.
- Normalized branding in the server/client health/config identity from `Anny / Robot` to canonical `ANNY`.

## Important verification note

The archive did not contain installed `node_modules`, and dependency installation exceeded the available execution window. Therefore a full TypeScript/Vite build could not be truthfully certified in this environment. Static inspection found and corrected the confirmed duplicate declaration. Run `npm ci`, then `npm run lint` and `npm run build` on the deployment machine before release.
