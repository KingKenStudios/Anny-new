# ANNY Brain Forensic Map — 2026-09-03

ANNY is one cognitive system, not a collection of independent chat bots.

## Cognitive flow

Input → modality normalization → session/context resolution → intent classification → decision classification → capability/permission checks → model routing → reasoning/plan → tool/action execution → verification → memory update → natural response → optional speech.

## Continuity rules

- User turns are authoritative instructions.
- Assistant/model outputs are context and evidence, never new user commands.
- Pronouns and continuation phrases resolve against the active session and project.
- A topic shift creates a new conversational intent without destroying prior memory.
- A project continuation keeps the current VFS/project unless the user explicitly requests a new project.
- Build, modify, repair, chat, media, and control actions use the same cognitive context rather than independent prompt interpreters.

## Deep decision rule

ANNY performs a compact cognitive preflight before action: understand the current request, compare it with recent context, identify the target, preserve explicit constraints, choose the appropriate capability, and verify the result. Internal reasoning is not exposed as chain-of-thought.

## Multimodal rule

Microphone, camera, images, documents, audio, video, URLs, code, and screen context are inputs to the same cognitive session. Speech output must never be fed back into microphone recognition.

## Application factory rule

A build request follows: understand → plan → generate frontend → generate backend → database/schema → APIs → authentication → storage → business logic → run → preview real code → test → repair → verify → persist → deploy when requested.

## Memory rule

Working memory, session memory, persistent project/codebase memory, vector knowledge memory, and procedural memory must reinforce the same session identity.

## Ecosystem rule

Keda, KenPay, Voom, King Ken Studio, robotics, industrial systems, and future applications consume ANNY capabilities through controlled APIs. They are applications of the ANNY intelligence layer, not separate brains.

## Language rule

Universal language handling remains unchanged for non-Nigerian languages. Nigerian pronunciation specialization is isolated to Nigerian language speech payloads and must not mutate displayed text or unrelated language pipelines.
