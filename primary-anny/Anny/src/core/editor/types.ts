
export interface EditorObject {
  id: string;
  type: 'container' | 'text' | 'image' | 'button' | 'section' | 'shape';
  tagName: string; // 'div', 'h1', 'p', etc.
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  styles: Record<string, any>;
  props: Record<string, any>;
  children: string[]; // IDs of children elements
}

export interface Layer {
  id: string;
  name: string;
  objectId: string;
  visible: boolean;
  locked: boolean;
  parentId?: string;
}

export interface DocumentState {
  objects: Record<string, EditorObject>;
  layers: Layer[];
  selectedObjectIds: string[];
  rootElementId: string;
  historyIndex?: number;
}
