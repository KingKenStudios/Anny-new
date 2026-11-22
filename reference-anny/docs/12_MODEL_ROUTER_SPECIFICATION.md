# ANNY
## OFFICIAL ENTERPRISE MODEL ROUTER SPECIFICATION
**Version:** 1.0.0  
**Status:** Permanent Provider-Agnostic Model Routing & Hardware-Aware Cascade Blueprint  
**Author:** Chief AI Model Architect & Principal Inference Systems Engineer  
**Project:** ANNY (Operating System)  

---

## 1. Executive Model Router Summary
The ANNY Enterprise Model Router is the central inference orchestration subsystem of the Operating System. Managed directly by the Anny Kernel and serving the AI Brain, Runtime Engine, and Multi-Agent Swarm Platform, the Model Router decouples higher-level cognitive code from specific AI providers.

No subsystem or agent within Anny is permitted to call an AI model directly. Every prompt completion, tool call, embedding generation, or multimodal stream is routed through the Model Router. Adhering strictly to the master constitution **"One AI. One Brain. Unlimited Applications."**, the Model Router dynamically balances tasks across local offline models (Ollama, GGUF, ONNX) and cloud provider cascades (Google Gemini, Anthropic Claude, OpenAI, DeepSeek, Qwen) based on latency targets, hardware limits, cost, and privacy policies.

---

## 2. Model Router Architecture Diagram

```
+-----------------------------------------------------------------------------------+
|                        AI BRAIN & AGENT SWARM INFERENCE REQUEST                   |
+-----------------------------------------------------------------------------------+
                                         │
                                         ▼
+-----------------------------------------------------------------------------------+
|                            MODEL ROUTER FACADE API                                |
|          (Context Compression, Token Budgeting & Security Sanitizer)              |
+-----------------------------------------------------------------------------------+
                                         │
                                         ▼
+-----------------------------------------------------------------------------------+
|                         ROUTING DECISION ENGINE (MCDA)                            |
|     (Evaluates Task Complexity, Hardware Tier, Latency, Privacy & Token Quotas)    |
+-----------------------------------------------------------------------------------+
                                         │
     ┌───────────────────────────────────┴───────────────────────────────────┐
     │                                                                       │
     ▼                                                                       ▼
+─────────────────────────────────────────+ +─────────────────────────────────────────+
|      LOCAL INFERENCE ROUTE (OFFLINE)    | |       CLOUD PROVIDER CASCADE (ONLINE)   |
| ─────────────────────────────────────── | | ─────────────────────────────────────── |
| • Ollama Local Sockets                  | | • Tier 1: Gemini 2.5 Pro / Flash        |
| • GGUF Models (tinyllama, llama3.2)     | | • Tier 2: Claude 3.7 Sonnet / Haiku     |
| • Local ONNX / CUDA Tensor Engines      | | • Tier 3: OpenAI GPT-4o / DeepSeek-V3   |
+─────────────────────────────────────────+ +─────────────────────────────────────────+
     │                                                                       │
     └───────────────────────────────────┬───────────────────────────────────┘
                                         │
                                         ▼
+-----------------------------------------------------------------------------------+
|                         CIRCUIT BREAKER & FALLBACK HANDLER                        |
|             (Automatic Retry, Jitter Backoff & Fallback Balancing)                |
+-----------------------------------------------------------------------------------+
                                         │
                                         ▼
+-----------------------------------------------------------------------------------+
|                     STREAMING & TELEMETRY MONITORING CONSOLE                      |
|            (Real-time Token Consumption, Cost Tracking & Latency Metrics)         |
+-----------------------------------------------------------------------------------+
```

---

## 3. High-Level Subsystem Matrix (1-50)

