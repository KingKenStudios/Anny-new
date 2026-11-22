import React from 'react';
import { EditorEngine } from '../../../core/editor/engine';
import { DocumentState } from '../../../core/editor/types';
import { applyAdjustment } from '../image/adjustmentTool';
import { applyEffect } from '../effects/effectTool';

interface PropertiesPanelProps {
  engine: EditorEngine;
  state: DocumentState;
}

export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({ engine, state }) => {
  const selectedId = state.selectedObjectIds[0];
  const obj = selectedId ? state.objects[selectedId] : null;

  if (!obj) return <div className="p-4 text-slate-500 text-xs">Select an object to edit properties.</div>;

  return (
    <div className="p-4 text-xs overflow-y-auto h-full">
      <div className="font-bold mb-2">Properties: {obj.type}</div>
      <label className="block mb-1 text-slate-400">X Position</label>
      <input 
        type="number"
        className="bg-white/5 p-1 w-full rounded mb-2"
        value={obj.x}
        onChange={(e) => engine.updateObjectProps(selectedId, { x: Number(e.target.value) })}
      />
      <label className="block mb-1 text-slate-400">Y Position</label>
      <input 
        type="number"
        className="bg-white/5 p-1 w-full rounded mb-2"
        value={obj.y}
        onChange={(e) => engine.updateObjectProps(selectedId, { y: Number(e.target.value) })}
      />
      {obj.type === 'text' && (
        <>
          <label className="block mb-1 text-slate-400">Text Content</label>
          <input 
            className="bg-white/5 p-1 w-full rounded mb-2"
            value={obj.props.text || ''}
            onChange={(e) => engine.updateObjectProps(selectedId, { props: { ...obj.props, text: e.target.value } })}
          />
        </>
      )}
      {obj.type === 'image' && (
        <>
          <div className="font-bold mt-4 mb-2">Adjustments</div>
          {['brightness', 'contrast', 'exposure', 'saturation', 'hue', 'sepia', 'invert', 'grayscale'].map(adj => (
            <div key={adj} className="mb-2">
              <label className="block text-slate-400 capitalize">{adj}</label>
              <input 
                type="range" min="0" max={adj === 'hue' ? 360 : 200}
                className="w-full"
                value={obj.props.adjustments?.[adj] || 100}
                onChange={(e) => applyAdjustment(engine, selectedId, adj, Number(e.target.value))}
              />
            </div>
          ))}
          <div className="font-bold mt-4 mb-2">Effects</div>
          <label className="block text-slate-400">Blur</label>
          <input 
             type="range" min="0" max="50"
             className="w-full"
             value={parseInt(obj.props.effects?.blur || '0')}
             onChange={(e) => applyEffect(engine, selectedId, 'blur', `${e.target.value}px`)}
          />
          <label className="block text-slate-400 mt-2">Drop Shadow</label>
          <input 
             type="text" className="w-full bg-white/5 p-1 rounded"
             placeholder="10px 10px 5px black"
             value={obj.props.effects?.dropShadow || ''}
             onChange={(e) => applyEffect(engine, selectedId, 'dropShadow', e.target.value)}
          />
        </>
      )}
    </div>
  );
};
