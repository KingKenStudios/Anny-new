# ANNY — ENTERPRISE LIVE DEVELOPMENT & PREVIEW PLATFORM SPECIFICATION (V6.0)
**Document Identifier:** `/docs/17_LIVE_DEVELOPMENT_PREVIEW_PLATFORM_SPECIFICATION.md`  
**Parent Framework:** ANNY Master Constitution  
**Standard Compliance:** Project Digital Twin Standard (PDTS-v1.0), OpenAPI 3.1, W3C ARIA 1.2  
**Status:** Permanent Specification — Live Engineering & Preview Subsystem  

---

## EXECUTIVE SUMMARY & MISSION

The **ANNY Enterprise Live Development & Preview Platform (V6.0)** provides real-time, zero-latency visual rendering, incremental compilation, interactive DOM inspection, hot module replacement, and natural-language component editing across all software applications synthesized within ANNY.

Unifying capabilities found in Google AI Studio, Replit, Cursor, VS Code, Figma Dev Mode, and Chrome DevTools into a single cohesive subsystem, the Live Development & Preview Platform allows engineers and AI agents to continuously observe, inspect, debug, test, compare, and deploy applications in real-time. Changes written by developers or streamed by autonomous AI agents reflect instantly in the live preview with visual state preservation.

---

## LIVE PREVIEW & SANDBOX ARCHITECTURE DIAGRAM

```
+---------------------------------------------------------------------------------------------------+
|                                 ANNY VISUAL EDITOR & CANVAS                              |
|          (Natural-Language Direct Point & Click Component Editor, Visual Diff Viewer)             |
+---------------------------------------------------------------------------------------------------+
                                                  |
                                                  v
+---------------------------------------------------------------------------------------------------+
|                                 1. INCREMENTAL COMPILER & BUILD ENGINE                            |
|   +--------------------------+  +--------------------------+  +-------------------------------+   |
|   | Fast Refresh Manager     |  | Hot Reload Manager (HMR) |  | Incremental AST Bundler       |   |
|   +--------------------------+  +--------------------------+  +-------------------------------+   |
+---------------------------------------------------------------------------------------------------+
                                                  |
                                                  v
+---------------------------------------------------------------------------------------------------+
|                                   2. ISOLATED RUNTIME SANDBOX                                     |
|   +--------------------------+  +--------------------------+  +-------------------------------+   |
|   | Secure Browser Sandbox   |  | Container Runtime Engine |  | Mock API & Database Proxy     |   |
|   +--------------------------+  +--------------------------+  +-------------------------------+   |
+---------------------------------------------------------------------------------------------------+
                                                  |
                                                  v
+---------------------------------------------------------------------------------------------------+
|                               3. MULTI-DEVICE PREVIEW & INSPECTOR MATRIX                          |
|  +------------------------+  +------------------------+  +-------------------------------------+  |
|  | Component & DOM Inspect|  | State & Store Inspector|  | Network & API Inspector             |  |
|  | (Click-to-Prompt AI)   |  | (Redux/Zustand/Context)|  | (REST, GraphQL, gRPC Tracing)       |  |
|  +------------------------+  +------------------------+  +-------------------------------------+  |
|  +------------------------+  +------------------------+  +-------------------------------------+  |
|  | Multi-Device Viewports |  | Visual Regression      |  | Time-Travel Debugger                |  |
|  | (Mobile, TV, Watch)    |  | (Before/After Diff)    |  | (State Rollback Engine)             |  |
|  +------------------------+  +------------------------+  +-------------------------------------+  |
+---------------------------------------------------------------------------------------------------+
                                                  |
                                                  v
+---------------------------------------------------------------------------------------------------+
|                             4. CONTINUOUS DEPLOYMENT PREVIEW PIPELINE                             |
|   +--------------------------+  +--------------------------+  +-------------------------------+   |
|   | Digital Twin Inspector   |  | One-Click Staging/Prod   |  | Automated Rollback Safety     |   |
|   +--------------------------+  +--------------------------+  +-------------------------------+   |
+---------------------------------------------------------------------------------------------------+
```

