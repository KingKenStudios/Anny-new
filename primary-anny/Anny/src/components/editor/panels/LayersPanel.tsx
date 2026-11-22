import React from 'react';
import { EditorEngine } from '../../../core/editor/engine';
import { DocumentState } from '../../../core/editor/types';

interface LayersPanelProps {
  engine: EditorEngine;
  state: DocumentState;
}

export const LayersPanel: React.FC<LayersPanelProps> = ({ engine, state }) => {
  return (
    <div className="flex flex-col h-full text-xs">
      <div className="p-2 font-bold border-b border-white/10">Layers</div>
      <div className="flex-1 overflow-y-auto">
        {state.layers.map(layer => (
          <div 
            key={layer.id}
            onClick={() => engine.selectObject(layer.objectId)}
            className={`p-2 border-b border-white/5 cursor-pointer ${state.selectedObjectIds.includes(layer.objectId) ? 'bg-purple-600' : 'hover:bg-white/5'}`}
          >
            {layer.name}
          </div>
        ))}
      </div>
    </div>
  );
};
