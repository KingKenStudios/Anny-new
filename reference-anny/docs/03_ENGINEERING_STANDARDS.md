# ANNY
## ENGINEERING STANDARDS & HANDBOOK
**Version:** 1.0.0  
**Status:** Permanent Engineering Baseline  
**Author:** Engineering Leadership Team & Chief Architect  
**Project:** ANNY (Operating System)  

---

## 1. Engineering Philosophy
Engineering at ANNY is governed by precision, modularity, resiliency, and long-term maintainability. We write production-ready code from day one. Every module, interface, and execution engine must adhere strictly to the principle: **"One AI. One Brain. Unlimited Applications."**

---

## 2-7. Core Software Engineering Principles

| Principle | Core Directive | Best Practices | Common Mistakes to Avoid |
| :--- | :--- | :--- | :--- |
| **2. Engineering Principles** | Decouple interfaces from concrete implementations. | Use Hexagonal Ports & Adapters; keep logic testable without network. | Hardcoding direct vendor SDK calls in business logic. |
| **3. Clean Code** | Code is written primarily for human readability. | Clear naming, small focused functions (<30 lines), explicit typing. | Clever one-liners that obscure functional intent. |
| **4. SOLID Principles** | SRP, OCP, LSP, ISP, DIP strictly enforced. | Single responsibility per file; rely on abstractions, not implementations. | Massive 1000+ line controllers handling state, UI, and DB. |
| **5. DRY (Don't Repeat Yourself)** | Abstract common domain patterns into reusable helpers. | Share core types and math/string utilities via central `/lib` or domain packages. | Copy-pasting model parsing or vector math logic across components. |
| **6. KISS (Keep It Simple, Stupid)** | The simplest working solution is the superior solution. | Prefer direct, readable linear control flows over over-engineered abstractions. | Creating 5 layers of factory wrappers for a simple status lookup. |
| **7. YAGNI (You Aren't Gonna Need It)** | Implement strictly what is specified in the requirements. | Build for current spec with clear extension points; do not speculate features. | Adding unused speculative database columns or speculative config flags. |

---

## 8-15. Architecture & Structural Standards
- **8. Domain-Driven Design (DDD):** Ubiquitous language across codebase. Bounded contexts separate Domain Packs (PLC, SCADA, Software, Finance) from Core Kernel logic.
- **9. Clean Architecture:** Dependencies point inward. Domain models at center -> Use Cases -> Adapters -> Infrastructure (DB, Web, Model Router).
- **10. Hexagonal Architecture:** Ports define interfaces (e.g., `IMemoryStore`); Adapters implement them (e.g., `QdrantVectorAdapter`, `RedisCacheAdapter`).
- **11. Microkernel Rules:** Microkernel handles process lifecycle, IPC event bus, and security boundaries. All business features MUST be plugins or Domain Packs.
- **12. Module Design:** Every module must expose an explicit `index.ts` public interface; private internals MUST NOT be directly imported by outer modules.
- **13. Plugin Development:** Plugins implement `IAnnyPlugin` interface, declare capabilities, and hook into event bus lifecycle safely.
- **14. Package Organization:** Monorepo/modular layout separating `/src/components`, `/src/lib`, `/src/services`, `/docs`, `/domain_packs`.
- **15. Folder Structure:**

```
/src
  ├── assets/          # Static assets & web media
  ├── components/      # Modular React UI components (Tailwind CSS)
  ├── services/        # Subsystem engines (Brain, Model Router, Agent, Memory)
  ├── domain_packs/    # Domain specific prompts, rules & validators
  ├── capability_packs/# Feature execution modules (Code, OCR, Vision, TTS)
  ├── lib/             # Shared utilities, math, crypto & formatters
  ├── types/           # Strict TypeScript interfaces, types, & enums
  ├── db/              # Database schemas, migrations & connection clients
/docs                  # Permanent Architectural & Requirements Documentation
```

---

## 16-25. Naming & Configuration Standards

| Target | Convention | Example | Rule |
| :--- | :--- | :--- | :--- |
| **16. Variables** | camelCase | `activeAgentId`, `tokenCount` | Descriptive nouns; no single letter names except loop counters. |
| **17. Functions** | camelCase (verb prefix) | `executeModelRouting()`, `sanitizeInput()` | Imperative verbs describing exact outcome. |
| **18. Classes** | PascalCase | `ModelRouter`, `AgentScheduler` | Nouns; clear single responsibility. |
| **19. Interfaces** | PascalCase (prefix `I` optional) | `IIntelligenceEngine`, `AgentState` | Abstract behavioral contracts. |
| **20. Files** | PascalCase for UI (`.tsx`), camelCase for modules (`.ts`) | `AnnyChat.tsx`, `modelRouter.ts` | Filename must match primary export. |
| **21. APIs** | kebab-case | `/api/v1/model-router/dispatch` | Plural nouns for resources, standard REST verbs. |
| **22. Databases** | snake_case | `user_accounts`, `execution_logs` | Plural table names, clear relational foreign keys. |
| **23. Env Vars** | UPPER_SNAKE_CASE | `GEMINI_API_KEY`, `POSTGRES_URL` | Defined in `.env.example`, loaded server-side only. |
| **24. Config** | camelCase JSON/TS | `anny.config.ts`, `metadata.json` | Explicit typed schemas; validated on boot. |

---

## 26-30. Formatting & Documentation
- **26. Code Formatting:** Enforced via Prettier & ESLint (`npm run lint`). 2 spaces indent, semicolon required, single quotes for strings.
- **27. Documentation Standards:** All public functions and classes MUST include JSDoc comments detailing parameters, return values, and exceptions.
- **28. Comment Standards:** Comments explain *WHY*, not *WHAT*. Avoid stating the obvious.
- **29. Markdown Rules:** Standard GFM markdown. Consistent heading hierarchy, clean tables, explicit code block syntax highlighting.
- **30. Architecture Docs:** Every major architectural change MUST update `/docs/02_SYSTEM_ARCHITECTURE.md` prior to code merging.

---

## 31-38. Git Workflow & Review Process
- **31. Branch Strategy:** `main` (production baseline), `feature/*` (new capabilities), `fix/*` (bug fixes), `release/*` (prepared tags).
- **32. Commit Messages:** Conventional Commits: `feat(kernel): add model fallback cascade`, `fix(chat): fix autoscroll lock`.
- **33. Versioning Strategy:** Semantic Versioning (`MAJOR.MINOR.PATCH`). Zero breaking changes on MINOR/PATCH updates.
- **34. Pull Request Standards:** Small PRs (<400 lines), green automated CI lint/compile, 1+ approval requirement.
- **35. Definition of Done:** Code compiled, lint clean, tests passing, PRD & Architecture docs updated, security audit verified.

---

## 39-46. Testing & Quality Assurance
- **39. Unit Testing:** 80%+ coverage target for core kernel math, prompt parsers, and tool routers.
- **40. Integration Testing:** End-to-end API & model fallback cascades verified against mock/live adapters.
- **41. End-to-End (E2E):** Workspace UI rendering, AI Chat streaming, and Code Builder workflow verified in staging containers.
- **42. Performance Testing:** Response latency benchmarks (<50ms TTFB for cached RAG, <100ms for local model dispatch).
- **43. Security Testing:** Automated static analysis (SAST), secret scanning, and prompt injection injection suites.
- **44. AI Evaluation:** Continuous benchmark of model output accuracy, hallucination rate (<2%), and tool call execution success.

---

## 47-51. Observability, Logging & Telemetry
- **47. Logging:** Structured JSON logs containing `timestamp`, `level` (`INFO`/`WARN`/`ERROR`), `traceId`, `service`, and `payload`.
- **48. Monitoring:** Real-time metrics tracking CPU, memory heap, LLM token throughput, and API latency.
- **49. Tracing:** Distributed OpenTelemetry span tracking across API Gateway -> Microkernel -> Model Router -> Database.

---

## 52-67. Security, Safety & Sandbox Rules
- **52. Input Sanitization:** All incoming user input and external payloads MUST pass regex injection filters before prompt assembly.
- **53. Prompt Injection Protection:** System instructions are isolated in system context roles; user inputs wrapped in untrusted boundaries.
- **54. Industrial SCADA Safety:** Actions involving hardware or SCADA controllers require explicit Lockout/Tagout (LOTO) token confirmation.
- **55. Sandbox Isolation:** Code execution MUST occur in sandboxed containers with restricted network, filesystem, and privilege access.
- **56. Secrets Management:** Zero raw secret storage in git repositories. Secrets read from process environment variables only.

---

## 68-75. Storage, API & Performance Standards
- **68. PostgreSQL:** Primary transactional DB using Drizzle ORM. Prepared statements for all queries; explicit index creation.
- **69. Redis Caching:** Ephemeral key storage with TTL set on all cache entries. Semantic caching for identical model queries.
- **70. REST & WebSockets:** REST for CRUD state operations; WebSockets for low-latency streaming LLM text and telemetry feeds.
- **71. Concurrency:** Asynchronous non-blocking event loop execution. Parallel execution for independent tool calls (`Promise.all`).

---

## 76-92. Language & Technology Guidelines

| Language / Tech | Primary Role | Mandatory Rules & Standards |
| :--- | :--- | :--- |
| **TypeScript** | Core UI & Node Services | Strict mode enabled (`noImplicitAny: true`); named imports; standard enums. |
| **Python** | Local AI & ML Pipelines | Type hints mandatory (`typing`); PEP 8 compliance; docstrings per module. |
| **React / Vite** | Developer Workspace UI | Functional components + hooks only; Tailwind utility classes; Framer Motion. |
| **Express / Node** | API Gateway & Middleware | CJS compilation via esbuild (`dist/server.cjs`); explicit port 3000 host `0.0.0.0`. |
| **SQL** | Database Persistence | Capitalized keywords (`SELECT`, `JOIN`); explicit indexing; migration scripts. |

---

## 93-98. AI Agent & Memory Engineering Standards
- **93. Model Agnosticism:** Never import provider SDKs directly into feature code. Call model operations via `ModelRouter`.
- **94. Memory Management:** Short-term memory uses sliding context windows; long-term memory uses dense vector embeddings with metadata filtering.
- **95. Agent Workflows:** Autonomous agent loops MUST feature max step counters (max 10 iterations) to prevent infinite reasoning loops.

---

## 99. Enterprise Checklist
Before deploying any release of ANNY, the build MUST pass:
- [x] Zero TypeScript compilation errors (`npm run build`).
- [x] Zero ESLint warnings or errors (`npm run lint`).
- [x] All environment variables declared in `.env.example`.
- [x] Security audit: Zero un-sanitized shell inputs or hardcoded credentials.
- [x] Architectural compliance: Aligned with Constitution, PRD, and Architecture docs.

---

## 100. Anny Engineering Commandments
1. **Thou shalt maintain One Brain for Unlimited Applications.**
2. **Thou shalt build offline-first with local execution supremacy.**
3. **Thou shalt never expose API keys or secrets to the browser client.**
4. **Thou shalt isolate business domain rules into Domain Packs.**
5. **Thou shalt enforce strict industrial safety and Lockout/Tagout protocols.**
6. **Thou shalt write clean, fully-typed, well-documented code.**
7. **Thou shalt never break backward compatibility for existing applications.**
8. **Thou shalt validate, sanitize, and audit every prompt and tool execution.**
9. **Thou shalt log, trace, and monitor every cognitive subsystem.**
10. **Thou shalt uphold ANNY as a world-class enterprise technology platform.**

---

## Anny Engineering Checklist
Use this checklist during code review prior to merge:
- [ ] Code compiles cleanly via `compile_applet` / `npm run build`.
- [ ] Code satisfies `lint_applet` / `npm run lint` with zero errors.
- [ ] All public functions, classes, and types are documented with clear types.
- [ ] Inputs are sanitized and prompt injection protection is active.
- [ ] Model operations use `ModelRouter` with fallback capability.
- [ ] No secrets or keys are committed to source control or exposed in frontend code.
- [ ] Unit & integration test cases are written and passing.
- [ ] The change is fully backward compatible with past releases.
