import React from 'react';
import { EditorEngine } from '../../../core/editor/engine';
import { DocumentState } from '../../../core/editor/types';
import { TransformHandles } from '../canvas/TransformHandles';
import { Grid } from '../canvas/Grid';
import { ToolOptionsBar } from '../tools/ToolOptionsBar';

export const CanvasArea = ({ 
    engine, 
    state, 
    canvasRef, 
    handleCanvasMouseDown, 
    renderObject, 
    zoom, 
    offset 
}: { 
    engine: EditorEngine, 
    state: DocumentState, 
    canvasRef: React.RefObject<HTMLDivElement>, 
    handleCanvasMouseDown: (e: React.MouseEvent) => void,
    renderObject: (id: string) => React.ReactNode,
    zoom: number,
    offset: { x: number, y: number }
}) => {
  return (
    <div className="flex-1 bg-[#1a1c2e] overflow-auto p-8 relative flex flex-col">
        <ToolOptionsBar engine={engine} />
        <div 
            ref={canvasRef} 
            className="bg-white w-[1920px] h-[1080px] mx-auto shadow-2xl relative" 
            id="editor-canvas" 
            onMouseDown={handleCanvasMouseDown}
            style={{ transform: `scale(${zoom}) translate(${offset.x}px, ${offset.y}px)`, transformOrigin: 'top left' }}
        >
            <Grid zoom={zoom} offset={offset} />
            {renderObject(state.rootElementId)}
            <TransformHandles 
                objects={state.selectedObjectIds.map(id => state.objects[id])} 
                engine={engine}
            />
        </div>
    </div>
  );
};
