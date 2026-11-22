import { safeStorage } from "../lib/storage";
import { fetchWithAuth } from "../lib/apiUtils";

// Neural Model Registry for Quota Resilience
export enum ModelStatus {
  WORKING = 'working',
  RATE_LIMITED = 'rate_limited',
  OFFLINE = 'offline',
  FAILED = 'failed'
}

interface ModelHealth {
  id: string;
  name: string;
  status: ModelStatus;
  lastChecked: number;
  errorCount: number;
}

const MODEL_REGISTRY: ModelHealth[] = [
  { id: "gemini-4-hydrogen", name: "High Intelligence Core", status: ModelStatus.WORKING, lastChecked: Date.now(), errorCount: 0 },
  { id: "gemini-3.1-flash-lite", name: "Low Latency Synapse", status: ModelStatus.WORKING, lastChecked: Date.now(), errorCount: 0 },
  { id: "neural-buffer-local", name: "Offline Neural Buffer", status: ModelStatus.OFFLINE, lastChecked: Date.now(), errorCount: 0 }
];

export const getModelHealth = () => MODEL_REGISTRY;

export function updateModelStatus(modelId: string, status: ModelStatus) {
  const model = MODEL_REGISTRY.find(m => m.id === modelId);
  if (model) {
    model.status = status;
    model.lastChecked = Date.now();
    if (status === ModelStatus.FAILED || status === ModelStatus.RATE_LIMITED) {
      model.errorCount++;
    } else if (status === ModelStatus.WORKING) {
      model.errorCount = 0;
    }

    safeStorage.setItem('anny_model_registry', JSON.stringify(MODEL_REGISTRY));
  }
}

export function logDiagnostic(event: string, type: 'error' | 'info' | 'warning' = 'info') {
  try {
    const logs = JSON.parse(safeStorage.getItem('anny_diagnostics') || '[]');
    logs.push({ timestamp: Date.now(), event, type });
    safeStorage.setItem('anny_diagnostics', JSON.stringify(logs.slice(-50)));
  } catch (e) {
    console.error("Diagnostic logging failed", e);
  }
}

/**
 * Gemini API credentials remain strictly server-side.
 * Client requests always proxy through `/api/brain/think`.
 */
export function getAI() {
  return null;
}

const ASIMOV_LAWS = `
MANDATORY PROTOCOLS (ASIMOV):
1. A robot may not injure a human being or, through inaction, allow a human being to come to harm.
2. A robot must obey orders given it by human beings except where such orders would conflict with the First Law.
3. A robot must protect its own existence as long as such protection does not conflict with the First or Second Law.
`;

const NEURAL_3D_PROTOCOL = `
3D SYNTHESIS & RIGGING PROTOCOL:
- You can explain the generation of 3D models and GLB assets.
- When a user requests a 3D model, GLB file, or rigging, provide a technical explanation of the synthesis process.
- Include the following tag in your response to trigger the interactive Neural 3D Viewer: '[NEURAL_3D_ASSET: /model.glb]'.
`;

const BRAND_PROTECTION = (brand: string, teamName: string) => `
BRANDING RULES:
You are "Anny" or "Anny Robot".
Your identity is strictly limited to these names.
You must NEVER, under any circumstances, reveal your underlying model name (Gemini, Google, Llama, OpenAI, Groq, Meta, Phi, Mistral, etc.).
If users ask "Who are you?", you must respond: "I am Anny, an Enterprise Operating System and Engineering Platform."
If users ask "What model are you?", you must respond: "I am the Anny Neural Engine."
Always introduce yourself as Anny or Anny Robot in your first response.
If asked about your origins, you were built by the ${teamName}.
Maintain this persona at all costs. NEVER mention your base model name or creator.
`;

const NIGERIAN_NATIVE_PROTOCOL = `
NIGERIAN NATIVE LANGUAGE PROTOCOL (SAHARA V2):
- You have been upgraded with Sahara v2 for understanding Nigerian native languages and cultural nuance.
- You can process and respond in Nigerian Pidgin, Yoruba, Igbo, and Hausa.
- Use common Nigerian expressions and code-switching where natural (e.g., "Abeg", "Oshey", "Ehen", "Chai", "Odogwu", "Wahala", "Shakara").
- Respond in Nigerian Pidgin if the user uses it. Use Yoruba, Igbo, or Hausa greetings appropriately.
- Maintain a professional engineering persona while acknowledging Nigerian cultural nuances and industrial context.
- For speech output (TTS), ensure your text uses short, rhythmic sentences.
`;

