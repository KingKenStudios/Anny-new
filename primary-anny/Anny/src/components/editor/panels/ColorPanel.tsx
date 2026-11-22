import React from 'react';
import { EditorEngine } from '../../../core/editor/engine';

export const ColorPanel = ({ engine }: { engine: EditorEngine }) => {
  const activeColor = engine.getActiveColor();

  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    engine.setActiveColor(e.target.value);
  };

  return (
    <div className="p-4 bg-slate-800 text-white rounded">
      <div className="font-bold mb-2">Color</div>
      <input 
        type="color" 
        value={activeColor}
        onChange={handleColorChange}
        className="w-full h-10 cursor-pointer"
      />
      <div className="mt-2 text-xs font-mono">{activeColor}</div>
    </div>
  );
};
