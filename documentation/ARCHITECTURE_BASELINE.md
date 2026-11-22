# ANNY consolidated architecture baseline

**Status:** Initial engineering baseline — 20 November 2026  
**Repository:** `KingKenStudios/ANNY`  
**Primary application root:** `primary-anny/`

## Product identity

ANNY is the central intelligence layer: **One AI. One Brain. Unlimited Applications.** AIOS is an operating environment ANNY can operate across; Akinwumi Group is the owner/ecosystem. ANNY must support local/offline operation as a first-class mode and online providers as optional, replaceable integrations. No paid API, subscription, or metered cloud service may be required for the core product.

## Repository roles

| Path | Role | Change policy |
|---|---|---|
| `primary-anny/` | Primary application root: Vite frontend, root package manifest and Bun lockfile | All application changes start here |
| `primary-anny/Anny/` | Nested Express server and supporting services, with its own package manifest and npm lockfile | Treat as the server runtime within the primary application |
| `reference-anny/` | Historical/reference implementation and supporting research | Preserve as read-only evidence; selectively port reviewed components |
| `documentation/` | Architecture, audit findings, operating procedures | Keep current with implementation |
| `.github/workflows/` | Reproducible CI and repository automation | Required checks must be green before merge |

The two imported snapshots are intentionally not merged. Their package manifests, server implementations, environment configuration and Firebase database identifiers differ. Do not combine them by copying whole directories over one another.

## Primary application entry points

- Frontend package manifest and lockfile: `primary-anny/package.json`, `primary-anny/bun.lock`
- Frontend entry point: `primary-anny/index.html` and `primary-anny/src/`
- Express server: `primary-anny/Anny/server.ts`
- Server package manifest and npm lockfile: `primary-anny/Anny/package.json`, `primary-anny/Anny/package-lock.json`
- Server environment template: `primary-anny/Anny/.env.example`
- Local 3D generation service: `primary-anny/Anny/modly-main/`

## Architectural boundaries

1. **Identity and authorization:** server-verified identity only. Never authorize using client-supplied user IDs, role headers, or UI state.
2. **Model access:** route through a provider registry/router. Local providers must remain usable without cloud credentials. A cloud provider being listed is not proof that it is available, free, or healthy.
3. **Memory and persistence:** distinguish durable storage from in-memory caches and simulated/test implementations. Do not describe volatile memory as persistent memory.
4. **Tools and execution:** separate planning from execution; require explicit user approval for consequential actions. Treat code execution, filesystem access, network fetches and industrial control as privileged capabilities.
5. **Multimodal and media:** advertise a capability only when a real runtime path and end-to-end test exist. A registry entry or UI panel alone is not implementation proof.
6. **Observability:** report measured health and failures, not optimistic static defaults.
7. **Safety-critical engineering:** PLC, SCADA, robotics and electrical actions remain read-only by default; active operations require explicit authorization and appropriate physical safety procedures.

## Development commands

Run from `primary-anny/`:

```bash
bun install --frozen-lockfile
cd Anny && npm ci
cd ..
bun run lint
bun run build
bun run dev
```

The repository CI workflow installs the frontend from the root Bun lockfile and the nested server from its npm lockfile, both with frozen/clean-install enforcement, then runs TypeScript validation and the production build. These checks do not replace security testing, integration tests, or deployment validation.

## Change control

- Keep changes focused and reviewable; do not rewrite large subsystems to silence a check.
- Preserve source provenance when porting from `reference-anny/`.
- Add tests for security boundaries and bug fixes; negative tests must demonstrate rejection of invalid input.
- Never remove TODO/FIXME markers as a substitute for implementing the underlying work.
- Never convert failed/unavailable health states into success states to satisfy tests.
- Do not commit real environment files, credentials, service-account keys, private keys, or production data.
- Require CI and human review before merging to `main`.
