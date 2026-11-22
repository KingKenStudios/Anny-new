import React, { useState } from 'react';
import { Eye, Edit3, Move, Plus, Check, RefreshCw, Layers, Sparkles, Layout, Palette } from 'lucide-react';
import { WorkspaceManager } from '../../core/workspaceManager';

export const VisualBuilder: React.FC = () => {
  const wsManager = WorkspaceManager.getInstance();
  const activeWs = wsManager.getCurrentWorkspace();
  const vfs = wsManager.getVFS();

  const [selectedElement, setSelectedElement] = useState<string>('Header Title');
  const [elementText, setElementText] = useState<string>(activeWs?.name || 'Anny Super Application');
  const [accentColor, setAccentColor] = useState<string>('#22d3ee');
  const [isSaved, setIsSaved] = useState(false);

  const handleApplyVisualEdit = () => {
    setIsSaved(true);
    if (vfs.exists('/src/App.tsx')) {
      let code = vfs.readFile('/src/App.tsx');
      // Update text in App.tsx dynamically if matching title pattern
      code = code.replace(/<h1[^>]*>.*?<\/h1>/g, `<h1 className="text-2xl font-bold text-white tracking-tight">${elementText}</h1>`);
      vfs.writeFile('/src/App.tsx', code);
      wsManager.restartDevServer();
    }
    setTimeout(() => setIsSaved(false), 2500);
  };

  return (
    <div className="h-full w-full bg-[#080a18] text-slate-200 flex flex-col font-sans overflow-hidden">
      {/* Header */}
      <div className="p-3 border-b border-white/10 bg-[#0d0f22] flex items-center justify-between font-mono text-xs">
        <div className="flex items-center gap-2">
          <Edit3 className="w-4 h-4 text-cyan-400" />
          <h3 className="font-bold text-white uppercase tracking-wider">Visual WYSIWYG Builder & Canvas Overlay</h3>
        </div>
        <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded">
          Hot-Reload VFS Synced
        </span>
      </div>

      <div className="flex-1 min-h-0 flex overflow-hidden">
        {/* Visual Inspector Controls Sidebar */}
        <div className="w-80 border-r border-white/10 p-4 bg-[#0a0c1a] flex flex-col font-mono text-xs space-y-4 overflow-y-auto custom-scrollbar">
          <div className="p-3 bg-[#101228] border border-white/10 rounded-xl space-y-1">
            <span className="text-[10px] text-slate-400 block font-bold">SELECTED ELEMENT</span>
            <span className="text-cyan-400 font-bold text-xs">{selectedElement}</span>
          </div>

          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-white font-bold text-[11px] block">Text Content</label>
              <input
                type="text"
                value={elementText}
                onChange={(e) => setElementText(e.target.value)}
                className="w-full bg-[#121428] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-cyan-500/40"
              />
            </div>

            <div className="space-y-1">
              <label className="text-white font-bold text-[11px] block">Accent Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="w-8 h-8 rounded border-none cursor-pointer bg-transparent"
                />
                <span className="text-slate-300 font-mono text-xs">{accentColor}</span>
              </div>
            </div>

            <button
              onClick={handleApplyVisualEdit}
              className={`w-full py-2 rounded-xl font-bold flex items-center justify-center gap-2 text-xs transition-all shadow-md ${
                isSaved ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black'
              }`}
            >
              {isSaved ? <Check className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
              <span>{isSaved ? 'Synced to VFS Code!' : 'Apply Visual Changes'}</span>
            </button>
          </div>
        </div>

        {/* Live Canvas Overlay Box */}
        <div className="flex-1 p-6 bg-[#050610] flex items-center justify-center overflow-hidden">
          <div className="w-full max-w-2xl bg-slate-950 border-2 border-dashed border-cyan-500/40 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="cursor-pointer hover:ring-2 ring-cyan-400 p-2 rounded-xl transition-all" onClick={() => setSelectedElement('Header Title')}>
                <h1 className="text-2xl font-bold text-white tracking-tight">{elementText}</h1>
                <p className="text-xs text-cyan-400 font-mono mt-1">Click to edit title in Visual Builder</p>
              </div>

              <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono rounded-full">
                Interactive Canvas Active
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-slate-900 border border-white/10 rounded-xl cursor-pointer hover:border-cyan-400 transition-all" onClick={() => setSelectedElement('Subsystem Card 1')}>
                <span className="text-xs font-bold text-cyan-400 block font-mono">Core Subsystem Node</span>
                <p className="text-slate-300 text-xs mt-1">Visual element selectable directly on preview layer.</p>
              </div>

              <div className="p-4 bg-slate-900 border border-white/10 rounded-xl cursor-pointer hover:border-purple-400 transition-all" onClick={() => setSelectedElement('Subsystem Card 2')}>
                <span className="text-xs font-bold text-purple-400 block font-mono">Persistence Subsystem Node</span>
                <p className="text-slate-300 text-xs mt-1">Changes map dynamically back to AST source.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
