/**
 * ANNY — PHASE 38 UNIVERSAL LANGUAGE MODEL EXPANSION STUDIO
 * Owned by Akinwumi Kehinde / Akinwumi Group
 *
 * Interactive studio for:
 * 1. Live Universal Language Capability Matrix (Tier 1 African + Tier 2 Global)
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
  Play,
  CheckCircle2,
  AlertCircle,
  Search,
  Languages,
  Sparkles,
  Database,
  Code,
  FileCheck,
  RefreshCw,
  MessageSquare,
} from 'lucide-react';
import { annyRuntimeBridge } from '../runtime/AnnyRuntimeBridge';

interface AnnyPhase38UniversalLanguageStudioProps {
  onSelectLanguagePrompt?: (prompt: string) => void;
}

export const AnnyPhase38UniversalLanguageStudio: React.FC<AnnyPhase38UniversalLanguageStudioProps> = ({
  onSelectLanguagePrompt,
}) => {
  const [activeTab, setActiveTab] = useState<'matrix' | 'selector' | 'translate' | 'lid' | 'audit'>('matrix');
  const [matrixData, setMatrixData] = useState<any>(null);
  const [loadingMatrix, setLoadingMatrix] = useState(false);
  const [tierFilter, setTierFilter] = useState<'all' | 'african' | 'global' | 'real' | 'blocked'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLanguageRow, setSelectedLanguageRow] = useState<any>(null);

  const [selLang, setSelLang] = useState('yo');
  const [selTask, setSelTask] = useState('ASR');
  const [selResult, setSelResult] = useState<any>(null);
  const [selLoading, setSelLoading] = useState(false);

  const [trText, setTrText] = useState('Jowo lo si `https://anny.ai/api/v1` ki o si fi `const token = "live_987";` se ise.');
  const [trSource, setTrSource] = useState('yo');
  const [trTarget, setTrTarget] = useState('en');
  const [trResult, setTrResult] = useState<any>(null);
  const [trLoading, setTrLoading] = useState(false);

  const [lidText, setLidText] = useState('Mo fe lo si office loni but there is heavy traffic on the road.');
  const [lidResult, setLidResult] = useState<any>(null);
  const [lidLoading, setLidLoading] = useState(false);

  const [auditResult, setAuditResult] = useState<any>(null);
  const [auditRunning, setAuditRunning] = useState(false);

  useEffect(() => {
    void loadMatrix();
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
        task: selTask,
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
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      row.language.toLowerCase().includes(q) ||
      row.nativeName.toLowerCase().includes(q) ||
      row.iso639_1.toLowerCase().includes(q) ||
      row.region.toLowerCase().includes(q) ||
      row.script.toLowerCase().includes(q);

    if (!matchesSearch) return false;
    if (tierFilter === 'african') return row.tier === 'african';
    if (tierFilter === 'global') return row.tier === 'global';
    if (tierFilter === 'real') return row.realityStatus === 'REAL';
    if (tierFilter === 'blocked') return row.realityStatus === 'BLOCKED_BY_ENVIRONMENT';
    return true;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'REAL':
        return <span className="px-2 py-0.5 text-[11px] font-semibold rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">REAL</span>;
      case 'PARTIAL':
        return <span className="px-2 py-0.5 text-[11px] font-semibold rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/30">PARTIAL</span>;
      case 'BROWSER_ONLY':
        return <span className="px-2 py-0.5 text-[11px] font-semibold rounded-md bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">BROWSER</span>;
      case 'BLOCKED_BY_ENVIRONMENT':
        return <span className="px-2 py-0.5 text-[11px] font-semibold rounded-md bg-purple-500/10 text-purple-300 border border-purple-500/30">BLOCKED</span>;
      default:
        return <span className="px-2 py-0.5 text-[11px] font-semibold rounded-md bg-slate-700/40 text-slate-400 border border-slate-700">N/A</span>;
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#040614] text-slate-100 font-sans overflow-hidden">
      {/* Top Banner Header */}
      <div className="p-4 bg-[#070b22] border-b border-white/10 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-cyan-500/10 border border-cyan-500/30 rounded-xl text-cyan-400">
            <Globe className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-bold text-white tracking-wide">Universal Language Intelligence Fabric</h1>
              <span className="px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider rounded bg-cyan-950 text-cyan-400 border border-cyan-700/50">
                70 Languages Live
              </span>
            </div>
            <p className="text-xs text-slate-400">
              African priority &amp; global language matrix, hardware model routing, code-safe translation, and LID
            </p>
          </div>
        </div>

        {/* Global Summary Stats */}
        <div className="flex items-center gap-2 sm:gap-3 text-xs flex-wrap">
          <div className="bg-slate-900/90 px-3 py-1.5 rounded-lg border border-white/10 flex items-center gap-2">
            <Languages className="w-4 h-4 text-cyan-400" />
            <span>Total: <strong className="text-white">{matrixData?.summary?.totalLanguages || 0}</strong></span>
          </div>
          <div className="bg-slate-900/90 px-3 py-1.5 rounded-lg border border-white/10 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Active: <strong className="text-emerald-400">{matrixData?.summary?.realCount || 0}</strong></span>
          </div>
          <button
            type="button"
            onClick={() => void loadMatrix()}
            disabled={loadingMatrix}
            className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-slate-200 rounded-lg border border-white/10 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingMatrix ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center px-4 bg-[#06091c] border-b border-white/10 gap-1 overflow-x-auto">
        {[
          { id: 'matrix', label: 'Capability Matrix', icon: Layers },
          { id: 'selector', label: 'Model Selector & Packs', icon: Cpu },
          { id: 'translate', label: 'Code-Safe Translation', icon: Code },
          { id: 'lid', label: 'LID & Code-Switching', icon: Sparkles },
          { id: 'audit', label: '40-Point Verification', icon: FileCheck },
        ].map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id as any)}
              className={`px-4 py-2.5 text-xs font-semibold border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap cursor-pointer ${
                activeTab === t.id
                  ? 'border-cyan-400 text-cyan-400 bg-cyan-950/20'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden p-4">
        {/* TAB 1: CAPABILITY MATRIX */}
        {activeTab === 'matrix' && (
          <div className="h-full flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-3 bg-[#080d25] p-3 rounded-xl border border-white/10">
              <div className="relative flex-1 min-w-[220px] max-w-md">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search language, ISO code (yo, ig, ha, fr), script, or region..."
                  className="w-full bg-[#040614] border border-white/10 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>
              <div className="flex items-center gap-1 bg-[#040614] p-1 rounded-lg border border-white/10 text-xs flex-wrap">
                {[
                  { id: 'all', label: `All (${matrixData?.rows?.length || 0})` },
                  { id: 'african', label: `African Priority (${matrixData?.summary?.africanCount || 29})` },
                  { id: 'global', label: `Global Major (${matrixData?.summary?.globalCount || 41})` },
                  { id: 'real', label: `Active (${matrixData?.summary?.realCount || 0})` },
                  { id: 'blocked', label: `Blocked (${matrixData?.summary?.blockedCount || 0})` },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setTierFilter(f.id as any)}
                    className={`px-2.5 py-1 rounded cursor-pointer transition-colors ${
                      tierFilter === f.id
                        ? 'bg-cyan-600 text-white font-semibold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 flex flex-col lg:flex-row gap-4 overflow-hidden min-h-0">
              <div className="flex-1 bg-[#080d25] border border-white/10 rounded-xl overflow-hidden flex flex-col min-h-0">
                <div className="overflow-auto flex-1">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="sticky top-0 bg-[#0b102d] border-b border-white/10 text-slate-400 z-10">
                      <tr>
                        <th className="py-2.5 px-3 font-semibold">Language</th>
                        <th className="py-2.5 px-2 font-semibold">ISO</th>
                        <th className="py-2.5 px-2 font-semibold">Script</th>
                        <th className="py-2.5 px-2 font-semibold">ASR</th>
                        <th className="py-2.5 px-2 font-semibold">TTS</th>
                        <th className="py-2.5 px-2 font-semibold">Translation</th>
                        <th className="py-2.5 px-2 font-semibold">LID</th>
                        <th className="py-2.5 px-3 font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {filteredRows.map((row: any) => (
                        <tr
                          key={row.iso639_1}
                          onClick={() => setSelectedLanguageRow(row)}
                          className={`hover:bg-white/[0.04] cursor-pointer transition-colors ${
                            selectedLanguageRow?.iso639_1 === row.iso639_1
                              ? 'bg-cyan-950/40 border-l-2 border-cyan-400'
                              : ''
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
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {selectedLanguageRow && (
                <div className="w-full lg:w-80 bg-[#080d25] border border-white/10 rounded-xl p-4 flex flex-col gap-3 overflow-y-auto shrink-0">
                  <div className="border-b border-white/10 pb-3">
                    <div className="text-[11px] font-semibold text-cyan-400 uppercase tracking-wider">Language Profile</div>
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
                      <span className="text-slate-400">Dialects:</span>
                      <p className="text-white text-[11px]">{selectedLanguageRow.dialects?.join(', ') || 'Standard'}</p>
                    </div>
                    <div>
                      <span className="text-slate-400">Open-Weight Reference Model:</span>
                      <p className="text-cyan-300 font-mono text-[11px]">{selectedLanguageRow.localModel}</p>
                    </div>
                    <div>
                      <span className="text-slate-400">Active Execution Provider:</span>
                      <p className="text-white">{selectedLanguageRow.executionProvider}</p>
                    </div>
                    <div>
                      <span className="text-slate-400">Estimated Footprint:</span>
                      <p className="text-white">{(selectedLanguageRow.modelSizeBytes / 1e6).toFixed(1)} MB</p>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-white/10 flex flex-col gap-2">
                    {onSelectLanguagePrompt && (
                      <button
                        type="button"
                        onClick={() =>
                          onSelectLanguagePrompt(
                            `Communicate with me in ${selectedLanguageRow.language} (${selectedLanguageRow.nativeName}) while preserving all technical terms and code blocks.`
                          )
                        }
                        className="w-full py-2 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        Chat in {selectedLanguageRow.language}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setSelLang(selectedLanguageRow.iso639_1);
                        setActiveTab('selector');
                      }}
                      className="w-full py-1.5 px-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Cpu className="w-3.5 h-3.5" />
                      Configure Model Pack
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setTrSource(selectedLanguageRow.iso639_1);
                        setActiveTab('translate');
                      }}
                      className="w-full py-1.5 px-3 bg-white/5 hover:bg-white/10 text-slate-200 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Code className="w-3.5 h-3.5" />
                      Test Code-Safe Translation
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: HARDWARE-AWARE MODEL SELECTOR */}
        {activeTab === 'selector' && (
          <div className="h-full grid grid-cols-1 lg:grid-cols-2 gap-4 overflow-y-auto">
            <div className="bg-[#080d25] border border-white/10 rounded-xl p-5 flex flex-col gap-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-cyan-400" />
                  Hardware-Aware Language Model Selector
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Evaluates live server CPU cores, RAM, and active neural providers to recommend the optimal language engine.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-slate-400 mb-1">Target Language:</label>
                  <select
                    value={selLang}
                    onChange={(e) => setSelLang(e.target.value)}
                    className="w-full bg-[#040614] border border-white/10 rounded-lg p-2 text-white text-xs focus:outline-none focus:border-cyan-500"
                  >
                    <option value="yo">Yorùbá (yo) [African Priority]</option>
                    <option value="ig">Igbo (ig) [African Priority]</option>
                    <option value="ha">Hausa (ha) [African Priority]</option>
                    <option value="pcm">Nigerian Pidgin (pcm) [African Priority]</option>
                    <option value="sw">Kiswahili (sw) [African Priority]</option>
                    <option value="am">Amharic (am) [African Priority]</option>
                    <option value="zu">isiZulu (zu) [African Priority]</option>
                    <option value="en">English (en) [Global]</option>
                    <option value="fr">French (fr) [Global]</option>
                    <option value="es">Spanish (es) [Global]</option>
                    <option value="ar">Arabic (ar) [Global]</option>
                    <option value="zh-Hans">Mandarin Chinese (zh) [Global]</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Task Modality:</label>
                  <select
                    value={selTask}
                    onChange={(e) => setSelTask(e.target.value)}
                    className="w-full bg-[#040614] border border-white/10 rounded-lg p-2 text-white text-xs focus:outline-none focus:border-cyan-500"
                  >
                    <option value="ASR">ASR (Speech-to-Text)</option>
                    <option value="TTS">TTS (Speech Synthesis)</option>
                    <option value="TRANSLATION">Direct Translation</option>
                    <option value="LID">Language Identification</option>
                    <option value="LLM">Neural Generation (LLM)</option>
                  </select>
                </div>
              </div>

              <button
                type="button"
                onClick={() => void runModelSelection()}
                disabled={selLoading}
                className="py-2.5 px-4 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50 cursor-pointer"
              >
                <Play className="w-4 h-4" />
                {selLoading ? 'Probing Host & Selecting...' : 'Select Optimal Model'}
              </button>

              <div className="border-t border-white/10 pt-4">
                <h4 className="text-xs font-bold text-slate-200 mb-2 flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-cyan-400" />
                  Language Pack Tiers ({selLang.toUpperCase()})
                </h4>
                <div className="bg-[#040614] p-3 rounded-lg border border-white/10 text-xs space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Minimal Pack:</span>
                    <span className="text-white font-mono">LID + Diacritics (~1 MB)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Speech Pack:</span>
                    <span className="text-white font-mono">MMS ASR + TTS (~420–615 MB)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Full Sovereign Pack:</span>
                    <span className="text-white font-mono">ASR + TTS + NLLB + LLM (~3.2 GB)</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-[#080d25] border border-white/10 rounded-xl p-5 flex flex-col gap-3">
              <h3 className="text-sm font-bold text-white">Selection &amp; Provenance Dossier</h3>
              {selResult ? (
                selResult.error ? (
                  <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                    {selResult.error}
                  </div>
                ) : (
                  <div className="space-y-3 text-xs">
                    <div className="bg-[#040614] p-3.5 rounded-lg border border-white/10 space-y-2">
                      <div className="flex justify-between items-center gap-2">
                        <span className="text-slate-400">Model Name:</span>
                        <strong className="text-cyan-300 font-mono">{selResult.selectedModel?.name}</strong>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-slate-400">Model ID:</span>
                        <span className="text-white font-mono text-right">{selResult.selectedModel?.modelId}</span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-slate-400">Architecture:</span>
                        <span className="text-white">{selResult.selectedModel?.architecture}</span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-slate-400">License:</span>
                        <span className="text-emerald-400">{selResult.selectedModel?.license}</span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-slate-400">Execution Provider:</span>
                        <span className="text-cyan-400">{selResult.recommendedProvider}</span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-slate-400">Host Hardware:</span>
                        <span className="text-emerald-400 font-bold">
                          {selResult.hardwareCompatible ? 'VERIFIED COMPATIBLE' : 'LIMITED RESOURCES'}
                        </span>
                      </div>
                    </div>

                    <div className="p-3 bg-[#040614] rounded-lg border border-white/10">
                      <div className="text-[11px] text-slate-400 font-semibold mb-1">Official Model Source:</div>
                      <p className="text-slate-300 font-mono text-[10px] break-all">{selResult.selectedModel?.sourceUrl}</p>
                    </div>

                    <div className="p-3 bg-[#040614] rounded-lg border border-white/10">
                      <div className="text-[11px] text-slate-400 font-semibold mb-1">Live Runtime Notes:</div>
                      <p className="text-slate-300 text-[11px] leading-relaxed">{selResult.notes}</p>
                    </div>
                  </div>
                )
              ) : (
                <div className="h-48 flex items-center justify-center text-slate-500 text-xs italic">
                  Select a language and task to generate the live hardware selection dossier.
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: DIRECT TRANSLATION & CODE-TOKEN PRESERVATION */}
        {activeTab === 'translate' && (
          <div className="h-full grid grid-cols-1 lg:grid-cols-2 gap-4 overflow-y-auto">
            <div className="bg-[#080d25] border border-white/10 rounded-xl p-5 flex flex-col gap-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Code className="w-4 h-4 text-cyan-400" />
                  Direct Translation &amp; Code-Token Preservation Engine
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Protects code blocks, inline backticks, URLs, and function identifiers verbatim during live neural translation.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-slate-400 mb-1">Source Language:</label>
                  <select
                    value={trSource}
                    onChange={(e) => setTrSource(e.target.value)}
                    className="w-full bg-[#040614] border border-white/10 rounded-lg p-2 text-white text-xs focus:outline-none focus:border-cyan-500"
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
                    className="w-full bg-[#040614] border border-white/10 rounded-lg p-2 text-white text-xs focus:outline-none focus:border-cyan-500"
                  >
                    <option value="en">English (en)</option>
                    <option value="fr">French (fr)</option>
                    <option value="es">Spanish (es)</option>
                    <option value="yo">Yorùbá (yo)</option>
                    <option value="ig">Igbo (ig)</option>
                    <option value="ha">Hausa (ha)</option>
                    <option value="pcm">Nigerian Pidgin (pcm)</option>
                    <option value="sw">Kiswahili (sw)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 text-xs mb-1">Input Text (with Code / URLs):</label>
                <textarea
                  value={trText}
                  onChange={(e) => setTrText(e.target.value)}
                  rows={5}
                  className="w-full bg-[#040614] border border-white/10 rounded-lg p-2.5 text-white font-mono text-xs focus:outline-none focus:border-cyan-500"
                />
              </div>

              <button
                type="button"
                onClick={() => void runTranslation()}
                disabled={trLoading}
                className="py-2.5 px-4 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50 cursor-pointer"
              >
                <Play className="w-4 h-4" />
                {trLoading ? 'Translating & Preserving Tokens...' : 'Execute Code-Safe Translation'}
              </button>
            </div>

            <div className="bg-[#080d25] border border-white/10 rounded-xl p-5 flex flex-col gap-3">
              <h3 className="text-sm font-bold text-white">Preserved Output &amp; Strategy Report</h3>
              {trResult ? (
                trResult.error ? (
                  <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                    {trResult.error}
                  </div>
                ) : (
                  <div className="space-y-3 text-xs">
                    <div className="bg-[#040614] p-3.5 rounded-lg border border-white/10">
                      <div className="text-[11px] text-slate-400 mb-1 font-semibold">Translated Output:</div>
                      <p className="text-emerald-300 font-mono text-xs leading-relaxed whitespace-pre-wrap">{trResult.translatedText}</p>
                    </div>

                    <div className="bg-[#040614] p-3.5 rounded-lg border border-white/10 space-y-2">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Translation Pathway:</span>
                        <span className="text-cyan-400 font-bold">{trResult.translationStrategy}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Preserved Tokens:</span>
                        <span className="text-emerald-400 font-mono">{trResult.preservedTokens?.length || 0} tokens</span>
                      </div>
                    </div>

                    {trResult.preservedTokens && trResult.preservedTokens.length > 0 && (
                      <div className="bg-[#040614] p-3 rounded-lg border border-white/10">
                        <div className="text-[11px] text-slate-400 font-semibold mb-1.5">Protected Technical Tokens:</div>
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
                )
              ) : (
                <div className="h-48 flex items-center justify-center text-slate-500 text-xs italic">
                  Execute translation to see live output and preserved code tokens.
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: LID & CODE-SWITCHING */}
        {activeTab === 'lid' && (
          <div className="h-full grid grid-cols-1 lg:grid-cols-2 gap-4 overflow-y-auto">
            <div className="bg-[#080d25] border border-white/10 rounded-xl p-5 flex flex-col gap-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  Language Identification &amp; Code-Switching Analyzer
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Detects African tonal diacritics, regional phrases, and multi-language code-switched spans in real time.
                </p>
              </div>

              <textarea
                value={lidText}
                onChange={(e) => setLidText(e.target.value)}
                rows={5}
                className="w-full bg-[#040614] border border-white/10 rounded-lg p-2.5 text-white font-mono text-xs focus:outline-none focus:border-cyan-500"
              />

              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => setLidText('Ẹ n lẹ́ o, báwo ni gbogbo nǹkan ṣe ń lọ?')} className="px-2.5 py-1 bg-white/5 hover:bg-white/10 text-[11px] text-slate-300 rounded border border-white/10 cursor-pointer">
                  Yorùbá
                </button>
                <button type="button" onClick={() => setLidText('Kedu ka i mere taa? Biko meere m webụsaịtị.')} className="px-2.5 py-1 bg-white/5 hover:bg-white/10 text-[11px] text-slate-300 rounded border border-white/10 cursor-pointer">
                  Igbo
                </button>
                <button type="button" onClick={() => setLidText('Sannu, ina kwana? Ina son in gina sabon gidan yanar gizo.')} className="px-2.5 py-1 bg-white/5 hover:bg-white/10 text-[11px] text-slate-300 rounded border border-white/10 cursor-pointer">
                  Hausa
                </button>
                <button type="button" onClick={() => setLidText('Wetin dey happen my guy? Abeg make sure say dis code compile well.')} className="px-2.5 py-1 bg-white/5 hover:bg-white/10 text-[11px] text-slate-300 rounded border border-white/10 cursor-pointer">
                  Pidgin
                </button>
              </div>

              <button
                type="button"
                onClick={() => void runLid()}
                disabled={lidLoading}
                className="py-2.5 px-4 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50 cursor-pointer"
              >
                <Play className="w-4 h-4" />
                {lidLoading ? 'Analyzing...' : 'Analyze Language & Code-Switching'}
              </button>
            </div>

            <div className="bg-[#080d25] border border-white/10 rounded-xl p-5 flex flex-col gap-3">
              <h3 className="text-sm font-bold text-white">LID &amp; Dialect Diagnostic</h3>
              {lidResult ? (
                lidResult.error ? (
                  <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                    {lidResult.error}
                  </div>
                ) : (
                  <div className="space-y-3 text-xs">
                    <div className="bg-[#040614] p-3.5 rounded-lg border border-white/10 space-y-2">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Primary Language:</span>
                        <strong className="text-emerald-400">{lidResult.languageName} ({lidResult.primaryLanguage})</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Confidence:</span>
                        <span className="text-cyan-400 font-mono font-bold">{(lidResult.confidence * 100).toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Code-Switching:</span>
                        <span className={lidResult.isCodeSwitching ? 'text-amber-400 font-bold' : 'text-slate-400'}>
                          {lidResult.isCodeSwitching ? 'DETECTED' : 'MONOLINGUAL'}
                        </span>
                      </div>
                    </div>

                    {lidResult.codeSwitchingSegments && lidResult.codeSwitchingSegments.length > 0 && (
                      <div className="bg-[#040614] p-3 rounded-lg border border-white/10 space-y-1.5">
                        <div className="text-[11px] text-slate-400 font-semibold">Segmented Spans:</div>
                        {lidResult.codeSwitchingSegments.map((seg: any, idx: number) => (
                          <div key={idx} className="p-2 bg-[#080d25] rounded border border-white/5 flex justify-between items-center gap-2 text-[11px]">
                            <span className="text-slate-200 font-mono">"{seg.text}"</span>
                            <span className="px-2 py-0.5 bg-cyan-950 text-cyan-400 rounded text-[10px] border border-cyan-800 shrink-0">
                              {seg.language}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              ) : (
                <div className="h-48 flex items-center justify-center text-slate-500 text-xs italic">
                  Run language analysis to view live classification and code-switching spans.
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 5: 40-POINT LIVE CERTIFICATION */}
        {activeTab === 'audit' && (
          <div className="h-full flex flex-col gap-4 overflow-y-auto">
            <div className="bg-[#080d25] border border-white/10 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-cyan-400" />
                  Universal Language Live 40-Point Certification (P38-001 → P38-040)
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Verifies real host hardware, provider availability, LID accuracy, code-token preservation, and model routing.
                </p>
              </div>
              <button
                type="button"
                onClick={() => void runPhase38Audit()}
                disabled={auditRunning}
                className="py-2 px-5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-2 transition-colors disabled:opacity-50 cursor-pointer"
              >
                <Play className="w-4 h-4" />
                {auditRunning ? 'Running 40 Live Probes...' : 'Execute Live Certification'}
              </button>
            </div>

            {auditResult && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  <div className="bg-[#080d25] border border-white/10 p-3.5 rounded-xl">
                    <div className="text-slate-400 text-xs">Total Probes</div>
                    <div className="text-xl font-bold text-white mt-1">{auditResult.summary?.total || 40}</div>
                  </div>
                  <div className="bg-emerald-500/5 border border-emerald-500/30 p-3.5 rounded-xl">
                    <div className="text-emerald-400 text-xs">Passed</div>
                    <div className="text-xl font-bold text-emerald-400 mt-1">{auditResult.summary?.passed || 0}</div>
                  </div>
                  <div className="bg-purple-500/5 border border-purple-500/30 p-3.5 rounded-xl">
                    <div className="text-purple-300 text-xs">Env Blocked</div>
                    <div className="text-xl font-bold text-purple-300 mt-1">{auditResult.summary?.blocked || 0}</div>
                  </div>
                  <div className="bg-[#080d25] border border-white/10 p-3.5 rounded-xl">
                    <div className="text-slate-400 text-xs">Failed</div>
                    <div className="text-xl font-bold text-rose-400 mt-1">{auditResult.summary?.failed || 0}</div>
                  </div>
                  <div className="bg-cyan-500/5 border border-cyan-500/30 p-3.5 rounded-xl">
                    <div className="text-cyan-400 text-xs">Pass Rate</div>
                    <div className="text-xl font-bold text-cyan-400 mt-1">{auditResult.summary?.passRate || '0%'}</div>
                  </div>
                </div>

                <div className="bg-[#080d25] border border-white/10 rounded-xl overflow-hidden">
                  <div className="p-3 bg-[#0b102d] border-b border-white/10 font-semibold text-xs text-slate-200">
                    Live Execution Evidence (P38-001 to P38-040)
                  </div>
                  <div className="divide-y divide-white/5 max-h-[360px] overflow-y-auto">
                    {auditResult.tests?.map((test: any) => (
                      <div key={test.testId} className="p-3 hover:bg-white/[0.03] flex items-center justify-between gap-3 text-xs">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-cyan-400 font-semibold">{test.testId}</span>
                            <span className="font-medium text-white">{test.name}</span>
                            <span className="px-1.5 py-0.5 bg-slate-800 text-slate-400 text-[10px] rounded border border-slate-700">{test.category}</span>
                          </div>
                          <p className="text-slate-400 text-[11px]">{test.details}</p>
                        </div>
                        <div className="shrink-0">
                          {test.status === 'PASS' && (
                            <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded text-xs font-bold flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> PASS
                            </span>
                          )}
                          {test.status === 'BLOCKED_BY_ENVIRONMENT' && (
                            <span className="px-2.5 py-1 bg-purple-500/10 text-purple-300 border border-purple-500/30 rounded text-xs font-bold flex items-center gap-1">
                              <AlertCircle className="w-3.5 h-3.5" /> ENV
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
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
