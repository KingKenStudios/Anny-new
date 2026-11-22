import React from 'react';
import { MousePointer2, Circle, Type, Hand, PaintBucket, Image as ImageIcon } from 'lucide-react';
import { EditorEngine } from '../../../core/editor/engine';

export const LeftToolbar = ({ engine, activeTool, setActiveTool }: { engine: EditorEngine, activeTool: string, setActiveTool: (tool: string) => void }) => {
  const tools = [
    { id: 'move', icon: MousePointer2, name: 'Move (V)' },
    { id: 'shape', icon: Circle, name: 'Shape (U)' },
    { id: 'text', icon: Type, name: 'Text (T)' },
    { id: 'brush', icon: PaintBucket, name: 'Brush (B)' },
    { id: 'pen', icon: PaintBucket, name: 'Pen (P)' },
    { id: 'image', icon: ImageIcon, name: 'Image (I)' },
    { id: 'hand', icon: Hand, name: 'Hand (H)' },
  ];

  return (
    <div className="w-16 bg-[#121421] border-r border-white/10 flex flex-col items-center py-2 gap-1">
      {tools.map(tool => (
        <button 
          key={tool.id}
          onClick={() => { setActiveTool(tool.id); engine.setActiveTool(tool.id); }}
          className={`p-2.5 rounded-lg ${activeTool === tool.id ? 'bg-purple-600' : 'hover:bg-white/10'}`}
          title={tool.name}
        >
          <tool.icon className="w-4 h-4" />
        </button>
      ))}
    </div>
  );
};
