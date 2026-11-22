import React, { useState, useEffect } from 'react';
import { 
  Box, Layers, ShieldCheck, Database, FileText, Image as ImageIcon, 
  Cpu, Zap, Eye, Terminal, FileCode, CheckCircle2, Play, Code, ArrowRight
} from 'lucide-react';
import { universalArtifactEngine, Artifact, ArtifactType } from '../../core/universalArtifactEngine';
import { universalPreviewEngine } from '../../core/universalPreviewEngine';

export const UniversalArtifactsViewer: React.FC = () => {
  const [artifacts, setArtifacts] = useState<Artifact[]>(universalArtifactEngine.getArtifacts());
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [selectedArtifact, setSelectedArtifact] = useState<Artifact | null>(artifacts[0] || null);

  useEffect(() => {
    const unsubscribe = universalArtifactEngine.subscribe(() => {
      const updated = universalArtifactEngine.getArtifacts();
      setArtifacts(updated);
      if (!selectedArtifact && updated.length > 0) {
        setSelectedArtifact(updated[0]);
      }
    });
    return () => unsubscribe();
  }, [selectedArtifact]);

  const filtered = selectedType === 'ALL' 
    ? artifacts 
    : artifacts.filter(a => a.type === selectedType);

  const handlePreviewArtifact = (art: Artifact) => {
    setSelectedArtifact(art);
    universalPreviewEngine.routePreview(art);
  };

  return (
    <div className="h-full w-full bg-[#03040d] text-slate-200 flex flex-col font-sans overflow-hidden">
      {/* Top Bar */}
      <div className="p-3 border-b border-white/10 bg-[#080a1e] flex flex-wrap items-center justify-between gap-3 font-mono text-xs">
        <div className="flex items-center gap-2">
          <Box className="w-4 h-4 text-cyan-400" />
          <h3 className="font-bold text-white uppercase tracking-wider">Universal Artifact Engine Registry ({artifacts.length} Artifacts)</h3>
        </div>

        {/* Filter Categories */}
        <div className="flex items-center gap-1 overflow-x-auto text-[11px]">
          {['ALL', 'REACT_APP', 'LOGO', 'MARKDOWN', 'IMAGE', 'DATABASE', 'PLC_PROGRAM', 'STL_CAD'].map(type => (
            <button
              key={type}
              onClick={() => setSelectedType(type)}
              className={`px-2.5 py-1 rounded-lg border transition shrink-0 ${
                selectedType === type
                  ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 font-bold'
                  : 'bg-[#040512] border-white/10 text-slate-400 hover:text-white'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 overflow-hidden">
        {/* Artifact List */}
        <div className="border-r border-white/10 p-3 bg-[#050718] overflow-y-auto space-y-2 custom-scrollbar">
          <span className="text-[10px] text-slate-400 font-mono block uppercase font-bold mb-2">Registered Artifacts</span>
          {filtered.map((art) => {
            const isSelected = selectedArtifact?.id === art.id;
            return (
              <div
                key={art.id}
                onClick={() => setSelectedArtifact(art)}
                className={`p-3 rounded-xl border transition cursor-pointer font-mono text-xs space-y-1.5 ${
                  isSelected
                    ? 'bg-cyan-500/15 border-cyan-400 text-white shadow-lg'
                    : 'bg-[#090c24] border-white/5 text-slate-300 hover:border-white/20'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold truncate text-xs">{art.name}</span>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-cyan-500/10 border border-cyan-500/30 text-cyan-300">
                    {art.type}
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 truncate">Path: {art.workspaceLocation}</div>
                <div className="flex items-center justify-between text-[10px] pt-1 border-t border-white/5">
                  <span className="text-emerald-400 font-bold">{art.verificationStatus}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePreviewArtifact(art);
                    }}
                    className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 font-bold uppercase text-[10px]"
                  >
                    <Eye className="w-3 h-3" />
                    <span>Preview</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Artifact Inspector */}
        <div className="col-span-2 p-4 bg-[#03040d] overflow-y-auto font-mono text-xs space-y-4 custom-scrollbar">
          {selectedArtifact ? (
            <div className="space-y-4">
              <div className="p-4 bg-[#080a22] border border-white/10 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-cyan-400 font-bold block uppercase tracking-wider">SELECTED ARTIFACT DETAILS</span>
                  <h4 className="text-base font-bold text-white mt-0.5">{selectedArtifact.name}</h4>
                  <p className="text-slate-400 text-xs mt-1">ID: {selectedArtifact.id} • Version: {selectedArtifact.version}</p>
                </div>

                <button
                  onClick={() => handlePreviewArtifact(selectedArtifact)}
                  className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-extrabold rounded-xl flex items-center gap-2 shadow-lg transition text-xs"
                >
                  <Eye className="w-4 h-4" />
                  <span>Launch Preview</span>
                </button>
              </div>

              {/* Artifact Attributes */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 bg-[#080a22] border border-white/5 rounded-xl">
                  <span className="text-[10px] text-slate-400 block font-bold">TYPE</span>
                  <span className="text-cyan-300 font-bold mt-1 block">{selectedArtifact.type}</span>
                </div>
                <div className="p-3 bg-[#080a22] border border-white/5 rounded-xl">
                  <span className="text-[10px] text-slate-400 block font-bold">PREVIEW ROUTE</span>
                  <span className="text-purple-300 font-bold mt-1 block">{selectedArtifact.previewType}</span>
                </div>
                <div className="p-3 bg-[#080a22] border border-white/5 rounded-xl">
                  <span className="text-[10px] text-slate-400 block font-bold">VERIFICATION</span>
                  <span className="text-emerald-400 font-bold mt-1 block">{selectedArtifact.verificationStatus}</span>
                </div>
                <div className="p-3 bg-[#080a22] border border-white/5 rounded-xl">
                  <span className="text-[10px] text-slate-400 block font-bold">AUDIT STATUS</span>
                  <span className="text-teal-300 font-bold mt-1 block">{selectedArtifact.auditStatus}</span>
                </div>
              </div>

              {/* Metadata JSON */}
              <div className="p-4 bg-[#080a22] border border-white/10 rounded-2xl space-y-2">
                <span className="font-bold text-white text-xs block">Artifact Metadata & Configuration</span>
                <pre className="p-3 bg-[#03040e] border border-white/5 rounded-xl text-[11px] text-slate-300 overflow-x-auto">
                  {JSON.stringify(selectedArtifact.metadata, null, 2)}
                </pre>
              </div>

              {/* Lineage & Relationships */}
              <div className="p-4 bg-[#080a22] border border-white/10 rounded-2xl space-y-2">
                <span className="font-bold text-white text-xs block">Artifact Relationship & Dependency Lineage</span>
                {selectedArtifact.relationships.length === 0 ? (
                  <div className="text-slate-400 text-xs">Root artifact (no parent dependencies)</div>
                ) : (
                  <div className="space-y-1.5">
                    {selectedArtifact.relationships.map((rel, i) => (
                      <div key={i} className="p-2 bg-[#03040e] border border-white/5 rounded-lg flex items-center justify-between text-xs">
                        <span>Target: <strong className="text-cyan-300">{rel.artifactId}</strong></span>
                        <span className="px-2 py-0.5 bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 rounded text-[10px] uppercase font-bold">
                          {rel.relationType}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-slate-400">Select an artifact to inspect its lineage and metadata.</div>
          )}
        </div>
      </div>
    </div>
  );
};
