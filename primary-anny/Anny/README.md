<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/d75888bd-341e-4403-bc06-f8d51526c143

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## 3D Model Generation (image → 3D mesh, real local AI)

3D generation uses the bundled `modly-main/` engine (open-source, runs locally on your GPU) — not a cloud API. It's a separate process from the main app.

**One-time setup:**
```bash
npm run modly:setup
```
This creates a Python virtual environment in `modly-main/api/.venv` and installs the FastAPI backend's dependencies. The first actual generation run will additionally download the AI model weights from Hugging Face (several GB) — this requires a GPU and internet access, and only happens once.

**Start it (in a separate terminal, alongside `npm run dev`):**
```bash
npm run modly:start
```
This runs the engine at `http://127.0.0.1:8765`. The main app's server proxies `/api/modly/*` requests to it automatically. You can check `GET /api/modly/health` to see whether it's reachable.

**Using it:** open the 3D Generator (Neural Lab) panel and upload a photo — it's sent to the local engine for real image-to-3D reconstruction, then rendered with animation/orbit controls once ready. Text-only prompts (no image) instead use an optional cloud fallback (Meshy) if you set `MESHY_API_KEY` in `.env.local` — there is no simulated/fake result if neither is configured; you'll get an honest error telling you what to set up.

**Note:** I configured and verified the server-side wiring against the engine's real API contract (`modly-main/api/routers/generation.py`), and confirmed every endpoint fails honestly with no engine running. I was not able to run actual GPU inference in this environment — no GPU is available here and Hugging Face's model-weight host isn't reachable from this sandbox. The first real end-to-end generation should be tested on your machine.


## Persistent and offline vector memory

ANNY supports two distinct vector-storage modes:

- **Remote Qdrant:** when `QDRANT_URL` is configured, ANNY uses the real Qdrant REST API for collection creation, vector upserts, and semantic search. Qdrant's storage volume in `docker-compose.yml` is named `anny_qdrant`, so its data survives container recreation.
- **Browser offline storage:** when no remote Qdrant URL is configured and the app is running in a browser, ANNY stores vectors in IndexedDB on that device. This survives browser reloads, but it is local to that browser profile and is not automatically synced or backed up.
- **Volatile fallback:** runtimes without remote Qdrant or browser IndexedDB use process memory only. ANNY reports this as volatile and it is lost when the process exits.

### Start the bundled Qdrant service

From this directory, run:

```bash
docker compose up -d qdrant
```

The ANNY container in the same Compose project is configured to use `http://qdrant:6333` by default. For a remote Qdrant instance, set `QDRANT_URL` to its HTTP(S) endpoint and optionally set `QDRANT_API_KEY`; Compose forwards both values to the application container.

A real embedding provider is still required for semantic indexing and search. Storage availability alone does not create embeddings. ANNY reports remote Qdrant as connected only after a live request succeeds, and a configured-but-unreachable Qdrant endpoint does not silently fall back to volatile storage.

**Operational note:** browser IndexedDB is device-local storage, not a backup system. Export or back up important source documents separately.


## Durable server authentication sessions

Server-issued guest and administrator sessions use PostgreSQL-backed revocation state when `DATABASE_URL` is configured. ANNY stores SHA-256 hashes of access and refresh credentials, never the raw bearer tokens. Refresh rotation consumes the previous refresh hash and inserts its replacement in one database transaction, preventing a refresh-token replay from creating multiple active sessions.

- In production, durable session storage is required. If PostgreSQL is not configured or the session registry is unavailable, ANNY refuses to issue or accept server-signed sessions rather than silently treating process memory as durable.
- In local development and tests without PostgreSQL, the existing in-process session mode remains available. It is not restart-safe or shared between server instances.
- Firebase ID-token verification remains a separate identity path and is still validated against Google's signing certificates and the configured Firebase project.
- Logout and administrator logout report a temporary service error if durable revocation cannot be confirmed.

The `auth_sessions` table and indexes are created additively with `CREATE TABLE IF NOT EXISTS`; this feature does not alter or delete existing user, project, or memory records.


### Persistent offline keyword retrieval

