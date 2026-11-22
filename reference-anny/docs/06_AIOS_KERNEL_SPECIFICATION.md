# ANNY
## OFFICIAL Anny KERNEL SPECIFICATION
**Version:** 1.0.0  
**Status:** Permanent Microkernel Hypervisor & Subsystem Dispatcher Blueprint  
**Author:** Chief Anny Kernel Architect & Principal Systems Engineer  
**Project:** ANNY (Operating System)  

---

## 1. Executive Kernel Summary
The ANNY Microkernel is the central hypervisor of the Operating System. It abstracts hardware, model inference engines, memory platforms, and agent execution swarms into a unified, event-driven operating context. Guided by the permanent constitution **"One AI. One Brain. Unlimited Applications."**, no subsystem or tool invocation is permitted to bypass the Kernel. Every cognitive loop, tool execution, IPC frame, and data mutation is routed through the Kernel event bus and security sandbox.

---

## 2. Architecture Philosophy & Design Principles
- **Microkernel Isolation:** The core kernel retains only minimal essential hypervisor primitives: Process Scheduling, Resource Budgeting, Inter-Process Communication (IPC), Event Bus Dispatch, and Security Sandboxing.
- **Dynamic Module Loading:** All business logic, domain constraints (SCADA, PLC, Software, Healthcare), and execution tools are hot-swappable Domain & Capability Packs registered into the Kernel Service Registry.
- **Fault-Tolerant Resilience:** Subsystem failures (e.g., cloud LLM timeout or plugin crash) trigger automated recovery handlers without halting the core microkernel thread.

---

## 3. High-Level Kernel Architecture Diagram

```
+-----------------------------------------------------------------------------------+
|                            KERNEL HYPERVISOR BOUNDARY                             |
|                                                                                   |
|  +-----------------------------------------------------------------------------+  |
|  |                           KERNEL SERVICE REGISTRY                           |  |
|  +-----------------------------------------------------------------------------+  |
|                                         |                                         |
|  +---------------------+  +---------------------+  +------------------------+  |
|  |  Resource Manager   |  |   Kernel Scheduler  |  |   Security Controller  |  |
|  |  (CPU/GPU/Tokens)   |  |   (Priority FIFO)   |  |    (LOTO / Sandbox)    |  |
|  +---------------------+  +---------------------+  +------------------------+  |
|                                         |                                         |
|  +-----------------------------------------------------------------------------+  |
|  |                     UNIVERSAL KERNEL EVENT BUS (IPC)                        |  |
|  +-----------------------------------------------------------------------------+  |
|         |                     |                     |                    |        |
|         v                     v                     v                    v        |
|  +--------------+     +---------------+     +--------------+     +---------------+|
|  | AI Brain /   |     | Tri-Tier      |     | Multi-Agent  |     | Domain &      ||
|  | Model Router |     | Memory Engine |     | Orchestrator |     | Capability    ||
|  +--------------+     +---------------+     +--------------+     | Packs         ||
|                                                                  +---------------+|
+-----------------------------------------------------------------------------------+
```

---

## 4-7. Kernel Lifecycle & Initialization Sequence

### 4. Kernel Lifecycle States
The Kernel transitions strictly through five lifecycle states:
1. `UNINITIALIZED` -> 2. `BOOTSTRAPPING` -> 3. `READY` -> 4. `EXECUTION_ACTIVE` -> 5. `SHUTTING_DOWN`.

```
[ UNINITIALIZED ]
       |  (Boot invocation)
       v
[ BOOTSTRAPPING ] ──> (Config & Hardware Check) ──> (Registry Initialization)
       |
       v
[     READY     ] <──> [ EXECUTION_ACTIVE ] ──> (Graceful Drain) ──> [ SHUTTING_DOWN ]
```

### 5. Kernel Startup Sequence
1. **Environment & Hardware Verification:** Read `.env.example`, check Node CJS / Python runtime environments, verify GPU/CUDA or Ollama local sockets.
2. **Core Memory & Database Binding:** Initialize PostgreSQL Drizzle ORM connections, connect Redis ephemeral cache client, verify Qdrant vector collection handle.
3. **Service Registry & Event Bus Activation:** Boot internal event bus broker (`KernelEventBus`), register core handlers.
4. **Pack Registration:** Load installed Domain Packs and Capability Packs dynamically from `/src/domain_packs`.
5. **Model Router Handshake:** Probe primary cloud provider endpoints (Gemini, Claude, OpenAI) and local fallback sockets (Ollama/GGUF). Emits `KERNEL_READY` event.

### 6. Kernel Shutdown Sequence
1. Intercept `SIGINT` / `SIGTERM` signals.
2. Freeze queue input; notify active agents via `KERNEL_SHUTTING_DOWN` event.
3. Flush Redis memory buffers and pending telemetry logs to PostgreSQL / ClickHouse.
4. Close persistent database sockets cleanly. Terminate processes with exit code `0`.

---

## 8-20. Kernel Core Managers & Controllers

