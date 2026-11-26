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

## 3D Model Generation (local image-to-mesh and text-to-3D)

ANNY's bundled `modly-main/` engine performs image-to-mesh generation locally on the GPU. It is separate from the main application.

**One-time setup:**
```bash
npm run modly:setup
```
This creates the Python environment and installs the local API dependencies. Model weights are downloaded from Hugging Face when a model is first used; model installation requires internet access, but subsequent inference can run offline when the weights are present.

**Start the local mesh engine:**
```bash
npm run modly:start
```
The API listens at `http://127.0.0.1:8765`; the main ANNY server proxies authenticated `/api/modly/*` requests.

**Open the sidebar → 3D Generator:** It supports direct PNG/JPEG/WebP image-to-mesh uploads as well as text prompts.
- **Local / Offline:** for text prompts, ANNY first creates a reference raster with a locally hosted Stable Diffusion WebUI-compatible API (`SD_WEBUI_URL`, e.g. `http://127.0.0.1:7860`, launched with its API enabled), then sends that image to the local Modly mesh model. Both local models must be configured; this path does not fall back to cloud providers.
- **Cloud:** text-to-3D uses Meshy only when `MESHY_API_KEY` or `MODLY_API_KEY` is configured on the server. Cloud generation may incur provider charges.
- **Image-to-3D:** the existing local image-upload endpoint remains available through the Modly service.

The generator shows job status/progress, links the reference image when the local text pipeline created one, and previews/downloads the resulting GLB when the provider returns a verified model URL. Cancel is supported for local Modly jobs.

**Validation note:** CI validates source, tests, type-checks and builds. Actual GPU inference and model-quality review must still be run on a machine with the required model weights and hardware.


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


## Offline semantic embeddings

Set `EMBEDDING_PROVIDER=ollama` to force local-only embeddings even when cloud credentials are present. With `EMBEDDING_PROVIDER=auto` (the default), ANNY uses Gemini when configured and otherwise attempts genuine local Ollama embeddings rather than manufacturing placeholder vectors. Install an embedding model locally (for example `ollama pull nomic-embed-text`) and optionally set `OLLAMA_EMBEDDING_MODEL=nomic-embed-text:latest`. The configured model must exist in the local Ollama model list and be identified as an embedding model.

The adapter uses Ollama's `/api/embed` endpoint and supports the legacy `/api/embeddings` endpoint when the modern route returns HTTP 404. Returned vectors must be non-empty arrays of finite numbers. Missing or invalid provider output fails explicitly; ANNY never substitutes synthetic vectors or silently switches providers.

If neither a real cloud embedding provider nor a local embedding model is available, semantic indexing and retrieval report an embedding-provider error. Keyword retrieval may still be available through the separately persisted local keyword index.
