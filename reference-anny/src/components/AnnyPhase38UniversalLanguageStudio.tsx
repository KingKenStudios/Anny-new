/**
 * ANNY — PHASE 38 UNIVERSAL LANGUAGE MODEL EXPANSION STUDIO
 * Intelligence by Akinwumi Group
 * 
 * Interactive studio for:
 * 1. Live Universal Language Capability Matrix (Tier 1 African + Tier 2 World)
 * 2. Hardware-Aware Model Selector & Language Pack Manager
 * 3. Direct Translation with Code-Token Preservation Engine
 * 4. Language Identification (LID) & Code-Switching Analyzer
 * 5. Phase 38 40-Point Forensic Audit Runner with Zero-Simulation Truth
 */

import React, { useState, useEffect } from 'react';
import { 
  Globe, 
  Cpu, 
  Layers, 
  ShieldCheck, 
  Download, 
  Play, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Search, 
  Filter, 
  Languages, 
  Terminal, 
  Sparkles, 
  Database,
  ArrowRight,
  Code,
  Volume2,
  Mic,
  FileCheck,
  RefreshCw
} from 'lucide-react';
import { annyRuntimeBridge } from '../runtime/AnnyRuntimeBridge';

export const AnnyPhase38UniversalLanguageStudio: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'matrix' | 'selector' | 'translate' | 'lid' | 'audit'>('matrix');
  const [matrixData, setMatrixData] = useState<any>(null);
  const [loadingMatrix, setLoadingMatrix] = useState(false);
  const [tierFilter, setTierFilter] = useState<'all' | 'african' | 'global' | 'real' | 'blocked'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLanguageRow, setSelectedLanguageRow] = useState<any>(null);

  // Model Selector Simulator State
  const [selLang, setSelLang] = useState('yo');
  const [selTask, setSelTask] = useState('ASR');
  const [selResult, setSelResult] = useState<any>(null);
  const [selLoading, setSelLoading] = useState(false);

  // Translation State
  const [trText, setTrText] = useState('Jowo lo si `https://anny.ai/api/v1` ki o si fi `const token = "live_987";` se ise.');
  const [trSource, setTrSource] = useState('yo');
  const [trTarget, setTrTarget] = useState('en');
  const [trResult, setTrResult] = useState<any>(null);
  const [trLoading, setTrLoading] = useState(false);

  // LID State
  const [lidText, setLidText] = useState('Mo fe lo si office loni but there is heavy traffic on the road.');
  const [lidResult, setLidResult] = useState<any>(null);
  const [lidLoading, setLidLoading] = useState(false);

  // Audit State
  const [auditResult, setAuditResult] = useState<any>(null);
  const [auditRunning, setAuditRunning] = useState(false);

  useEffect(() => {
    loadMatrix();
  }, []);

  const loadMatrix = async () => {
    setLoadingMatrix(true);
    try {
      const res = await annyRuntimeBridge.getLanguageMatrix();
      if (res && res.rows) {
        setMatrixData(res);
        if (!selectedLanguageRow && res.rows.length > 0) {
          setSelectedLanguageRow(res.rows[0]);
        }
      }
    } catch (err) {
      console.error('Failed to load language matrix:', err);
    } finally {
      setLoadingMatrix(false);
    }
  };

  const runModelSelection = async () => {
    setSelLoading(true);
    try {
      const res = await annyRuntimeBridge.selectLanguageModel({
        language: selLang,
        task: selTask
      });
      setSelResult(res?.selection || null);
    } catch (err: any) {
      setSelResult({ error: err.message });
    } finally {
      setSelLoading(false);
    }
  };

  const runTranslation = async () => {
    setTrLoading(true);
    try {
      const res = await annyRuntimeBridge.translate(trText, trSource, trTarget);
      setTrResult(res?.translation || null);
    } catch (err: any) {
      setTrResult({ error: err.message });
    } finally {
      setTrLoading(false);
    }
  };

  const runLid = async () => {
    setLidLoading(true);
    try {
      const res = await annyRuntimeBridge.detectLanguage(lidText);
      setLidResult(res?.detection || null);
    } catch (err: any) {
      setLidResult({ error: err.message });
    } finally {
      setLidLoading(false);
    }
  };

  const runPhase38Audit = async () => {
    setAuditRunning(true);
    try {
      const res = await annyRuntimeBridge.activatePhase38();
      setAuditResult(res);
      await loadMatrix();
    } catch (err: any) {
      setAuditResult({ error: err.message });
    } finally {
      setAuditRunning(false);
    }
  };

  const filteredRows = (matrixData?.rows || []).filter((row: any) => {
    const matchesSearch = 
      row.language.toLowerCase().includes(searchQuery.toLowerCase()) ||
      row.nativeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      row.iso639_1.toLowerCase().includes(searchQuery.toLowerCase()) ||
      row.region.toLowerCase().includes(searchQuery.toLowerCase()) ||
      row.script.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (tierFilter === 'african') {
      return ['yo', 'ig', 'ha', 'pcm', 'sw', 'am', 'zu', 'xh', 'sn', 'so', 'om', 'ln', 'lg', 'wo', 'rw', 'tw', 'bm', 'ti', 'st', 'tn', 'mg', 'fon', 'ff', 'bin', 'efi', 'knc', 'tiv', 'nup', 'ijc'].includes(row.iso639_1);
    }
    if (tierFilter === 'global') {
      return ['en', 'fr', 'es', 'pt', 'de', 'it', 'nl', 'ru', 'uk', 'pl', 'tr', 'ar', 'fa', 'ur', 'hi', 'bn', 'pa', 'ta', 'te', 'mr', 'gu', 'kn', 'ml', 'zh-Hans', 'zh-Hant', 'ja', 'ko', 'vi', 'th', 'id', 'ms', 'fil', 'he', 'el', 'sv', 'no', 'da', 'fi', 'cs', 'ro', 'hu'].includes(row.iso639_1);
    }
    if (tierFilter === 'real') {
      return row.realityStatus === 'REAL';
    }
    if (tierFilter === 'blocked') {
      return row.realityStatus === 'BLOCKED_BY_ENVIRONMENT';
    }
    return true;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'REAL':
        return <span className="px-2 py-0.5 text-xs font-semibold rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">REAL / ACTIVE</span>;
      case 'PARTIAL':
        return <span className="px-2 py-0.5 text-xs font-semibold rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/30">PARTIAL</span>;
      case 'BROWSER_ONLY':
        return <span className="px-2 py-0.5 text-xs font-semibold rounded-md bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">BROWSER ONLY</span>;
      case 'BLOCKED_BY_ENVIRONMENT':
        return <span className="px-2 py-0.5 text-xs font-semibold rounded-md bg-purple-500/10 text-purple-400 border border-purple-500/30">BLOCKED (SANDBOX)</span>;
      default:
        return <span className="px-2 py-0.5 text-xs font-semibold rounded-md bg-slate-700/40 text-slate-400 border border-slate-700">UNAVAILABLE</span>;
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 font-sans overflow-hidden">
      {/* Top Banner Header */}
      <div className="p-4 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-cyan-500/10 border border-cyan-500/30 rounded-xl text-cyan-400">
            <Globe className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-white tracking-wide">Universal Language Intelligence Fabric</h1>
              <span className="px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider rounded bg-cyan-950 text-cyan-400 border border-cyan-700/50">Phase 38 Real</span>
            </div>
            <p className="text-xs text-slate-400">Real open-weight language model activation for African priority & global languages</p>
          </div>
        </div>

        {/* Global Summary Stats */}
        <div className="flex items-center gap-4 text-xs">
          <div className="bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700 flex items-center gap-2">
            <Languages className="w-4 h-4 text-cyan-400" />
            <span>Languages: <strong className="text-white">{matrixData?.summary?.totalLanguages || 0}</strong></span>
          </div>
          <div className="bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Real Local: <strong className="text-emerald-400">{matrixData?.summary?.realCount || 0}</strong></span>
          </div>
          <div className="bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-purple-400" />
            <span>Sandbox Blocked: <strong className="text-purple-300">{matrixData?.summary?.blockedCount || 0}</strong></span>
          </div>
          <button
            onClick={loadMatrix}
            disabled={loadingMatrix}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-600 flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingMatrix ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center px-4 bg-slate-900 border-b border-slate-800 gap-2">
        <button
          onClick={() => setActiveTab('matrix')}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'matrix' 
              ? 'border-cyan-400 text-cyan-400 bg-cyan-950/20' 
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="w-4 h-4" />
          Capability Matrix
        </button>
        <button
          onClick={() => setActiveTab('selector')}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'selector' 
              ? 'border-cyan-400 text-cyan-400 bg-cyan-950/20' 
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Cpu className="w-4 h-4" />
          Model Selector & Packs
        </button>
        <button
          onClick={() => setActiveTab('translate')}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'translate' 
              ? 'border-cyan-400 text-cyan-400 bg-cyan-950/20' 
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Code className="w-4 h-4" />
          Direct Translation & Code-Preservation
        </button>
        <button
          onClick={() => setActiveTab('lid')}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'lid' 
              ? 'border-cyan-400 text-cyan-400 bg-cyan-950/20' 
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          LID & Code-Switching
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'audit' 
              ? 'border-cyan-400 text-cyan-400 bg-cyan-950/20' 
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileCheck className="w-4 h-4" />
          Phase 38 Forensic Audit (40-Point)
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden p-4">
        {/* TAB 1: CAPABILITY MATRIX */}
        {activeTab === 'matrix' && (
          <div className="h-full flex flex-col gap-3">
            {/* Filters Bar */}
            <div className="flex items-center justify-between gap-4 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
              <div className="flex items-center gap-2 flex-1">
                <div className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by language, ISO code (e.g. yo, ha, fr), script, or region..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
                  <button
                    onClick={() => setTierFilter('all')}
                    className={`px-2.5 py-1 rounded ${tierFilter === 'all' ? 'bg-cyan-500 text-white font-medium' : 'text-slate-400 hover:text-slate-200'}`}
                  >
                    All ({matrixData?.rows?.length || 0})
                  </button>
                  <button
                    onClick={() => setTierFilter('african')}
                    className={`px-2.5 py-1 rounded ${tierFilter === 'african' ? 'bg-cyan-500 text-white font-medium' : 'text-slate-400 hover:text-slate-200'}`}
                  >
                    Tier 1: African Priority (29)
                  </button>
                  <button
                    onClick={() => setTierFilter('global')}
                    className={`px-2.5 py-1 rounded ${tierFilter === 'global' ? 'bg-cyan-500 text-white font-medium' : 'text-slate-400 hover:text-slate-200'}`}
                  >
                    Tier 2: Global Major (41)
                  </button>
                  <button
                    onClick={() => setTierFilter('real')}
                    className={`px-2.5 py-1 rounded ${tierFilter === 'real' ? 'bg-emerald-600 text-white font-medium' : 'text-slate-400 hover:text-slate-200'}`}
                  >
                    Real Active ({matrixData?.summary?.realCount || 0})
                  </button>
                  <button
                    onClick={() => setTierFilter('blocked')}
                    className={`px-2.5 py-1 rounded ${tierFilter === 'blocked' ? 'bg-purple-600 text-white font-medium' : 'text-slate-400 hover:text-slate-200'}`}
                  >
                    Sandbox Blocked ({matrixData?.summary?.blockedCount || 0})
                  </button>
                </div>
              </div>
            </div>

            {/* Matrix Table & Detail View */}
            <div className="flex-1 flex gap-4 overflow-hidden">
              {/* Matrix Table */}
              <div className="flex-1 bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden flex flex-col">
                <div className="overflow-x-auto flex-1 overflow-y-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="sticky top-0 bg-slate-900 border-b border-slate-800 text-slate-400 z-10">
                      <tr>
                        <th className="py-2.5 px-3 font-semibold">Language</th>
                        <th className="py-2.5 px-2 font-semibold">ISO</th>
                        <th className="py-2.5 px-2 font-semibold">Script</th>
                        <th className="py-2.5 px-2 font-semibold">ASR</th>
                        <th className="py-2.5 px-2 font-semibold">TTS</th>
                        <th className="py-2.5 px-2 font-semibold">Translation</th>
                        <th className="py-2.5 px-2 font-semibold">LID</th>
                        <th className="py-2.5 px-3 font-semibold">Reality Status</th>
                        <th className="py-2.5 px-3 font-semibold">Local Model</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {filteredRows.map((row: any) => (
                        <tr 
                          key={row.iso639_1}
                          onClick={() => setSelectedLanguageRow(row)}
                          className={`hover:bg-slate-800/40 cursor-pointer transition-colors ${
                            selectedLanguageRow?.iso639_1 === row.iso639_1 ? 'bg-cyan-950/40 border-l-2 border-cyan-400' : ''
                          }`}
                        >
                          <td className="py-2 px-3 font-medium text-slate-100">
                            <div>{row.language}</div>
                            <div className="text-[10px] text-slate-400">{row.nativeName}</div>
                          </td>
                          <td className="py-2 px-2 text-slate-300 font-mono text-[11px]">{row.iso639_1}</td>
                          <td className="py-2 px-2 text-slate-400 text-[11px]">{row.script}</td>
                          <td className="py-2 px-2">{getStatusBadge(row.asr)}</td>
                          <td className="py-2 px-2">{getStatusBadge(row.tts)}</td>
                          <td className="py-2 px-2">{getStatusBadge(row.translation)}</td>
                          <td className="py-2 px-2">{getStatusBadge(row.lid)}</td>
                          <td className="py-2 px-3">{getStatusBadge(row.realityStatus)}</td>
                          <td className="py-2 px-3 text-slate-400 text-[11px] truncate max-w-[140px]">{row.localModel}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Language Detail Panel */}
              {selectedLanguageRow && (
                <div className="w-80 bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col gap-3 overflow-y-auto">
                  <div className="border-b border-slate-800 pb-3">
                    <div className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">Language Detail</div>
                    <h3 className="text-base font-bold text-white mt-0.5">{selectedLanguageRow.language}</h3>
                    <p className="text-xs text-slate-400">{selectedLanguageRow.nativeName}</p>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div>
                      <span className="text-slate-400">ISO-639 Codes:</span>
                      <p className="text-white font-mono">{selectedLanguageRow.iso639_1} / {selectedLanguageRow.iso639_3}</p>
                    </div>
                    <div>
                      <span className="text-slate-400">Region:</span>
                      <p className="text-white">{selectedLanguageRow.region}</p>
                    </div>
                    <div>
                      <span className="text-slate-400">Script:</span>
                      <p className="text-white">{selectedLanguageRow.script}</p>
                    </div>
                    <div>
                      <span className="text-slate-400">Dialects:</span>
                      <p className="text-white text-[11px]">{selectedLanguageRow.dialects?.join(', ') || 'Standard'}</p>
                    </div>
                    <div>
                      <span className="text-slate-400">Associated Open-Weight Model:</span>
                      <p className="text-cyan-300 font-mono text-[11px]">{selectedLanguageRow.localModel}</p>
                    </div>
                    <div>
                      <span className="text-slate-400">Execution Provider:</span>
                      <p className="text-white">{selectedLanguageRow.executionProvider}</p>
                    </div>
                    <div>
                      <span className="text-slate-400">Storage Footprint:</span>
                      <p className="text-white">{(selectedLanguageRow.modelSizeBytes / 1e6).toFixed(1)} MB</p>
                    </div>
                    <div>
                      <span className="text-slate-400">Reality Status:</span>
                      <div className="mt-1">{getStatusBadge(selectedLanguageRow.realityStatus)}</div>
                    </div>
                    {selectedLanguageRow.evidenceId && (
                      <div>
                        <span className="text-slate-400">Cryptographic Evidence:</span>
                        <p className="text-emerald-400 font-mono text-[11px]">{selectedLanguageRow.evidenceId}</p>
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-slate-800 flex flex-col gap-2">
                    <button
                      onClick={() => {
                        setSelLang(selectedLanguageRow.iso639_1);
                        setActiveTab('selector');
                      }}
                      className="w-full py-1.5 px-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Cpu className="w-3.5 h-3.5" />
                      Configure Model Pack
                    </button>
                    <button
                      onClick={() => {
                        setTrSource(selectedLanguageRow.iso639_1);
                        setActiveTab('translate');
                      }}
                      className="w-full py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Code className="w-3.5 h-3.5" />
                      Test Translation
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: HARDWARE-AWARE MODEL SELECTOR & PACKS */}
        {activeTab === 'selector' && (
          <div className="h-full grid grid-cols-2 gap-4 overflow-y-auto">
            {/* Selector Input Panel */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col gap-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-cyan-400" />
                  Hardware-Aware Language Model Selector
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Dynamically evaluates host RAM, CPU cores, GPU/NPU acceleration, and storage partitions to choose the authentic open-weight model.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-slate-400 mb-1">Target Language:</label>
                  <select
                    value={selLang}
                    onChange={(e) => setSelLang(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white text-xs focus:outline-none focus:border-cyan-500"
                  >
                    <option value="yo">Yorùbá (yo) [Tier 1 Priority]</option>
                    <option value="ig">Igbo (ig) [Tier 1 Priority]</option>
                    <option value="ha">Hausa (ha) [Tier 1 Priority]</option>
                    <option value="pcm">Nigerian Pidgin (pcm) [Tier 1 Priority]</option>
                    <option value="sw">Kiswahili (sw) [Tier 1 Priority]</option>
                    <option value="am">Amharic (am) [Tier 1 Priority]</option>
                    <option value="zu">isiZulu (zu) [Tier 1 Priority]</option>
                    <option value="en">English (en) [Tier 2 Global]</option>
                    <option value="fr">French (fr) [Tier 2 Global]</option>
                    <option value="es">Spanish (es) [Tier 2 Global]</option>
                    <option value="ar">Arabic (ar) [Tier 2 Global]</option>
                    <option value="zh-Hans">Mandarin Chinese (zh) [Tier 2 Global]</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Task Modality:</label>
                  <select
                    value={selTask}
                    onChange={(e) => setSelTask(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white text-xs focus:outline-none focus:border-cyan-500"
                  >
                    <option value="ASR">ASR (Speech-to-Text)</option>
                    <option value="TTS">TTS (Speech Synthesis)</option>
                    <option value="TRANSLATION">Direct Translation</option>
                    <option value="LID">Language Identification</option>
                    <option value="LLM">Local Neural Generation (LLM)</option>
                  </select>
                </div>
              </div>

              <button
                onClick={runModelSelection}
                disabled={selLoading}
                className="py-2 px-4 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
              >
                <Play className="w-4 h-4" />
                {selLoading ? 'Probing Host & Selecting...' : 'Select Optimal Model'}
              </button>

              {/* Language Pack Resolution */}
              <div className="border-t border-slate-800 pt-4">
                <h4 className="text-xs font-bold text-slate-200 mb-2 flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-cyan-400" />
                  Language Pack Profile ({selLang.toUpperCase()})
                </h4>
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Minimal Pack:</span>
                    <span className="text-white font-mono">LID + Lexicon (~1 MB)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Speech Pack:</span>
                    <span className="text-white font-mono">MMS ASR + TTS (~187 MB)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Full Sovereign Pack:</span>
                    <span className="text-white font-mono">ASR + TTS + NLLB + Qwen (~3.2 GB)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Selection Result Display */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col gap-3">
              <h3 className="text-sm font-bold text-white">Selection & Provenance Dossier</h3>
              {selResult ? (
                <div className="space-y-3 text-xs">
                  <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Model Name:</span>
                      <strong className="text-cyan-300 font-mono">{selResult.selectedModel?.name || 'Rule-Based Fallback'}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Model ID:</span>
                      <span className="text-white font-mono">{selResult.selectedModel?.modelId || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Architecture:</span>
                      <span className="text-white">{selResult.selectedModel?.architecture || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">License:</span>
                      <span className="text-emerald-400">{selResult.selectedModel?.license || 'Open Source'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Size (Bytes):</span>
                      <span className="text-white font-mono">{selResult.selectedModel?.expectedSizeBytes ? `${(selResult.selectedModel.expectedSizeBytes / 1e6).toFixed(1)} MB` : 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Execution Provider:</span>
                      <span className="text-cyan-400">{selResult.recommendedProvider || 'CPU (NATIVE_CPU)'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Hardware Compatible:</span>
                      <span className={selResult.hardwareCompatible ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>
                        {selResult.hardwareCompatible ? 'YES (Passed Preflight)' : 'NO (Insufficient RAM/Storage)'}
                      </span>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                    <div className="text-[11px] text-slate-400 font-semibold mb-1">Official Download Source (HTTPS Allowlisted):</div>
                    <p className="text-slate-300 font-mono text-[10px] break-all">{selResult.selectedModel?.sourceUrl || 'N/A'}</p>
                  </div>

                  <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                    <div className="text-[11px] text-slate-400 font-semibold mb-1">Zero-Simulation Reality Notice:</div>
                    <p className="text-slate-300 text-[11px] leading-relaxed">
                      {selResult.notes || 'Real model registered. Model binary download will execute on physical host storage.'}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="h-48 flex items-center justify-center text-slate-500 text-xs italic">
                  Select a language and task to generate the authentic hardware selection dossier.
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: DIRECT TRANSLATION & CODE-TOKEN PRESERVATION */}
        {activeTab === 'translate' && (
          <div className="h-full grid grid-cols-2 gap-4 overflow-y-auto">
            {/* Input Side */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col gap-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Code className="w-4 h-4 text-cyan-400" />
                  Direct Translation & Code-Token Preservation Engine
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Protects technical tokens, code blocks, URLs, shell commands, and JSON payloads from translation corruption.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-slate-400 mb-1">Source Language:</label>
                  <select
                    value={trSource}
                    onChange={(e) => setTrSource(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white text-xs focus:outline-none focus:border-cyan-500"
                  >
                    <option value="yo">Yorùbá (yo)</option>
                    <option value="ig">Igbo (ig)</option>
                    <option value="ha">Hausa (ha)</option>
                    <option value="pcm">Nigerian Pidgin (pcm)</option>
                    <option value="sw">Kiswahili (sw)</option>
                    <option value="en">English (en)</option>
                    <option value="fr">French (fr)</option>
                    <option value="es">Spanish (es)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Target Language:</label>
                  <select
                    value={trTarget}
                    onChange={(e) => setTrTarget(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white text-xs focus:outline-none focus:border-cyan-500"
                  >
                    <option value="en">English (en)</option>
                    <option value="fr">French (fr)</option>
                    <option value="es">Spanish (es)</option>
                    <option value="yo">Yorùbá (yo)</option>
                    <option value="ig">Igbo (ig)</option>
                    <option value="ha">Hausa (ha)</option>
                    <option value="sw">Kiswahili (sw)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 text-xs mb-1">Input Text (with Code / Technical Tokens):</label>
                <textarea
                  value={trText}
                  onChange={(e) => setTrText(e.target.value)}
                  rows={5}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white font-mono text-xs focus:outline-none focus:border-cyan-500"
                />
              </div>

              <button
                onClick={runTranslation}
                disabled={trLoading}
                className="py-2 px-4 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
              >
                <Play className="w-4 h-4" />
                {trLoading ? 'Translating & Preserving Tokens...' : 'Execute Direct Translation'}
              </button>
            </div>

            {/* Translation Output Side */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col gap-3">
              <h3 className="text-sm font-bold text-white">Preserved Output & Strategy Report</h3>
              {trResult ? (
                <div className="space-y-3 text-xs">
                  <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800">
                    <div className="text-[11px] text-slate-400 mb-1 font-semibold">Translated Output:</div>
                    <p className="text-emerald-300 font-mono text-xs leading-relaxed">{trResult.translatedText}</p>
                  </div>

                  <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Translation Pathway:</span>
                      <span className="text-cyan-400 font-bold">{trResult.translationStrategy}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Direct Route:</span>
                      <span className="text-white">{trResult.isDirect ? 'DIRECT (NO ENGLISH PIVOT)' : 'PIVOT'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Preserved Tokens:</span>
                      <span className="text-emerald-400 font-mono">{trResult.preservedTokens?.length || 0} tokens</span>
                    </div>
                  </div>

                  {trResult.preservedTokens && trResult.preservedTokens.length > 0 && (
                    <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                      <div className="text-[11px] text-slate-400 font-semibold mb-1">Protected Code Identifiers:</div>
                      <div className="flex flex-wrap gap-1.5">
                        {trResult.preservedTokens.map((tok: string, idx: number) => (
                          <span key={idx} className="px-2 py-0.5 bg-slate-800 text-cyan-300 font-mono text-[10px] rounded border border-slate-700">
                            {tok}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-48 flex items-center justify-center text-slate-500 text-xs italic">
                  Click 'Execute Direct Translation' to see preserved tokens and translation strategy.
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: LID & CODE-SWITCHING */}
        {activeTab === 'lid' && (
          <div className="h-full grid grid-cols-2 gap-4 overflow-y-auto">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col gap-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  Language Identification & Code-Switching Detection
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Accurately identifies African diacritics, character n-grams, and mixed multi-language speech spans in a single sentence.
                </p>
              </div>

              <div>
                <label className="block text-slate-400 text-xs mb-1">Input Text (or Mixed Code-Switched Sentence):</label>
                <textarea
                  value={lidText}
                  onChange={(e) => setLidText(e.target.value)}
                  rows={6}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white font-mono text-xs focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setLidText('Ẹ n lẹ́ o, báwo ni gbogbo nǹkan ṣe ń lọ?')}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-300 rounded border border-slate-700"
                >
                  Yorùbá Example
                </button>
                <button
                  onClick={() => setLidText('Kedu ka i mere taa? Anyi ga-eji nwayo nwayo rute ya.')}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-300 rounded border border-slate-700"
                >
                  Igbo Example
                </button>
                <button
                  onClick={() => setLidText('Ina son in gina sabon tsarin computational AIOS yanzu.')}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-300 rounded border border-slate-700"
                >
                  Hausa Example
                </button>
                <button
                  onClick={() => setLidText('Wetin dey happen my guy? We dey try make sure say code dey compile well.')}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-300 rounded border border-slate-700"
                >
                  Pidgin Example
                </button>
              </div>

              <button
                onClick={runLid}
                disabled={lidLoading}
                className="py-2 px-4 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
              >
                <Play className="w-4 h-4" />
                {lidLoading ? 'Analyzing N-Grams & Dialects...' : 'Analyze Language & Code-Switching'}
              </button>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col gap-3">
              <h3 className="text-sm font-bold text-white">LID & Dialect Diagnostic</h3>
              {lidResult ? (
                <div className="space-y-3 text-xs">
                  <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Primary Detected Language:</span>
                      <strong className="text-emerald-400 font-bold">{lidResult.languageName} ({lidResult.primaryLanguage})</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Confidence Score:</span>
                      <span className="text-cyan-400 font-mono font-bold">{(lidResult.confidence * 100).toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Code-Switching Detected:</span>
                      <span className={lidResult.isCodeSwitching ? 'text-amber-400 font-bold' : 'text-slate-400'}>
                        {lidResult.isCodeSwitching ? 'YES (MULTIPLE LANGUAGES DETECTED)' : 'NO (MONOLINGUAL)'}
                      </span>
                    </div>
                  </div>

                  {lidResult.codeSwitchingSegments && lidResult.codeSwitchingSegments.length > 0 && (
                    <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                      <div className="text-[11px] text-slate-400 font-semibold mb-2">Segmented Multi-Language Spans:</div>
                      <div className="space-y-1.5">
                        {lidResult.codeSwitchingSegments.map((seg: any, idx: number) => (
                          <div key={idx} className="p-2 bg-slate-900 rounded border border-slate-800 flex justify-between items-center text-[11px]">
                            <span className="text-slate-200 font-mono italic">"{seg.text}"</span>
                            <span className="px-2 py-0.5 bg-cyan-950 text-cyan-400 rounded text-[10px] border border-cyan-800">
                              {seg.language} ({(seg.confidence * 100).toFixed(0)}%)
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-48 flex items-center justify-center text-slate-500 text-xs italic">
                  Run language analysis to see real-time classification, confidence, and code-switching spans.
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 5: PHASE 38 FORENSIC AUDIT */}
        {activeTab === 'audit' && (
          <div className="h-full flex flex-col gap-4 overflow-y-auto">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-cyan-400" />
                  Phase 38 Universal Language Forensic Audit Runner (P38-001 → P38-040)
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Validates authentic hardware detection, model catalog provenance, checksums, execution evidence, and Zero-Simulation law enforcement.
                </p>
              </div>
              <button
                onClick={runPhase38Audit}
                disabled={auditRunning}
                className="py-2 px-5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-2 transition-colors disabled:opacity-50"
              >
                <Play className="w-4 h-4" />
                {auditRunning ? 'Running 40 Forensic Probes...' : 'Execute Phase 38 Certification'}
              </button>
            </div>

            {auditResult && (
              <div className="space-y-4">
                {/* Summary Scorecard */}
                <div className="grid grid-cols-5 gap-3">
                  <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl">
                    <div className="text-slate-400 text-xs">Total Forensic Tests</div>
                    <div className="text-xl font-bold text-white mt-1">{auditResult.summary?.total || 40}</div>
                  </div>
                  <div className="bg-slate-900 border border-emerald-500/30 p-3.5 rounded-xl bg-emerald-500/5">
                    <div className="text-emerald-400 text-xs">Passed Probes</div>
                    <div className="text-xl font-bold text-emerald-400 mt-1">{auditResult.summary?.passed || 0}</div>
                  </div>
                  <div className="bg-slate-900 border border-purple-500/30 p-3.5 rounded-xl bg-purple-500/5">
                    <div className="text-purple-400 text-xs">Blocked by Sandbox</div>
                    <div className="text-xl font-bold text-purple-300 mt-1">{auditResult.summary?.blocked || 0}</div>
                  </div>
                  <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl">
                    <div className="text-slate-400 text-xs">Failed</div>
                    <div className="text-xl font-bold text-slate-200 mt-1">{auditResult.summary?.failed || 0}</div>
                  </div>
                  <div className="bg-slate-900 border border-cyan-500/30 p-3.5 rounded-xl bg-cyan-500/5">
                    <div className="text-cyan-400 text-xs">Pass Rate</div>
                    <div className="text-xl font-bold text-cyan-400 mt-1">{auditResult.summary?.passRate || '0%'}</div>
                  </div>
                </div>

                {/* Test Breakdown Grid */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                  <div className="p-3 bg-slate-900 border-b border-slate-800 font-semibold text-xs text-slate-200">
                    Detailed Test Execution Evidence (P38-001 to P38-040)
                  </div>
                  <div className="divide-y divide-slate-800 max-h-[400px] overflow-y-auto">
                    {auditResult.tests?.map((test: any) => (
                      <div key={test.testId} className="p-3 hover:bg-slate-800/30 flex items-center justify-between text-xs">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-cyan-400 font-semibold">{test.testId}</span>
                            <span className="font-medium text-white">{test.name}</span>
                            <span className="px-1.5 py-0.5 bg-slate-800 text-slate-400 text-[10px] rounded border border-slate-700">{test.category}</span>
                          </div>
                          <p className="text-slate-400 text-[11px]">{test.details}</p>
                        </div>
                        <div>
                          {test.status === 'PASS' && (
                            <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded text-xs font-bold flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> PASS
                            </span>
                          )}
                          {test.status === 'BLOCKED_BY_ENVIRONMENT' && (
                            <span className="px-2.5 py-1 bg-purple-500/10 text-purple-300 border border-purple-500/30 rounded text-xs font-bold flex items-center gap-1">
                              <AlertCircle className="w-3.5 h-3.5" /> BLOCKED
                            </span>
                          )}
                          {test.status === 'FAIL' && (
                            <span className="px-2.5 py-1 bg-red-500/10 text-red-400 border border-red-500/30 rounded text-xs font-bold">
                              FAIL
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Raw Forensic Log Output */}
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
                  <div className="text-xs font-mono text-slate-400 mb-2">RAW CERTIFICATION REPORT:</div>
                  <pre className="text-[11px] font-mono text-slate-300 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                    {auditResult.report}
                  </pre>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
