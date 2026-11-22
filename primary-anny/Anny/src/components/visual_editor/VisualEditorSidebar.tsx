import React from 'react';
import { Layers, Plus, FileText, Sparkles, Image as ImageIcon, Settings, Trash2, Eye, EyeOff, Lock, Unlock, ChevronDown, ChevronRight, Wand2 } from 'lucide-react';
import { EditableNode, SectionGroup, PageItem } from '../VisualEditor';

export interface VisualEditorSidebarProps {
  activeDockTab: 'pages' | 'layers' | 'ai_builder' | 'pen_tool' | 'add' | 'assets' | 'settings';
  setActiveDockTab: (tab: 'pages' | 'layers' | 'ai_builder' | 'pen_tool' | 'add' | 'assets' | 'settings') => void;
  sections: SectionGroup[];
  selectedElementIds: string[];
  setSelectedElementIds: (ids: string[]) => void;
  selectedSectionId: string | null;
  setSelectedSectionId: (id: string | null) => void;
  pages: PageItem[];
  activePage: string;
  setActivePage: (p: string) => void;
  aiPromptText: string;
  setAiPromptText: (txt: string) => void;
  onApplyAiPrompt: () => void;
  isAiProcessing: boolean;
  onAddElement: (type: EditableNode['type']) => void;
  onDeleteElement: (id: string) => void;
}

export const VisualEditorSidebar: React.FC<VisualEditorSidebarProps> = ({
  activeDockTab,
  setActiveDockTab,
  sections,
  selectedElementIds,
  setSelectedElementIds,
  selectedSectionId,
  setSelectedSectionId,
  pages,
  activePage,
  setActivePage,
  aiPromptText,
  setAiPromptText,
  onApplyAiPrompt,
  isAiProcessing,
  onAddElement,
  onDeleteElement
}) => {
  return (
    <div className="w-64 bg-[#070913] border-r border-white/10 flex flex-col shrink-0">
      {/* Dock Tabs Bar */}
      <div className="flex items-center border-b border-white/10 p-1 bg-[#090d1a] text-xs font-mono">
        {[
          { id: 'layers', label: 'Layers', icon: Layers },
          { id: 'add', label: 'Add', icon: Plus },
          { id: 'ai_builder', label: 'AI Modify', icon: Sparkles },
          { id: 'pages', label: 'Pages', icon: FileText },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeDockTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveDockTab(tab.id as any)}
              className={`flex-1 py-1.5 flex items-center justify-center gap-1 rounded-md transition-all ${
                isActive
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-[11px]">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Panel Body */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* LAYERS TREE */}
        {activeDockTab === 'layers' && (
          <div className="space-y-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Section Hierarchy</span>
            {sections.map(section => (
              <div key={section.id} className="border border-white/10 rounded-xl bg-[#0b0f1f] overflow-hidden">
                <div
                  onClick={() => setSelectedSectionId(section.id)}
                  className={`p-2 flex items-center justify-between text-xs font-mono cursor-pointer transition-all ${
                    selectedSectionId === section.id
                      ? 'bg-cyan-500/20 text-cyan-300 font-bold border-b border-cyan-500/30'
                      : 'text-slate-300 hover:bg-white/5'
                  }`}
                >
                  <span className="truncate">{section.name}</span>
                  <span className="text-[10px] text-slate-500">{section.elements.length} nodes</span>
                </div>

                <div className="p-1 space-y-1">
                  {section.elements.map(el => {
                    const isSelected = selectedElementIds.includes(el.id);
                    return (
                      <div
                        key={el.id}
                        onClick={() => setSelectedElementIds([el.id])}
                        className={`px-2 py-1.5 rounded-lg text-xs cursor-pointer flex items-center justify-between transition-all ${
                          isSelected
                            ? 'bg-cyan-500/30 text-white font-semibold border border-cyan-500/50'
                            : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                        }`}
                      >
                        <span className="truncate flex-1">{el.name || el.tag}</span>
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            onDeleteElement(el.id);
                          }}
                          className="p-1 text-slate-500 hover:text-rose-400 rounded opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ADD ELEMENTS PALETTE */}
        {activeDockTab === 'add' && (
          <div className="space-y-3">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Insert Components</span>
            <div className="grid grid-cols-2 gap-2">
              {[
                { type: 'heading', label: 'Heading' },
                { type: 'text', label: 'Paragraph' },
                { type: 'button', label: 'Button' },
                { type: 'image', label: 'Image' },
                { type: 'card', label: 'Card Container' },
                { type: 'badge', label: 'Badge' },
              ].map(item => (
                <button
                  key={item.type}
                  onClick={() => onAddElement(item.type as any)}
                  className="p-2.5 bg-[#0e1322] hover:bg-cyan-950/40 border border-white/10 hover:border-cyan-500/40 rounded-xl text-left text-xs font-mono text-slate-200 hover:text-cyan-300 transition-all flex flex-col gap-1"
                >
                  <Plus className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* AI BUILDER / MODIFIER */}
        {activeDockTab === 'ai_builder' && (
          <div className="space-y-3">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">AI Visual Modifier</span>
            <p className="text-xs text-slate-400 leading-relaxed">
              Describe how you want to modify the selected canvas element or section in plain natural language.
            </p>
            <textarea
              value={aiPromptText}
              onChange={e => setAiPromptText(e.target.value)}
              placeholder="e.g. Change button background to emerald green with rounded pill border..."
              rows={4}
              className="w-full bg-[#0d1222] border border-cyan-500/30 focus:border-cyan-400 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none"
            />
            <button
              disabled={isAiProcessing || !aiPromptText.trim()}
              onClick={onApplyAiPrompt}
              className="w-full py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 disabled:opacity-40 transition-all shadow-md shadow-cyan-500/20"
            >
              <Wand2 className="w-3.5 h-3.5" />
              <span>{isAiProcessing ? 'Applying...' : 'Apply AI Modification'}</span>
            </button>
          </div>
        )}

        {/* PAGES */}
        {activeDockTab === 'pages' && (
          <div className="space-y-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">App Pages</span>
            {pages.map(page => (
              <div
                key={page.id}
                onClick={() => setActivePage(page.path)}
                className={`p-2.5 rounded-xl border text-xs font-mono cursor-pointer flex items-center justify-between transition-all ${
                  activePage === page.path
                    ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300 font-bold'
                    : 'border-white/10 text-slate-300 hover:bg-white/5'
                }`}
              >
                <span>{page.name}</span>
                <span className="text-[10px] text-slate-500">{page.path}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