Browser ANNY also persists tenant-owned BM25 keyword chunks in the `keyword_chunks` IndexedDB object store. The database upgrades additively from version 1 to version 2, retaining the existing vector collection store. Keyword reads require an owner ID and query the owner index, so records belonging to other users are not included in retrieval.

This is device-local persistence. Server-side Node runtimes without IndexedDB still use the in-process keyword index unless a separate durable server-side knowledge store is configured; they must not be described as restart-safe BM25 storage.


## Durable isolated preview sessions

Preview-session metadata is persisted with the project store, using PostgreSQL when configured and the atomic `.anny-data/projects.json` store for local/self-hosted operation. A server restart can restore the preview ID, project owner, version, state, and entry file; the preview is rebuilt from the persisted project files when requested.

Preview capability credentials are derived with HMAC-SHA-256 from the preview identity and a stable server secret. The raw capability token is never stored in PostgreSQL or the project JSON file.

- In production, set a strong, stable `SESSION_SECRET`; preview creation fails closed if it is missing or weak.
- In local development, ANNY creates `.anny-data/preview-capability.key` with mode `0600`, keeps the local data directory at mode `0700`, and reuses the key across restarts. The entire `.anny-data/` directory is Git-ignored.
- If PostgreSQL is configured but the durable preview-session registry is unavailable, preview status, refresh, stop, and serving return a service-unavailable response instead of trusting stale process memory.
- Preview session ownership is checked against the owning persisted project.


### Project deletion durability

The local project store now records deletion tombstones in `.anny-data/projects.json`. A deleted project ID is excluded when the store is reloaded, preventing an old cached project snapshot from reappearing after a restart. When PostgreSQL is configured, its successful reads remain authoritative; if a PostgreSQL delete cannot be confirmed, the API reports the failure while the local tombstone prevents an offline cache from exposing the stale copy.


## Verified offline Ollama inference

ANNY discovers the active Ollama endpoint from `OLLAMA_BASE_URL` and local loopback candidates, verifies installed models, and runs a real inference probe before reporting the local provider as healthy. Chat requests use the endpoint that was actually discovered rather than assuming the environment URL is populated.

- If no model is explicitly selected, ANNY chooses the first installed local model.
- Explicit model names must match an installed model; an unavailable tag is not silently replaced by a different model.
- Local chat supports text and JSON response format; image input is sent only to model names identified as vision-capable. Function-tool declarations are passed to Ollama, but actual tool calling depends on the selected model's support.
- CPU-based local inference has a longer default request timeout to accommodate first-load model initialization.
- Explicitly selecting Ollama or enabling offline-only mode never silently falls back to a cloud provider.
- A local inference failure invalidates the cached discovery so the next request can re-probe the endpoint.


## Runtime adapter reality status

The current Universal Execution Adapter Engine contains adapter metadata and placeholder lifecycle simulations, not real process-spawning/build adapters. It does not currently compile projects through those adapters, launch operating-system processes, expose verified preview endpoints, or connect Docker/Kubernetes/ROS 2/PLC/SCADA hardware.

- Placeholder builds return `success: false` and explicitly state that no build ran.
- Placeholder run state reports `SIMULATED`, PID `0`, and no preview URL.
- Health is degraded or awaiting dependency rather than healthy.
- Adapter selection does not launch a process when a real build adapter is unavailable.

Use the separate verified workspace compilation/preview pipeline where it is actually available; do not treat these placeholder adapter results as a real deployment or runtime test.


## Preview render verification

A preview route being selected is not proof that the generated artifact rendered. The current preview health routine does not have independent evidence from each viewer (iframe load/target DOM, image decode, PDF page render, or simulator output). It therefore reports `ROUTED_UNVERIFIED` / `DEGRADED` instead of counting the host ANNY page DOM as successful artifact rendering.


## Runtime Bridge status

The Runtime Bridge's Node, browser/Sandpack, Docker, and remote execution providers do not currently implement actual project process execution. The Node/browser/remote placeholders now report unavailable and fail rather than returning invented PIDs, ports, logs, or successful job status. Docker remains unavailable until a real daemon integration exists.

The separate isolated VFS preview runner is a browser preview path; preview routing is not proof that an artifact rendered. The bridge's preview configs therefore remain `isLive: false` until viewer-specific evidence is supplied.
