import { EditorEngine } from '../../../core/editor/engine';

export const applyAdjustment = (engine: EditorEngine, id: string, adjustment: string, value: number) => {
  const obj = engine.getState().objects[id];
  if (!obj) return;
  const newAdjustments = { ...(obj.props.adjustments || {}), [adjustment]: value };
  
  const filterString = Object.entries(newAdjustments)
    .map(([key, val]) => {
        if (key === 'blur') return `blur(${val}px)`;
        if (key === 'sepia') return `sepia(${val}%)`;
        if (key === 'invert') return `invert(${val}%)`;
        if (key === 'grayscale') return `grayscale(${val}%)`;
        if (key === 'brightness') return `brightness(${val}%)`;
        if (key === 'contrast') return `contrast(${val}%)`;
        if (key === 'saturation') return `saturate(${val}%)`;
        if (key === 'hue') return `hue-rotate(${val}deg)`;
        return `${key}(${val}%)`;
    })
    .join(' ');

  engine.updateObjectProps(id, { 
    props: { ...obj.props, adjustments: newAdjustments },
    styles: { ...obj.styles, filter: filterString }
  });
};
