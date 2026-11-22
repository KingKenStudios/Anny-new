import React from 'react';
import { Sliders, Type, AlignLeft, AlignCenter, AlignRight, Palette, Image as ImageIcon, Link as LinkIcon, Settings } from 'lucide-react';
import { EditableNode, SectionGroup } from '../VisualEditor';

export interface VisualEditorPropertiesProps {
  selectedElement: EditableNode | null;
  selectedSection: SectionGroup | null;
  onUpdateElement: (updated: EditableNode) => void;
  onUpdateSection: (updated: SectionGroup) => void;
}

export const VisualEditorProperties: React.FC<VisualEditorPropertiesProps> = ({
  selectedElement,
  selectedSection,
  onUpdateElement,
  onUpdateSection
}) => {
  if (!selectedElement && !selectedSection) {
    return (
      <div className="w-72 bg-[#070913] border-l border-white/10 p-4 text-center text-xs text-slate-500 font-mono shrink-0 flex flex-col items-center justify-center">
        <Sliders className="w-8 h-8 text-slate-600 mb-2" />
        <span>Select an element or section on canvas to edit properties</span>
      </div>
    );
  }

  return (
    <div className="w-72 bg-[#070913] border-l border-white/10 flex flex-col shrink-0 overflow-y-auto p-4 space-y-4">
      <div className="flex items-center justify-between pb-2 border-b border-white/10">
        <span className="text-xs font-bold text-white font-mono uppercase tracking-wider">
          {selectedElement ? `Node: ${selectedElement.type}` : `Section: ${selectedSection?.name}`}
        </span>
      </div>

      {/* NODE EDITING */}
      {selectedElement && (
        <div className="space-y-4 text-xs font-mono">
          {/* Content Value */}
          <div>
            <label className="block text-[10px] text-slate-400 mb-1 uppercase">Text / Content</label>
            <input
              type="text"
              value={selectedElement.content}
              onChange={e =>
                onUpdateElement({
                  ...selectedElement,
                  content: e.target.value
                })
              }
              className="w-full bg-[#0d1222] border border-white/10 focus:border-cyan-400 rounded-lg px-2.5 py-1.5 text-white"
            />
          </div>

          {/* Tailwind Classes */}
          <div>
            <label className="block text-[10px] text-slate-400 mb-1 uppercase">Tailwind Utility Classes</label>
            <textarea
              value={selectedElement.classes}
              onChange={e =>
                onUpdateElement({
                  ...selectedElement,
                  classes: e.target.value
                })
              }
              rows={3}
              className="w-full bg-[#0d1222] border border-white/10 focus:border-cyan-400 rounded-lg p-2 text-white text-[11px]"
            />
          </div>

          {/* Quick Style Adjustments */}
          <div className="space-y-2 border-t border-white/10 pt-3">
            <span className="block text-[10px] text-slate-400 uppercase font-bold">Quick Styles</span>

            {/* Typography Size & Color */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[9px] text-slate-500">Text Color</label>
                <input
                  type="color"
                  value={selectedElement.styles?.textColor || '#ffffff'}
                  onChange={e =>
                    onUpdateElement({
                      ...selectedElement,
                      styles: { ...selectedElement.styles, textColor: e.target.value }
                    })
                  }
                  className="w-full h-8 bg-transparent cursor-pointer rounded"
                />
              </div>

              <div>
                <label className="block text-[9px] text-slate-500">Font Size</label>
                <select
                  value={selectedElement.styles?.fontSize || 'text-base'}
                  onChange={e =>
                    onUpdateElement({
                      ...selectedElement,
                      styles: { ...selectedElement.styles, fontSize: e.target.value }
                    })
                  }
                  className="w-full bg-[#0d1222] border border-white/10 rounded px-2 py-1.5 text-white text-[11px]"
                >
                  <option value="text-xs">Extra Small (xs)</option>
                  <option value="text-sm">Small (sm)</option>
                  <option value="text-base">Base (md)</option>
                  <option value="text-lg">Large (lg)</option>
                  <option value="text-2xl">Heading (2xl)</option>
                  <option value="text-4xl">Title (4xl)</option>
                </select>
              </div>
            </div>

            {/* Media Image URL (if image) */}
            {(selectedElement.type === 'image' || selectedElement.type === 'video') && (
              <div>
                <label className="block text-[10px] text-slate-400 mb-1 uppercase">Media Image URL</label>
                <input
                  type="text"
                  value={selectedElement.mediaUrl || ''}
                  onChange={e =>
                    onUpdateElement({
                      ...selectedElement,
                      mediaUrl: e.target.value
                    })
                  }
                  placeholder="https://images.unsplash.com/..."
                  className="w-full bg-[#0d1222] border border-white/10 rounded px-2 py-1 text-white text-[11px]"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* SECTION EDITING */}
      {selectedSection && !selectedElement && (
        <div className="space-y-4 text-xs font-mono">
          <div>
            <label className="block text-[10px] text-slate-400 mb-1 uppercase">Section Title</label>
            <input
              type="text"
              value={selectedSection.name}
              onChange={e =>
                onUpdateSection({
                  ...selectedSection,
                  name: e.target.value
                })
              }
              className="w-full bg-[#0d1222] border border-white/10 rounded px-2.5 py-1.5 text-white"
            />
          </div>

          <div>
            <label className="block text-[10px] text-slate-400 mb-1 uppercase">Background Color</label>
            <input
              type="color"
              value={selectedSection.bgColor || '#050713'}
              onChange={e =>
                onUpdateSection({
                  ...selectedSection,
                  bgColor: e.target.value
                })
              }
              className="w-full h-8 bg-transparent cursor-pointer rounded"
            />
          </div>
        </div>
      )}
    </div>
  );
};
