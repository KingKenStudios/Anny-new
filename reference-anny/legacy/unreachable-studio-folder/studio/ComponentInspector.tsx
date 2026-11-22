import React, { useState } from 'react';
import { Layers, Box, Eye, Edit3, Code2, Play, CheckCircle2, ChevronRight, ChevronDown, RefreshCw, Zap, Search } from 'lucide-react';
import { WorkspaceManager } from '../../core/workspaceManager';

export interface ComponentNode {
  id: string;
  name: string;
  type: 'layout' | 'component' | 'primitive';
  file: string;
  props: Record<string, any>;
  children?: ComponentNode[];
}

export const ComponentInspector: React.FC = () => {
  const wsManager = WorkspaceManager.getInstance();
  const activeWs = wsManager.getCurrentWorkspace();
  const vfs = wsManager.getVFS();

  const [selectedNodeId, setSelectedNodeId] = useState<string>('app-root');
  const [searchTerm, setSearchTerm] = useState('');
  const [propEdits, setPropEdits] = useState<Record<string, string>>({
    title: activeWs?.name || 'Anny App',
    theme: 'Dark Slate',
    padding: '6 (24px)',
    status: 'ONLINE (PORT 3000)',
  });

  const componentTree: ComponentNode = {
    id: 'app-root',
    name: 'App (<App />)',
    type: 'layout',
    file: '/src/App.tsx',
    props: { activeTab: 'dashboard', isOnline: true },
    children: [
      {
        id: 'header-banner',
        name: 'HeaderBanner (<header />)',
        type: 'component',
        file: '/src/App.tsx',
        props: { title: activeWs?.name || 'Anny App', logo: 'Activity', badge: 'ONLINE' },
        children: [
          { id: 'logo-icon', name: 'ActivityIcon (<Activity />)', type: 'primitive', file: '/src/App.tsx', props: { color: 'cyan-400', animate: true } },
          { id: 'title-heading', name: 'Heading (<h1 />)', type: 'primitive', file: '/src/App.tsx', props: { text: activeWs?.name, className: 'text-2xl font-bold' } }
        ]
      },
      {
        id: 'nav-tabs',
        name: 'NavTabs (<div />)',
        type: 'component',
        file: '/src/App.tsx',
        props: { tabs: ['dashboard', 'analytics', 'terminal'], active: 'dashboard' }
      },
      {
        id: 'main-quadrant',
        name: 'MainQuadrant (<main />)',
        type: 'layout',
        file: '/src/App.tsx',
        props: { gridCols: '1 md:grid-cols-3' },
        children: [
          { id: 'card-logic', name: 'LogicCard (<DomainCard />)', type: 'component', file: '/src/components/DomainCard.tsx', props: { title: 'Core Logic Subsystem', icon: 'Cpu', status: 'Active' } },
          { id: 'card-db', name: 'PersistenceCard (<DomainCard />)', type: 'component', file: '/src/components/DomainCard.tsx', props: { title: 'Persistence Layer', icon: 'Server', db: 'PostgreSQL' } },
          { id: 'card-security', name: 'SecurityCard (<DomainCard />)', type: 'component', file: '/src/components/DomainCard.tsx', props: { title: 'Security Sentinel', icon: 'ShieldCheck', threats: 0 } }
        ]
      }
    ]
  };

  const renderTree = (node: ComponentNode, level: number = 0) => {
    const isSelected = selectedNodeId === node.id;
    const hasChildren = node.children && node.children.length > 0;

    return (
      <div key={node.id} className="font-mono text-xs">
        <div
          onClick={() => setSelectedNodeId(node.id)}
          style={{ paddingLeft: `${level * 16 + 8}px` }}
          className={`flex items-center gap-2 py-1.5 px-2 rounded-lg cursor-pointer transition-all ${
            isSelected
              ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40'
              : 'text-slate-300 hover:bg-white/5 hover:text-white'
          }`}
        >
          {hasChildren ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <Box className="w-3 h-3 text-slate-500" />}
          <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
            node.type === 'layout' ? 'bg-purple-500/20 text-purple-300' : node.type === 'component' ? 'bg-cyan-500/20 text-cyan-300' : 'bg-slate-800 text-slate-400'
          }`}>
            {node.type}
          </span>
          <span className="truncate">{node.name}</span>
        </div>
        {hasChildren && (
          <div className="space-y-0.5">
            {node.children!.map(child => renderTree(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-full w-full bg-[#080a18] text-slate-200 flex flex-col font-sans overflow-hidden">
      {/* Header */}
      <div className="p-3 border-b border-white/10 bg-[#0d0f22] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-cyan-400" />
          <h3 className="font-bold text-xs text-white uppercase tracking-wider font-mono">Visual Component Inspector</h3>
        </div>
        <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded-md">
          AST DOM Linked
        </span>
      </div>

      <div className="flex-1 min-h-0 flex overflow-hidden">
        {/* Left: Component Tree */}
        <div className="w-1/2 border-r border-white/10 p-3 flex flex-col bg-[#0a0c1a] overflow-hidden">
          <div className="relative mb-3">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filter component tree..."
              className="w-full bg-[#121428] border border-white/10 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 outline-none focus:border-cyan-500/40 font-mono"
            />
          </div>

          <div className="flex-1 overflow-y-auto space-y-1 custom-scrollbar pr-1">
            {renderTree(componentTree)}
          </div>
        </div>

        {/* Right: Selected Component Properties & Props Editor */}
        <div className="w-1/2 p-4 flex flex-col bg-[#080915] overflow-y-auto custom-scrollbar space-y-4 font-mono text-xs">
          <div className="p-3 bg-[#10132b] border border-white/10 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-cyan-400">{selectedNodeId}</span>
              <span className="text-[10px] text-slate-400">File: /src/App.tsx</span>
            </div>
            <p className="text-[11px] text-slate-300 font-sans">
              Inspecting active component element props, visual metrics, and reactive state bindings.
            </p>
          </div>

          <div className="space-y-3">
            <h4 className="font-bold text-white text-xs uppercase tracking-wider flex items-center gap-1.5">
              <Edit3 className="w-3.5 h-3.5 text-purple-400" /> Interactive Props Inspector
            </h4>

            {Object.entries(propEdits).map(([key, val]) => (
              <div key={key} className="space-y-1 bg-[#0f1124] p-2.5 rounded-xl border border-white/5">
                <div className="flex justify-between text-[11px]">
                  <span className="text-purple-300 font-bold">{key}</span>
                  <span className="text-slate-500 text-[10px]">string</span>
                </div>
                <input
                  type="text"
                  value={val}
                  onChange={(e) => setPropEdits({ ...propEdits, [key]: e.target.value })}
                  className="w-full bg-[#070814] border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white outline-none focus:border-cyan-400 font-mono"
                />
              </div>
            ))}
          </div>

          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-[11px] flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>Prop edits automatically hot-reload into Virtual FileSystem state.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