---

## SUBSYSTEM SPECIFICATIONS (1 THROUGH 50)

### 1. Platform Overview
Provides instant, real-time previewing, stateful hot-reloading, interactive component selection, and autonomous AI debugging for web, mobile, desktop, backend API, and industrial SCADA interfaces.

### 2. Preview Engine
High-throughput rendering engine that runs within an isolated, sandboxed iframe environment, handling client-side SPA state updates, server-side SSR preview streams, and canvas webGL outputs.

### 3. Build Engine
Sub-second compilation pipeline powered by Vite, Esbuild, and SWC, ensuring code changes are built and served in <100ms.

### 4. Incremental Compiler
Only recompiles modified AST nodes and dependent modules, avoiding full application rebuilds during active agent generation sessions.

### 5. Hot Reload Manager
Intelligently swaps modified code modules in memory without triggering full page reloads, preserving client state and form inputs.

### 6. Fast Refresh Manager
Ensures React/Vue/Svelte component state is retained across code updates, rendering modified UI elements instantly without resetting navigation position.

### 7. Multi-Device Preview
Simulates multiple device form factors concurrently with accurate pixel density, touch events, and viewport boundaries.

### 8. Desktop Preview
Renders responsive desktop resolutions (1024px, 1440px, 1920px, 4K Ultrawide) with cursor hover feedback and multi-window split views.

### 9. Tablet Preview
Simulates iPad, Android tablet, and Surface Pro dimensions with orientation switching (Portrait / Landscape).

### 10. Mobile Preview
Simulates modern mobile devices (iPhone 15/16 Pro, Pixel 8/9, Galaxy S24) with touch gesture emulation, notch safe areas, and mobile keyboard overlays.

### 11. Foldable Preview
Emulates dual-screen and foldable devices (Galaxy Z Fold, Pixel Fold) with dynamic hinge angle triggers and posture transitions.

### 12. TV Preview
Simulates smart TV interface viewports (1080p / 4K) with d-pad remote control focus navigation and high-contrast spatial distance rules.

### 13. Watch Preview
Emulates smartwatch displays (Apple Watch, WearOS) with circular/rectangular screen clipping, crown scrolling, and compact touch target verification.

### 14. Responsive Engine
Fluid viewport resizing control enabling continuous drag-to-resize, breakpoint highlighting, and media query stress-testing.

### 15. Browser Sandbox
Restricts execution of preview code to safe cross-origin isolated contexts, preventing previewed code from leaking credentials or escaping container bounds.

### 16. Runtime Sandbox
Isolated process sandbox for backend microservices and databases, executing server routes safely alongside previewed frontend interfaces.

### 17. Component Inspector
Point-and-click component selector allowing users to inspect prop values, CSS styles, component hierarchy, and trigger direct AI prompt edits on selected elements.

### 18. DOM Inspector
Full-featured tree view of rendered DOM elements with real-time attribute editing, computed style inspection, and event listener mapping.

### 19. CSS Inspector
Visual style editor providing live tweaking of Tailwind utility classes, CSS variables, flexbox/grid alignments, and color palettes.

### 20. State Inspector
Deep inspection tool for global application state (Zustand, Redux, React Context, Pinia) with state tree editing and time-travel replay.

### 21. API Inspector
Captures outgoing HTTP/gRPC/WebSocket requests from the preview iframe, displaying request payloads, headers, response status, and latency.

### 22. Database Inspector
Previews real-time database query results, database schema migrations, and generated seed records within the active preview environment.

### 23. Network Inspector
Simulates network conditions (Offline, 3G Slow, 4G, High Latency, Packet Loss) to verify application resilience under realistic network constraints.

### 24. Storage Inspector
Inspects and modifies client-side storage keys in real-time, including `localStorage`, `sessionStorage`, `IndexedDB`, and HTTP Cookies.

