# ANNY Forensic Repair Continuation — 2026-09-03

## Scope
Continued from ANNY_FORENSIC_REPAIRED_2026-09-03.zip. The source archive was treated as authoritative; previous AI claims were not trusted.

## Repairs made

### 1. Microphone transcript lifecycle
- Each explicit microphone session starts with a fresh transcript buffer.
- Starting a new microphone session clears the previous transcript instead of reusing stale speech.
- Final speech segments are accumulated only within the current session.
- Interim recognition text is displayed without becoming permanent duplicate input.

### 2. Four-second voice auto-submit
- Once speech has produced usable transcript text, a 4-second silence timer is armed.
- Any subsequent speech resets the timer.
- After 4 seconds without speech, the current transcript is submitted exactly once through the existing single ANNY submission lock.
- The recognition session is stopped before submission.

### 3. ANNY speech echo prevention
- ANNY's canonical voice service now emits `anny:speech-start` and `anny:speech-end` lifecycle events.
- Microphone recognition is hard-stopped whenever ANNY begins speaking.
- Recognition refuses incoming results while ANNY audio is active.
- This prevents ANNY's own spoken response from becoming the next user prompt.
- The visual voice-wave component no longer opens a second microphone stream. SpeechRecognition is the single authoritative microphone capture path.

### 4. Camera robustness
- Camera availability is checked before getUserMedia.
- Existing camera tracks are stopped before retrying, preventing stale streams.
- The returned video track is validated and monitored for `ended` state.
- The video element is explicitly started where possible.
- Capture requires a live video track and usable video readiness before producing a frame.
- Camera failure remains an honest runtime error; no fake image or mock vision result is introduced.

### 5. Voice selection
- The existing canonical ANNY voice role remains the single persisted preference.
- Female selection is used for automatic speech and speaker-button playback.
- Male selection is used for automatic speech and speaker-button playback.
- Nigerian TTS receives the same selected voice role.
- The stale settings description claiming that the speaker button always uses Male was corrected.

### 6. Navigation cleanup
- Removed the obsolete Prompt Library item from the primary slide menu.
- Core product surfaces remain available: Chats, Projects, Session History, AI Agents, Knowledge, Memory, Models, Tools, Integrations, Settings.
- No verification/phase test pages were added to the user-facing menu.

### 7. Database safety
- No database schema or data store was replaced during this continuation repair.
- Existing provider-independent infrastructure remains intact: PostgreSQL, Redis, Qdrant, RabbitMQ, MinIO, ClickHouse, and Ollama.
- The repair deliberately avoids destructive migrations or changes that could invalidate existing data.

## Verification limits
The archive contains no `node_modules` directory. `npm ci` was attempted but timed out in this execution environment. Therefore dependency-backed `tsc`, Vite build, and browser hardware tests cannot honestly be certified here.

A source-level TypeScript run was performed, but its output is dominated by missing dependency/type-package errors caused by the absent installation. No additional syntax error specific to the changed microphone/voice/camera regions was surfaced by that run.

## Required deployment verification
After installing dependencies on a normal development/deployment machine:

```bash
npm ci
npm run lint
npm run build
```

Then perform browser acceptance tests:
1. Start microphone, speak, stop, start again; confirm the second session contains only new speech.
2. Speak a prompt, remain silent for 4 seconds; confirm exactly one submission.
3. Enable auto-speech; confirm ANNY's own speech never becomes a new user prompt.
4. Test Female selected with automatic response and speaker button; both must use Female.
5. Test Male selected with automatic response and speaker button; both must use Male.
6. Enable camera, confirm live preview, submit a vision question, confirm one current frame reaches the pipeline.
7. Deny camera permission, retry, and confirm an honest permission state rather than a fabricated vision response.
8. Build two different applications and confirm each preview executes its own canonical VFS.
