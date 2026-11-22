import { WorkspaceManager } from '../../../core/workspaceManager';
import * as Babel from '@babel/standalone';
import { sanitizeConstDeclarations } from '../../../core/codeSanitizer';

export interface PatchTargetOptions {
  targetFile?: string;
  targetLine?: number;
  oldSrc?: string;
}

export class RealProjectSourcePatcher {
  private static vfsUndoStack: Array<Record<string, string>> = [];
  private static vfsRedoStack: Array<Record<string, string>> = [];

  /**
   * Capture current VFS files snapshot for undo/redo
   */
  public static snapshotVFSState(): void {
    try {
      const wsManager = WorkspaceManager.getInstance();
      const vfs = wsManager.getVFS();
      const files = vfs.getAllFiles();
      const fileMap: Record<string, string> = {};
      files.forEach(node => {
        fileMap[node.path] = node.content;
      });
      this.vfsUndoStack.push(fileMap);
      if (this.vfsUndoStack.length > 50) {
        this.vfsUndoStack.shift();
      }
      this.vfsRedoStack = [];
    } catch (err) {
      console.warn("[RealProjectSourcePatcher] Snapshot error:", err);
    }
  }

  /**
   * Undo VFS Source Change
   */
  public static undo(): boolean {
    if (this.vfsUndoStack.length === 0) return false;
    try {
      const wsManager = WorkspaceManager.getInstance();
      const vfs = wsManager.getVFS();
      
      const currentFiles = vfs.getAllFiles();
      const currentMap: Record<string, string> = {};
      currentFiles.forEach(node => {
        currentMap[node.path] = node.content;
      });
      this.vfsRedoStack.push(currentMap);

      const previousState = this.vfsUndoStack.pop()!;
      for (const [path, content] of Object.entries(previousState)) {
        vfs._unsafe_writeFile(path, content);
      }
      vfs.saveToStorage();
      window.dispatchEvent(new CustomEvent('anny_vfs_changed'));
      return true;
    } catch (err) {
      console.error("[RealProjectSourcePatcher] Undo error:", err);
      return false;
    }
  }

  /**
   * Redo VFS Source Change
   */
  public static redo(): boolean {
    if (this.vfsRedoStack.length === 0) return false;
    try {
      const wsManager = WorkspaceManager.getInstance();
      const vfs = wsManager.getVFS();

      const currentFiles = vfs.getAllFiles();
      const currentMap: Record<string, string> = {};
      currentFiles.forEach(node => {
        currentMap[node.path] = node.content;
      });
      this.vfsUndoStack.push(currentMap);

      const nextState = this.vfsRedoStack.pop()!;
      for (const [path, content] of Object.entries(nextState)) {
        vfs._unsafe_writeFile(path, content);
      }
      vfs.saveToStorage();
      window.dispatchEvent(new CustomEvent('anny_vfs_changed'));
      return true;
    } catch (err) {
      console.error("[RealProjectSourcePatcher] Redo error:", err);
      return false;
    }
  }

  /**
   * Validate that code compiles cleanly without syntax / JSX errors.
   */
  private static validateJSXSyntax(code: string, path: string): boolean {
    try {
      const cleanCode = sanitizeConstDeclarations(code);
      Babel.transform(cleanCode, {
        presets: [
          ['env', { modules: 'commonjs' }],
          ['react', { runtime: 'classic' }],
          'typescript'
        ],
        filename: path
      });
      return true;
    } catch (err: any) {
      console.error(`[RealProjectSourcePatcher] JSX Syntax Validation Failed for ${path}:`, err?.message || err);
      return false;
    }
  }

