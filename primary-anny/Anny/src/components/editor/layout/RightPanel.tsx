import React from 'react';
import { EditorEngine } from '../../../core/editor/engine';
import { DocumentState } from '../../../core/editor/types';
import { LayersPanel } from '../panels/LayersPanel';
import { PropertiesPanel } from '../panels/PropertiesPanel';
import { ColorPanel } from '../panels/ColorPanel';

export const RightPanel = ({ engine, state, activePanel, setActivePanel }: { engine: EditorEngine, state: DocumentState, activePanel: string, setActivePanel: (panel: string) => void }) => {
  const tabs = ['Properties', 'Layers', 'Color', 'History'];

  return (
    <div className="w-80 bg-[#121421] border-l border-white/10 flex flex-col">
      <div className="flex border-b border-white/10 text-xs">
        {tabs.map(tab => (
          <button 
            key={tab} 
            onClick={() => setActivePanel(tab)} 
            className={`flex-1 py-2 hover:bg-white/5 border-r border-white/10 last:border-0 ${activePanel === tab ? 'bg-white/10' : ''}`}
          >
            {tab}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto">
        {activePanel === 'Properties' && <PropertiesPanel engine={engine} state={state} />}
        {activePanel === 'Layers' && <LayersPanel engine={engine} state={state} />}
        {activePanel === 'Color' && <ColorPanel engine={engine} />}
      </div>
    </div>
  );
};
