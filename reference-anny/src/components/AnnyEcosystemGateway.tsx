import React, { useState, useEffect } from 'react';
import { safeFetchJson } from '../lib/apiUtils';
import { motion, AnimatePresence } from 'motion/react';
import {
  Globe, ShieldCheck, Zap, Key, Cpu, Network, Database, Layers, Play, Check,
  AlertTriangle, Copy, Terminal, Server, Bot, Activity, Lock, RefreshCw, Plus,
  Radio, Car, Plane, Music, ShoppingBag, Landmark, ArrowRight, ShieldAlert, Code2
} from 'lucide-react';

export interface EnterpriseProfile {
  id: string;
  name: string;
  category: string;
  description: string;
  status: 'ACTIVE' | 'STANDBY' | 'MAINTENANCE';
  capabilityPacks: string[];
  apiKeyCount: number;
  totalRequestsCount: number;
  dataIsolationLevel: 'STRICT_TENANT' | 'SHARED_VAULT' | 'AIR_GAPPED';
  lastActive: string;
}

export interface ControlLevel {
  level: number;
  name: string;
  description: string;
  status: 'OPERATIONAL' | 'INTERLOCKED' | 'SIMULATION_ONLY';
  activeNodeCount: number;
  safetyInterlockActive: boolean;
  lotoStatus: 'DISENGAGED' | 'LOCKED_OUT';
  authorizedRoles: string[];
}

