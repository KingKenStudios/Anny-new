# Phase 2 — Document upload / RAG ingestion hardening

## Implemented in this branch

- Multipart document uploads are capped at 5 files, 15 MiB per file, and 25 MiB combined. The upload middleware and validation helper both enforce limits.
- JSON/base64 document upload requests are capped to 15 MiB decoded data and a bounded encoded payload.
- Direct authenticated RAG ingestion is capped at 2 MiB UTF-8 and title/type lengths are bounded.
- RAG search queries are capped at 10,000 characters and result count is normalized to 1–20 (default 5).
- RAG ingestion only accepts allowlisted text extensions, valid UTF-8, files without NUL bytes, and text <= 2 MiB.
- Binary media, malformed text, environment-like filenames, common credential-marker text and private-key markers are not ingested into text memory.
- Binary files can still be uploaded for attachment/preview metadata, but the server no longer treats every non-image file as plain text.
- Authenticated document-download endpoints serve files as attachments with an octet-stream type, `nosniff`, and sandbox CSP instead of rendering untrusted uploaded HTML/SVG inline.
- Added unit tests for file count/size/batch boundaries, text allowlist, binary detection, malformed UTF-8, environment/credential exclusions, query length and result-limit normalization.
- Primary CI runs the Bun unit tests before type-check and build.

## Existing test-suite state

An exploratory unfiltered `bun test` run was **not green**: it discovers older test/acceptance scripts that fail on stale API usage (e.g. a removed memory method and VFS mutations rejected by the transaction guard) and provider-network tests that expect credentials or a reachable local provider. CI therefore runs the new focused upload-policy unit test rather than pretending the entire legacy suite passes. Those legacy tests must be separated into deterministic unit, integration, acceptance, and environment-dependent suites, then fixed or explicitly retired with evidence.

## Dependency maintenance

Weekly Dependabot update PRs are configured for both the primary frontend dependency manifest and nested server package. The current nested `npm ci` logs report **20 advisories (1 critical, 16 high, 2 moderate, 1 low)**; the exact package breakdown has not yet been captured. Track this release blocker in [issue #6](https://github.com/KingKenStudios/ANNY/issues/6). Security advisories still need review and remediation; automated update PRs are not proof that all dependencies are safe.

## Important limitations

This is a basic filename/content heuristic, not a complete secrets detector. Users should not upload secrets; a comprehensive secret scanning/redaction layer and end-to-end tests are still needed. Uploaded file buffers and base64 representations are retained in the server's in-memory document map; the new map has a 100-document cap, estimated 128 MiB memory cap, and 1-hour TTL eviction. It remains ephemeral; persistent storage, accurate memory accounting, streaming uploads, and restart behavior require separate work. The RAG backend must be tested for user-isolation, deletion and retention.
