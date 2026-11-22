# ANNY Current Forensic Baseline

This file replaces historical phase claims. It is not a runtime certification and must not be used to claim that a capability is available unless the live environment verifies it.

## Canonical application path

App → Anny → AnnyApp → AnnyWorkspace.

Normal ANNY conversation and project generation use one client submission path and `POST /api/anny/pipeline`.

## Project generation truth

Fresh builds receive a unique project workspace and generation ID. Historical VFS seed files and the canned ecommerce fallback were removed. A build is successful only when the model returns real project files that pass the generation contract.

Application builds are expected to include a real browser frontend and, unless the user explicitly requests static/frontend-only output, a real backend implementation and deployment configuration.

## Preview truth

The Preview pane executes the active project's VFS through `StandalonePreviewRunner`. Missing dependencies and compiler/runtime failures are surfaced as errors. No mock application is used as a successful preview.

## Conversation truth

Normal responses are passed through the canonical natural-conversation formatter. Decorative Markdown is removed from ordinary conversation, while requested code and structured technical output are preserved.

## Voice truth

Female ANNY is the default conversational voice. The speaker button uses Male ANNY. Users can select the default conversational voice under Settings. Nigerian-language TTS is isolated behind a language router and does not modify unrelated languages.

## Security truth

No built-in administrator password is present. No generated source should contain credentials. Local secret storage requires an environment-provided vault password.

## Runtime verification still required

A static audit cannot prove camera hardware access, GPU availability, external provider availability, or third-party model quality. Those must be tested in the target deployment environment.
