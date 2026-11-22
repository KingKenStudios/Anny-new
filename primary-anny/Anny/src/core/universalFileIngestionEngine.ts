/**
 * ANNY — UNIVERSAL FILE INGESTION, ANALYSIS & CREATION ENGINE (VERSION 2.0)
 * Handles drag-and-drop, individual files, multi-file uploads, folder trees, and ZIP archives.
 * Unpacks archives with JSZip, indexes project graphs, classifies workspace routes, and
 * publishes real-time events to SystemBus.
 */

import JSZip from 'jszip';
import { WorkspaceManager } from './workspaceManager';
import { systemBus } from './systemBus';

export interface IngestedFileResult {
  path: string;
  name: string;
  size: number;
  type: string;
  category: 'code' | 'document' | 'image' | 'audio' | 'video' | 'archive' | 'data' | 'other';
  content?: string;
  isBinary?: boolean;
}

export interface IngestionSummary {
  totalFiles: number;
  totalSize: number;
  extractedFromZip: boolean;
  projectType: string;
  framework?: string;
  mainLanguages: string[];
  entryPoint?: string;
  dependencies: Record<string, string>;
  componentsCount: number;
  routesCount: number;
  workspaceRecommended: 'code' | '3d' | 'image' | 'audio' | 'video' | 'document' | 'data';
}

export class UniversalFileIngestionEngine {
  private static instance: UniversalFileIngestionEngine;

  private constructor() {}

  public static getInstance(): UniversalFileIngestionEngine {
    if (!UniversalFileIngestionEngine.instance) {
      UniversalFileIngestionEngine.instance = new UniversalFileIngestionEngine();
    }
    return UniversalFileIngestionEngine.instance;
  }

  /**
   * Process an array of browser File objects (from input element or drag-and-drop DataTransfer)
   */
  public async processFiles(
    files: File[],
    sessionId?: string,
    onProgress?: (stage: string, progress: number, currentFileName?: string) => void
  ): Promise<IngestionSummary> {
    const wsManager = WorkspaceManager.getInstance();
    const activeSessionId = sessionId || wsManager.getActiveProjectId();
    const vfs = wsManager.getVFS();

    systemBus.publish('BuildStageChanged', 'UniversalFileIngestionEngine', {
      stage: 'UNDERSTANDING',
      progress: 5,
      message: `Receiving ${files.length} file(s)...`
    });
    if (onProgress) onProgress('Receiving files...', 5);

    let processedCount = 0;
    let totalSize = 0;
    let extractedFromZip = false;

    const fileBatch: { path: string; content: string; isExecutable?: boolean }[] = [];
    const mainLanguages = new Set<string>();

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      totalSize += file.size;
      const relativePath = file.webkitRelativePath || file.name;
      const normalizedPath = relativePath.startsWith('/') ? relativePath : '/' + relativePath;

      if (onProgress) onProgress(`Processing ${file.name}...`, Math.round(10 + (i / files.length) * 40), file.name);

      // Check if file is ZIP archive
      if (file.name.endsWith('.zip') || file.type === 'application/zip' || file.type === 'application/x-zip-compressed') {
        extractedFromZip = true;
        systemBus.publish('BuildStageChanged', 'UniversalFileIngestionEngine', {
          stage: 'ANALYZING',
          progress: 25,
          message: `Extracting ZIP archive '${file.name}'...`
        });

        try {
          const zip = new JSZip();
          const zipContent = await zip.loadAsync(file);

          const zipEntries = Object.keys(zipContent.files);
          let extractedCount = 0;

          for (const filename of zipEntries) {
            const entry = zipContent.files[filename];
            if (entry.dir) continue;

            // Skip node_modules, .git, build outputs
            if (filename.includes('node_modules/') || filename.includes('.git/') || filename.includes('dist/') || filename.includes('.DS_Store')) {
              continue;
            }

            const cleanPath = filename.startsWith('/') ? filename : '/' + filename;
            const ext = cleanPath.split('.').pop()?.toLowerCase() || '';

            // Extract text for code/text files, or data URL / string for media/binary assets
            if (this.isTextExtension(ext)) {
              const textContent = await entry.async('string');
              fileBatch.push({ path: cleanPath, content: textContent });
              this.trackLanguage(ext, mainLanguages);
            } else if (this.isMediaExtension(ext)) {
              const base64Data = await entry.async('base64');
              const mimeType = this.getMimeType(ext);
              fileBatch.push({ path: cleanPath, content: `data:${mimeType};base64,${base64Data}` });
            } else {
              fileBatch.push({ path: cleanPath, content: `[Binary Data: ${ext.toUpperCase()}]` });
            }

            extractedCount++;
            if (onProgress && extractedCount % 20 === 0) {
              onProgress(`Extracting archive entry ${extractedCount}...`, 30 + Math.min(30, Math.round((extractedCount / zipEntries.length) * 30)));
            }
          }
        } catch (zipErr) {
          console.error('JSZip extraction error:', zipErr);
        }
      } else {
        // Individual non-zip file
        const ext = normalizedPath.split('.').pop()?.toLowerCase() || '';
        if (this.isTextExtension(ext)) {
          const textContent = await this.readAsText(file);
          fileBatch.push({ path: normalizedPath, content: textContent });
          this.trackLanguage(ext, mainLanguages);
        } else if (this.isMediaExtension(ext)) {
          const dataUrl = await this.readAsDataURL(file);
          fileBatch.push({ path: normalizedPath, content: dataUrl });
        } else {
          fileBatch.push({ path: normalizedPath, content: `[Binary File: ${file.name}]` });
        }
      }

      processedCount++;
    }

