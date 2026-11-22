# Phase 2 — Source unification baseline

**Status: investigation started; no code from the reference tree has been blindly merged.**

## Observed layout

- The consolidated top-level `primary-anny/src` is a small bootstrap shell (four files). The actual primary frontend is `primary-anny/Anny/src` (260 source files), imported by the bootstrap `App.tsx`.
- The primary frontend and backend are co-located under `primary-anny/Anny`; the server entrypoint is `primary-anny/Anny/server.ts`.
- The reference frontend is `reference-anny/src`; its source tree contains 419 files across components, core, runtime, services, views, scripts, types and other folders.
- The reference is a large candidate feature source, not automatically a more reliable implementation. Files with phase/certification/audit names are not evidence of runtime capability by themselves.

## Initial path comparison (22 November 2026)

A tree-based comparison (basename only; it does not compare content) found:

| Area | Primary | Reference |
|---|---:|---:|
| Total source files | 260 | 419 |
| Components | 77 | 89 |
| Core | 110 | 232 |
| Services | 32 | 23 |
| Views | 10 | 16 |
| Runtime directory | 0 | 26 |

249 primary/reference filenames share a basename. This is a strong indication that many capabilities already exist in the primary tree, but **not proof of identical code or behavior**. Reference-only names are candidates for tracing, not automatic ports. The primary also contains files absent from the reference snapshot; these should not be discarded.

## Guardrails

1. Keep `reference-anny/` immutable as the preserved snapshot.
2. Primary remains the single application shipped/run by the project.
3. Port a feature only after identifying the user-visible caller, implementation, dependency chain, security boundary, configuration, tests, and license/provenance.
4. No wholesale copying of the reference `App.tsx`, workspace, auth, secrets/config, storage, provider, or runtime modules.
5. Do not make production health/capability claims from simulated tests, UI panels, registries, phase reports, or compile success.
6. Keep all work in reviewable branches and PRs; do not deploy or merge automatically.
7. Offline-first and no mandatory paid services remain acceptance requirements.

## Work sequence

- [x] Record source inventory counts and paths.
- [x] Add deterministic inventory tool and unit tests.
- [x] Add CI to run the inventory tool on source changes.
- [ ] Extract feature/capability map from the reference and trace each feature to its entrypoint and dependencies.
- [ ] Establish import/dependency graph and duplicate/conflicting service map.
- [ ] Compare primary and reference capability by capability; record candidate ports, risk, and tests.
- [ ] Start porting only validated, high-value missing features to the primary architecture.
- [ ] Add real integration tests for each port and its security controls.

## Running the inventory

```bash
python scripts/compare_source_inventory.py
python scripts/compare_source_inventory.py --format json --output inventory.json
python -m unittest scripts/test_compare_source_inventory.py
```

This tool compares paths and basenames only. It intentionally does not call files equivalent, feature-complete, safe, or missing.


## Reference modules that must not be ported as-is

The initial code reading has already found misleading simulated behavior in candidate modules:

- `reference-anny/src/core/annyUniversalTranslationFabric.ts`: its "NLLB local inference" method returns the input prefixed with the target language (not model inference). It also returns hard-coded dictionary matches for a few phrases. The capability labels/latency/confidence therefore cannot be treated as real translation evidence.
- `reference-anny/src/runtime/AnnyInferenceEngine.ts`: the implementation constructs a synthetic evidence string from the input instead of invoking a real inference runtime/model. It marks model/runtime verified and READY without performing model execution.

These modules must not be merged into primary until they are replaced with real model-backed implementations and falsifiable tests. This is exactly why copying a feature panel or "phase certification" file would create false capability claims.

- `reference-anny/src/core/AnnyAiosControlPlane.ts`: descriptors are registered with `status: REAL`, but dispatch branches return descriptive state objects (e.g., "RUNNING"/"delivered") rather than invoking an OS/app control adapter. The UI also supplies a fixed `grantedPermission: EXECUTE` and `userConfirmed: true`; this is not a trustworthy permission boundary.
- `reference-anny/src/core/AnnyCollectiveLearningFabric.ts`: synchronization is implemented as an in-process queue count/state transition, not a verified network synchronization protocol.
- `reference-anny/src/core/AnnyPortableRuntime.ts`: capability profiles should be treated as declared/static profiles until host probes and actual platform adapters are demonstrated.
- `reference-anny/src/core/AnnyOrganizationIntelligence.ts`: in-memory organization/memory isolation primitives require persistence, server-side identity binding, and adversarial cross-tenant tests before use as a security boundary.

**Decision:** do not port the corresponding views/engines solely because they look complete. Keep the current primary functionality; replace these implementations with real adapter-backed behavior, evidence, and tests before integrating them.