| # | Subsystem Engine | Primary Responsibility | Architectural Implementation Mechanism |
| :--- | :--- | :--- | :--- |
| **1** | **Router Overview** | Central gateway for all AI model completions. | Unified facade interface (`IModelRouter`). |
| **2** | **Router Philosophy** | Provider-agnostic; zero hardcoded vendor dependencies.| Dynamic driver plugin architecture. |
| **3** | **Routing Engine** | Evaluates criteria and selects optimal model per turn. | Multi-Criteria Decision Analysis (MCDA) matrix. |
| **4** | **Model Registry** | Central catalog of available local & cloud models. | Dynamically refreshed JSON/TS model catalog. |
| **5** | **Provider Registry** | Manages API keys, endpoints, and socket descriptors.| Encrypted provider connection pool. |
| **6** | **Capability Registry**| Maps model capabilities (Vision, Audio, Coding, RAG). | Strongly typed model feature flag matrix. |
| **7** | **Model Discovery** | Probes local Ollama ports and cloud API health. | Background heartbeats probing endpoints. |
| **8** | **Dynamic Routing** | Re-routes live requests based on real-time latency. | Real-time sliding window latency tracker. |
| **9** | **Policy Engine** | Enforces privacy policies, LOTO, and token limits. | Policy rule evaluation assertions. |
| **10** | **Cost Optimizer** | Minimizes cloud API costs by leveraging local models.| Cost-per-token threshold calculator. |
| **11** | **Latency Optimizer** | Routes time-sensitive tasks to high-speed models. | SLA latency constraint matcher. |
| **12** | **Quality Optimizer** | Routes complex architecture tasks to top-tier LLMs. | Reasoning score evaluator (>95% threshold). |
| **13** | **Privacy Optimizer** | Keeps sensitive data strictly on local GGUF models.| Data sensitivity classifier filter. |
| **14** | **Hardware Optimizer**| Detects RAM/GPU availability and allocates models. | Hardware tier detector (Low/Mid/High). |
| **15** | **Context Window** | Validates prompt length against model token limits. | Dynamic token counter & boundary checker. |
| **16** | **Token Manager** | Enforces 200K workspace token budgets. | Sliding window token bucket limiter. |
| **17** | **Prompt Optimizer** | Reformats prompts to match model-specific templates.| XML/Markdown template formatter. |
| **18** | **Prompt Compression**| Trims redundant context while preserving core facts. | Semantic token pruning algorithm. |
| **19** | **Streaming Manager** | Pipes streaming tokens to WebSocket UI clients. | Native ReadableStream transformer. |
| **20** | **Parallel Inference**| Executes multiple model completions in parallel. | Async `Promise.all` model swarm executor.|
| **21** | **Ensemble Execution** | Blends outputs from multiple models for consensus. | Majority voting & agreement evaluator. |
| **22** | **Fallback Manager** | Triggers fallback models upon primary API failure. | Multi-tier fallback cascade handler. |
| **23** | **Retry Manager** | Handles transient network errors with exponential backoff.| Jittered backoff retry loop (Max 3 retries).|
| **24** | **Circuit Breaker** | Trips failing API providers to avoid wasting budget.| Standard Circuit Breaker state machine. |
| **25** | **Health Monitoring**| Tracks uptime, error rate, and response latencies. | Prometheus-compatible metrics collector. |
| **26** | **Benchmark Engine** | Continuously evaluates model accuracy on standard tasks.| Automated evaluation test suite runner. |
| **27** | **Eval Framework** | Measures alignment with AGENTS.md guidelines. | Rubric-based LLM-as-a-judge scorer. |
| **28** | **Accuracy Scoring** | Scores model factual precision on RAG queries. | Grounded citation accuracy evaluator. |
| **29** | **Coding Score** | Evaluates generated code against TypeScript compiler.| Automated `tsc --noEmit` build validator. |
| **30** | **Reasoning Score** | Evaluates mathematical and logic reasoning depth. | Multi-step logic verification checker. |
| **31** | **Creativity Score** | Evaluates design layout & UI concept generation. | Aesthetic design rule checker. |
| **32** | **Vision Capability** | Manages multi-modal image & screenshot ingestion. | Base64 / URL image payload parser. |
| **33** | **Audio Capability** | Manages speech-to-text (STT) and text-to-speech (TTS).| Web Audio API & TTS synthesizer integration. |
| **34** | **Video Capability** | Processes multi-frame video sequence inputs. | Keyframe extraction transformer. |
| **35** | **Embedding Models**| Generates 1536-dim vectors for Qdrant storage. | Vector embedding pipeline runner. |
| **36** | **Reranking Models** | Re-ranks RAG candidate chunks prior to prompt build.| Cross-encoder re-ranker model interface.|
| **37** | **Function Calling** | Transforms structured tools into model-native schemas.| JSON Schema tool call serializer. |
| **38** | **Tool Calling** | Dispatches model tool calls to sandboxed handlers. | Permission-gated tool dispatcher. |
| **39** | **Model Sandboxing** | Prevents prompt injection attacks from hijacking models.| Untrusted XML input tag wrapper. |
| **40** | **Security Policies**| Enforces LOTO safety and secret protection rules. | Regex credential scrubbing filter. |
| **41** | **Secrets Management**| Manages API keys securely in Node server memory. | Encrypted process environment proxy. |
| **42** | **Rate Limiting** | Prevents exceeding provider API rate limits (RPM/TPM).| Token bucket rate-limiter daemon. |
| **43** | **Quota Management**| Tracks monthly enterprise API budget caps. | Database quota tracker with alerting. |
| **44** | **Billing Abstraction**| Calculates cost per inference turn across providers.| Token pricing model ledger. |
| **45** | **Router APIs** | Express endpoints for router administration (`/api/router`).| REST & WebSocket administration routes. |
| **46** | **Router SDK** | TypeScript client SDK for custom router integrations.| Typed client library (`AnnyRouterSDK`). |
| **47** | **Router CLI** | Terminal command for routing diagnostics & benchmarks.| Commander.js CLI runner (`anny-anny router`).|
| **48** | **Analytics Dashboard**| Visual dashboard displaying real-time model metrics.| UI workspace telemetry charts. |
| **49** | **Future Expansion** | Support for custom fine-tuned GGUF local models. | Dynamic model descriptor plugin loader. |
| **50** | **Certification** | Enterprise model router validation audit suite. | Certification audit checklist. |

