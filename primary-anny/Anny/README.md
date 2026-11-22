<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/d75888bd-341e-4403-bc06-f8d51526c143

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## 3D Model Generation (image → 3D mesh, real local AI)

3D generation uses the bundled `modly-main/` engine (open-source, runs locally on your GPU) — not a cloud API. It's a separate process from the main app.

**One-time setup:**
```bash
npm run modly:setup
```
This creates a Python virtual environment in `modly-main/api/.venv` and installs the FastAPI backend's dependencies. The first actual generation run will additionally download the AI model weights from Hugging Face (several GB) — this requires a GPU and internet access, and only happens once.

**Start it (in a separate terminal, alongside `npm run dev`):**
```bash
npm run modly:start
```
This runs the engine at `http://127.0.0.1:8765`. The main app's server proxies `/api/modly/*` requests to it automatically. You can check `GET /api/modly/health` to see whether it's reachable.

**Using it:** open the 3D Generator (Neural Lab) panel and upload a photo — it's sent to the local engine for real image-to-3D reconstruction, then rendered with animation/orbit controls once ready. Text-only prompts (no image) instead use an optional cloud fallback (Meshy) if you set `MESHY_API_KEY` in `.env.local` — there is no simulated/fake result if neither is configured; you'll get an honest error telling you what to set up.

**Note:** I configured and verified the server-side wiring against the engine's real API contract (`modly-main/api/routers/generation.py`), and confirmed every endpoint fails honestly with no engine running. I was not able to run actual GPU inference in this environment — no GPU is available here and Hugging Face's model-weight host isn't reachable from this sandbox. The first real end-to-end generation should be tested on your machine.