    // Write batch into Virtual File System
    systemBus.publish('BuildStageChanged', 'UniversalFileIngestionEngine', {
      stage: 'WRITING_FILES',
      progress: 70,
      message: `Writing ${fileBatch.length} file(s) into session workspace VFS...`
    });
    if (onProgress) onProgress(`Writing files to workspace...`, 70);

    vfs.importBatch(fileBatch, (proc, total) => {
      const pct = 70 + Math.round((proc / total) * 20);
      systemBus.publish('BuildStageChanged', 'UniversalFileIngestionEngine', {
        stage: 'WRITING_FILES',
        progress: pct,
        message: `Indexed ${proc}/${total} files...`
      });
      if (onProgress) onProgress(`Indexed ${proc}/${total} files...`, pct);
    });

    // Extract project graph statistics
    const projectGraph = vfs.getProjectGraph();
    const pkgStr = vfs.readFile('/package.json');
    let framework = 'Web Application';
    let entryPoint = vfs.exists('/src/App.tsx') ? '/src/App.tsx' : vfs.exists('/index.html') ? '/index.html' : undefined;

    if (pkgStr) {
      if (pkgStr.includes('"react"')) framework = 'React + Vite';
      if (pkgStr.includes('"next"')) framework = 'Next.js';
      if (pkgStr.includes('"three"')) framework = '3D / Three.js';
      if (pkgStr.includes('"express"')) framework = 'Node.js Express Full-Stack';
    }

    let workspaceRecommended: IngestionSummary['workspaceRecommended'] = 'code';
    if (framework.includes('3D') || Array.from(mainLanguages).some(l => ['gltf', 'glb', 'obj', 'fbx'].includes(l))) {
      workspaceRecommended = '3d';
    }

    const summary: IngestionSummary = {
      totalFiles: fileBatch.length,
      totalSize,
      extractedFromZip,
      projectType: framework,
      framework,
      mainLanguages: Array.from(mainLanguages),
      entryPoint,
      dependencies: projectGraph.dependencies,
      componentsCount: projectGraph.components.length,
      routesCount: projectGraph.routes.length,
      workspaceRecommended
    };

    systemBus.publish('BuildStageChanged', 'UniversalFileIngestionEngine', {
      stage: 'COMPLETED',
      progress: 100,
      message: `Successfully ingested & analyzed ${fileBatch.length} file(s). Recommended workspace: ${workspaceRecommended.toUpperCase()}`
    });
    if (onProgress) onProgress('Analysis complete.', 100);

    return summary;
  }

  private readAsText(file: File): Promise<string> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string) || '');
      reader.onerror = () => resolve('');
      reader.readAsText(file);
    });
  }

  private readAsDataURL(file: File): Promise<string> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string) || '');
      reader.onerror = () => resolve('');
      reader.readAsDataURL(file);
    });
  }

  private isMediaExtension(ext: string): boolean {
    const mediaExts = [
      'png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'ico', 'tiff', 'svg',
      'mp3', 'wav', 'ogg', 'aac', 'flac', 'm4a',
      'mp4', 'webm', 'mov', 'avi',
      'pdf'
    ];
    return mediaExts.includes(ext.toLowerCase());
  }

  private getMimeType(ext: string): string {
    const map: Record<string, string> = {
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      gif: 'image/gif',
      webp: 'image/webp',
      bmp: 'image/bmp',
      ico: 'image/x-icon',
      svg: 'image/svg+xml',
      mp3: 'audio/mpeg',
      wav: 'audio/wav',
      ogg: 'audio/ogg',
      aac: 'audio/aac',
      flac: 'audio/flac',
      m4a: 'audio/m4a',
      mp4: 'video/mp4',
      webm: 'video/webm',
      mov: 'video/quicktime',
      avi: 'video/x-msvideo',
      pdf: 'application/pdf'
    };
    return map[ext.toLowerCase()] || 'application/octet-stream';
  }

  private isTextExtension(ext: string): boolean {
    const textExts = [
      'ts', 'tsx', 'js', 'jsx', 'json', 'html', 'css', 'scss', 'sass', 'less',
      'md', 'txt', 'py', 'java', 'c', 'cpp', 'h', 'cs', 'go', 'rs', 'php', 'rb',
      'swift', 'kt', 'sql', 'sh', 'bash', 'yaml', 'yml', 'xml', 'csv', 'env',
      'gitignore', 'dockerfile', 'svg'
    ];
    return textExts.includes(ext.toLowerCase());
  }

  private trackLanguage(ext: string, langs: Set<string>): void {
    const map: Record<string, string> = {
      ts: 'TypeScript',
      tsx: 'TypeScript React',
      js: 'JavaScript',
      jsx: 'JavaScript React',
      py: 'Python',
      java: 'Java',
      cpp: 'C++',
      c: 'C',
      cs: 'C#',
      go: 'Go',
      rs: 'Rust',
      php: 'PHP',
      rb: 'Ruby',
      html: 'HTML',
      css: 'CSS',
      json: 'JSON',
      md: 'Markdown',
      sql: 'SQL'
    };
    if (map[ext]) langs.add(map[ext]);
  }
}

export const universalFileIngestionEngine = UniversalFileIngestionEngine.getInstance();
