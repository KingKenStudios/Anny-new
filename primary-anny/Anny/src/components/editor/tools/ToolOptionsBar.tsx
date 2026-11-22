import React from 'react';
import { EditorEngine } from '../../../core/editor/engine';

export const ToolOptionsBar = ({ engine }: { engine: EditorEngine }) => {
  const activeTool = engine.getActiveTool();

  return (
    <div className="flex gap-4 p-2 bg-slate-900 text-white text-xs items-center">
      <div>Tool: {activeTool}</div>
      {activeTool === 'brush' && (
        <>
            <div>Size: <input type="number" className="w-10 bg-slate-700" defaultValue={5} /></div>
            <div>Opacity: <input type="range" defaultValue={100} /></div>
        </>
      )}
      {activeTool === 'text' && (
        <>
            <div>Font: <select className="bg-slate-700"><option>Arial</option></select></div>
        </>
      )}
    </div>
  );
};