### 25. AI Debugger
Autonomous error detection engine that intercepts unhandled runtime exceptions, analyzes stack traces, and proposes single-click fixes.

### 26. Error Intelligence
Categorizes runtime failures (SyntaxError, TypeError, NetworkError, CORS policy, SCADA safety trips) and links them to exact source code lines.

### 27. Stack Trace Analyzer
Maps compiled runtime error stack traces back to original TypeScript/Python source files using sourcemap resolution.

### 28. Performance Profiler
Measures frame rates (FPS), main thread blocking time, React component re-render frequencies, and JS heap allocations.

### 29. Memory Profiler
Detects memory leaks, un-detached DOM nodes, uncleared timers, and growing event listener counts during preview execution.

### 30. CPU Profiler
Visualizes CPU flame charts and function call durations, highlighting computationally expensive routines for AI optimization.

### 31. GPU Profiler
Tracks WebGL canvas render cycles, shader compilation times, and GPU memory usage for 3D graphics and robotics visualizations.

### 32. Bundle Analyzer
Visualizes production JavaScript bundle asset sizes, identifying heavy third-party packages and tree-shaking opportunities.

### 33. Lighthouse Integration
Automates Google Lighthouse audits within the preview window, scoring Performance, Accessibility, Best Practices, and SEO.

### 34. Accessibility Analyzer
Scans active DOM elements for WCAG 2.1 AA violations, displaying visual highlight overlays for low-contrast text and missing ARIA labels.

### 35. SEO Analyzer
Validates page title tags, meta descriptions, OpenGraph image tags, canonical URLs, and structured JSON-LD data.

### 36. Visual Regression
Compares visual rendering across code commits, highlighting pixel deltas with a side-by-side visual diff slider.

### 37. Screenshot Engine
Captures full-page, element-specific, or multi-device viewport screenshots for documentation and bug reporting.

### 38. Video Recording
Records interactive preview sessions with mouse movements and click events for automated bug reproduction.

### 39. Time Travel Debugging
Allows developers and AI agents to step backward and forward through past UI states, action dispatches, and code checkpoints.

### 40. Live Collaboration
Multi-user preview sessions where multiple team members can view, inspect, and interact with the same live preview instance simultaneously.

### 41. Preview Sharing
Generates secure, shareable preview URLs (e.g. `https://ais-pre-xyz.cloudrun.app`) for client reviews and stakeholder testing.

### 42. Preview Security
Enforces OAuth scope limits, token sanitization, and strict CORS headers on all preview deployment URLs.

### 43. Deployment Preview
Creates ephemeral feature-branch preview environments that automatically deploy upon pull request creation.

### 44. Rollback Preview
Allows instantaneous one-click rollbacks of live preview states to any previous stable build checkpoint.

### 45. Preview APIs
REST and WebSocket APIs for programmatically manipulating preview viewports, triggering screenshots, and retrieving diagnostic logs.

### 46. Preview SDK
Client library for embedding preview controls, component highlighters, and feedback widgets into custom enterprise applications.

### 47. Preview CLI
Command-line tool (`anny-preview`) for initiating local preview proxy tunnels and running automated visual regression tests in CI/CD.

### 48. Preview Analytics
Tracks user interaction patterns, session durations, error frequencies, and performance metrics across preview deployments.

### 49. Future Evolution
Prepared for spatial computing previews (Vision Pro / AR), hardware-in-the-loop (HIL) robotics simulation, and neural feedback loops.

### 50. Certification Checklist
A mandatory 10-point audit checklist verifying build speed, rendering accuracy, accessibility, and security before release.

---

## SEQUENCE DIAGRAM: POINT-AND-CLICK AI COMPONENT EDITING

