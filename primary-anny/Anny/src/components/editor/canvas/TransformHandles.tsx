import React, { useState } from 'react';
import { EditorEngine } from '../../../core/editor/engine';
import { EditorObject } from '../../../core/editor/types';

interface TransformHandlesProps {
  objects: EditorObject[];
  engine: EditorEngine;
}

export const TransformHandles: React.FC<TransformHandlesProps> = ({ objects, engine }) => {
  if (objects.length === 0) return null;

  const minX = Math.min(...objects.map(o => o.x));
  const minY = Math.min(...objects.map(o => o.y));
  const maxX = Math.max(...objects.map(o => o.x + o.width));
  const maxY = Math.max(...objects.map(o => o.y + o.height));
  
  const width = maxX - minX;
  const height = maxY - minY;

  const handleResize = (handle: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const startX = e.clientX;
    const startY = e.clientY;
    const isShift = e.shiftKey;
    const isAlt = e.altKey;

    const onMouseMove = (moveEvent: MouseEvent) => {
      let dx = moveEvent.clientX - startX;
      let dy = moveEvent.clientY - startY;

      objects.forEach(obj => {
        let newWidth = obj.width;
        let newHeight = obj.height;
        let newX = obj.x;
        let newY = obj.y;

        if (handle === 'rotate') {
           const centerX = obj.x + obj.width / 2;
           const centerY = obj.y + obj.height / 2;
           let angle = Math.atan2(moveEvent.clientY - centerY, moveEvent.clientX - centerX) * 180 / Math.PI;
           if (isShift) angle = Math.round(angle / 45) * 45;
           engine.updateObjectProps(obj.id, { rotation: angle });
           return;
        }

        if (handle.includes('right')) newWidth += dx;
        if (handle.includes('left')) { newWidth -= dx; newX += dx; }
        if (handle.includes('bottom')) newHeight += dy;
        if (handle.includes('top')) { newHeight -= dy; newY += dy; }
        
        if (isShift) {
           const ratio = obj.width / obj.height;
           if (handle.includes('left') || handle.includes('right')) newHeight = newWidth / ratio;
           else newWidth = newHeight * ratio;
        }

        if (isAlt) {
           newX -= (newWidth - obj.width) / 2;
           newY -= (newHeight - obj.height) / 2;
        }

        engine.updateObjectProps(obj.id, { x: newX, y: newY, width: Math.max(10, newWidth), height: Math.max(10, newHeight) });
      });
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  return (
    <div
      className="absolute border border-purple-500"
      style={{ left: minX, top: minY, width, height, transform: `rotate(${objects[0].rotation}deg)` }}
    >
      {/* Corner Handles */}
      <div className="absolute -top-1 -left-1 w-2 h-2 bg-purple-500 cursor-nwse-resize" onMouseDown={(e) => handleResize('top-left', e)} />
      <div className="absolute -top-1 -right-1 w-2 h-2 bg-purple-500 cursor-nesw-resize" onMouseDown={(e) => handleResize('top-right', e)} />
      <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-purple-500 cursor-nesw-resize" onMouseDown={(e) => handleResize('bottom-left', e)} />
      <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-purple-500 cursor-nwse-resize" onMouseDown={(e) => handleResize('bottom-right', e)} />
      {/* Rotation Handle */}
      <div className="absolute -top-6 left-1/2 -ml-1 w-2 h-2 bg-green-500 rounded-full cursor-grab" onMouseDown={(e) => handleResize('rotate', e)} />
    </div>
  );
};
