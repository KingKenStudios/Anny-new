import { EditorEngine } from '../../../core/editor/engine';

export const applyEffect = (engine: EditorEngine, id: string, effect: string, value: string) => {
  const obj = engine.getState().objects[id];
  if (!obj) return;
  const newEffects = { ...(obj.props.effects || {}), [effect]: value };
  
  // Construct filter/shadow string from effects
  const shadow = newEffects.dropShadow || 'none';
  const blur = newEffects.blur || '0px';
  const filterString = `drop-shadow(${shadow}) blur(${blur})`;
  
  engine.updateObjectProps(id, { 
    props: { ...obj.props, effects: newEffects },
    styles: { ...obj.styles, filter: filterString }
  });
};
