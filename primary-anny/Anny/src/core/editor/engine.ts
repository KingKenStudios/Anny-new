
import { DocumentState, EditorObject, Layer } from './types';

interface Command {
  execute: () => void;
  undo: () => void;
}

export class EditorEngine {
  private state: DocumentState;
  private history: Command[] = [];
  private historyIndex: number = -1;
  private listeners: (() => void)[] = [];

  constructor(initialState: DocumentState) {
    this.state = initialState;
  }

  getState() {
    return { ...this.state, historyIndex: this.historyIndex };
  }

  setState(newState: DocumentState) {
    this.state = newState;
    this.notify();
  }

  subscribe(listener: () => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach(l => l());
  }

  private executeCommand(command: Command) {
    command.execute();
    this.history = this.history.slice(0, this.historyIndex + 1);
    this.history.push(command);
    this.historyIndex++;
    this.notify();
  }

  undo() {
    if (this.historyIndex >= 0) {
      this.history[this.historyIndex].undo();
      this.historyIndex--;
      this.notify();
    }
  }

  redo() {
    if (this.historyIndex < this.history.length - 1) {
      this.historyIndex++;
      this.history[this.historyIndex].execute();
      this.notify();
    }
  }

  // Core Commands
  selectObject(id: string, additive: boolean = false) {
    if (additive) {
      if (this.state.selectedObjectIds.includes(id)) {
        this.state.selectedObjectIds = this.state.selectedObjectIds.filter(selectedId => selectedId !== id);
      } else {
        this.state.selectedObjectIds.push(id);
      }
    } else {
      this.state.selectedObjectIds = [id];
    }
    this.notify();
  }

  moveObjects(ids: string[], dx: number, dy: number) {
    const oldPositions = ids.map(id => ({ id, x: this.state.objects[id].x, y: this.state.objects[id].y }));

    this.executeCommand({
      execute: () => {
        ids.forEach(id => {
          this.state.objects[id].x += dx;
          this.state.objects[id].y += dy;
        });
        this.notify();
      },
      undo: () => {
        oldPositions.forEach(({ id, x, y }) => {
          this.state.objects[id].x = x;
          this.state.objects[id].y = y;
        });
        this.notify();
      }
    });
  }

  rotateObject(id: string, rotation: number) {
    const obj = this.state.objects[id];
    if (!obj) return;
    const oldRotation = obj.rotation;
    this.executeCommand({
      execute: () => {
        this.state.objects[id].rotation = rotation;
        this.notify();
      },
      undo: () => {
        this.state.objects[id].rotation = oldRotation;
        this.notify();
      }
    });
  }

  updateObjectProps(id: string, props: Partial<EditorObject>) {
    const obj = this.state.objects[id];
    if (!obj) return;
    const oldProps = { ...obj.props };
    const oldStyles = { ...obj.styles };
    this.executeCommand({
      execute: () => {
        this.state.objects[id] = { ...this.state.objects[id], ...props };
        this.notify();
      },
      undo: () => {
        this.state.objects[id].props = oldProps;
        this.state.objects[id].styles = oldStyles;
        this.notify();
      }
    });
  }

  scaleObject(id: string, width: number, height: number) {
    const obj = this.state.objects[id];
    if (!obj) return;
    const oldWidth = obj.width;
    const oldHeight = obj.height;
    this.executeCommand({
      execute: () => {
        this.state.objects[id].width = width;
        this.state.objects[id].height = height;
        this.notify();
      },
      undo: () => {
        this.state.objects[id].width = oldWidth;
        this.state.objects[id].height = oldHeight;
        this.notify();
      }
    });
  }
  
  deleteObject(id: string) {
    const obj = this.state.objects[id];
    if (!obj) return;
    const parent = this.state.objects['root']; // Simplified, assumes all in root
    const oldIndex = parent.children.indexOf(id);

    this.executeCommand({
      execute: () => {
        delete this.state.objects[id];
        parent.children = parent.children.filter(childId => childId !== id);
        this.notify();
      },
      undo: () => {
        this.state.objects[id] = obj;
        parent.children.splice(oldIndex, 0, id);
        this.notify();
      }
    });
  }