---

## 4. Hardware-Aware Routing Decision Engine (MCDA)

The Routing Decision Engine scores candidate models using a Multi-Criteria Decision Analysis (MCDA) function:

$$\text{Score}(M) = w_q \cdot Q(M) - w_c \cdot C(M) - w_l \cdot L(M) + w_p \cdot P(M)$$

Where:
- $Q(M)$: Quality & Reasoning score for requested task domain (0.0 to 1.0).
- $C(M)$: Estimated monetary cost per 1K tokens.
- $L(M)$: Normalized expected response latency in seconds.
- $P(M)$: Privacy score (1.0 for local offline models, 0.2 for public cloud APIs).

### Hardware Tier Allocation Matrix

```
+-----------------------------------------------------------------------------------+
|                        HARDWARE TIER & MODEL ROUTING TABLE                        |
+-----------------------------------------------------------------------------------+
| Hardware Tier  | Primary Local Model Engine   | Cloud Fallback Cascade Target     |
+----------------+------------------------------+-----------------------------------+
| LOW-END        | • tinyllama (GGUF)           | • Gemini 2.5 Flash / Claude Haiku |
| (<8GB RAM)     | • phi4-mini (Local)          | • DeepSeek-V3 API                 |
+----------------+------------------------------+-----------------------------------+
| MID-RANGE      | • llama3.2 (8B GGUF)         | • Gemini 2.5 Pro                  |
| (8-16GB RAM)   | • qwen2.5 (7B Local)         | • Claude 3.7 Sonnet               |
+----------------+------------------------------+-----------------------------------+
| HIGH-END       | • llama3.3 (70B Quant)       | • Primary Cloud API Cascade:      |
| (>16GB + CUDA) | • deepseek-coder (Local CUDA)|   1. Gemini 2.5 Pro               |
|                |                              |   2. Claude 3.7 Sonnet            |
|                |                              |   3. OpenAI GPT-4o                |
+-----------------------------------------------------------------------------------+
```

---

## 5. Standard Model Profiles per Task Domain

| Domain Profile | Target Models | Special Capabilities Required |
| :--- | :--- | :--- |
| **Software Architecture** | Gemini 2.5 Pro, Claude 3.7 Sonnet | Deep context window (200K+), Structural reasoning. |
| **Frontend Code Generation**| Claude 3.7 Sonnet, Gemini 2.5 Flash | High coding score, Tailwind design pattern compliance. |
| **Backend & Database** | DeepSeek-Coder, Gemini 2.5 Pro | Drizzle ORM syntax, SQL optimization, type safety. |
| **SCADA & Industrial Safety**| Qwen2.5 (Local), Llama 3.2 (Local) | Zero cloud latency, offline stability, LOTO enforcement.|
| **Fast Auto-Completion** | Local GGUF (`phi4-mini`), Gemini Flash| Sub-100ms response time, low token latency. |
| **RAG Embeddings** | `text-embedding-3-small`, Ollama Nomic | 1536-dimensional dense vector embeddings. |

---

## Model Router Certification Checklist
Before any Model Router update is approved for merge in ANNY, it MUST pass this certification suite:

- [ ] **1. Provider Agnosticism:** Router functions seamlessly without reliance on any single cloud provider.
- [ ] **2. Offline Failover:** Disconnecting external internet automatically routes tasks to local Ollama / GGUF sockets without crash.
- [ ] **3. Fallback Resilience:** Simulating 429 / 500 errors on primary API cleanly cascades to secondary fallback models within 500ms.
- [ ] **4. Circuit Breaker:** Repeated provider failures trip circuit breaker and suspend failing endpoints for 60 seconds.
- [ ] **5. Typecheck & Code Audits:** 100% of code generated via routed models passes `tsc --noEmit` validation.
- [ ] **6. Build Verification:** `npm run lint` and `npm run build` complete cleanly with 0 errors.
