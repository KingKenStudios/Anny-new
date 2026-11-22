# ANNY Brain Forensic Repair V3 — 2026-09-03

This release continues from ANNY_FORENSIC_REPAIRED_2026-09-03_V2 and concentrates on making the cognitive layer authoritative instead of adding another independent assistant path.

## 1. One brain, one context

The Cognitive Kernel now resolves session context before intent classification. The current user turn is evaluated together with recent user turns, recent assistant/model context, active project state, VFS references, editor targets, corrections, and continuation signals.

Assistant/model output is explicitly treated as context/evidence, never as a new user command.

## 2. Continuation and topic changes

ANNY now distinguishes:
- continuation of the same conversation,
- continuation of the current project,
- a new topic,
- a new build,
- a project modification/repair.

This prevents phrases such as “continue”, “make it better”, “fix it”, “now add the backend”, and “what about something else?” from being interpreted as unrelated fresh prompts when the context clearly indicates otherwise.

## 3. Cognitive preflight

Before execution, the kernel performs a compact decision preflight using intent evaluation and decision classification. It selects the action class and preserves constraints before execution. This is a structured control decision and does not expose private chain-of-thought.

## 4. Conversation history

The normal conversation provider receives recent user and assistant turns with their roles preserved, followed by the current user turn. This makes multi-turn conversation coherent while preventing assistant output from being treated as a user instruction.

## 5. Project continuity

The workspace request classifier now recognizes contextual project modification language and continuation signals. A request such as “make it responsive” or “continue the backend” keeps the active project when a project exists instead of accidentally creating a fresh application.

## 6. Universal file drop

The application root now accepts dragged files from any ANNY page. Files dropped while another page is open are held safely until the chat workspace is active, then attached to the current task. This prevents file drops from disappearing simply because the user was on Projects, History, Models, Settings, or another page.

## 7. Multimodal architecture

The existing architecture remains aligned with the ANNY map: microphone → VAD/recognition → intent understanding → reasoning → action → TTS, with camera, images, documents, audio, video, URLs, code and UI available as multimodal inputs.

## 8. ANNY application factory

The cognitive contract remains: understand → plan → frontend → backend → database/schema → APIs → authentication → storage → business logic → run → real preview → test → repair → verify → persist → deploy when requested.

## 9. Memory architecture

The intended memory hierarchy remains working memory, session memory, persistent project/codebase memory, vector knowledge memory and procedural memory. The project/session identity must remain consistent across those layers.

## 10. AIOS and ecosystem

ANNY remains the central intelligence and application factory. AIOS is the operating environment. Keda, KenPay, Voom, King Ken Studio, robotics, industrial systems and future applications are consumers of ANNY capabilities through controlled interfaces rather than independent brains.

## 11. Nigerian language isolation

Nigerian pronunciation specialization remains isolated from the universal language system. Yoruba, Hausa, Igbo, Nigerian Pidgin and Nigerian English processing must not mutate unrelated language text or speech behavior. True native-level pronunciation still requires an actual high-quality language-specific speech model and appropriate data; browser locale selection alone cannot honestly guarantee perfection.

## 12. Verification limitation

This environment does not contain the project's installed npm dependency tree. `npm ci` could not complete within the execution limit, so a complete dependency-backed production build cannot honestly be certified here. Source changes were inspected directly and the archive is generated from the V2 project with these repairs applied.
