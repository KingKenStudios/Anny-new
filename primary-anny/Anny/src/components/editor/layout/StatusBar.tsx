import React from 'react';
import { DocumentState } from '../../../core/editor/types';

export const StatusBar = ({ state }: { state: DocumentState }) => {
  return (
    <div className="h-6 bg-[#121421] border-t border-white/10 flex items-center px-4 text-[10px] justify-between select-none">
      <span>1920 x 1080 px @ 72 DPI</span>
      <div className="flex gap-4">
        <span>{state.historyIndex >= 0 ? `History state: ${state.historyIndex}` : 'No history'}</span>
        <span>Zoom 66%</span>
      </div>
    </div>
  );
};