  duplicateObject(id: string) {
    const obj = this.state.objects[id];
    if (!obj) return;
    const newId = `${obj.type}_${Date.now()}`;
    const newObject = { ...obj, id: newId, x: obj.x + 20, y: obj.y + 20 };
    
    this.executeCommand({
      execute: () => {
        this.state.objects[newId] = newObject;
        this.state.objects['root'].children.push(newId);
        this.notify();
      },
      undo: () => {
        delete this.state.objects[newId];
        this.state.objects['root'].children = this.state.objects['root'].children.filter(cid => cid !== newId);
        this.notify();
      }
    });
  }

  groupObjects(ids: string[]) {
    const groupId = `group_${Date.now()}`;
    const parent = this.state.objects['root'];
    const childrenIds = ids;
    const newGroup: EditorObject = {
      id: groupId,
      type: 'container',
      tagName: 'div',
      x: Math.min(...ids.map(id => this.state.objects[id].x)),
      y: Math.min(...ids.map(id => this.state.objects[id].y)),
      width: Math.max(...ids.map(id => this.state.objects[id].x + this.state.objects[id].width)) - Math.min(...ids.map(id => this.state.objects[id].x)),
      height: Math.max(...ids.map(id => this.state.objects[id].y + this.state.objects[id].height)) - Math.min(...ids.map(id => this.state.objects[id].y)),
      rotation: 0,
      opacity: 1,
      styles: { position: 'absolute' },
      props: {},
      children: childrenIds
    };

    this.executeCommand({
      execute: () => {
        this.state.objects[groupId] = newGroup;
        ids.forEach(id => {
          this.state.objects[id].x -= newGroup.x;
          this.state.objects[id].y -= newGroup.y;
          parent.children = parent.children.filter(childId => childId !== id);
        });
        parent.children.push(groupId);
        this.notify();
      },
      undo: () => {
        delete this.state.objects[groupId];
        ids.forEach(id => {
          this.state.objects[id].x += newGroup.x;
          this.state.objects[id].y += newGroup.y;
          parent.children.push(id);
        });
        parent.children = parent.children.filter(childId => childId !== groupId);
        this.notify();
      }
    });
  }

  ungroupObjects(groupId: string) {
    const group = this.state.objects[groupId];
    if (!group || group.type !== 'container') return;
    const parent = this.state.objects['root'];
    const childrenIds = group.children;

    this.executeCommand({
      execute: () => {
        childrenIds.forEach(id => {
          this.state.objects[id].x += group.x;
          this.state.objects[id].y += group.y;
          parent.children.push(id);
        });
        delete this.state.objects[groupId];
        parent.children = parent.children.filter(childId => childId !== groupId);
        this.notify();
      },
      undo: () => {
        this.state.objects[groupId] = group;
        childrenIds.forEach(id => {
          this.state.objects[id].x -= group.x;
          this.state.objects[id].y -= group.y;
          parent.children = parent.children.filter(childId => childId !== id);
        });
        parent.children.push(groupId);
        this.notify();
      }
    });
  }

  alignObjects(ids: string[], alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') {
    if (ids.length === 0) return;
    const target = ids.map(id => this.state.objects[id]);
    const minX = Math.min(...target.map(o => o.x));
    const maxX = Math.max(...target.map(o => o.x + o.width));
    const minY = Math.min(...target.map(o => o.y));
    const maxY = Math.max(...target.map(o => o.y + o.height));
    const centerX = minX + (maxX - minX) / 2;
    const centerY = minY + (maxY - minY) / 2;

    const oldPositions = ids.map(id => ({ id, x: this.state.objects[id].x, y: this.state.objects[id].y }));

    this.executeCommand({
      execute: () => {
        ids.forEach(id => {
          const obj = this.state.objects[id];
          if (alignment === 'left') obj.x = minX;
          else if (alignment === 'center') obj.x = centerX - obj.width / 2;
          else if (alignment === 'right') obj.x = maxX - obj.width;
          else if (alignment === 'top') obj.y = minY;
          else if (alignment === 'middle') obj.y = centerY - obj.height / 2;
          else if (alignment === 'bottom') obj.y = maxY - obj.height;
        });
        this.notify();
      },
      undo: () => {
        oldPositions.forEach(({ id, x, y }) => {
          this.state.objects[id].x = x;
          this.state.objects[id].y = y;
        });
        this.notify();
      }
    });
  }