  /**
   * Helper to find candidate file for patch
   */
  private static getTargetFile(preferredFile?: string, matchText?: string): string {
    const wsManager = WorkspaceManager.getInstance();
    const vfs = wsManager.getVFS();
    const files = vfs.getAllFiles();

    if (preferredFile && vfs.exists(preferredFile)) {
      return preferredFile;
    }

    if (matchText) {
      for (const [path, node] of Object.entries(files)) {
        if (node.type === 'file' && (path.endsWith('.tsx') || path.endsWith('.jsx') || path.endsWith('.js') || path.endsWith('.html'))) {
          const content = vfs.readFile(path);
          if (content && content.includes(matchText)) {
            return path;
          }
        }
      }
    }

    const defaults = ['/src/App.tsx', '/src/App.jsx', '/App.tsx', '/App.jsx', '/src/main.tsx'];
    for (const d of defaults) {
      if (vfs.exists(d)) return d;
    }

    const anyTsx = Object.keys(files).find(p => p.endsWith('.tsx') || p.endsWith('.jsx'));
    return anyTsx || '/src/App.tsx';
  }

  /**
   * Patches text content safely in target file and target line location.
   */
  public static patchTextContent(oldText: string, newText: string, opts?: PatchTargetOptions): boolean {
    if (!oldText || oldText === newText) return false;
    try {
      this.snapshotVFSState();
      const wsManager = WorkspaceManager.getInstance();
      const vfs = wsManager.getVFS();

      const searchStr = oldText.trim();
      if (!searchStr) return false;

      const targetFile = this.getTargetFile(opts?.targetFile, searchStr);
      const content = vfs.readFile(targetFile);
      if (!content) return false;

      let matchText = '';
      if (content.includes(oldText)) {
        matchText = oldText;
      } else if (content.includes(searchStr)) {
        matchText = searchStr;
      } else {
        // Try finding first line of text
        const firstLine = searchStr.split('\n')[0].trim();
        if (firstLine && firstLine.length > 2 && content.includes(firstLine)) {
          matchText = firstLine;
        }
      }

      if (!matchText) {
        console.warn(`[RealProjectSourcePatcher] Could not find "${searchStr}" in ${targetFile}`);
        return false;
      }

      let updatedContent = '';

      if (opts?.targetLine && opts.targetLine > 0) {
        const lines = content.split('\n');
        const startLine = Math.max(0, opts.targetLine - 5);
        const endLine = Math.min(lines.length - 1, opts.targetLine + 5);

        let replaced = false;
        for (let i = startLine; i <= endLine; i++) {
          if (lines[i].includes(matchText)) {
            lines[i] = lines[i].replace(matchText, newText);
            replaced = true;
            break;
          }
        }

        if (!replaced) {
          const firstIdx = content.indexOf(matchText);
          if (firstIdx !== -1) {
            updatedContent = content.slice(0, firstIdx) + newText + content.slice(firstIdx + matchText.length);
          }
        } else {
          updatedContent = lines.join('\n');
        }
      } else {
        const firstIdx = content.indexOf(matchText);
        if (firstIdx !== -1) {
          updatedContent = content.slice(0, firstIdx) + newText + content.slice(firstIdx + matchText.length);
        }
      }

      if (!updatedContent || updatedContent === content) return false;

      if (!this.validateJSXSyntax(updatedContent, targetFile)) {
        console.error(`[RealProjectSourcePatcher] Rejected patch to ${targetFile} due to syntax error. Rolling back.`);
        this.undo();
        return false;
      }

      vfs._unsafe_writeFile(targetFile, updatedContent);
      vfs.saveToStorage();
      window.dispatchEvent(new CustomEvent('anny_vfs_changed'));
      console.log(`[RealProjectSourcePatcher] Patched text in ${targetFile}: "${oldText}" -> "${newText}"`);
      return true;
    } catch (err) {
      console.error("[RealProjectSourcePatcher] Error patching text content:", err);
      return false;
    }
  }

