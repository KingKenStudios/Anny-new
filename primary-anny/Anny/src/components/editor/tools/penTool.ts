import { EditorEngine } from '../../../core/editor/engine';

export const handlePenPath = (engine: EditorEngine, rootId: string, points: {x: number, y: number}[]) => {
  const id = engine.createObject({
    type: 'shape',
    tagName: 'path',
    x: Math.min(...points.map(p => p.x)),
    y: Math.min(...points.map(p => p.y)),
    width: Math.max(...points.map(p => p.x)) - Math.min(...points.map(p => p.x)),
    height: Math.max(...points.map(p => p.y)) - Math.min(...points.map(p => p.y)),
    rotation: 0,
    opacity: 1,
    styles: { position: 'absolute', stroke: 'blue', fill: 'none', strokeWidth: '2px' },
    props: { points },
    children: []
  });
  engine.updateObjectProps('root', { children: [...engine.getState().objects['root'].children, id] });
};
