# ANNY initial security and integrity review

**Review date:** 20 November 2026  
**Scope:** Static inspection of the consolidated repository and selected application/configuration files, plus GitHub Actions type-check/build verification.  
**Status:** Preliminary; not a penetration test, dependency audit, runtime certification, or production approval.

## Executive decision

**Do not deploy either imported application as a public production service yet.** The repository migration and build foundation are complete, but copying source files and passing a build do not prove that authentication, data isolation, persistence, offline inference, or every capability works safely at runtime.

## Confirmed observations

### 1. Primary application layout

The primary application root is `primary-anny/`; its Vite frontend and Bun lockfile are at that root, while the Express server and its own package manifest live under `primary-anny/Anny/`. The server has a server-side authentication module, mandatory secret validation during server startup, an explicit trust-proxy setting, server-side rate-limit middleware, and public-URL validation intended to prevent SSRF. These are useful controls, but their correctness and complete route coverage still require dedicated security tests.

### 2. Reference application contains unsafe defaults

The reference `src/services/envConfigService.ts` includes fallback values for JWT/session/encryption secrets and an administrator username/password. These must never be used for a deployment. The reference snapshot is retained for comparison only; do not use its environment service or auth implementation as a replacement for the primary implementation without a separate security review.

### 3. Historical reports conflict

The reference snapshot contains a certification report claiming a clean, ready state, while its own forensic report records simulated or disconnected voice, multimodal, worker, video, URL-analysis and persistence paths. Treat the certification report as a historical claim, not as current evidence. A passing self-authored suite is not equivalent to independent end-to-end verification.

### 4. Firebase configuration differs between snapshots

The primary and reference app configurations name the same Firebase project but use different Firestore database IDs. This is a deployment/configuration decision that must be explicitly resolved before enabling persistent user data. Do not silently switch database IDs or assume data is shared.

### 5. Dependency and build verification

The root primary frontend uses `bun.lock`; the nested Express server has its own `package.json` and `package-lock.json`. The nested npm lockfile was regenerated in a lockfile-only maintenance pull request, validated, and merged.

The latest successful main-branch CI run verified:
- `bun install --frozen-lockfile` for the frontend.
- `npm ci` for the nested server.
- `bun run lint` (TypeScript validation).
- `bun run build` (Vite frontend and bundled Express server).

The production build also reported a JavaScript bundle of approximately 5.32 MB (about 1.39 MB gzip), several mixed static/dynamic imports that prevent some modules from being split into separate chunks, and direct `eval('require')` usage in database-monitoring and PostgreSQL modules. These are performance, maintainability and runtime-hardening tasks; do not suppress the warnings by simply raising the chunk-size limit.

The production server build originally emitted a source map. The build script now omits that server source map to reduce accidental source disclosure if the build directory is exposed. The latest CI run passed after this change; the server bundle output contains only `dist/server.cjs`, with no `dist/server.cjs.map`.

### 6. Capability claims need runtime evidence

The reference forensic report itself identifies simulated or disconnected capabilities, including voice transcription, several multimodal inputs, remote workers, video generation, and durable memory. Keep these marked as experimental/unverified until actual end-to-end tests pass.

## Immediate controls

- Use `primary-anny/` as the application root and `primary-anny/Anny/` as its nested server/runtime.
- Keep `reference-anny/` unchanged as a read-only comparison source.
- Use unique high-entropy secrets supplied through a secure deployment secret manager; never copy example values into production.
- Keep cloud AI keys server-side. Never expose private provider keys through `VITE_*` variables or browser storage.
- Confirm Firebase project/database selection and review Firestore/Storage rules before enabling user data.
- Keep the application private or behind access controls until authentication, authorization, rate limits, uploads, SSRF defenses, and admin routes are independently tested.
- Do not connect the application to real PLC/SCADA/robotic equipment during software-only validation.

## Required next verification gates

| Gate | Evidence required | Status |
|---|---|---|
| Root frontend install | `bun install --frozen-lockfile` using `primary-anny/bun.lock` | Passed in CI |
| Nested server install | `npm ci` using the reconciled nested lockfile | Passed in CI |
| Type validation | `bun run lint` from `primary-anny/` | Passed in CI |
| Production build | `bun run build` from `primary-anny/` | Passed in CI; performance warnings remain |
| Production source-map removal | Confirm no `dist/server.cjs.map` emitted | Passed in latest CI build logs |
| Authentication tests | valid, invalid, expired, revoked, spoofed identity cases | Not yet evidenced |
| Authorization tests | per-user isolation and admin route enforcement | Not yet evidenced |
| SSRF tests | private IPv4/IPv6, DNS rebinding, redirects, metadata targets | Not yet evidenced |
| Upload tests | size/type/path traversal and ownership enforcement | Not yet evidenced |
| Persistence tests | restart durability and cross-user isolation | Not yet evidenced |
| Offline acceptance | clean network-disabled run with local model configured | Not yet evidenced |
| Deployment review | TLS, headers, backups, monitoring, secret rotation, recovery | Not yet evidenced |

## Important distinction

A successful TypeScript check and frontend/server build proves only that the code type-checks and bundles. It does not prove the application starts correctly, authenticates users safely, connects to databases, performs local inference, or is ready for production.
