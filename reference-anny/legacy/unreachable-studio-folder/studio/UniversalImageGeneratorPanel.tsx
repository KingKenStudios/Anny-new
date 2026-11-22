import React, { useState, useEffect } from 'react';
import { 
  Image as ImageIcon, Sparkles, Play, Download, Check, RefreshCw, 
  Layers, Box, Eye, Cpu, Zap
} from 'lucide-react';
import { imageGenerationEngine, GeneratedImageAsset } from '../../core/imageGenerationEngine';

export const UniversalImageGeneratorPanel: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [category, setCategory] = useState<'LOGO' | 'ICON' | 'UI_MOCKUP' | 'ARCHITECTURE' | 'ROBOTICS_CAD' | 'FLOWCHART'>('LOGO');
  const [stylePreset, setStylePreset] = useState<'tech_minimal' | 'cyberpunk' | 'industrial' | 'futuristic'>('tech_minimal');
  const [isGenerating, setIsGenerating] = useState(false);
  const [assets, setAssets] = useState<GeneratedImageAsset[]>(imageGenerationEngine.getGeneratedAssets());
  const [selectedAsset, setSelectedAsset] = useState<GeneratedImageAsset | null>(assets[0] || null);

  useEffect(() => {
    const unsubscribe = imageGenerationEngine.subscribe(() => {
      const updated = imageGenerationEngine.getGeneratedAssets();
      setAssets(updated);
      if (!selectedAsset && updated.length > 0) {
        setSelectedAsset(updated[0]);
      }
    });
    return () => unsubscribe();
  }, [selectedAsset]);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    try {
      const asset = await imageGenerationEngine.generateImage({
        prompt,
        assetCategory: category,
        stylePreset
      });
      setSelectedAsset(asset);
    } catch (e) {
      console.error(e);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="h-full w-full bg-[#03040d] text-slate-200 flex flex-col font-sans overflow-hidden">
      {/* Top Header */}
      <div className="p-3 border-b border-white/10 bg-[#080a1e] flex flex-wrap items-center justify-between gap-3 font-mono text-xs">
        <div className="flex items-center gap-2">
          <ImageIcon className="w-4 h-4 text-cyan-400" />
          <h3 className="font-bold text-white uppercase tracking-wider">AI Visual Asset & Vector Synthesis Engine (AIGE v1.0)</h3>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as any)}
            className="px-2.5 py-1.5 bg-[#03040e] border border-white/10 rounded-lg text-white text-xs focus:outline-none"
          >
            <option value="LOGO">Logo Badge</option>
            <option value="ICON">UI Icon</option>
            <option value="UI_MOCKUP">UI Wireframe</option>
            <option value="ARCHITECTURE">System Diagram</option>
            <option value="ROBOTICS_CAD">Robotics Concept</option>
            <option value="FLOWCHART">Process Flowchart</option>
          </select>

          <input
            type="text"
            placeholder="Describe visual prompt (e.g. AlienTech Cyber Neural Logo)..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
            className="w-72 px-3 py-1.5 bg-[#03040e] border border-white/10 rounded-lg text-white text-xs focus:outline-none focus:border-cyan-500"
          />

          <button
            onClick={handleGenerate}
            disabled={isGenerating || !prompt.trim()}
            className="px-4 py-1.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 text-white font-extrabold rounded-lg flex items-center gap-1.5 shadow-lg transition text-xs"
          >
            <Sparkles className="w-3.5 h-3.5 fill-current text-cyan-200" />
            <span>{isGenerating ? 'Synthesizing...' : 'Synthesize Image'}</span>
          </button>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 overflow-hidden">
        {/* Gallery Sidebar */}
        <div className="border-r border-white/10 p-3 bg-[#050718] overflow-y-auto space-y-2 custom-scrollbar">
          <span className="text-[10px] text-slate-400 font-mono block uppercase font-bold mb-2">Generated Asset Gallery ({assets.length})</span>
          {assets.map((asset) => {
            const isSelected = selectedAsset?.id === asset.id;
            return (
              <div
                key={asset.id}
                onClick={() => setSelectedAsset(asset)}
                className={`p-2.5 rounded-xl border transition cursor-pointer font-mono text-xs space-y-2 ${
                  isSelected
                    ? 'bg-cyan-500/15 border-cyan-400 text-white shadow-lg'
                    : 'bg-[#080a22] border-white/5 text-slate-300 hover:border-white/20'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-lg bg-black/60 border border-white/10 overflow-hidden flex items-center justify-center shrink-0">
                    <img src={asset.dataUrlOrPath} alt={asset.title} className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                  </div>
                  <div className="overflow-hidden">
                    <span className="font-bold text-xs block truncate">{asset.title}</span>
                    <span className="text-[10px] text-cyan-300 block">{asset.category} • {asset.dimensions.width}x{asset.dimensions.height}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected Image Stage */}
        <div className="col-span-2 p-6 bg-[#02030a] flex flex-col items-center justify-center relative overflow-hidden font-mono text-xs">
          {selectedAsset ? (
            <div className="w-full max-w-lg space-y-4 flex flex-col items-center">
              <div className="p-4 bg-[#07091a] border border-white/15 rounded-3xl shadow-2xl flex flex-col items-center relative overflow-hidden w-full">
                <div className="w-full h-80 bg-black/80 rounded-2xl border border-white/10 overflow-hidden flex items-center justify-center p-4">
                  <img
                    src={selectedAsset.dataUrlOrPath}
                    alt={selectedAsset.title}
                    className="max-h-full max-w-full object-contain filter drop-shadow-[0_0_20px_rgba(0,238,255,0.4)]"
                    referrerPolicy="no-referrer"
                  />
                </div>

                <div className="w-full mt-4 flex items-center justify-between text-xs">
                  <div>
                    <h4 className="font-bold text-white text-sm">{selectedAsset.title}</h4>
                    <p className="text-slate-400 text-[11px]">Workspace Path: {selectedAsset.workspacePath}</p>
                  </div>

                  <a
                    href={selectedAsset.dataUrlOrPath}
                    download={`${selectedAsset.category.toLowerCase()}_asset.svg`}
                    className="px-3.5 py-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold rounded-xl flex items-center gap-1.5 transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download SVG</span>
                  </a>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-slate-400">Synthesize a new visual image asset above.</div>
          )}
        </div>
      </div>
    </div>
  );
};
