import React from 'react';
import { Monitor, Tablet, Smartphone, Undo, Redo, ZoomIn, ZoomOut, Maximize2, Code, FileText, Download, Share2, Sparkles, Layers, RefreshCw } from 'lucide-react';

export interface VisualEditorHeaderProps {
  projectName: string;
  viewport: 'desktop' | 'tablet' | 'mobile';
  setViewport: (v: 'desktop' | 'tablet' | 'mobile') => void;
  canvasMode: 'visual_nodes' | 'live_app';
  setCanvasMode: (m: 'visual_nodes' | 'live_app') => void;
  zoomLevel: number;
  setZoomLevel: React.Dispatch<React.SetStateAction<number>>;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onSwitchTab?: (tab: 'preview' | 'code' | 'files' | 'terminal' | 'database') => void;
  onRefreshVFS?: () => void;
  onExport?: () => void;
}

export const VisualEditorHeader: React.FC<VisualEditorHeaderProps> = ({
  projectName,
  viewport,
  setViewport,
  canvasMode,
  setCanvasMode,
  zoomLevel,
  setZoomLevel,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onSwitchTab,
  onRefreshVFS,
  onExport
}) => {
  return (
    <header className="h-13 bg-[#080b1a] border-b border-white/10 px-4 flex items-center justify-between shrink-0 z-20">
      {/* Left: Title & Refresh */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
            <Layers className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-bold text-white truncate max-w-[160px]">{projectName}</span>
        </div>

        {onRefreshVFS && (
          <button
            onClick={onRefreshVFS}
            className="p-1.5 text-slate-400 hover:text-cyan-400 hover:bg-white/5 rounded-lg transition-all"
            title="Reload VFS Code Sections"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Center: Viewport & Canvas Mode Switcher */}
      <div className="flex items-center gap-3">
        {/* Canvas Mode Toggle */}
        <div className="flex items-center bg-[#0d1222] border border-white/10 rounded-lg p-0.5 text-xs font-mono">
          <button
            onClick={() => setCanvasMode('visual_nodes')}
            className={`px-3 py-1 rounded-md transition-all ${
              canvasMode === 'visual_nodes'
                ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Visual Nodes
          </button>
          <button
            onClick={() => setCanvasMode('live_app')}
            className={`px-3 py-1 rounded-md transition-all ${
              canvasMode === 'live_app'
                ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Live Runner
          </button>
        </div>

        {/* Viewport Width Controls */}
        <div className="flex items-center bg-[#0d1222] border border-white/10 rounded-lg p-0.5">
          <button
            onClick={() => setViewport('desktop')}
            className={`p-1.5 rounded transition-all ${
              viewport === 'desktop' ? 'bg-white/15 text-cyan-400' : 'text-slate-400 hover:text-white'
            }`}
            title="Desktop View (100%)"
          >
            <Monitor className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setViewport('tablet')}
            className={`p-1.5 rounded transition-all ${
              viewport === 'tablet' ? 'bg-white/15 text-cyan-400' : 'text-slate-400 hover:text-white'
            }`}
            title="Tablet View (768px)"
          >
            <Tablet className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setViewport('mobile')}
            className={`p-1.5 rounded transition-all ${
              viewport === 'mobile' ? 'bg-white/15 text-cyan-400' : 'text-slate-400 hover:text-white'
            }`}
            title="Mobile View (375px)"
          >
            <Smartphone className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Zoom Controls */}
        <div className="hidden md:flex items-center gap-1 text-slate-400 text-xs font-mono">
          <button
            onClick={() => setZoomLevel(prev => Math.max(50, prev - 10))}
            className="p-1 hover:text-white rounded"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="w-9 text-center">{zoomLevel}%</span>
          <button
            onClick={() => setZoomLevel(prev => Math.min(150, prev + 10))}
            className="p-1 hover:text-white rounded"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Right: Undo/Redo & Actions */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 border-r border-white/10 pr-2">
          <button
            disabled={!canUndo}
            onClick={onUndo}
            className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none rounded hover:bg-white/5"
            title="Undo (Ctrl+Z)"
          >
            <Undo className="w-3.5 h-3.5" />
          </button>
          <button
            disabled={!canRedo}
            onClick={onRedo}
            className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none rounded hover:bg-white/5"
            title="Redo (Ctrl+Y)"
          >
            <Redo className="w-3.5 h-3.5" />
          </button>
        </div>

        {onSwitchTab && (
          <button
            onClick={() => onSwitchTab('code')}
            className="px-2.5 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-slate-300 hover:text-white text-xs font-mono flex items-center gap-1.5 transition-all"
          >
            <Code className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">View Code</span>
          </button>
        )}

        {onExport && (
          <button
            onClick={onExport}
            className="px-3 py-1 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold rounded-lg text-xs transition-all flex items-center gap-1.5 shadow-md shadow-cyan-500/20"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export</span>
          </button>
        )}
      </div>
    </header>
  );
};