| Subsystem Manager | Primary Responsibility | Technical Pattern / Strategy |
| :--- | :--- | :--- |
| **8. Service Registry** | Maintains singleton references to all active kernel engines. | Dependency Injection Container; zero global mutation. |
| **9. Resource Manager** | Allocates CPU, RAM, GPU, and LLM token budgets. | Sliding window token bucket algorithm + RAM guardrails. |
| **10. Kernel Scheduler** | Schedules concurrent agent turns and async execution tasks. | Priority-based FIFO queue with deadline timeouts. |
| **11. Event Bus** | Low-latency pub/sub event channel for all IPC messages. | Typed Async Event Emitter (sub-5ms propagation). |
| **12. IPC Layer** | Connects UI WebSocket clients, background workers, and agents. | Structured JSON-RPC / Protobuf frame protocol. |
| **13. State Manager** | Tracks real-time global state tree of the workspace. | Immutable snapshot store with atomic diff updates. |
| **14. Context Manager** | Assembles prompt context under strict token budget limits. | Dynamic RAG chunk stitching + context compression. |
| **15. Session Manager** | Validates user JWT claims and tracks active WebSocket sockets. | Ephemeral Redis key index with auto-TTL expiration. |
| **16. Config Manager** | Parses environment variables and `metadata.json` configs. | Zod schema validation on application boot. |
| **17. Plugin Loader** | Hot-swaps extension modules safely inside sandboxes. | Dynamic ESM/CJS loader with capability verification. |
| **18. Domain Pack Loader** | Registers industry-specific prompt constraints and rules. | Structural validator checking `IDomainPack` contracts. |
| **19. Capability Loader** | Registers execution tools (Code, OCR, Vision, TTS). | Tool schema validation + permission check wrapper. |
| **20. Security Controller**| Enforces LOTO rules, input sanitization, and sandboxing. | Regex prompt sanitizer + digital signature verifier. |

---

## 21-30. Universal Kernel Event Bus Specification

The Kernel Event Bus publishes typed system events across all layers:

```typescript
export type AnnyKernelEventType =
  // Task Lifecycle
  | 'TASK_CREATED'
  | 'TASK_SCHEDULED'
  | 'TASK_COMPLETED'
  | 'TASK_FAILED'
  // Model Router
  | 'MODEL_SELECTED'
  | 'MODEL_FALLBACK_TRIGGERED'
  | 'MODEL_INFERENCE_FAILED'
  // Memory & Knowledge
  | 'MEMORY_CONTEXT_UPDATED'
  | 'KNOWLEDGE_RAG_INDEXED'
  // Workflow & Agent
  | 'WORKFLOW_STARTED'
  | 'WORKFLOW_STEP_COMPLETED'
  | 'AGENT_STATE_CHANGED'
  // Build & Deploy
  | 'BUILD_STARTED'
  | 'BUILD_COMPLETED'
  | 'DEPLOY_STARTED'
  | 'DEPLOY_SUCCESS'
  // Industrial Safety
  | 'LOTO_VERIFICATION_REQUESTED'
  | 'LOTO_SAFETY_APPROVED'
  | 'SECURITY_ALERT_TRIGGERED';
```

---

## 31-40. Resource Management & Security Architecture

### Resource Allocation Budget Rules
- **Token Budgeting:** Default limit of 200,000 tokens per workspace session. Triggers context compression when context reaches 80% limit.
- **Hardware Tier Routing:**
  - *LOW-END (<8GB RAM):* Route to `tinyllama` / `phi4-mini` GGUF local models.
  - *MID-RANGE (8-16GB RAM):* Route to `llama3.2` / `qwen2.5`.
  - *HIGH-END (>16GB RAM + CUDA):* Route to `llama3.3` or primary Cloud API cascade (Gemini 2.5 Pro / Claude 3.7).

### Security & Sandbox Controls
- **Prompt Injection Defense:** User text is sanitized against command execution patterns and wrapped in strict `<untrusted_user_input>` XML tags.
- **Digital Lockout/Tagout (LOTO):** Modbus/SCADA write signals require dual-key verification tokens before execution.
- **Zero Client Secret Exposure:** All API keys remain isolated in Node server-side memory (`process.env`).

---

## 41-50. API, Telemetry & Performance Targets

### Performance SLA Targets
- **Kernel Event Dispatch Latency:** <2 ms.
- **Local Model Dispatch Latency:** <50 ms.
- **Context RAG Chunk Retrieval:** <15 ms.
- **UI WebSockets Telemetry Frame Rate:** 60 FPS updates.

---

## Kernel Certification Checklist
Before any Kernel version release is deployed to production, it MUST pass this certification suite:

- [ ] **1. Constitution Compliance:** Zero hardcoded model bindings; strict model-agnostic hypervisor architecture verified.
- [ ] **2. Lifecycle Verification:** Boot, execution, and graceful shutdown sequence pass 100% integration tests.
- [ ] **3. Event Bus Performance:** Sub-5ms event propagation confirmed under 1,000 req/sec load.
- [ ] **4. Resource Guardrails:** Memory leak check verified; automatic context compression triggers at 80% context window capacity.
- [ ] **5. Security Audit:** Prompt injection filters active; LOTO safety protocol active for hardware execution routes.
- [ ] **6. Build Verification:** `npm run lint` passes with 0 errors; TypeScript `npm run build` succeeds without type errors.