export function AnnyEcosystemGateway() {
  const [activeTab, setActiveTab] = useState<'enterprises' | 'api_explorer' | 'control_hierarchy' | 'agents' | 'offline_matrix'>('enterprises');
  const [enterprises, setEnterprises] = useState<EnterpriseProfile[]>([]);
  const [controlHierarchy, setControlHierarchy] = useState<ControlLevel[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [offlineMatrix, setOfflineMatrix] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Modal / Action state
  const [selectedCompany, setSelectedCompany] = useState<EnterpriseProfile | null>(null);
  const [actionPackName, setActionPackName] = useState('CorePack');
  const [actionName, setActionName] = useState('feed_generate');
  const [actionParams, setActionParams] = useState('{\n  "amount": 250,\n  "currency": "USD"\n}');
  const [actionResult, setActionResult] = useState<any>(null);
  const [actionExecuting, setActionExecuting] = useState(false);

  // Api Key Gen state
  const [newKeyCompanyId, setNewKeyCompanyId] = useState('keda');
  const [generatedKeyResult, setGeneratedKeyResult] = useState<string | null>(null);

  // Intelligence Query state
  const [intelQuery, setIntelQuery] = useState('Analyze ISO 20022 payment message and verify fraud risk for KenPay');
  const [intelResult, setIntelResult] = useState<any>(null);
  const [intelLoading, setIntelLoading] = useState(false);

  const [copiedKey, setCopiedKey] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [entRes, ctrlRes, agentRes, keyRes, offRes] = await Promise.all([
        safeFetchJson('/api/v1/anny/enterprises'),
        safeFetchJson('/api/v1/anny/control-hierarchy'),
        safeFetchJson('/api/v1/anny/agents'),
        safeFetchJson('/api/v1/anny/keys'),
        safeFetchJson('/api/v1/anny/offline-matrix')
      ]);

      if (entRes.data?.enterprises) setEnterprises(entRes.data.enterprises);
      if (ctrlRes.data?.levels) setControlHierarchy(ctrlRes.data.levels);
      if (agentRes.data?.agents) setAgents(agentRes.data.agents);
      if (keyRes.data?.keys) setApiKeys(keyRes.data.keys);
      if (offRes.data) setOfflineMatrix(offRes.data);
    } catch (err) {
      console.warn('Failed to fetch ANNY Ecosystem data:', err);
    } finally {
      setLoading(false);
    }
  };

  const executeCapabilityAction = async () => {
    if (!selectedCompany) return;
    setActionExecuting(true);
    setActionResult(null);
    try {
      let parsedParams = {};
      try {
        parsedParams = JSON.parse(actionParams);
      } catch (e) {
        parsedParams = { raw: actionParams };
      }

      const res = await fetch(`/api/v1/anny/enterprises/${selectedCompany.id}/capability-pack`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          packName: actionPackName,
          action: actionName,
          params: parsedParams,
          requestedBy: 'Operator_UI'
        })
      });
      const json = await res.json();
      setActionResult(json);
      fetchData(); // Refresh metrics
    } catch (err: any) {
      setActionResult({ error: err.message });
    } finally {
      setActionExecuting(false);
    }
  };

  const handleGenerateKey = async () => {
    try {
      const selectedEnt = enterprises.find(e => e.id === newKeyCompanyId);
      const res = await fetch('/api/v1/anny/keys/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId: newKeyCompanyId,
          companyName: selectedEnt?.name || newKeyCompanyId,
          scopes: ['universal:read', 'chat:write', 'capability:execute']
        })
      });
      const json = await res.json();
      if (json.apiKey) {
        setGeneratedKeyResult(json.apiKey);
        fetchData();
      }
    } catch (err: any) {
      alert(`Key generation failed: ${err.message}`);
    }
  };

  const executeIntelligenceQuery = async () => {
    if (!intelQuery.trim()) return;
    setIntelLoading(true);
    setIntelResult(null);
    try {
      const res = await fetch('/api/v1/anny/intelligence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: intelQuery,
          companyId: 'universal',
          category: 'General'
        })
      });
      const json = await res.json();
      setIntelResult(json);
    } catch (err: any) {
      setIntelResult({ error: err.message });
    } finally {
      setIntelLoading(false);
    }
  };

  const toggleControlLevelLoto = async (levelNum: number, currentStatus: string, currentLoto: string) => {
    const nextLoto = currentLoto === 'LOCKED_OUT' ? 'DISENGAGED' : 'LOCKED_OUT';
    const nextStatus = nextLoto === 'LOCKED_OUT' ? 'INTERLOCKED' : 'OPERATIONAL';

    try {
      await fetch('/api/v1/anny/control-hierarchy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          level: levelNum,
          status: nextStatus,
          lotoStatus: nextLoto
        })
      });
      fetchData();
    } catch (err: any) {
      alert(`Failed to update level ${levelNum}: ${err.message}`);
    }
  };

  const getCompanyIcon = (id: string) => {
    switch (id) {
      case 'keda': return ShoppingBag;
      case 'kenpay': return Landmark;
      case 'voom': return Car;
      case 'king_ken_studio': return Music;
      case 'mechatronics': return Cpu;
      case 'aerospace': return Plane;
      case 'automotive': return Radio;
      default: return Globe;
    }
  };

  return (
    <div className="w-full h-full bg-[#0B0D12] text-[#EDEFF4] flex flex-col font-sans overflow-hidden border border-[#262C39]">
      {/* Header Banner */}
      <div className="p-4 md:p-6 bg-gradient-to-r from-[#161A23] via-[#0D1017] to-[#161A23] border-b border-[#262C39] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-[#D8A857]/10 border border-[#D8A857]/30 text-[#D8A857]">
              <Globe className="w-5 h-5 animate-pulse" />
            </span>
            <h1 className="text-lg md:text-xl font-bold font-mono tracking-wide text-white uppercase">
              <span className="animate-aios-shift drop-shadow-[0_0_8px_rgba(0,229,255,0.6)]">ANNY</span> Universal Ecosystem & API Integration Hub
            </h1>
          </div>
          <p className="text-xs text-[#8890A0] font-mono">
            One Brain powering AIOS, KEDA, KenPay, Voom, King Ken Studio, Mechatronics, Aerospace, Automotive & Future Enterprises.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            className="px-3 py-1.5 bg-[#1F2530] hover:bg-[#262D3A] border border-[#262C39] rounded-lg text-xs font-mono flex items-center gap-1.5 transition-all text-[#EDEFF4]"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Sync Gateway
          </button>
          <div className="px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-xs font-mono text-emerald-400 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            ANNY API v1.0 ONLINE
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#262C39] bg-[#0D1017] px-4 overflow-x-auto scrollbar-none">
        {[
          { id: 'enterprises', label: 'Ecosystem Capability Packs', icon: Layers },
          { id: 'api_explorer', label: 'Universal API Explorer', icon: Terminal },
          { id: 'control_hierarchy', label: '6 Levels of Control', icon: ShieldCheck },
          { id: 'agents', label: 'Multi-Agent Orchestrator', icon: Bot },
          { id: 'offline_matrix', label: 'Offline vs Cloud Matrix', icon: Network }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-3 text-xs font-mono uppercase tracking-wider flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-[#D8A857] text-[#D8A857] bg-[#D8A857]/5'
                : 'border-transparent text-[#8890A0] hover:text-[#EDEFF4] hover:bg-white/5'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-auto p-4 md:p-6 space-y-6">
        {activeTab === 'enterprises' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-mono font-bold uppercase text-[#D8A857] tracking-widest">
                  Enterprise Capability Packs & Verticals
                </h2>
                <p className="text-xs text-[#8890A0]">
                  Select an enterprise vertical to inspect microservices or execute capability pack actions.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {enterprises.map((company) => {
                const IconComp = getCompanyIcon(company.id);
                return (
                  <div
                    key={company.id}
                    className="p-5 rounded-xl bg-[#161A23] border border-[#262C39] hover:border-[#D8A857]/40 transition-all flex flex-col justify-between group relative overflow-hidden"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 group-hover:border-[#D8A857]/30 text-[#D8A857] transition-all">
                          <IconComp className="w-6 h-6" />
                        </div>
                        <span className="px-2 py-0.5 text-[9px] font-mono rounded border uppercase bg-emerald-500/10 border-emerald-500/30 text-emerald-400">
                          {company.status}
                        </span>
                      </div>

                      <div>
                        <h3 className="font-bold font-mono text-sm text-white group-hover:text-[#D8A857] transition-colors">
                          {company.name}
                        </h3>
                        <p className="text-[10px] text-[#D8A857] font-mono uppercase tracking-wider">{company.category}</p>
                      </div>

                      <p className="text-xs text-[#8890A0] leading-relaxed line-clamp-2">
                        {company.description}
                      </p>

                      <div className="pt-2 border-t border-white/5 space-y-1">
                        <p className="text-[10px] font-mono text-[#5C6478] uppercase">Installed Capability Packs:</p>
                        <div className="flex flex-wrap gap-1">
                          {company.capabilityPacks.map((pack, idx) => (
                            <span key={idx} className="px-2 py-0.5 bg-white/5 border border-white/10 rounded text-[9px] font-mono text-white/70">
                              {pack}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 pt-3 border-t border-[#262C39] flex items-center justify-between text-xs font-mono">
                      <span className="text-[10px] text-[#8890A0]">Reqs: {company.totalRequestsCount.toLocaleString()}</span>
                      <button
                        onClick={() => {
                          setSelectedCompany(company);
                          if (company.id === 'keda') setActionName('feed_generate');
                          else if (company.id === 'kenpay') setActionName('iso20022_parse');
                          else if (company.id === 'voom') setActionName('dispatch_match');
                          else if (company.id === 'king_ken_studio') setActionName('midi_send');
                          else setActionName('status');
                        }}
                        className="px-3 py-1.5 bg-[#D8A857]/10 hover:bg-[#D8A857]/20 border border-[#D8A857]/30 text-[#D8A857] rounded-lg flex items-center gap-1 transition-all"
                      >
                        <Play className="w-3 h-3" />
                        Execute Microservice
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Universal API Explorer Tab */}
        {activeTab === 'api_explorer' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column: Intelligence Query & API Key Manager */}
            <div className="space-y-6">
              <div className="p-5 rounded-xl bg-[#161A23] border border-[#262C39] space-y-4">
                <div className="flex items-center gap-2">
                  <Terminal className="w-5 h-5 text-[#D8A857]" />
                  <h3 className="font-mono font-bold text-sm text-white uppercase">ANNY Universal Intelligence API Tester</h3>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-mono text-[#8890A0] uppercase">Natural Language API Request:</label>
                  <textarea
                    rows={3}
                    value={intelQuery}
                    onChange={(e) => setIntelQuery(e.target.value)}
                    className="w-full bg-[#0D1017] border border-[#262C39] rounded-xl p-3 text-xs font-mono text-white focus:border-[#D8A857]/50 outline-none"
                  />
                  <button
                    onClick={executeIntelligenceQuery}
                    disabled={intelLoading}
                    className="w-full py-2.5 bg-[#D8A857] hover:bg-[#e0b263] text-black font-mono font-bold rounded-xl flex items-center justify-center gap-2 transition-all text-xs uppercase tracking-wider"
                  >
                    <Play className="w-4 h-4" />
                    {intelLoading ? 'Processing via ANNY Model Router...' : 'Execute Intelligence Endpoint'}
                  </button>
                </div>

                {intelResult && (
                  <div className="p-3 bg-[#0D1017] border border-[#262C39] rounded-xl space-y-2">
                    <div className="flex items-center justify-between text-[10px] font-mono text-[#8890A0]">
                      <span>Response Payload:</span>
                      <span className="text-emerald-400">HTTP 200 OK</span>
                    </div>
                    <pre className="text-[11px] font-mono text-emerald-300 max-h-60 overflow-auto whitespace-pre-wrap">
                      {JSON.stringify(intelResult, null, 2)}
                    </pre>
                  </div>
                )}
              </div>

              {/* API Key Generator */}
              <div className="p-5 rounded-xl bg-[#161A23] border border-[#262C39] space-y-4">
                <div className="flex items-center gap-2">
                  <Key className="w-5 h-5 text-[#D8A857]" />
                  <h3 className="font-mono font-bold text-sm text-white uppercase">Generate External Universal API Key</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-mono text-[#8890A0] uppercase">Select Target Enterprise:</label>
                    <select
                      value={newKeyCompanyId}
                      onChange={(e) => setNewKeyCompanyId(e.target.value)}
                      className="w-full mt-1 bg-[#0D1017] border border-[#262C39] rounded-xl p-2.5 text-xs font-mono text-white outline-none"
                    >
                      {enterprises.map(e => (
                        <option key={e.id} value={e.id}>{e.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-end">
                    <button
                      onClick={handleGenerateKey}
                      className="w-full py-2.5 bg-[#1F2530] hover:bg-[#262D3A] border border-[#262C39] text-[#D8A857] font-mono font-bold rounded-xl text-xs uppercase"
                    >
                      Issue API Token
                    </button>
                  </div>
                </div>

                {generatedKeyResult && (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl space-y-2">
                    <p className="text-[10px] font-mono text-emerald-400 uppercase">New Universal API Key Created:</p>
                    <div className="p-2 bg-black/60 rounded border border-emerald-500/20 font-mono text-xs text-white break-all flex items-center justify-between">
                      <span>{generatedKeyResult}</span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(generatedKeyResult);
                          setCopiedKey(true);
                          setTimeout(() => setCopiedKey(false), 2000);
                        }}
                        className="px-2 py-1 bg-emerald-500/20 rounded text-[10px] text-emerald-300"
                      >
                        {copiedKey ? 'COPIED' : 'COPY'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: API Code Snippet Examples */}
            <div className="p-5 rounded-xl bg-[#161A23] border border-[#262C39] space-y-4">
              <div className="flex items-center gap-2">
                <Code2 className="w-5 h-5 text-[#D8A857]" />
                <h3 className="font-mono font-bold text-sm text-white uppercase">Integration SDK Code Snippets</h3>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-xs font-mono text-[#8890A0] uppercase mb-1">1. cURL Request (Universal Intelligence):</p>
                  <pre className="p-3 bg-[#0D1017] border border-[#262C39] rounded-xl text-[11px] font-mono text-cyan-300 overflow-x-auto">
{`curl -X POST "${window.location.origin}/api/v1/anny/intelligence" \\
  -H "Content-Type: application/json" \\
  -H "X-ANNY-API-KEY: anny_live_keda_9f81a7:sk_keda_secret_live_01" \\
  -d '{
    "query": "Process KEDA social feed recommendations",
    "companyId": "keda"
  }'`}
                  </pre>
                </div>

                <div>
                  <p className="text-xs font-mono text-[#8890A0] uppercase mb-1">2. Node.js / TypeScript Integration:</p>
                  <pre className="p-3 bg-[#0D1017] border border-[#262C39] rounded-xl text-[11px] font-mono text-purple-300 overflow-x-auto">
{`import axios from 'axios';

const client = axios.create({
  baseURL: '${window.location.origin}/api/v1/anny',
  headers: { 'X-ANNY-API-KEY': process.env.ANNY_API_KEY }
});

// Trigger KenPay ISO 20022 Microservice
const res = await client.post('/enterprises/kenpay/capability-pack', {
  packName: 'ISO20022_Engine',
  action: 'iso20022_parse',
  params: { amount: 50000.00 }
});`}
                  </pre>
                </div>

                <div>
                  <p className="text-xs font-mono text-[#8890A0] uppercase mb-1">3. Python Integration:</p>
                  <pre className="p-3 bg-[#0D1017] border border-[#262C39] rounded-xl text-[11px] font-mono text-yellow-300 overflow-x-auto">
{`import requests

url = "${window.location.origin}/api/v1/anny/enterprises/voom/capability-pack"
payload = {
    "packName": "VoomDispatch",
    "action": "dispatch_match",
    "params": {"passengerId": "psg_991"}
}
res = requests.post(url, json=payload)`}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 6 Levels of Control Tab */}
        {activeTab === 'control_hierarchy' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-sm font-mono font-bold uppercase text-[#D8A857] tracking-widest">
                ANNY Progressive Control Hierarchy (Levels 1 - 6)
              </h2>
              <p className="text-xs text-[#8890A0]">
                Inspect and manage safety interlocks and Digital Lockout/Tagout (LOTO) across physical and digital boundaries.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {controlHierarchy.map((lvl) => (
                <div
                  key={lvl.level}
                  className={`p-5 rounded-xl border flex flex-col justify-between transition-all ${
                    lvl.lotoStatus === 'LOCKED_OUT'
                      ? 'bg-red-500/5 border-red-500/30'
                      : 'bg-[#161A23] border-[#262C39]'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-1 bg-white/5 border border-white/10 rounded font-mono text-xs font-bold text-white">
                        Level {lvl.level}
                      </span>
                      <span className={`px-2 py-0.5 text-[9px] font-mono rounded border uppercase ${
                        lvl.lotoStatus === 'LOCKED_OUT'
                          ? 'bg-red-500/20 border-red-500/40 text-red-400'
                          : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                      }`}>
                        {lvl.lotoStatus}
                      </span>
                    </div>

                    <h3 className="font-bold font-mono text-sm text-white">{lvl.name}</h3>
                    <p className="text-xs text-[#8890A0]">{lvl.description}</p>

                    <div className="pt-2 border-t border-white/5 space-y-1 text-[10px] font-mono text-[#8890A0]">
                      <div className="flex justify-between">
                        <span>Active Nodes:</span>
                        <span className="text-white">{lvl.activeNodeCount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Safety Interlocks:</span>
                        <span className={lvl.safetyInterlockActive ? 'text-amber-400' : 'text-emerald-400'}>
                          {lvl.safetyInterlockActive ? 'ENGAGED' : 'SAFE / MONITOR'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-white/5">
                    <button
                      onClick={() => toggleControlLevelLoto(lvl.level, lvl.status, lvl.lotoStatus)}
                      className={`w-full py-2 rounded-lg font-mono text-xs font-bold uppercase transition-all flex items-center justify-center gap-1.5 ${
                        lvl.lotoStatus === 'LOCKED_OUT'
                          ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/30'
                          : 'bg-red-500/20 border border-red-500/40 text-red-400 hover:bg-red-500/30'
                      }`}
                    >
                      <Lock className="w-3.5 h-3.5" />
                      {lvl.lotoStatus === 'LOCKED_OUT' ? 'Release Lockout / Re-engage' : 'Engage Digital LOTO'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Multi-Agent Orchestrator Tab */}
        {activeTab === 'agents' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-sm font-mono font-bold uppercase text-[#D8A857] tracking-widest">
                ANNY Specialized Multi-Agent Registry
              </h2>
              <p className="text-xs text-[#8890A0]">
                Master Orchestration Layer managing system, development, perceptual, and enterprise vertical agents.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {agents.map((ag) => (
                <div key={ag.id} className="p-4 rounded-xl bg-[#161A23] border border-[#262C39] space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Bot className="w-4 h-4 text-[#D8A857]" />
                      <span className="font-bold font-mono text-xs text-white">{ag.name}</span>
                    </div>
                    <span className="px-2 py-0.5 text-[8px] font-mono rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 uppercase">
                      {ag.type}
                    </span>
                  </div>

                  <p className="text-xs text-[#8890A0]">{ag.role}</p>

                  <div className="flex items-center justify-between text-[10px] font-mono pt-2 border-t border-white/5">
                    <span className="text-[#5C6478]">Category: {ag.enterpriseCategory}</span>
                    <span className="text-emerald-400 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      {ag.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Offline vs Online Matrix Tab */}
        {activeTab === 'offline_matrix' && offlineMatrix && (
          <div className="space-y-6">
            <div>
              <h2 className="text-sm font-mono font-bold uppercase text-[#D8A857] tracking-widest">
                Offline-First vs Cloud Neural Matrix
              </h2>
              <p className="text-xs text-[#8890A0]">
                ANNY maintains complete operation offline via Ollama, Akinwumi Core, and GGUF/ONNX local models.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Local Offline Cores */}
              <div className="p-5 rounded-xl bg-[#161A23] border border-[#262C39] space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-mono font-bold text-sm text-emerald-400 uppercase flex items-center gap-2">
                    <Server className="w-4 h-4" /> Local Sovereign Cores
                  </h3>
                  <span className="px-2 py-0.5 text-[9px] font-mono rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 uppercase">
                    OFFLINE READY
                  </span>
                </div>

                <div className="space-y-2 text-xs font-mono">
                  <div className="p-2.5 bg-[#0D1017] rounded-lg border border-[#262C39] flex justify-between">
                    <span className="text-[#8890A0]">Akinwumi Offline Core:</span>
                    <span className="text-emerald-400 font-bold">{offlineMatrix.localCores.akinwumiCore}</span>
                  </div>

                  <div className="p-2.5 bg-[#0D1017] rounded-lg border border-[#262C39] flex justify-between">
                    <span className="text-[#8890A0]">Ollama Local Server:</span>
                    <span className="text-emerald-400 font-bold">{offlineMatrix.localCores.ollama}</span>
                  </div>

                  <div className="p-2.5 bg-[#0D1017] rounded-lg border border-[#262C39] space-y-1">
                    <span className="text-[#8890A0]">GGUF Local LLM Quantizations:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {offlineMatrix.localCores.ggufModels.map((m: string, i: number) => (
                        <span key={i} className="px-2 py-0.5 bg-white/5 border border-white/10 rounded text-[10px] text-white">
                          {m}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="p-2.5 bg-[#0D1017] rounded-lg border border-[#262C39] flex justify-between">
                    <span className="text-[#8890A0]">Local Vector HNSW DB:</span>
                    <span className="text-cyan-400 font-bold">{offlineMatrix.localCores.localEmbeddings}</span>
                  </div>
                </div>
              </div>

              {/* Cloud Neural Fallbacks */}
              <div className="p-5 rounded-xl bg-[#161A23] border border-[#262C39] space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-mono font-bold text-sm text-cyan-400 uppercase flex items-center gap-2">
                    <Globe className="w-4 h-4" /> Cloud Provider Fallbacks
                  </h3>
                  <span className="px-2 py-0.5 text-[9px] font-mono rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 uppercase">
                    AUTO ROUTED
                  </span>
                </div>

                <div className="space-y-2 text-xs font-mono">
                  {Object.entries(offlineMatrix.onlineFallbacks).map(([provider, active]) => (
                    <div key={provider} className="p-2.5 bg-[#0D1017] rounded-lg border border-[#262C39] flex justify-between items-center">
                      <span className="text-[#8890A0] uppercase">{provider} Provider:</span>
                      <span className={`font-bold ${active ? 'text-emerald-400' : 'text-amber-400/60'}`}>
                        {active ? 'ONLINE & CONFIGURED' : 'KEY STANDBY'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Execution Modal */}
      {selectedCompany && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#161A23] border border-[#262C39] rounded-2xl p-6 space-y-4 relative">
            <div className="flex items-center justify-between border-b border-[#262C39] pb-3">
              <h3 className="font-mono font-bold text-sm text-white uppercase">
                Execute Microservice: {selectedCompany.name}
              </h3>
              <button
                onClick={() => setSelectedCompany(null)}
                className="text-xs font-mono text-[#8890A0] hover:text-white"
              >
                CLOSE [X]
              </button>
            </div>

            <div className="space-y-3 text-xs font-mono">
              <div>
                <label className="text-[#8890A0] uppercase">Target Microservice Action:</label>
                <input
                  type="text"
                  value={actionName}
                  onChange={(e) => setActionName(e.target.value)}
                  className="w-full mt-1 bg-[#0D1017] border border-[#262C39] rounded-xl p-2.5 text-white"
                />
              </div>

              <div>
                <label className="text-[#8890A0] uppercase">JSON Payload Parameters:</label>
                <textarea
                  rows={4}
                  value={actionParams}
                  onChange={(e) => setActionParams(e.target.value)}
                  className="w-full mt-1 bg-[#0D1017] border border-[#262C39] rounded-xl p-2.5 text-white font-mono"
                />
              </div>

              <button
                onClick={executeCapabilityAction}
                disabled={actionExecuting}
                className="w-full py-3 bg-[#D8A857] hover:bg-[#e0b263] text-black font-mono font-bold rounded-xl uppercase transition-all"
              >
                {actionExecuting ? 'Executing Microservice...' : 'Trigger Service Call'}
              </button>

              {actionResult && (
                <div className="p-3 bg-[#0D1017] border border-[#262C39] rounded-xl space-y-2">
                  <span className="text-[10px] text-emerald-400 font-bold uppercase">Result:</span>
                  <pre className="text-[11px] text-emerald-300 max-h-48 overflow-auto whitespace-pre-wrap">
                    {JSON.stringify(actionResult, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
