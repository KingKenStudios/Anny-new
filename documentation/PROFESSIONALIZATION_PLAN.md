# ANNY professionalization plan

**Baseline date:** 20 November 2026  
**Primary application:** `primary-anny/` (frontend) and `primary-anny/Anny/` (server)

This plan is an engineering sequence, not a claim that all listed work is complete.

## Phase 0 — Preserve and establish controls

- [x] Import primary and reference repositories into separate folders.
- [x] Keep original source repositories unchanged.
- [x] Document repository roles and initial security findings.
- [x] Add automated CI for dependency installation, TypeScript validation and production build.
- [x] Verify the main-branch CI pipeline passes with clean dependency installs.

## Phase 1 — Reproducible foundation

- [x] Verify the root Bun lockfile with `bun install --frozen-lockfile`.
- [x] Reconcile the nested server npm lockfile and verify clean `npm ci`.
- [x] Run TypeScript validation and production build in CI.
- [x] Verify the production server build no longer emits a source map.
- [x] Add deterministic Python unit tests for the source-inventory utility (coverage reporting remains open).
- [ ] Add dependency vulnerability and secret scanning with reviewed baselines.
- [ ] Refactor direct eval-based optional dependency loading and reduce oversized frontend chunks.
- [ ] Define supported Node/Python versions and pinned service versions.
- [ ] Document local development, offline mode, and deployment profiles.

## Phase 2 — Security hardening

Initial evidence and remediation are documented in [`PHASE2_SECURITY_REMEDIATION.md`](./PHASE2_SECURITY_REMEDIATION.md), [`PHASE2_DOCUMENT_UPLOAD_HARDENING.md`](./PHASE2_DOCUMENT_UPLOAD_HARDENING.md). Source comparison and unification guardrails are documented in [`PHASE2_SOURCE_UNIFICATION.md`](./PHASE2_SOURCE_UNIFICATION.md).

- [x] Perform an initial static Express route/auth classification; document public exceptions and identified exposure (complete runtime matrix and negative tests remain open).
- [ ] Prove user/tenant isolation for all data, storage and memory paths.
- [ ] Test authentication expiry, revocation, CSRF/CORS, cookies, admin bootstrap and role assignment.
- [ ] Test SSRF protections against private, loopback, link-local, IPv6, redirect and DNS edge cases.
- [x] Add size/entry/path/environment-file guards to authenticated source ZIP ingestion and protect host metrics/Ollama diagnostics with identity checks.
- [x] Bound document upload count/size and direct RAG ingestion; prevent binary and credential-like text from entering RAG memory (streaming, comprehensive secret scanning, persistence/retention and route integration tests remain open).
- [ ] Review Firebase rules and storage rules against the selected Firebase project/database.
- [ ] Rotate any credentials that were ever committed to a repository or shared outside a secret manager.

## Phase 3 — Runtime truth and reliability

- [ ] Replace static/simulated health claims with real service probes.
- [ ] Distinguish unavailable, degraded, offline and healthy states.
- [ ] Add structured logs, request correlation IDs, metrics and redaction.
- [ ] Verify database migrations, backups, restore drills and data retention.
- [ ] Test restart recovery, queue retries, idempotency and graceful shutdown.

## Phase 4 — Core intelligence

- [ ] Define one canonical request/context contract for the ANNY brain.
- [ ] Prove provider routing, model capability checks, timeout and retry policy.
- [ ] Make local Ollama/GGUF inference usable without cloud keys.
- [ ] Prove offline operation with networking disabled.
- [ ] Verify that online providers are optional and replaceable.
- [ ] Add regression tests for prompt injection, tool permissions and memory isolation.

## Phase 5 — Capability integration

For every capability (voice, vision, files, video, music, coding, robotics, mechatronics, industrial automation), require:
1. a real implementation,
2. a reachable caller path from the UI/API,
3. permission and safety checks,
4. failure handling,
5. an automated integration test,
6. accurate UI status.

Do not mark a capability complete merely because a class, route, UI panel, registry entry or mock test exists.

## Phase 6 — Release readiness

- [ ] Threat model and independent security review.
- [ ] CI green on all required checks.
- [ ] Staging deployment with real infrastructure.
- [ ] End-to-end tests and backup/restore exercise.
- [ ] Operational runbooks, incident response and rollback.
- [ ] Production deployment only after explicit release approval.

## Acceptance rule

A phase is complete only when its evidence is reproducible from the repository or CI logs. Never normalize failures, bypass tests, or edit audit output to manufacture a passing result.
