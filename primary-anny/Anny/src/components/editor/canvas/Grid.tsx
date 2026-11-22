import React from 'react';

export const Grid = ({ zoom, offset }: { zoom: number, offset: { x: number, y: number } }) => {
  const gridSize = 50 * zoom;
  return (
    <div 
      className="absolute inset-0 pointer-events-none"
      style={{
        backgroundImage: `linear-gradient(to right, #ccc 1px, transparent 1px), linear-gradient(to bottom, #ccc 1px, transparent 1px)`,
        backgroundSize: `${gridSize}px ${gridSize}px`,
        transform: `translate(${offset.x % gridSize}px, ${offset.y % gridSize}px)`
      }}
    />
  );
};
