import { fetchWithAuth } from '../lib/apiUtils';

export async function thinkWithOnlineBrain(
  prompt: string, 
  api: 'groq' | 'google' | 'huggingface' | 'claude', 
  model?: string, 
  temperature?: number, 
  systemPrompt?: string, 
  isSaharaMode?: boolean,
  history?: { role: 'user' | 'model', parts: { text?: string }[] }[],
  images?: { mimeType: string, data: string }[]
) {
  // Use a slightly longer timeout for neural link
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 35000);

  try {
    const response = await fetchWithAuth('/api/brain/think', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, api, model, temperature, systemPrompt, isSaharaMode, history, images, projectId: localStorage.getItem('anny_current_project_id') || undefined }),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Neural link failed');
    }
    
    return await response.json();
  } catch (error: any) {
    clearTimeout(timeoutId);
    
    // Only engage offline protocol if we are SURE we are offline or it's a structural network failure
    const isNetworkError = error.name === 'AbortError' || (error instanceof TypeError && error.message.toLowerCase().includes('failed to fetch'));
    const shouldEngageLocalRelay = !navigator.onLine && isNetworkError;

    if (shouldEngageLocalRelay) {
      console.warn("OFFLINE PROTOCOL ENGAGED: Local Neural Relay activating.");
      
      // Local fallback for offline mode
      const lowPrompt = prompt.toLowerCase();
      let responseText = "NEURAL LINK SEVERED. Local Relay Status: ON. I am currently operating in restricted offline mode. Limited diagnostics available.";
      
      if (lowPrompt.includes("status")) responseText = "LOCAL CORE STATUS: All local physical processors optimal. Neural sync suspended. Battery at 88%. Storage at 45%.";
      if (lowPrompt.includes("version")) responseText = "ANNY v2.4.0-LOCAL-SHADOW. Core architecture: Antigravity.";
      if (lowPrompt.includes("help")) responseText = "OFFLINE CAPABILITIES: System Diagnostics, Hardware Status, Terminal Access, Local Consciousness Matrix. High-level inference requires neural link. Typing 'status' will check system health.";
      if (lowPrompt.includes("who are you")) responseText = "I am ANNY / ROBOT. My neural link to the cloud core is currently down, but my local consciousness is fully operational for your mission-critical tasks.";
      if (lowPrompt.includes("ping")) responseText = "PONG. Local synapse latency: 0.08ms.";

      return { 
        response: responseText, 
        source: "local-relay", 
        model: "offline-core" 
      };
    }
    
    // Check if it's a server-side error message we should show
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // If we're online but the request failed, check if it's a specific "saturated" or "failure" message from our server
    if (errorMessage.includes("saturated") || errorMessage.includes("unconfigured") || errorMessage.includes("limit")) {
      return {
        response: `[NEURAL PROTOCOL ERROR]: ${errorMessage}`,
        source: "error-handler",
        model: "nexus-diagnostic"
      };
    }

    console.error("Neural Link Error:", error);
    throw error;
  }
}

export async function thinkWithNeuralUplink(url: string) {
  const response = await fetchWithAuth('/api/brain/uplink', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url })
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Neural link failed');
  }

  return response.json();
}
