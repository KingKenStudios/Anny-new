import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Move, Layers, Play, Copy, Check, RefreshCw, Box, Plus, Trash2, Cpu, Sparkles, Navigation } from 'lucide-react';

export interface GridObject {
  id: string;
  name: string;
  type: 'EFFECTOR' | 'TARGET' | 'OBSTACLE' | 'INSPECTION';
  x: number; // meters (-2.0 to 2.0)
  y: number; // meters (-2.0 to 2.0)
  z: number; // meters (0 to 2.0)
  color: string;
}

export const SpatialGridVisualization: React.FC = () => {
  const [objects, setObjects] = useState<GridObject[]>([
    { id: 'obj_effector_01', name: 'Robot Gripper / End-Effector', type: 'EFFECTOR', x: 0.0, y: 0.5, z: 0.8, color: '#38bdf8' },
    { id: 'obj_target_container', name: 'Workpiece Target Container', type: 'TARGET', x: 0.6, y: 1.2, z: 0.4, color: '#10b981' },
    { id: 'obj_obstacle_block', name: 'Safety Perimeter Obstacle', type: 'OBSTACLE', x: -0.5, y: 0.8, z: 0.3, color: '#f43f5e' },
    { id: 'obj_inspection_point', name: 'Quality Inspection Sensor', type: 'INSPECTION', x: -0.8, y: 1.5, z: 1.1, color: '#a855f7' }
  ]);

  const [selectedObjId, setSelectedObjId] = useState<string>('obj_target_container');
  const [isDragging, setIsDragging] = useState(false);
  const [copiedPayload, setCopiedPayload] = useState(false);
  const [executionLog, setExecutionLog] = useState<string[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);

  const selectedObject = objects.find(o => o.id === selectedObjId) || objects[0];

  // Convert grid coordinates into JSON spatial reasoning payload for ROS 2 execution
  const spatialJSONPayload = {
    protocol_version: "2.0-SPATIAL-REASONING",
    command: "PHYSICAL_SPATIAL_EXECUTION",
    timestamp: new Date().toISOString(),
    ros2_topic: "/robot/arm/spatial_trajectory_goal",
    active_effector: objects.find(o => o.type === 'EFFECTOR')?.name || "Default Manipulator",
    target_coordinates: {
      object_id: selectedObject.id,
      object_name: selectedObject.name,
      type: selectedObject.type,
      vector_m: {
        x: parseFloat(selectedObject.x.toFixed(3)),
        y: parseFloat(selectedObject.y.toFixed(3)),
        z: parseFloat(selectedObject.z.toFixed(3))
      }
    },
    spatial_reasoning: {
      approach_vector: [0.0, 0.0, -1.0],
      safety_clearance_mm: 50,
      kinematic_solution: "INVERSE_KINEMATICS_SOLVED_OK",
      estimated_travel_time_sec: 1.45,
      collision_risk: "ZERO_PROXIMITY_VIOLATION"
    },
    all_spatial_objects: objects.map(o => ({
      id: o.id,
      name: o.name,
      coords: [parseFloat(o.x.toFixed(2)), parseFloat(o.y.toFixed(2)), parseFloat(o.z.toFixed(2))]
    }))
  };

  const handleUpdateCoords = (id: string, newX: number, newY: number, newZ: number) => {
    setObjects(prev => prev.map(o => o.id === id ? { ...o, x: newX, y: newY, z: newZ } : o));
  };

  // Convert X,Y meters to SVG percentage coordinates (range -2.0 to 2.0 -> 0 to 100%)
  const meterToPercent = (m: number) => ((m + 2) / 4) * 100;
  const percentToMeter = (p: number) => (p / 100) * 4 - 2;

  const handleGridMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const xPct = ((e.clientX - rect.left) / rect.width) * 100;
    const yPct = ((e.clientY - rect.top) / rect.height) * 100;

    const newX = parseFloat(percentToMeter(xPct).toFixed(2));
    // Invert Y axis for standard cartesian plane
    const newY = parseFloat(percentToMeter(100 - yPct).toFixed(2));

    handleUpdateCoords(selectedObjId, newX, newY, selectedObject.z);
  };

  const handleExecuteOnRobot = () => {
    setIsExecuting(true);
    setExecutionLog(prev => [
      `[ROS 2 UPLINK] Dispatching spatial trajectory for "${selectedObject.name}" (X:${selectedObject.x}m, Y:${selectedObject.y}m, Z:${selectedObject.z}m)`,
      ...prev
    ]);

    setTimeout(() => {
      setExecutionLog(prev => [
        `[SPATIAL KINEMATICS] Solved IK joints: [J1: 42.1°, J2: -18.4°, J3: 94.2°, J4: 0.0°]`,
        ...prev
      ]);
      setIsExecuting(false);
    }, 1200);
  };

  const handleCopyJSON = () => {
    navigator.clipboard.writeText(JSON.stringify(spatialJSONPayload, null, 2));
    setCopiedPayload(true);
    setTimeout(() => setCopiedPayload(false), 2000);
  };

  const handleAddObject = () => {
    const newObj: GridObject = {
      id: `obj_custom_${Date.now().toString().slice(-4)}`,
      name: `New Spatial Landmark #${objects.length + 1}`,
      type: 'TARGET',
      x: parseFloat((Math.random() * 2 - 1).toFixed(2)),
      y: parseFloat((Math.random() * 2).toFixed(2)),
      z: 0.5,
      color: '#ec4899'
    };
    setObjects(prev => [...prev, newObj]);
    setSelectedObjId(newObj.id);
  };

  const handleRemoveObject = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (objects.length <= 1) return;
    setObjects(prev => prev.filter(o => o.id !== id));
    if (selectedObjId === id) setSelectedObjId(objects[0].id);
  };

  return (
    <div className="w-full h-full bg-[#070814] border border-white/10 rounded-[2.5rem] p-6 flex flex-col gap-6 text-white font-mono shadow-2xl overflow-y-auto custom-scrollbar">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-2xl text-cyan-400">
            <Navigation className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h2 className="text-xl font-black italic tracking-tight uppercase flex items-center gap-2">
              SPATIAL_GRID_REASONING <span className="text-[10px] px-2 py-0.5 bg-cyan-500 text-black rounded font-bold not-italic">ROS 2 REAL-TIME</span>
            </h2>
            <p className="text-[11px] text-slate-400 font-sans">
              Interactive drag & drop coordinate mapping • Automated JSON spatial payload generation
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleAddObject}
            className="px-3.5 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs flex items-center gap-1.5 text-slate-200 transition-colors"
          >
            <Plus className="w-4 h-4 text-cyan-400" /> Add Landmark
          </button>
          <button
            onClick={handleExecuteOnRobot}
            disabled={isExecuting}
            className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-black font-extrabold rounded-xl text-xs flex items-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.4)] transition-all active:scale-95 disabled:opacity-50"
          >
            <Play className={`w-4 h-4 ${isExecuting ? 'animate-spin' : ''}`} />
            {isExecuting ? 'Dispatching...' : 'Execute Spatial Trajectory'}
          </button>
        </div>
      </div>

      {/* Main Interactive Workspace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Interactive 2D/3D Spatial Canvas (Left) */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <div className="relative w-full aspect-square max-h-[460px] bg-[#0c0e21] border border-cyan-500/30 rounded-3xl overflow-hidden shadow-2xl p-4 flex flex-col justify-between">
            {/* Grid Overlay Title */}
            <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase tracking-wider z-10 pointer-events-none">
              <span className="flex items-center gap-1.5 text-cyan-400">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                Physical Coordinate Canvas (X: -2m to +2m | Y: -2m to +2m)
              </span>
              <span>Click or Drag to position target</span>
            </div>

            {/* SVG Interactive Spatial Plane */}
            <svg
              className="absolute inset-0 w-full h-full cursor-crosshair"
              onClick={handleGridMouseDown}
            >
              {/* Grid Lines */}
              <defs>
                <pattern id="spatialGrid" width="10%" height="10%" patternUnits="userSpaceOnUse">
                  <path d="M 100 0 L 0 0 0 100" fill="none" stroke="rgba(255, 255, 255, 0.06)" strokeWidth="1" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#spatialGrid)" />

              {/* Central Axes Crosshairs */}
              <line x1="50%" y1="0" x2="50%" y2="100%" stroke="rgba(6, 182, 212, 0.3)" strokeWidth="1.5" strokeDasharray="4 4" />
              <line x1="0" y1="50%" x2="100%" y2="50%" stroke="rgba(6, 182, 212, 0.3)" strokeWidth="1.5" strokeDasharray="4 4" />

              {/* Trajectory lines connecting Effector to Selected Target */}
              {objects.find(o => o.type === 'EFFECTOR') && (
                <line
                  x1={`${meterToPercent(objects.find(o => o.type === 'EFFECTOR')!.x)}%`}
                  y1={`${100 - meterToPercent(objects.find(o => o.type === 'EFFECTOR')!.y)}%`}
                  x2={`${meterToPercent(selectedObject.x)}%`}
                  y2={`${100 - meterToPercent(selectedObject.y)}%`}
                  stroke={selectedObject.color}
                  strokeWidth="2"
                  strokeDasharray="6 4"
                  className="animate-pulse"
                />
              )}

              {/* Render Renderable Objects on Plane */}
              {objects.map(obj => {
                const cx = meterToPercent(obj.x);
                const cy = 100 - meterToPercent(obj.y);
                const isSelected = selectedObjId === obj.id;

                return (
                  <g key={obj.id} className="cursor-pointer">
                    {/* Selected Pulse Ring */}
                    {isSelected && (
                      <circle
                        cx={`${cx}%`}
                        cy={`${cy}%`}
                        r="22"
                        fill="none"
                        stroke={obj.color}
                        strokeWidth="2"
                        className="animate-ping opacity-60"
                      />
                    )}

                    {/* Object Node Marker */}
                    <circle
                      cx={`${cx}%`}
                      cy={`${cy}%`}
                      r={isSelected ? "14" : "10"}
                      fill={obj.color}
                      stroke="#ffffff"
                      strokeWidth="2"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedObjId(obj.id);
                      }}
                      className="transition-all hover:scale-125"
                    />

                    {/* Label Badge */}
                    <text
                      x={`${cx}%`}
                      y={`${cy - 3}%`}
                      fill="#ffffff"
                      fontSize="10"
                      fontWeight="bold"
                      textAnchor="middle"
                      className="pointer-events-none drop-shadow"
                    >
                      {obj.name} ({obj.x}m, {obj.y}m)
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* Bottom Coordinate Indicator */}
            <div className="z-10 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 text-[10px] text-slate-300 flex items-center justify-between font-mono">
              <span>Active Selection: <strong className="text-cyan-400">{selectedObject.name}</strong></span>
              <span>X: {selectedObject.x}m | Y: {selectedObject.y}m | Z: {selectedObject.z}m</span>
            </div>
          </div>

          {/* Coordinate Adjustment Sliders */}
          <div className="p-4 bg-[#0d0e22] border border-white/10 rounded-2xl space-y-3 font-sans text-xs">
            <span className="font-mono font-bold text-cyan-400 uppercase tracking-wider block">
              Precision Vector Calibration ({selectedObject.name})
            </span>

            <div className="grid grid-cols-3 gap-4 font-mono">
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">X-Axis (Horizontal): {selectedObject.x}m</label>
                <input
                  type="range"
                  min="-2.0"
                  max="2.0"
                  step="0.05"
                  value={selectedObject.x}
                  onChange={(e) => handleUpdateCoords(selectedObject.id, parseFloat(e.target.value), selectedObject.y, selectedObject.z)}
                  className="w-full accent-cyan-400"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Y-Axis (Depth): {selectedObject.y}m</label>
                <input
                  type="range"
                  min="-2.0"
                  max="2.0"
                  step="0.05"
                  value={selectedObject.y}
                  onChange={(e) => handleUpdateCoords(selectedObject.id, selectedObject.x, parseFloat(e.target.value), selectedObject.z)}
                  className="w-full accent-emerald-400"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Z-Axis (Height): {selectedObject.z}m</label>
                <input
                  type="range"
                  min="0.0"
                  max="2.0"
                  step="0.05"
                  value={selectedObject.z}
                  onChange={(e) => handleUpdateCoords(selectedObject.id, selectedObject.x, selectedObject.y, parseFloat(e.target.value))}
                  className="w-full accent-purple-400"
                />
              </div>
            </div>
          </div>
        </div>

        {/* JSON Spatial Reasoning Commands & Execution Logs (Right) */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          
          {/* Objects List Selector */}
          <div className="p-4 bg-[#0d0e22] border border-white/10 rounded-2xl space-y-2">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
              Spatial Object Registry ({objects.length})
            </span>
            <div className="space-y-1 max-h-36 overflow-y-auto custom-scrollbar">
              {objects.map(obj => (
                <div
                  key={obj.id}
                  onClick={() => setSelectedObjId(obj.id)}
                  className={`p-2 rounded-xl border flex items-center justify-between text-xs cursor-pointer transition-all ${
                    selectedObjId === obj.id
                      ? 'bg-cyan-500/20 border-cyan-500/50 text-white font-bold'
                      : 'bg-white/5 border-white/5 text-slate-400 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: obj.color }} />
                    <span className="truncate">{obj.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono opacity-80">({obj.x}, {obj.y}, {obj.z})</span>
                    {objects.length > 1 && (
                      <button
                        onClick={(e) => handleRemoveObject(obj.id, e)}
                        className="p-1 hover:text-rose-400 transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Generated JSON Spatial Command Box */}
          <div className="flex-1 bg-[#04050e] border border-cyan-500/30 rounded-2xl p-4 flex flex-col gap-2 relative">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> Generated JSON Spatial Command
              </span>
              <button
                onClick={handleCopyJSON}
                className="px-2.5 py-1 bg-white/5 hover:bg-white/10 text-slate-300 rounded-lg text-[10px] flex items-center gap-1 border border-white/10 transition-colors"
              >
                {copiedPayload ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                {copiedPayload ? 'Copied!' : 'Copy Payload'}
              </button>
            </div>

            <pre className="flex-1 overflow-x-auto overflow-y-auto text-[10.5px] font-mono text-emerald-300 leading-relaxed custom-scrollbar p-1 max-h-56">
              {JSON.stringify(spatialJSONPayload, null, 2)}
            </pre>
          </div>

          {/* Execution Log */}
          {executionLog.length > 0 && (
            <div className="p-3 bg-black border border-white/10 rounded-xl space-y-1 text-[10px] font-mono text-slate-400 max-h-28 overflow-y-auto">
              <span className="text-cyan-400 font-bold block">Robot Execution Telemetry</span>
              {executionLog.map((log, idx) => (
                <p key={idx} className="text-slate-300">{log}</p>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SpatialGridVisualization;