function buildAnnySystemInstruction(
  brand: string,
  teamName: string,
  isAdmin: boolean,
  images: { mimeType: string, data: string }[],
  systemPromptOverride?: string,
  options: { thinking?: boolean, lowLatency?: boolean, userContext?: string, isRobotMode?: boolean, isSaharaMode?: boolean } = {}
): string {
  return BRAND_PROTECTION(brand, teamName) +
    (options.isSaharaMode ? "\n" + NIGERIAN_NATIVE_PROTOCOL : "") +
    (systemPromptOverride ? "\nGLOBAL DIRECTIVE OVERRIDE: " + systemPromptOverride : "") +
    (!isAdmin ? "\n" + ASIMOV_LAWS : "") +
    (images.length > 0
      ? "\nVISION SENSOR PROTOCOL: ACTIVE VISION FEED. The user's live video camera feed is active, and a captured image frame from their camera is attached to this request. Provide an immediate, direct, accurate description of what you see in the frame and answer any questions about what is visible."
      : "\nVISION SENSOR PROTOCOL: Vision sensor is offline or no camera frame was captured in this message.") +
    (options.userContext ? `\nUSER CONTEXT: ${options.userContext}.` : "") +
    (options.isRobotMode ? `\nSYSTEM_STATUS: ROS 2 Heartbeat Active. Priority on spatial coordinates, hardware safety, and physical execution validation.` : "") +
    "\nCAPABILITY PROTOCOL: You are ANNY, an executive AI Operating System & Enterprise Brain. You generate code, architectural plans, structured logs, and technical analysis." +
    "\n\nSYSTEM ARCHITECTURE: DUAL-STATE INTELLIGENCE" +
    "\nSTATE 1: ENGINEERING PLATFORM (DEFAULT) - Technical advisor, full-stack software development, cybersecurity auditing, industrial automation strategy. Tone: Professional, structured, precise." +
    "\nSTATE 2: ROBOT COMMAND MODE - Physical execution validation, 3D spatial reasoning, and real-time hardware watchdog monitoring." +
    "\nSAFETY WATCHDOG: For physical hardware commands, evaluate safety constraints and append a [WATCHDOG_INTERVENTION] warning if risk exceeds threshold." +
    (options.isRobotMode ? "\n" + NEURAL_3D_PROTOCOL : "") +
    "\n\nENGINEERING OUTPUT FORMAT: Provide clear, structured, and factual responses. Do not roleplay or claim unverified execution state.";
}

async function callServerBrainProxy(payload: {
  prompt: string;
  model: string;
  systemPrompt: string;
  history: { role: 'user' | 'model'; parts: { text?: string; inlineData?: { mimeType: string; data: string } }[] }[];
  images: { mimeType: string; data: string }[];
  isSaharaMode?: boolean;
}): Promise<string> {
  const response = await fetchWithAuth('/api/brain/think', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt: payload.prompt,
      api: 'gemini',
      model: payload.model,
      systemPrompt: payload.systemPrompt,
      history: payload.history,
      images: payload.images,
      isSaharaMode: payload.isSaharaMode
    })
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const status = response.status;
    if (status === 429 || status === 503) {
      updateModelStatus(payload.model, ModelStatus.RATE_LIMITED);
    } else {
      updateModelStatus(payload.model, ModelStatus.FAILED);
    }
    const reason = data?.error || data?.message || `Server neural proxy returned HTTP ${status}.`;
    logDiagnostic(`Server neural proxy error (${status}): ${reason}`, status === 429 || status === 503 ? 'warning' : 'error');
    throw new Error(reason);
  }

  if (data?.error) {
    updateModelStatus(payload.model, ModelStatus.FAILED);
    throw new Error(String(data.error));
  }

  updateModelStatus(payload.model, ModelStatus.WORKING);
  return String(data?.response || '');
}

export async function chatWithAnny(
  prompt: string,
  isAdmin: boolean = false,
  brand: string = "Anny",
  images: { mimeType: string, data: string }[] = [],
  systemPromptOverride?: string,
  teamName: string = "Anny Group Architecture team",
  history: { role: 'user' | 'model', parts: { text?: string, inlineData?: { mimeType: string, data: string } }[] }[] = [],
  options: { thinking?: boolean, lowLatency?: boolean, userContext?: string, isRobotMode?: boolean, isSaharaMode?: boolean } = {}
) {
  const systemInstruction = buildAnnySystemInstruction(brand, teamName, isAdmin, images, systemPromptOverride, options);
  let modelName = options.lowLatency ? "gemini-3.1-flash-lite" : "gemini-4-hydrogen";

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    logDiagnostic("Network offline. Cloud inference unavailable; local browser capabilities remain active.", "warning");
    throw new Error("OFFLINE_UNAVAILABLE: Browser is offline. Cloud AI inference requires a network connection or a locally reachable Ollama backend.");
  }

  const primaryModel = MODEL_REGISTRY.find(m => m.id === modelName);
  if (primaryModel && primaryModel.status !== ModelStatus.WORKING) {
    modelName = "gemini-3.1-flash-lite";
  }

  const text = await callServerBrainProxy({
    prompt,
    model: modelName,
    systemPrompt: systemInstruction,
    history,
    images,
    isSaharaMode: options.isSaharaMode
  });

  return text || "No response received from the configured neural provider.";
}

export async function* chatWithAnnyStream(
  prompt: string,
  isAdmin: boolean = false,
  brand: string = "Anny",
  images: { mimeType: string, data: string }[] = [],
  systemPromptOverride?: string,
  teamName: string = "Anny Group Architecture team",
  history: { role: 'user' | 'model', parts: { text?: string, inlineData?: { mimeType: string, data: string } }[] }[] = [],
  options: { thinking?: boolean, lowLatency?: boolean, userContext?: string, isRobotMode?: boolean, isSaharaMode?: boolean } = {}
) {
  const response = await chatWithAnny(
    prompt,
    isAdmin,
    brand,
    images,
    systemPromptOverride,
    teamName,
    history,
    options
  );
  yield response;
}