  /**
   * Helper to safely update or insert style properties into a line of JSX.
   */
  private static patchStyleInJSXLine(line: string, property: string, value: string): string {
    // Case 1: Existing style={{ ... }}
    if (line.includes('style={{')) {
      return line.replace(/style=\{\{([^}]*)\}\}/, (_, inner) => {
        const propRegex = new RegExp(`(${property})\\s*:\\s*(['"][^'"]*['"]|[^,}]*)`);
        if (propRegex.test(inner)) {
          const updatedInner = inner.replace(propRegex, `$1: '${value}'`);
          return `style={{${updatedInner}}}`;
        } else {
          const trimmed = inner.trim();
          const prefix = trimmed ? `${trimmed}, ` : '';
          return `style={{ ${prefix}${property}: '${value}' }}`;
        }
      });
    }

    // Case 2: Existing style="..."
    if (line.includes('style="')) {
      return line.replace(/style="([^"]*)"/, (_, inner) => {
        return `style="${property}: ${value}; ${inner}"`;
      });
    }

    // Case 3: Self-closing tag on this line ending with />
    if (line.includes('/>')) {
      return line.replace('/>', ` style={{ ${property}: '${value}' }} />`);
    }

    // Case 4: Standard opening tag ending with > (not preceded by /)
    if (/(?<!\/)>/.test(line)) {
      return line.replace(/(?<!\/)>/, ` style={{ ${property}: '${value}' }}>`);
    }

    return line;
  }

  /**
   * Patches typography properties safely.
   */
  public static patchTypography(
    elementText: string,
    properties: Record<string, string>,
    opts?: PatchTargetOptions
  ): boolean {
    let success = true;
    for (const [prop, val] of Object.entries(properties)) {
      if (!this.patchStyleProperty(elementText, prop, val, opts)) {
        success = false;
      }
    }
    return success;
  }

  /**
   * Patches style properties safely.
   */
  public static patchStyleProperty(elementText: string, property: string, value: string, opts?: PatchTargetOptions): boolean {
    try {
      this.snapshotVFSState();
      const wsManager = WorkspaceManager.getInstance();
      const vfs = wsManager.getVFS();

      const targetFile = this.getTargetFile(opts?.targetFile, elementText);
      const content = vfs.readFile(targetFile);
      if (!content) return false;

      const lines = content.split('\n');
      let lineIdx = -1;

      if (opts?.targetLine && opts.targetLine > 0 && opts.targetLine <= lines.length) {
        const candidateLine = opts.targetLine - 1;
        if (elementText ? lines[candidateLine].includes(elementText) : true) {
          lineIdx = candidateLine;
        }
      }

      if (lineIdx === -1 && elementText) {
        lineIdx = lines.findIndex(l => l.includes(elementText));
      }

      if (lineIdx === -1) {
        lineIdx = lines.findIndex(l => l.includes('return') || l.includes('<div') || l.includes('<section'));
      }

      if (lineIdx === -1) return false;

      let actualTargetLineIdx = lineIdx;
      // If target line has no JSX tag opening (< or style=), scan up to 3 lines up for tag opening
      if (!lines[actualTargetLineIdx].includes('<') && !lines[actualTargetLineIdx].includes('style=')) {
        for (let i = actualTargetLineIdx - 1; i >= Math.max(0, actualTargetLineIdx - 3); i--) {
          if (lines[i].includes('<') || lines[i].includes('style=')) {
            actualTargetLineIdx = i;
            break;
          }
        }
      }

      lines[actualTargetLineIdx] = this.patchStyleInJSXLine(lines[actualTargetLineIdx], property, value);
      const updatedContent = lines.join('\n');

      if (!this.validateJSXSyntax(updatedContent, targetFile)) {
        console.error(`[RealProjectSourcePatcher] Style patch to ${targetFile} generated invalid syntax. Rolling back.`);
        this.undo();
        return false;
      }

      vfs._unsafe_writeFile(targetFile, updatedContent);
      vfs.saveToStorage();
      window.dispatchEvent(new CustomEvent('anny_vfs_changed'));
      console.log(`[RealProjectSourcePatcher] Patched style ${property}='${value}' in ${targetFile}`);
      return true;
    } catch (err) {
      console.error("[RealProjectSourcePatcher] Error patching style property:", err);
      return false;
    }
  }

  /**
   * Patches an image's src attribute in the real project source across all candidate VFS files.
   */
  public static async patchImageSource(
    elementText: string,
    newSrc: string,
    opts?: PatchTargetOptions
  ): Promise<boolean> {
    try {
      this.snapshotVFSState();
      const wsManager = WorkspaceManager.getInstance();
      const vfs = wsManager.getVFS();

      const allFiles = vfs.getAllFiles();
      const candidateFiles: string[] = [];

      // 1. Preferred target file
      if (opts?.targetFile && vfs.exists(opts.targetFile)) {
        candidateFiles.push(opts.targetFile);
      }

      // 2. Common entry files
      const defaultEntries = ['/src/App.tsx', '/src/App.jsx', '/App.tsx', '/App.jsx', '/src/main.tsx'];
      for (const entry of defaultEntries) {
        if (vfs.exists(entry) && !candidateFiles.includes(entry)) {
          candidateFiles.push(entry);
        }
      }

      // 3. All other JSX/TSX/HTML files in VFS
      Object.keys(allFiles).forEach(path => {
        if ((path.endsWith('.tsx') || path.endsWith('.jsx') || path.endsWith('.js') || path.endsWith('.html')) &&
            !path.includes('node_modules') && !path.includes('dist') && !candidateFiles.includes(path)) {
          candidateFiles.push(path);
        }
      });

      const oldSrc = opts?.oldSrc;
      const normalizedOld = oldSrc ? oldSrc.replace(/^(https?:\/\/[^\/]+)/, '') : '';
      const filenameOld = oldSrc ? oldSrc.split('/').pop()?.split('?')[0] || '' : '';

      const srcRegex = /src=(["'])(.*?)\1|src=\{(.*?)\}/;

      for (const filePath of candidateFiles) {
        const content = vfs.readFile(filePath);
        if (!content) continue;

        const lines = content.split('\n');
        let lineIdx = -1;

        // Strategy A: Direct search by oldSrc string, normalized relative oldSrc, or filenameOld
        if (oldSrc && oldSrc.length > 3) {
          lineIdx = lines.findIndex(l => 
            (l.includes('<img') || l.includes('<Image') || l.includes('src=')) &&
            (l.includes(oldSrc) || (normalizedOld && l.includes(normalizedOld)))
          );
        }

        if (lineIdx === -1 && filenameOld && filenameOld.length > 3) {
          lineIdx = lines.findIndex(l => 
            (l.includes('<img') || l.includes('<Image')) && l.includes(filenameOld)
          );
        }

        // Strategy B: targetLine match in targetFile
        if (lineIdx === -1 && opts?.targetFile === filePath && opts?.targetLine && opts.targetLine > 0 && opts.targetLine <= lines.length) {
          const candidateIdx = opts.targetLine - 1;
          const candidateLine = lines[candidateIdx];
          if (candidateLine.includes('<img') || candidateLine.includes('<Image') || candidateLine.includes('src=')) {
            lineIdx = candidateIdx;
          } else {
            // Check adjacent lines +/- 3
            for (let i = Math.max(0, candidateIdx - 3); i <= Math.min(lines.length - 1, candidateIdx + 3); i++) {
              if (lines[i].includes('<img') || lines[i].includes('<Image') || lines[i].includes('src=')) {
                lineIdx = i;
                break;
              }
            }
          }
        }

        // Strategy C: elementText search
        if (lineIdx === -1 && elementText && elementText.length > 5) {
          lineIdx = lines.findIndex(l => l.includes(elementText) && (l.includes('<img') || l.includes('<Image') || l.includes('src=')));
        }

        // Strategy D: Any img tag in file if this was the preferred file
        if (lineIdx === -1 && opts?.targetFile === filePath) {
          lineIdx = lines.findIndex(l => l.includes('<img') || l.includes('<Image'));
        }

        if (lineIdx !== -1) {
          const targetLine = lines[lineIdx];
          let newLine = targetLine;

          if (srcRegex.test(targetLine)) {
            newLine = targetLine.replace(srcRegex, (match, quote, strSrc, curlySrc) => {
              if (curlySrc) return `src={"${newSrc}"}`;
              const q = quote || '"';
              return `src=${q}${newSrc}${q}`;
            });
          } else {
            const tagMatch = targetLine.match(/<img|<Image/);
            if (tagMatch) {
              newLine = targetLine.replace(tagMatch[0], `${tagMatch[0]} src="${newSrc}"`);
            }
          }

          lines[lineIdx] = newLine;
          const updatedContent = lines.join('\n');

          if (!this.validateJSXSyntax(updatedContent, filePath)) {
            console.error(`[RealProjectSourcePatcher] Image patch to ${filePath} generated invalid syntax. Skipping candidate.`);
            continue;
          }

          vfs._unsafe_writeFile(filePath, updatedContent);
          vfs.saveToStorage();
          window.dispatchEvent(new CustomEvent('anny_vfs_changed'));
          console.log(`[RealProjectSourcePatcher] Successfully patched image src in ${filePath} at line ${lineIdx + 1}`);
          return true;
        }
      }

      console.warn("[RealProjectSourcePatcher] Target image could not be located in any project source file.");
      return false;
    } catch (err) {
      console.error("[RealProjectSourcePatcher] Error patching image src:", err);
      return false;
    }
  }

  /**
   * Uploads an image to the project VFS and returns the local path
   */
  public static async uploadImageAsset(file: File): Promise<string> {
    const ws = WorkspaceManager.getInstance();
    const vfs = ws.getVFS();
    
    const assetDir = '/public/assets/images';
    // Ensure dir exists
    try {
      vfs._unsafe_writeFile(`${assetDir}/.keep`, '');
    } catch (e) {
      console.warn("Could not ensure asset dir exists, proceeding with write.");
    }

    const extension = file.name.split('.').pop() || 'png';
    const safeName = file.name.replace(/[^a-z0-9.]/gi, '_').toLowerCase();
    const fileName = `anny-upload-${Date.now()}-${safeName}`;
    const filePath = `${assetDir}/${fileName}`;

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        vfs._unsafe_writeFile(filePath, base64);
        vfs.saveToStorage();
        resolve(`/assets/images/${fileName}`);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /**
   * Inserts Shape into target file component with specific geometry.
   */
  public static insertShape(
    type: string, 
    color: string, 
    rect: { x: number; y: number; width: number; height: number }, 
    opts?: PatchTargetOptions
  ): boolean {
    const safeColor = color || '#8B5CF6';
    const { x, y, width, height } = rect;
    const id = `anny-${type}-${Date.now()}`;
    let snippet = '';

    const commonStyle = `position: 'absolute', left: '${x}px', top: '${y}px', width: '${width}px', height: '${height}px'`;

    switch (type) {
      case 'rounded_rectangle':
        snippet = `<div id="${id}" style={{ ${commonStyle}, backgroundColor: '${safeColor}', borderRadius: '12px' }} />`;
        break;
      case 'ellipse':
      case 'circle':
        snippet = `<div id="${id}" style={{ ${commonStyle}, backgroundColor: '${safeColor}', borderRadius: '50%' }} />`;
        break;
      case 'triangle':
        snippet = `<svg id="${id}" width="${width}" height="${height}" style={{ position: 'absolute', left: '${x}px', top: '${y}px', overflow: 'visible' }}>
          <path d="M ${width / 2} 0 L ${width} ${height} L 0 ${height} Z" fill="${safeColor}" />
        </svg>`;
        break;
      case 'star':
        // Generate a 5-point star path
        const points = [];
        for (let i = 0; i < 10; i++) {
          const r = i % 2 === 0 ? Math.min(width, height) / 2 : Math.min(width, height) / 4;
          const angle = (Math.PI * i) / 5 - Math.PI / 2;
          points.push(`${width / 2 + r * Math.cos(angle)},${height / 2 + r * Math.sin(angle)}`);
        }
        snippet = `<svg id="${id}" width="${width}" height="${height}" style={{ position: 'absolute', left: '${x}px', top: '${y}px', overflow: 'visible' }}>
          <polygon points="${points.join(' ')}" fill="${safeColor}" />
        </svg>`;
        break;
      case 'polygon':
        snippet = `<div id="${id}" style={{ ${commonStyle}, backgroundColor: '${safeColor}', clipPath: 'polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)' }} />`;
        break;
      case 'line':
        snippet = `<div id="${id}" style={{ position: 'absolute', left: '${x}px', top: '${y}px', width: '${width}px', height: '2px', backgroundColor: '${safeColor}' }} />`;
        break;
      case 'arrow':
        snippet = `<svg id="${id}" width="${width}" height="${height}" style={{ position: 'absolute', left: '${x}px', top: '${y}px', overflow: 'visible' }}>
          <line x1="0" y1="${height / 2}" x2="${width - 10}" y2="${height / 2}" stroke="${safeColor}" strokeWidth="2" />
          <path d="M ${width - 10} ${height / 2 - 5} L ${width} ${height / 2} L ${width - 10} ${height / 2 + 5} Z" fill="${safeColor}" />
        </svg>`;
        break;
      case 'rectangle':
      default:
        snippet = `<div id="${id}" style={{ ${commonStyle}, backgroundColor: '${safeColor}' }} />`;
        break;
    }

    return this.insertElementIntoProject(`Shape (${type})`, snippet, opts);
  }

  /**
   * Inserts Vector Path SVG safely into VFS file.
   */
  public static insertVectorPath(pathData: string, color: string, strokeWidth = 4, opts?: PatchTargetOptions): boolean {
    if (!pathData) return false;
    const safeColor = color || '#8B5CF6';
    const id = `anny-path-${Date.now()}`;
    const snippet = `<svg id="${id}" width="240" height="120" style={{ margin: '16px auto', display: 'block', overflow: 'visible' }}><path d="${pathData}" stroke="${safeColor}" strokeWidth="${strokeWidth}" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>`;
    return this.insertElementIntoProject('Vector Path', snippet, opts);
  }

  /**
   * Inserts Text element safely into VFS file.
   */
  public static insertTextElement(text = 'New Text Element', color = '#ffffff', opts?: PatchTargetOptions): boolean {
    const id = `anny-text-${Date.now()}`;
    const snippet = `<p id="${id}" style={{ color: '${color}', fontSize: '18px', fontWeight: 'bold', margin: '16px auto', textAlign: 'center' }}>${text}</p>`;
    return this.insertElementIntoProject('Text Element', snippet, opts);
  }

  /**
   * Inserts raw JSX snippet into target file / component.
   */
  public static insertElementIntoProject(elementType: string, snippet: string, opts?: PatchTargetOptions): boolean {
    try {
      this.snapshotVFSState();
      const wsManager = WorkspaceManager.getInstance();
      const vfs = wsManager.getVFS();

      const targetFile = this.getTargetFile(opts?.targetFile);
      const content = vfs.readFile(targetFile);
      if (!content) return false;

      const closingTags = ['</div>', '</section>', '</main>', '</article>', '</header>', '</footer>'];
      let lastIndex = -1;
      for (const tag of closingTags) {
        const idx = content.lastIndexOf(tag);
        if (idx > lastIndex) {
          lastIndex = idx;
        }
      }

      let updatedContent = '';
      if (lastIndex !== -1) {
        updatedContent = content.slice(0, lastIndex) + `\n  {/* Added by Anny Professional Editor: ${elementType} */}\n  ${snippet}\n` + content.slice(lastIndex);
      } else {
        updatedContent = content + `\n${snippet}\n`;
      }

      if (!this.validateJSXSyntax(updatedContent, targetFile)) {
        console.error(`[RealProjectSourcePatcher] Insertion into ${targetFile} produced invalid syntax. Rolling back.`);
        this.undo();
        return false;
      }

      vfs._unsafe_writeFile(targetFile, updatedContent);
      vfs.saveToStorage();
      window.dispatchEvent(new CustomEvent('anny_vfs_changed'));
      console.log(`[RealProjectSourcePatcher] Inserted ${elementType} into ${targetFile}`);
      return true;
    } catch (err) {
      console.error("[RealProjectSourcePatcher] Error inserting element:", err);
      return false;
    }
  }

  /**
   * Deletes element safely from project VFS file.
   */
  public static deleteElementFromProject(elementText: string, opts?: PatchTargetOptions): boolean {
    if (!elementText) return false;
    try {
      this.snapshotVFSState();
      const wsManager = WorkspaceManager.getInstance();
      const vfs = wsManager.getVFS();

      const targetFile = this.getTargetFile(opts?.targetFile, elementText);
      const content = vfs.readFile(targetFile);
      if (!content) return false;

      const lines = content.split('\n');
      const filtered = lines.filter(l => !l.includes(elementText));
      const updatedContent = filtered.join('\n');

      if (!this.validateJSXSyntax(updatedContent, targetFile)) {
        console.error(`[RealProjectSourcePatcher] Deletion in ${targetFile} produced invalid syntax. Rolling back.`);
        this.undo();
        return false;
      }

      vfs._unsafe_writeFile(targetFile, updatedContent);
      vfs.saveToStorage();
      window.dispatchEvent(new CustomEvent('anny_vfs_changed'));
      console.log(`[RealProjectSourcePatcher] Deleted element matching "${elementText}" from ${targetFile}`);
      return true;
    } catch (err) {
      console.error("[RealProjectSourcePatcher] Error deleting element:", err);
      return false;
    }
  }

  /**
   * Duplicates element matching elementText in target file.
   */
  public static duplicateElementInProject(elementText: string, opts?: PatchTargetOptions): boolean {
    if (!elementText) return false;
    try {
      this.snapshotVFSState();
      const wsManager = WorkspaceManager.getInstance();
      const vfs = wsManager.getVFS();

      const targetFile = this.getTargetFile(opts?.targetFile, elementText);
      const content = vfs.readFile(targetFile);
      if (!content) return false;

      const lines = content.split('\n');
      const lineIdx = lines.findIndex(l => l.includes(elementText));
      if (lineIdx === -1) return false;

      const targetLine = lines[lineIdx];
      lines.splice(lineIdx + 1, 0, targetLine);
      const updatedContent = lines.join('\n');

      if (!this.validateJSXSyntax(updatedContent, targetFile)) {
        console.error(`[RealProjectSourcePatcher] Duplication in ${targetFile} produced invalid syntax. Rolling back.`);
        this.undo();
        return false;
      }

      vfs._unsafe_writeFile(targetFile, updatedContent);
      vfs.saveToStorage();
      window.dispatchEvent(new CustomEvent('anny_vfs_changed'));
      console.log(`[RealProjectSourcePatcher] Duplicated element in ${targetFile}`);
      return true;
    } catch (err) {
      console.error("[RealProjectSourcePatcher] Error duplicating element:", err);
      return false;
    }
  }

  /**
   * Applies CSS filter string to target element style.
   */
  public static applyCSSFilter(elementText: string, filterVal: string, opts?: PatchTargetOptions): boolean {
    return this.patchStyleProperty(elementText, 'filter', filterVal, opts);
  }
}