  distributeObjects(ids: string[], axis: 'x' | 'y') {
    if (ids.length < 3) return;
    const sorted = [...ids].sort((a, b) => this.state.objects[a][axis === 'x' ? 'x' : 'y'] - this.state.objects[b][axis === 'x' ? 'x' : 'y']);
    
    const start = this.state.objects[sorted[0]][axis === 'x' ? 'x' : 'y'];
    const end = this.state.objects[sorted[sorted.length - 1]][axis === 'x' ? 'x' : 'y'];
    const space = (end - start) / (sorted.length - 1);

    const oldPositions = ids.map(id => ({ id, x: this.state.objects[id].x, y: this.state.objects[id].y }));

    this.executeCommand({
      execute: () => {
        sorted.forEach((id, i) => {
          this.state.objects[id][axis === 'x' ? 'x' : 'y'] = start + space * i;
        });
        this.notify();
      },
      undo: () => {
        oldPositions.forEach(({ id, x, y }) => {
          this.state.objects[id].x = x;
          this.state.objects[id].y = y;
        });
        this.notify();
      }
    });
  }

  setLayerOrder(id: string, delta: number) {
    const parent = this.state.objects['root'];
    const index = parent.children.indexOf(id);
    if (index === -1) return;
    const newIndex = Math.max(0, Math.min(parent.children.length - 1, index + delta));
    
    this.executeCommand({
      execute: () => {
        parent.children.splice(index, 1);
        parent.children.splice(newIndex, 0, id);
        this.notify();
      },
      undo: () => {
        parent.children.splice(newIndex, 1);
        parent.children.splice(index, 0, id);
        this.notify();
      }
    });
  }

  private activeColor: string = '#000000';
  private activeTool: string = 'select';

  setActiveColor(color: string) {
    this.activeColor = color;
    this.notify();
  }
  
  getActiveColor() {
    return this.activeColor;
  }
  
  setActiveTool(tool: string) {
    this.activeTool = tool;
    this.notify();
  }
  
  getActiveTool() {
    return this.activeTool;
  }

  createObject(obj: Omit<EditorObject, 'id'>) {
    const id = `${obj.type}_${Date.now()}_${Math.random()}`;
    const newObject: EditorObject = { ...obj, id };
    this.executeCommand({
      execute: () => {
        this.state.objects[id] = newObject;
        this.state.objects['root'].children.push(id);
        this.notify();
      },
      undo: () => {
        delete this.state.objects[id];
        this.state.objects['root'].children = this.state.objects['root'].children.filter(cid => cid !== id);
        this.notify();
      }
    });
    return id;
  }

  applyGradient(id: string, gradient: string) {
    const obj = this.state.objects[id];
    if (!obj) return;
    const oldStyles = { ...obj.styles };
    this.executeCommand({
      execute: () => {
        this.state.objects[id].styles = { ...oldStyles, background: gradient };
        this.notify();
      },
      undo: () => {
        this.state.objects[id].styles = oldStyles;
        this.notify();
      }
    });
  }

  pasteObjects(data: string[]) {
    const newIds = data.map(json => {
      const obj = JSON.parse(json);
      const newId = `${obj.type}_${Date.now()}_${Math.random()}`;
      return { ...obj, id: newId, x: obj.x + 20, y: obj.y + 20 };
    });

    this.executeCommand({
      execute: () => {
        newIds.forEach(obj => {
          this.state.objects[obj.id] = obj;
          this.state.objects['root'].children.push(obj.id);
        });
        this.notify();
      },
      undo: () => {
        newIds.forEach(obj => {
          delete this.state.objects[obj.id];
          this.state.objects['root'].children = this.state.objects['root'].children.filter(cid => cid !== obj.id);
        });
        this.notify();
      }
    });
  }
}
