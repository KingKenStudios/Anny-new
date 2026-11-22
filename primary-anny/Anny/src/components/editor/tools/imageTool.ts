import { EditorEngine } from '../../../core/editor/engine';

export const importImage = (engine: EditorEngine, rootId: string) => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.onchange = (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const imageUrl = event.target?.result as string;
        const id = engine.createObject({
          type: 'image',
          tagName: 'img',
          x: 100,
          y: 100,
          width: 300,
          height: 200,
          rotation: 0,
          opacity: 1,
          styles: { position: 'absolute' },
          props: { src: imageUrl },
          children: []
        });
        engine.updateObjectProps(rootId, { children: [...engine.getState().objects[rootId].children, id] });
      };
      reader.readAsDataURL(file);
    }
  };
  input.click();
};
