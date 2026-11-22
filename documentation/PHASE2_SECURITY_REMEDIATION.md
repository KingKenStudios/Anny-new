# Phase 2 security hardening — source archive endpoint

## Change made

The authenticated `POST /api/anny/source/rebuild-upload` endpoint now:
- limits the ZIP upload to 10 MiB;
- rejects archives with more than 200 entries;
- selects at most 100 supported text source files;
- rejects paths that are absolute, drive-qualified, contain parent traversal, or NUL;
- excludes `node_modules`, `.git`, and all `.env` / `.env.*` files (including example files, because those may contain real values);
- checks JSZip's reported uncompressed size before reading a selected entry (1 MiB per file and 5 MiB aggregate);
- checks actual UTF-8 byte length after reading as a second guard.

## Additional exposure closed in this PR

Two diagnostic endpoints previously had no authentication middleware: `/api/system/metrics` (host CPU/RAM totals and process uptime) and `/api/system/ollama` (local model discovery/probe). Both now require a verified ANNY identity. Guest sessions remain subject to the normal authenticated-session checks; verify intended guest access in integration tests.

## Why

Before the change, a 50 MiB in-memory ZIP upload could contain up to 500 selected files, and each entry was fully decompressed before the content was truncated to 20,000 characters. This creates a resource-exhaustion risk from large or highly compressed inputs and could send populated environment files to the configured AI provider.

## Static route review snapshot

A static pass over the Express registrations found the following endpoints without route-level auth middleware that are intentionally/conditionally public or must be verified individually:

- `/api/config`, `/api/health`: basic service/configuration indicators.
- `/api/auth/guest`, `/api/auth/logout`: session bootstrap and logout; logic must be tested against abuse and revocation.
- `/api/admin/session`, `/api/admin/verify`, `/api/admin/logout`: identity/session logic is handled inside these route bodies, not by middleware.
- `/api/v1/anny/integrations/keda/status`: reports only whether integration credentials are configured.
- `/api/infrastructure/openapi`: public schema document.
- `/api/modly/health`: service status endpoint.
- `GET *`: SPA fallback.

The KEDA command route performs token verification and role permission checks inside its handler. This static review is not a proof of route security; the route-level auth matrix and negative tests remain required.

## Remaining risks / verification required

- JSZip is not a streaming archive parser. The ZIP metadata-based checks reduce exposure but do not prove protection against malicious archive metadata or decompression edge cases. Consider moving archive inspection to a streaming, isolated worker/process before production.
- Route-level integration tests are still required for malformed ZIPs, traversal names, archive entry counts, compressed/uncompressed-size abuse, owner authorization, provider payload redaction, and rate limits.
- This patch intentionally does not change other upload routes; their size/memory limits and persistence/ownership behavior require separate review.
- Build and CI results are pending for this branch. No claim of production-ready security is made.

## Validation

Review the PR CI workflow and server build results before merging.
