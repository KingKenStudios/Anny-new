import React from 'react';
import { DynamicVFSAppRunner } from '../StandalonePreviewRunner';
import { EditableNode, SectionGroup } from '../VisualEditor';

export interface VisualEditorCanvasProps {
  canvasMode: 'visual_nodes' | 'live_app';
  viewport: 'desktop' | 'tablet' | 'mobile';
  zoomLevel: number;
  sections: SectionGroup[];
  selectedElementIds: string[];
  setSelectedElementIds: (ids: string[]) => void;
  selectedSectionId: string | null;
  setSelectedSectionId: (id: string | null) => void;
  editingInlineId: string | null;
  setEditingInlineId: (id: string | null) => void;
  inlineTextValue: string;
  setInlineTextValue: (txt: string) => void;
  onCommitInlineEdit: (id: string, text: string) => void;
}

export const VisualEditorCanvas: React.FC<VisualEditorCanvasProps> = ({
  canvasMode,
  viewport,
  zoomLevel,
  sections,
  selectedElementIds,
  setSelectedElementIds,
  selectedSectionId,
  setSelectedSectionId,
  editingInlineId,
  setEditingInlineId,
  inlineTextValue,
  setInlineTextValue,
  onCommitInlineEdit
}) => {
  const getViewportWidth = () => {
    if (viewport === 'mobile') return 'w-[375px] max-w-full';
    if (viewport === 'tablet') return 'w-[768px] max-w-full';
    return 'w-full';
  };

  if (canvasMode === 'live_app') {
    return (
      <div className="flex-1 bg-[#050610] p-4 flex items-center justify-center overflow-auto relative">
        <div className={`h-full bg-black rounded-2xl border border-white/10 overflow-hidden shadow-2xl transition-all ${getViewportWidth()}`}>
          <DynamicVFSAppRunner />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-[#050610] p-6 overflow-auto flex justify-center items-start relative">
      <div
        style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }}
        className={`bg-[#080b1a] border border-white/15 rounded-2xl shadow-2xl overflow-hidden transition-all duration-300 min-h-[600px] ${getViewportWidth()}`}
      >
        {sections.map(section => {
          const isSectionSelected = selectedSectionId === section.id;
          return (
            <div
              key={section.id}
              onClick={e => {
                e.stopPropagation();
                setSelectedSectionId(section.id);
              }}
              style={{ backgroundColor: section.bgColor || 'transparent' }}
              className={`p-6 border-b transition-all relative ${
                isSectionSelected ? 'border-cyan-500/60 ring-1 ring-cyan-500/30' : 'border-white/5'
              }`}
            >
              <div className="space-y-4">
                {section.elements.map(el => {
                  const isNodeSelected = selectedElementIds.includes(el.id);
                  const isEditingInline = editingInlineId === el.id;

                  return (
                    <div
                      key={el.id}
                      onClick={e => {
                        e.stopPropagation();
                        setSelectedElementIds([el.id]);
                        setSelectedSectionId(section.id);
                      }}
                      onDoubleClick={e => {
                        e.stopPropagation();
                        setEditingInlineId(el.id);
                        setInlineTextValue(el.content);
                      }}
                      className={`relative p-2 rounded-lg cursor-pointer transition-all ${
                        isNodeSelected
                          ? 'ring-2 ring-cyan-400 bg-cyan-500/10 shadow-lg shadow-cyan-500/10'
                          : 'hover:outline hover:outline-1 hover:outline-cyan-500/30'
                      }`}
                    >
                      {/* Selection Tag */}
                      {isNodeSelected && (
                        <span className="absolute -top-3 left-2 px-1.5 py-0.5 bg-cyan-500 text-slate-950 font-mono font-bold text-[9px] rounded shadow-md z-10 uppercase">
                          {el.tag || el.type}
                        </span>
                      )}

                      {/* Content rendering */}
                      {isEditingInline ? (
                        <input
                          type="text"
                          value={inlineTextValue}
                          onChange={e => setInlineTextValue(e.target.value)}
                          onBlur={() => onCommitInlineEdit(el.id, inlineTextValue)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') onCommitInlineEdit(el.id, inlineTextValue);
                          }}
                          autoFocus
                          className="w-full bg-[#0d1222] border border-cyan-400 rounded px-2 py-1 text-white font-mono text-sm focus:outline-none"
                        />
                      ) : (
                        <div className={el.classes}>
                          {el.type === 'image' && el.mediaUrl ? (
                            <img src={el.mediaUrl} alt={el.name} className="max-w-full rounded-xl object-cover" />
                          ) : (
                            <span>{el.content}</span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