```
User Action                      Preview Engine          Component Inspector       AI Agent Matrix         Incremental Compiler
    |                                  |                         |                        |                         |
    |-- Click Component in Preview --->|                         |                        |                         |
    |                                  |-- Resolve DOM Node ---->|                        |                         |
    |                                  |   & Component ID        |-- Prompt Input Box --->|                         |
    |-- Enter "Make button cyan" ------>|                         |   + Context Metadata   |                         |
    |                                  |                         |                        |-- Generate AST Edit --->|
    |                                  |                         |                        |                         |-- Recompile & HMR ----> Live Render Update
```

---

## DATABASE SCHEMA (Preview Sessions & Visual Snapshots)

```sql
-- Live Preview Sessions Table
CREATE TABLE anny_preview_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL,
    session_key VARCHAR(100) UNIQUE NOT NULL,
    environment VARCHAR(50) DEFAULT 'DEVELOPMENT', -- DEVELOPMENT, STAGING, PREVIEW
    active_viewport VARCHAR(50) DEFAULT 'DESKTOP',
    preview_url VARCHAR(512) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Visual Regression Snapshots Table
CREATE TABLE anny_visual_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES anny_preview_sessions(id) ON DELETE CASCADE,
    commit_hash VARCHAR(64) NOT NULL,
    viewport_type VARCHAR(50) NOT NULL,
    image_url VARCHAR(512) NOT NULL,
    dom_snapshot JSONB NOT NULL,
    accessibility_score INT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- AI Debugger Exception Logs Table
CREATE TABLE anny_preview_errors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES anny_preview_sessions(id) ON DELETE CASCADE,
    error_message TEXT NOT NULL,
    stack_trace TEXT NOT NULL,
    source_file VARCHAR(512),
    line_number INT,
    suggested_fix TEXT,
    is_resolved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

---

## PREVIEW PLATFORM API SPECIFICATION

### API Endpoint: Execute Point-and-Click AI Component Edit
`POST /api/v6/preview/component-edit`

**Request Body:**
```json
{
  "sessionKey": "prev-session-98421",
  "componentId": "src/components/Auth.tsx:Button:42",
  "userInstruction": "Change button background to cyan-600 with smooth scale-95 active state and ARIA label",
  "currentProps": {
    "variant": "primary",
    "children": "Login to Anny"
  }
}
```

**Response Body:**
```json
{
  "status": "SUCCESS",
  "modifiedFile": "src/components/Auth.tsx",
  "patchChecksum": "e9a2b8417c823",
  "compilationTimeMs": 48,
  "hmrApplied": true,
  "affectedComponent": "AuthButton"
}
```

---

## Live Development & Preview Platform Certification Checklist

Every instance of the Live Development & Preview Platform must pass this 10-point audit checklist:

1. [x] **Sub-100ms Incremental Compilation:** Code edits compile and reflect in live preview in under 100 milliseconds.
2. [x] **Stateful Hot Module Replacement (HMR):** Component state and form inputs persist seamlessly across code edits.
3. [x] **Point-and-Click Component Selection:** Users can click any element in live preview to trigger direct natural-language AI edits.
4. [x] **Multi-Device Viewport Emulation:** Desktop, tablet, mobile, foldable, TV, and watch layouts emulate accurately.
5. [x] **Autonomous AI Exception Interceptor:** Captures runtime errors, resolves sourcemaps, and outputs single-click fixes.
6. [x] **Full DevTools Inspection Suite:** Includes Component, DOM, CSS, State, API, Database, Network, and Storage inspectors.
7. [x] **WCAG 2.1 AA Accessibility Audit:** Automated Lighthouse & ARIA scanners highlight accessibility violations visually.
8. [x] **Time-Travel Debugging & Visual Diff:** Supports stepping through historical UI states and visual before/after comparison.
9. [x] **Cross-Origin Sandbox Isolation:** Preview iframe operates safely within isolated origin policies with zero credential leaks.
10. [x] **One-Click Deployment Pipeline:** Smooth promotion of verified preview builds to Staging and Production Cloud Run containers.

---
*Certified by ANNY Master Architecture Council — Version 6.0*
