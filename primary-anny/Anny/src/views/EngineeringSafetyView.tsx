import React, { useState, useEffect } from 'react';
import { MobileLogoMenu } from '../MobileLogoMenu';
import {
  Zap,
  Bot,
  Plane,
  Car,
  ShieldAlert,
  Download,
  Calculator,
  AlertTriangle,
  Search,
  CheckCircle2,
  Info,
} from 'lucide-react';
import { fetchWithAuth, safeFetchJson } from '../lib/apiUtils';
import {
  calculateElectricalAndSolar,
  calculateRoboticsMechatronics,
  calculateAerospacePreliminary,
  calculateVehicleEvPreliminary,
  searchSafetyChecklists,
  EngineeringCalculationResult,
  EngineeringDiscipline,
  SafetyChecklist,
} from '../core/engineeringSafetyEngine';

interface EngineeringSafetyViewProps {
  onToggleMobileMenu?: () => void;
}

export const EngineeringSafetyView: React.FC<EngineeringSafetyViewProps> = ({
  onToggleMobileMenu,
}) => {
  const [activeTab, setActiveTab] = useState<EngineeringDiscipline | 'safety'>('electrical_power');

  // Discipline form states
  const [elec, setElec] = useState({
    voltageV: 230,
    currentA: 24,
    phases: 1 as 1 | 3,
    powerFactor: 0.9,
    cableLengthM: 30,
    conductorMm2: 4,
    batteryVoltageV: 48,
    batteryAh: 100,
  });

  const [robo, setRobo] = useState({
    payloadKg: 4.5,
    armLengthM: 0.6,
    targetAngularAccelRadS2: 4,
    safetyFactor: 2.0,
    wheelDiameterM: 0.16,
    targetSpeedMS: 1.5,
  });

  const [aero, setAero] = useState({
    massKg: 14,
    wingAreaM2: 0.95,
    clMax: 1.35,
    liftToDragRatio: 11,
    staticThrustN: 65,
  });

  const [ev, setEv] = useState({
    vehicleMassKg: 1450,
    batteryKwh: 62,
    dragCd: 0.27,
    frontalAreaM2: 2.25,
    cruiseSpeedKmh: 95,
  });

  const [calcResult, setCalcResult] = useState<EngineeringCalculationResult | null>(() =>
    calculateElectricalAndSolar({ voltageV: 230, currentA: 24, phases: 1, cableLengthM: 30, conductorMm2: 4 })
  );
  const [calculating, setCalculating] = useState(false);

  const [safetyQuery, setSafetyQuery] = useState('');
  const [checklists, setChecklists] = useState<SafetyChecklist[]>(() => searchSafetyChecklists(''));

  const runCalculation = async (discipline: EngineeringDiscipline) => {
    setCalculating(true);
    const params =
      discipline === 'electrical_power'
        ? elec
        : discipline === 'robotics_mechatronics'
        ? robo
        : discipline === 'aerospace_preliminary'
        ? aero
        : ev;

    const runLocal = (): EngineeringCalculationResult => {
      if (discipline === 'electrical_power') return calculateElectricalAndSolar(elec);
      if (discipline === 'robotics_mechatronics') return calculateRoboticsMechatronics(robo);
      if (discipline === 'aerospace_preliminary') return calculateAerospacePreliminary(aero);
      return calculateVehicleEvPreliminary(ev);
    };

    try {
      const res = await fetchWithAuth('/api/engineering/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ discipline, params }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json?.result) {
        setCalcResult(json.result);
      } else {
        setCalcResult(runLocal());
      }
    } catch {
      setCalcResult(runLocal());
    } finally {
      setCalculating(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'safety') {
      void (async () => {
        const res = await safeFetchJson(`/api/safety/checklists?q=${encodeURIComponent(safetyQuery)}`);
        if (res.data?.checklists) {
          setChecklists(res.data.checklists);
        } else {
          setChecklists(searchSafetyChecklists(safetyQuery));
        }
      })();
    } else {
      void runCalculation(activeTab);
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'safety') {
      setChecklists(searchSafetyChecklists(safetyQuery));
    }
  }, [safetyQuery, activeTab]);

  const downloadToolchainFile = (artifact: NonNullable<EngineeringCalculationResult['toolchainArtifact']>) => {
    const blob = new Blob([artifact.content], { type: artifact.mimeType || 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = artifact.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#040612] text-slate-100 overflow-y-auto p-4 sm:p-6 lg:p-8 custom-scrollbar">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <MobileLogoMenu onToggleMobileMenu={onToggleMobileMenu} />
            <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold uppercase tracking-wider">
              Offline-First Workbench
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white mt-1 flex items-center gap-2.5">
            <Calculator className="w-7 h-7 text-cyan-400" />
            Engineering & Safety Assistant
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Deterministic calculations, OpenPLC / ROS 2 / OpenSCAD starter artifacts, and offline industrial & first-aid checklists.
          </p>
        </div>
      </div>

      {/* Discipline Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-6 scrollbar-none">
        {[
          { id: 'electrical_power', label: 'Electrical & Solar', icon: Zap },
          { id: 'robotics_mechatronics', label: 'Robotics & Mechatronics', icon: Bot },
          { id: 'aerospace_preliminary', label: 'Aerospace (Preliminary)', icon: Plane },
          { id: 'vehicle_ev', label: 'Vehicles & EV', icon: Car },
          { id: 'safety', label: 'Emergency & Safety Checklists', icon: ShieldAlert },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
                active
                  ? tab.id === 'safety'
                    ? 'bg-rose-500/20 text-rose-200 border border-rose-500/40'
                    : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'bg-[#080b22] text-slate-400 hover:text-white border border-white/10'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {activeTab === 'safety' ? (
        <div className="space-y-6 max-w-5xl">
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-3 text-xs text-rose-200">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <span>
              <strong>IMPORTANT SAFETY NOTICE:</strong> These checklists run completely offline for immediate awareness only. ANNY does <strong>NOT</strong> automatically dial 911 / 112 / 999 or dispatch emergency services, and is <strong>NOT</strong> a medical diagnosis tool.
            </span>
          </div>

          <div className="relative max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={safetyQuery}
              onChange={(e) => setSafetyQuery(e.target.value)}
              placeholder="Search checklists (electrical, lithium fire, LOTO, E-Stop, first aid)..."
              className="w-full bg-[#080b22] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {checklists.map((list) => (
              <div key={list.id} className="p-5 rounded-2xl bg-[#080b22] border border-white/10 space-y-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-bold text-white">{list.title}</h3>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      list.urgency === 'CRITICAL'
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    }`}
                  >
                    {list.urgency}
                  </span>
                </div>

                <div>
                  <p className="text-[10px] font-mono uppercase text-cyan-400 mb-1.5">Immediate Steps</p>
                  <ol className="list-decimal list-inside space-y-1 text-xs text-slate-200">
                    {list.immediateSteps.map((step, i) => (
                      <li key={i}>{step}</li>
                    ))}
                  </ol>
                </div>

                <div>
                  <p className="text-[10px] font-mono uppercase text-rose-400 mb-1">Do Not Do</p>
                  <ul className="list-disc list-inside space-y-1 text-xs text-slate-300">
                    {list.doNotDo.map((d, i) => (
                      <li key={i}>{d}</li>
                    ))}
                  </ul>
                </div>

                <div className="p-3 rounded-xl bg-black/40 border border-white/10 text-[11px] text-amber-200">
                  <strong>Dispatch Guidance:</strong> {list.emergencyCallGuidance}
                </div>
                <p className="text-[10px] text-slate-400 italic">{list.disclaimer}</p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-6xl">
          {/* Input Parameters Panel */}
          <div className="lg:col-span-5 bg-[#080b22] border border-white/10 rounded-2xl p-6 space-y-5">
            <h2 className="text-sm font-bold uppercase tracking-wider text-cyan-400">
              Engineering Parameters
            </h2>

            {activeTab === 'electrical_power' && (
              <div className="grid grid-cols-2 gap-3 text-xs">
                <NumberField label="Voltage (V)" value={elec.voltageV} onChange={(v) => setElec({ ...elec, voltageV: v })} />
                <NumberField label="Current (A)" value={elec.currentA} onChange={(v) => setElec({ ...elec, currentA: v })} />
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Phases</label>
                  <select
                    value={elec.phases}
                    onChange={(e) => setElec({ ...elec, phases: Number(e.target.value) === 3 ? 3 : 1 })}
                    className="w-full bg-[#090d28] border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    <option value={1}>1-Phase</option>
                    <option value={3}>3-Phase</option>
                  </select>
                </div>
                <NumberField label="Power Factor" value={elec.powerFactor} step={0.05} onChange={(v) => setElec({ ...elec, powerFactor: v })} />
                <NumberField label="Cable Run (m)" value={elec.cableLengthM} onChange={(v) => setElec({ ...elec, cableLengthM: v })} />
                <NumberField label="Conductor (mm²)" value={elec.conductorMm2} onChange={(v) => setElec({ ...elec, conductorMm2: v })} />
                <NumberField label="Battery (V)" value={elec.batteryVoltageV} onChange={(v) => setElec({ ...elec, batteryVoltageV: v })} />
                <NumberField label="Battery (Ah)" value={elec.batteryAh} onChange={(v) => setElec({ ...elec, batteryAh: v })} />
              </div>
            )}

            {activeTab === 'robotics_mechatronics' && (
              <div className="grid grid-cols-2 gap-3 text-xs">
                <NumberField label="Payload (kg)" value={robo.payloadKg} step={0.5} onChange={(v) => setRobo({ ...robo, payloadKg: v })} />
                <NumberField label="Arm Length (m)" value={robo.armLengthM} step={0.05} onChange={(v) => setRobo({ ...robo, armLengthM: v })} />
                <NumberField label="Accel (rad/s²)" value={robo.targetAngularAccelRadS2} step={0.5} onChange={(v) => setRobo({ ...robo, targetAngularAccelRadS2: v })} />
                <NumberField label="Safety Factor" value={robo.safetyFactor} step={0.2} onChange={(v) => setRobo({ ...robo, safetyFactor: v })} />
                <NumberField label="Wheel Dia (m)" value={robo.wheelDiameterM} step={0.01} onChange={(v) => setRobo({ ...robo, wheelDiameterM: v })} />
                <NumberField label="Linear Speed (m/s)" value={robo.targetSpeedMS} step={0.1} onChange={(v) => setRobo({ ...robo, targetSpeedMS: v })} />
              </div>
            )}

            {activeTab === 'aerospace_preliminary' && (
              <div className="grid grid-cols-2 gap-3 text-xs">
                <NumberField label="Mass (kg)" value={aero.massKg} step={0.5} onChange={(v) => setAero({ ...aero, massKg: v })} />
                <NumberField label="Wing Area (m²)" value={aero.wingAreaM2} step={0.05} onChange={(v) => setAero({ ...aero, wingAreaM2: v })} />
                <NumberField label="Cl max" value={aero.clMax} step={0.05} onChange={(v) => setAero({ ...aero, clMax: v })} />
                <NumberField label="L/D Ratio" value={aero.liftToDragRatio} step={0.5} onChange={(v) => setAero({ ...aero, liftToDragRatio: v })} />
                <NumberField label="Static Thrust (N)" value={aero.staticThrustN} step={1} onChange={(v) => setAero({ ...aero, staticThrustN: v })} />
              </div>
            )}

            {activeTab === 'vehicle_ev' && (
              <div className="grid grid-cols-2 gap-3 text-xs">
                <NumberField label="Vehicle Mass (kg)" value={ev.vehicleMassKg} step={25} onChange={(v) => setEv({ ...ev, vehicleMassKg: v })} />
                <NumberField label="Battery (kWh)" value={ev.batteryKwh} step={1} onChange={(v) => setEv({ ...ev, batteryKwh: v })} />
                <NumberField label="Aero Cd" value={ev.dragCd} step={0.01} onChange={(v) => setEv({ ...ev, dragCd: v })} />
                <NumberField label="Frontal Area (m²)" value={ev.frontalAreaM2} step={0.05} onChange={(v) => setEv({ ...ev, frontalAreaM2: v })} />
                <NumberField label="Cruise Speed (km/h)" value={ev.cruiseSpeedKmh} step={5} onChange={(v) => setEv({ ...ev, cruiseSpeedKmh: v })} />
              </div>
            )}

            <button
              onClick={() => void runCalculation(activeTab)}
              disabled={calculating}
              className="w-full py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs uppercase tracking-wider cursor-pointer transition-all"
            >
              {calculating ? 'Computing...' : 'Compute Deterministic Sizing'}
            </button>
          </div>

          {/* Calculation Outputs & Toolchain Export */}
          <div className="lg:col-span-7 space-y-5">
            {calcResult && (
              <div className="bg-[#080b22] border border-white/10 rounded-2xl p-6 space-y-5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h2 className="text-base font-bold text-white">{calcResult.title}</h2>
                    <p className="text-[11px] text-slate-400 mt-0.5">Standard textbook physics & electrical estimates</p>
                  </div>
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {calcResult.outputs.map((out, idx) => (
                    <div key={idx} className="p-3.5 rounded-xl bg-[#050818] border border-white/10">
                      <p className="text-[11px] text-slate-400">{out.label}</p>
                      <p className="text-base font-bold font-mono text-cyan-300 mt-0.5">
                        {out.value} <span className="text-xs text-slate-400">{out.unit}</span>
                      </p>
                      {out.notes && <p className="text-[10px] text-slate-500 mt-1">{out.notes}</p>}
                    </div>
                  ))}
                </div>

                {calcResult.warnings.length > 0 && (
                  <div className="space-y-2">
                    {calcResult.warnings.map((w, i) => (
                      <div key={i} className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        <span>{w}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="p-3.5 rounded-xl bg-rose-500/5 border border-rose-500/20 text-[11px] text-rose-200 flex items-start gap-2">
                  <Info className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>{calcResult.disclaimer}</span>
                </div>

                {calcResult.toolchainArtifact && (
                  <div className="p-4 rounded-xl bg-[#050818] border border-white/10 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-xs font-bold text-white">{calcResult.toolchainArtifact.toolName}</p>
                        <p className="text-[10px] font-mono text-slate-400">{calcResult.toolchainArtifact.filename}</p>
                      </div>
                      <button
                        onClick={() => downloadToolchainFile(calcResult.toolchainArtifact!)}
                        className="px-3 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download Starter</span>
                      </button>
                    </div>
                    <pre className="text-[11px] font-mono text-emerald-300/90 max-h-48 overflow-auto p-3 bg-black/50 rounded-lg border border-white/5">
                      {calcResult.toolchainArtifact.content}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

function NumberField({
  label,
  value,
  step = 1,
  onChange,
}: {
  label: string;
  value: number;
  step?: number;
  onChange: (val: number) => void;
}) {
  return (
    <div>
      <label className="text-[11px] text-slate-400 block mb-1">{label}</label>
      <input
        type="number"
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="w-full bg-[#090d28] border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-cyan-500/50"
      />
    </div>
  );
}
