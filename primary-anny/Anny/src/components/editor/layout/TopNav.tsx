import React from 'react';
import { Undo2, Redo2, Sparkles } from 'lucide-react';
import { EditorEngine } from '../../../core/editor/engine';

export const TopNav = ({ engine }: { engine: EditorEngine }) => {
  return (
    <div className="h-14 bg-[#121421] border-b border-white/10 flex items-center justify-between px-4 text-sm select-none">
      <div className="flex items-center gap-4">
        <span className="font-bold text-purple-400">Anny</span>
        {['File', 'Edit', 'Image', 'Layer', 'Select', 'Filter', 'View', 'Window', 'Help'].map(menu => (
          <button key={menu} className="text-slate-400 hover:text-white">{menu}</button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <button onClick={() => engine.undo()} className="p-2 hover:bg-white/10 rounded"><Undo2 className="w-4 h-4" /></button>
        <button onClick={() => engine.redo()} className="p-2 hover:bg-white/10 rounded"><Redo2 className="w-4 h-4" /></button>
        <button className="flex items-center gap-1 bg-purple-600 px-3 py-1 rounded-md text-xs"><Sparkles className="w-3 h-3" /> Anny AI</button>
        <button className="px-3 py-1 rounded-md text-xs hover:bg-white/5">Share</button>
        <button className="px-3 py-1 rounded-md text-xs bg-white/10">Export</button>
      </div>
    </div>
  );
};
