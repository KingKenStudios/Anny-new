import { EditorEngine } from '../../../core/editor/engine';

export const handleGradientDraw = (engine: EditorEngine, id: string, type: 'linear' | 'radial', stops: { color: string, position: number }[]) => {
    const gradient = `${type}-gradient(${stops.map(s => `${s.color} ${s.position}%`).join(', ')})`;
    engine.applyGradient(id, gradient);
};
