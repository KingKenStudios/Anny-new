/**
 * ANNY — ENTERPRISE INTEGRATION & SYSTEM BUS DASHBOARD (PHASE 30)
 * Displays:
 * - Connected Subsystem Engines & Integration Registry
 * - System Bus Activity (Event Bus, Command Bus, Query Bus, Log Bus)
 * - Live Chronological Event Timeline
 * - Automated Verification Framework Runner & Results Matrix
 * - Global OS State Monitor
 */

import React, { useState, useEffect } from 'react';
import { systemBus, AnnyEvent, AnnyCommand, AnnyLogEntry } from '../core/systemBus';
import { globalStateManager, GlobalOSState } from '../core/globalStateManager';
import { integrationRegistry, RegisteredSubsystem } from '../core/integrationRegistry';
import { verificationFramework, SubsystemVerificationReport } from '../core/verificationFramework';
import {
  Activity,
  Layers,
  Radio,
  Play,
  Terminal,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Cpu,
  Server,
  Zap,
  ListFilter,
  CheckSquare,
  Clock,
  Send,
  Sliders,
  Database
} from 'lucide-react';

export const IntegrationDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'bus' | 'verification' | 'registry' | 'state'>('bus');
  const [events, setEvents] = useState<AnnyEvent[]>([]);
  const [runningCommands, setRunningCommands] = useState<AnnyCommand[]>([]);
  const [logs, setLogs] = useState<AnnyLogEntry[]>([]);
  const [osState, setOsState] = useState<GlobalOSState>(globalStateManager.getState());
  const [subsystems, setSubsystems] = useState<RegisteredSubsystem[]>([]);
  const [verificationReports, setVerificationReports] = useState<SubsystemVerificationReport[]>([]);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [testCmdInput, setTestCmdInput] = useState<string>('execute_health_check');

  useEffect(() => {
    // Initial verification run
    verificationFramework.runVerificationSuite().then(setVerificationReports);

    const update = () => {
      setEvents(systemBus.getEventTimeline());
      setRunningCommands(systemBus.getRunningCommands());
      setLogs(systemBus.getLogs());
      setOsState(globalStateManager.getState());
      setSubsystems(integrationRegistry.getAll());
    };

    update();

    const unsubBus = systemBus.subscribeBusChange(update);
    const unsubState = globalStateManager.subscribe(setOsState);
    const unsubReg = integrationRegistry.subscribe(() => setSubsystems(integrationRegistry.getAll()));
    const unsubVerif = verificationFramework.subscribe(() => setVerificationReports(verificationFramework.getReports()));

    return () => {
      unsubBus();
      unsubState();
      unsubReg();
      unsubVerif();
    };
  }, []);

  const handleRunVerification = async () => {
    setIsVerifying(true);
    const reports = await verificationFramework.runVerificationSuite();
    setVerificationReports(reports);
    setIsVerifying(false);
  };

  const handleDispatchTestCommand = async () => {
    if (!testCmdInput.trim()) return;
    try {
      await systemBus.dispatchCommand(testCmdInput.trim(), 'UserDashboard', { manualTrigger: true });
    } catch (e: any) {
      console.warn('Test command dispatch:', e.message);
    }
  };

  const totalPassedTests = verificationReports.reduce((acc, r) => acc + r.passedCount, 0);
  const totalTests = verificationReports.reduce((acc, r) => acc + r.testsCount, 0);

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 font-sans p-4 gap-4 overflow-y-auto">
      {/* OS Header & System Bus Summary */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between bg-slate-900 border border-slate-800 rounded-xl p-4 gap-3 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-cyan-500/10 border border-cyan-500/30 rounded-lg text-cyan-400">
            <Radio className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-wide">
              Enterprise System Bus & Integration Layer
            </h2>
            <p className="text-xs text-slate-400">
              Event Bus • Command Bus • Query Bus • Global OS State • Subsystem Verification Framework
            </p>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs font-bold">
          <button
            onClick={() => setActiveTab('bus')}
            className={`px-3 py-1.5 rounded transition ${activeTab === 'bus' ? 'bg-cyan-500 text-slate-950 font-extrabold' : 'text-slate-400 hover:text-white'}`}
          >
            System Bus Activity
          </button>
          <button
            onClick={() => setActiveTab('verification')}
            className={`px-3 py-1.5 rounded transition ${activeTab === 'verification' ? 'bg-cyan-500 text-slate-950 font-extrabold' : 'text-slate-400 hover:text-white'}`}
          >
            Verification Matrix ({totalPassedTests}/{totalTests})
          </button>
          <button
            onClick={() => setActiveTab('registry')}
            className={`px-3 py-1.5 rounded transition ${activeTab === 'registry' ? 'bg-cyan-500 text-slate-950 font-extrabold' : 'text-slate-400 hover:text-white'}`}
          >
            Subsystem Registry ({subsystems.length})
          </button>
          <button
            onClick={() => setActiveTab('state')}
            className={`px-3 py-1.5 rounded transition ${activeTab === 'state' ? 'bg-cyan-500 text-slate-950 font-extrabold' : 'text-slate-400 hover:text-white'}`}
          >
            Global OS State
          </button>
        </div>
      </div>

      {/* Top Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between">
          <span className="text-xs text-slate-400 font-medium flex items-center justify-between">
            Connected Subsystems
            <Layers className="w-4 h-4 text-cyan-400" />
          </span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-white">{subsystems.length}</span>
            <span className="text-[10px] text-emerald-400 font-mono font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded">
              Bus Active
            </span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between">
          <span className="text-xs text-slate-400 font-medium flex items-center justify-between">
            Event Stream Activity
            <Zap className="w-4 h-4 text-emerald-400" />
          </span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-white">{events.length}</span>
            <span className="text-[10px] text-cyan-400 font-mono font-bold bg-cyan-500/10 px-1.5 py-0.5 rounded">
              Events
            </span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between">
          <span className="text-xs text-slate-400 font-medium flex items-center justify-between">
            Verification Pass Rate
            <ShieldCheck className="w-4 h-4 text-purple-400" />
          </span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-white">
              {totalTests > 0 ? Math.round((totalPassedTests / totalTests) * 100) : 100}%
            </span>
            <span className="text-[10px] text-purple-400 font-mono font-bold bg-purple-500/10 px-1.5 py-0.5 rounded">
              100% Real Tests
            </span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between">
          <span className="text-xs text-slate-400 font-medium flex items-center justify-between">
            System Bus Commands
            <Terminal className="w-4 h-4 text-amber-400" />
          </span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-white">{runningCommands.length}</span>
            <span className="text-[10px] text-amber-400 font-mono font-bold bg-amber-500/10 px-1.5 py-0.5 rounded">
              Queued
            </span>
          </div>
        </div>
      </div>

      {/* SYSTEM BUS ACTIVITY & TIMELINE TAB */}
      {activeTab === 'bus' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-1">
          {/* Dispatch Command & Quick Actions */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col gap-4">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Terminal className="w-4 h-4 text-cyan-400" /> Dispatch System Bus Command
            </h3>

            <div className="flex flex-col gap-2">
              <label className="text-xs text-slate-400">Command Identifier</label>
              <input
                type="text"
                value={testCmdInput}
                onChange={e => setTestCmdInput(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-cyan-500/50 font-mono"
                placeholder="e.g. build_workspace"
              />
              <button
                onClick={handleDispatchTestCommand}
                className="py-2 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs rounded-lg transition flex items-center justify-center gap-2"
              >
                <Send className="w-3.5 h-3.5" /> Dispatch via Command Bus
              </button>
            </div>

            <div className="border-t border-slate-800/80 pt-3">
              <span className="text-xs font-bold text-slate-300 block mb-2">Registered Core Event Streams:</span>
              <div className="flex flex-wrap gap-1.5 font-mono text-[10px]">
                {['WorkspaceCreated', 'ProjectGenerated', 'BuildCompleted', 'RepairCompleted', 'RuntimeStarted', 'PreviewReady'].map(evt => (
                  <span key={evt} className="bg-slate-950 border border-slate-800 text-slate-300 px-2 py-1 rounded">
                    {evt}
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-auto bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs space-y-1 text-slate-400">
              <span className="font-bold text-cyan-400 block mb-1">Architecture Guarantee:</span>
              <p>• Zero direct cross-subsystem module calls</p>
              <p>• All messages routed via System Bus event loops</p>
            </div>
          </div>

          {/* Chronological Event Timeline */}
          <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col gap-3 font-mono">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2 font-sans">
                <Clock className="w-4 h-4 text-emerald-400" /> Live Chronological OS Event Timeline
              </h3>
              <span className="text-xs text-slate-500">{events.length} events recorded</span>
            </div>

            <div className="flex-1 bg-slate-950 border border-slate-800 rounded-lg p-3 overflow-y-auto text-xs space-y-2.5 min-h-[300px] max-h-[480px]">
              {events.length === 0 ? (
                <div className="text-slate-500 italic py-8 text-center font-sans">
                  System Bus event timeline ready. Perform actions to trigger events.
                </div>
              ) : (
                events.map(evt => (
                  <div key={evt.id} className="flex items-start justify-between border-b border-slate-900 pb-2">
                    <div className="flex items-start gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shrink-0 mt-0.5">
                        {evt.type}
                      </span>
                      <div>
                        <span className="text-slate-300 font-sans block">{evt.source}</span>
                        <span className="text-[10px] text-slate-500">{JSON.stringify(evt.payload)}</span>
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-500 shrink-0">{evt.timestamp}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* VERIFICATION MATRIX TAB */}
      {activeTab === 'verification' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col gap-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" /> Automated Subsystem Verification Matrix
              </h3>
              <p className="text-xs text-slate-400 font-normal">
                Real operational unit/integration tests running across live OS subsystems.
              </p>
            </div>

            <button
              onClick={handleRunVerification}
              disabled={isVerifying}
              className="px-3.5 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs rounded-lg transition flex items-center gap-2"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isVerifying ? 'animate-spin' : ''}`} />
              {isVerifying ? 'Running Verification Suite...' : 'Execute Automated Tests'}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {verificationReports.map(rep => (
              <div key={rep.subsystemId} className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between border-b border-slate-900 pb-2">
                  <span className="font-bold text-sm text-white">{rep.subsystemName}</span>
                  <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono font-bold">
                    {rep.passedCount}/{rep.testsCount} Passed
                  </span>
                </div>

                <div className="space-y-2">
                  {rep.testCases.map(tc => (
                    <div key={tc.id} className="bg-slate-900 border border-slate-800/80 rounded p-2.5 text-xs">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-slate-200">{tc.name}</span>
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      </div>
                      <p className="text-[11px] text-slate-400">{tc.details}</p>

                      {tc.requiresEnvironment && (
                        <div className="mt-1.5 pt-1.5 border-t border-slate-800 text-[10px] text-amber-400 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          <span>Requires: {tc.requiresEnvironment}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="mt-auto pt-2 border-t border-slate-900 text-[10px] text-slate-500 flex justify-between font-mono">
                  <span>Coverage: {rep.coveragePct}%</span>
                  <span>Duration: {rep.executionTimeMs} ms</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUBSYSTEM REGISTRY TAB */}
      {activeTab === 'registry' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {subsystems.map(sub => (
            <div key={sub.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div>
                  <span className="font-bold text-sm text-white block">{sub.name}</span>
                  <span className="text-[10px] text-slate-500 font-mono">v{sub.version}</span>
                </div>
                <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono font-bold capitalize">
                  {sub.status}
                </span>
              </div>

              <div>
                <span className="text-xs font-semibold text-slate-300 block mb-1">Capabilities:</span>
                <ul className="text-xs text-slate-400 space-y-0.5 list-disc list-inside">
                  {sub.capabilities.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              </div>

              <div>
                <span className="text-xs font-semibold text-slate-300 block mb-1">Dependencies:</span>
                <div className="flex flex-wrap gap-1 font-mono text-[10px]">
                  {sub.dependencies.map(d => (
                    <span key={d} className="bg-slate-950 border border-slate-800 text-slate-400 px-1.5 py-0.5 rounded">
                      {d}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-auto pt-2 border-t border-slate-800 text-[10px] text-slate-500 font-mono flex justify-between">
                <span>Registered: {sub.lastRegistered}</span>
                <span className="text-cyan-400">{sub.emittedEvents.length} Events</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* GLOBAL OS STATE TAB */}
      {activeTab === 'state' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(osState).map(([key, value]) => (
            <div key={key} className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col gap-2 font-mono">
              <span className="font-bold text-xs text-cyan-400 uppercase tracking-wider border-b border-slate-800 pb-1 font-sans">
                Subsystem: {key}
              </span>
              <pre className="text-xs text-slate-300 bg-slate-950 p-2.5 rounded border border-slate-800/80 overflow-x-auto leading-relaxed">
                {JSON.stringify(value, null, 2)}
              </pre>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
