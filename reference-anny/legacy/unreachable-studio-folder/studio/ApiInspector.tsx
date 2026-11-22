import React, { useState } from 'react';
import { Network, Send, Play, CheckCircle2, AlertCircle, Clock, ShieldCheck, RefreshCw, FileText } from 'lucide-react';
import { WorkspaceManager } from '../../core/workspaceManager';

export interface ApiEndpoint {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  description: string;
  authRequired: boolean;
  samplePayload?: string;
}

export const ApiInspector: React.FC = () => {
  const wsManager = WorkspaceManager.getInstance();
  const activeWs = wsManager.getCurrentWorkspace();

  const endpoints: ApiEndpoint[] = [
    { method: 'GET', path: '/api/config', description: 'Sovereign OS Brand config & hardware mode', authRequired: false },
    { method: 'GET', path: '/api/health', description: 'System liveness, uptime & active keys probe', authRequired: false },
    { method: 'GET', path: '/api/admin/health', description: 'Administrator telemetry and health check', authRequired: true },
    { method: 'POST', path: '/api/brain/think', description: 'AI Neural model reasoning (Groq/Gemini/HF/Claude)', authRequired: false, samplePayload: '{\n  "prompt": "Test system ping",\n  "api": "google"\n}' },
    { method: 'POST', path: '/api/brain/uplink', description: 'Web URL neural ingestion and web scraper', authRequired: false, samplePayload: '{\n  "url": "https://news.ycombinator.com"\n}' },
    { method: 'POST', path: '/api/sahara/translate', description: 'Native language translation engine', authRequired: false, samplePayload: '{\n  "text": "Hello world",\n  "from": "English",\n  "to": "Pidgin"\n}' },
    { method: 'POST', path: '/api/sahara/tts', description: 'Text-to-Speech voice audio synthesizer', authRequired: false, samplePayload: '{\n  "text": "Anny System Online",\n  "voice": "en_male_1"\n}' },
    { method: 'POST', path: '/api/vision/analyze', description: 'Camera frame and image analysis pipeline', authRequired: false, samplePayload: '{\n  "prompt": "Analyze visual scene",\n  "image": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="\n}' },
    { method: 'POST', path: '/api/modly/generate', description: '3D Mesh neural generation trigger', authRequired: false, samplePayload: '{\n  "prompt": "Industrial Robot Drone"\n}' },
    { method: 'GET', path: '/api/modly/status/modly_test', description: '3D Mesh generation status query', authRequired: false },
    { method: 'POST', path: '/api/create-subscription', description: 'Enterprise billing subscription tier connector', authRequired: true, samplePayload: '{\n  "planId": "enterprise_pro",\n  "billingPeriod": "monthly"\n}' }
  ];

  const [selectedEndpoint, setSelectedEndpoint] = useState<ApiEndpoint>(endpoints[0]);
  const [requestBody, setRequestBody] = useState<string>(selectedEndpoint.samplePayload || '{}');
  const [response, setResponse] = useState<{ status: number; latencyMs: number; data: any } | null>(null);
  const [isSending, setIsSending] = useState(false);

  const handleSendRequest = async () => {
    setIsSending(true);
    const start = Date.now();
    try {
      const options: RequestInit = {
        method: selectedEndpoint.method,
        headers: { 'Content-Type': 'application/json' }
      };

      if (selectedEndpoint.method !== 'GET' && requestBody) {
        options.body = requestBody;
      }

      const res = await fetch(selectedEndpoint.path, options);
      const latencyMs = Date.now() - start;
      let data: any;
      try {
        data = await res.json();
      } catch (err) {
        data = { rawText: await res.text() };
      }

      setResponse({
        status: res.status,
        latencyMs,
        data
      });
    } catch (err: any) {
      setResponse({
        status: 500,
        latencyMs: Date.now() - start,
        data: { error: err.message || 'Fetch request failed' }
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="h-full w-full bg-[#080a18] text-slate-200 flex flex-col font-sans overflow-hidden">
      {/* Header */}
      <div className="p-3 border-b border-white/10 bg-[#0d0f22] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Network className="w-4 h-4 text-cyan-400" />
          <h3 className="font-bold text-xs text-white uppercase tracking-wider font-mono">API & Router Endpoint Inspector</h3>
        </div>
        <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded">
          Express / Vite Route Matcher Active
        </span>
      </div>

      <div className="flex-1 min-h-0 flex overflow-hidden">
        {/* Left: Endpoint List */}
        <div className="w-72 border-r border-white/10 p-3 bg-[#0a0c1a] flex flex-col font-mono text-xs">
          <div className="text-slate-400 font-bold mb-3 text-[10px] uppercase tracking-wider flex items-center justify-between">
            <span>REGISTERED ENDPOINTS</span>
            <RefreshCw className="w-3 h-3 text-slate-500 hover:text-white cursor-pointer" />
          </div>

          <div className="space-y-1.5 flex-1 overflow-y-auto custom-scrollbar">
            {endpoints.map((ep) => (
              <button
                key={ep.path}
                onClick={() => {
                  setSelectedEndpoint(ep);
                  setRequestBody(ep.samplePayload || '{}');
                }}
                className={`w-full text-left p-2.5 rounded-xl border transition-all space-y-1 ${
                  selectedEndpoint.path === ep.path
                    ? 'bg-cyan-500/20 border-cyan-500/40 text-white'
                    : 'bg-[#101228] border-white/5 text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                    ep.method === 'GET' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-purple-500/20 text-purple-300'
                  }`}>
                    {ep.method}
                  </span>
                  {ep.authRequired && <span className="text-[9px] text-amber-400 font-mono">AUTH</span>}
                </div>
                <p className="font-bold text-xs text-cyan-300 truncate">{ep.path}</p>
                <p className="text-[10px] text-slate-400 truncate">{ep.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Right: Request Builder & Response Inspector */}
        <div className="flex-1 p-4 flex flex-col bg-[#080915] overflow-y-auto custom-scrollbar space-y-4 font-mono text-xs">
          {/* Endpoint Banner */}
          <div className="p-3 bg-[#0e1024] border border-white/10 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`px-2 py-1 rounded text-xs font-bold ${
                selectedEndpoint.method === 'GET' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-purple-500/20 text-purple-300'
              }`}>
                {selectedEndpoint.method}
              </span>
              <span className="font-bold text-white text-sm">{selectedEndpoint.path}</span>
            </div>

            <button
              onClick={handleSendRequest}
              disabled={isSending}
              className="px-4 py-1.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-bold rounded-lg flex items-center gap-1.5 shadow-lg transition-all"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSending ? 'Dispatching...' : 'Send Request'}</span>
            </button>
          </div>

          {/* Request Payload */}
          {selectedEndpoint.method !== 'GET' && (
            <div className="space-y-2 bg-[#0a0c1a] p-3 rounded-xl border border-white/10">
              <span className="font-bold text-white text-xs block">Request Body (JSON)</span>
              <textarea
                value={requestBody}
                onChange={(e) => setRequestBody(e.target.value)}
                rows={4}
                className="w-full bg-[#060712] border border-white/10 rounded-lg p-2.5 text-xs text-cyan-300 outline-none focus:border-cyan-500/40"
              />
            </div>
          )}

          {/* Response Inspector */}
          {response && (
            <div className="p-3 bg-[#0a0c1a] border border-white/10 rounded-xl space-y-2">
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white">Response Payload</span>
                  <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-400 font-bold">
                    HTTP {response.status} OK
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-cyan-400" /> Latency: {response.latencyMs} ms
                </span>
              </div>

              <pre className="p-3 bg-[#050610] border border-white/5 rounded-lg text-emerald-400 text-xs overflow-x-auto">
                {JSON.stringify(response.data, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
