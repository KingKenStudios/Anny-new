import React, { useState } from 'react';
import { Folder, File, ChevronRight, ChevronDown, Trash2, Pencil } from 'lucide-react';

export interface FileTreeViewProps {
  files: string[];
  folders?: string[];
  activeFile: string;
  onSelect: (filePath: string) => void;
  openTabs: string[];
  setOpenTabs: (tabs: string[]) => void;
  onDelete: (filePath: string) => void;
  onRename?: (path: string) => void;
  onMove?: (sourcePath: string, destinationFolder: string) => void;
}

export const FileTreeView: React.FC<FileTreeViewProps> = ({ 
  files,
  folders = [],
  activeFile, 
  onSelect, 
  openTabs, 
  setOpenTabs, 
  onDelete,
  onRename,
  onMove
}) => {
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({'src': true, 'src/components': true});
  
  const toggleFolder = (folderPath: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedFolders(prev => ({ ...prev, [folderPath]: !prev[folderPath] }));
  };

  // Build tree from both files and empty directories.
  const tree: any = {};
  folders.forEach((f: string) => {
    const normalized = f.replace(/^\/+/, '');
    if (!normalized) return;
    let current = tree;
    normalized.split('/').forEach((part) => {
      if (!current[part]) current[part] = {};
      current = current[part];
    });
  });
  files.forEach((f: string) => {
    const normalized = f.replace(/^\/+/, '');
    if (!normalized) return;
    const parts = normalized.split('/');
    let current = tree;
    for (let i = 0; i < parts.length; i++) {
      if (!current[parts[i]]) {
        current[parts[i]] = i === parts.length - 1 ? null : {};
      }
      current = current[parts[i]];
    }
  });

  const renderTree = (node: any, path: string = '', level: number = 0) => {
    return Object.keys(node).sort((a,b) => {
      // sort folders first
      if (node[a] !== null && node[b] === null) return -1;
      if (node[a] === null && node[b] !== null) return 1;
      return a.localeCompare(b);
    }).map(key => {
      const fullPath = path ? `${path}/${key}` : key;
      const isFolder = node[key] !== null;
      const isActive = activeFile === fullPath || activeFile === '/' + fullPath;
      const isExpanded = expandedFolders[fullPath] !== false; // default expanded

      if (isFolder) {
        return (
          <div key={fullPath}>
            <div 
              className="flex items-center gap-1.5 px-2 py-1 rounded cursor-pointer hover:bg-white/5 text-slate-300"
              style={{ paddingLeft: `${level * 12 + 8}px` }}
              onClick={(e) => toggleFolder(fullPath, e)}
              onDragOver={(e) => { if (onMove) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; } }}
              onDrop={(e) => { const source = e.dataTransfer.getData('text/anny-path'); if (source && onMove) { e.preventDefault(); onMove(source, '/' + fullPath); } }}
            >
              {isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-purple-400" /> : <ChevronRight className="w-3.5 h-3.5 text-purple-400" />}
              <Folder className="w-3.5 h-3.5 text-blue-400" />
              <span className="truncate">{key}</span>
            </div>
            {isExpanded && renderTree(node[key], fullPath, level + 1)}
          </div>
        );
      }

      // File
      const isTs = key.endsWith('.ts') || key.endsWith('.tsx');
      const isJson = key.endsWith('.json');
      return (
        <div 
          key={fullPath}
          draggable={Boolean(onMove)}
          onDragStart={(e) => { e.dataTransfer.setData('text/anny-path', '/' + fullPath); e.dataTransfer.effectAllowed = 'move'; }}
          onClick={() => {
            const canonicalPath = '/' + fullPath;
            onSelect(canonicalPath);
            if (!openTabs.includes(canonicalPath)) setOpenTabs([...openTabs, canonicalPath]);
          }}
          className={`group flex items-center justify-between px-2 py-1 rounded cursor-pointer transition-colors ${
            isActive ? 'bg-purple-600/30 text-purple-200 font-bold border border-purple-500/30' : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
          style={{ paddingLeft: `${level * 12 + 16}px` }}
        >
          <div className="flex items-center gap-1.5 truncate">
            <File className={`w-3.5 h-3.5 shrink-0 ${isTs ? 'text-blue-400' : isJson ? 'text-amber-400' : 'text-purple-400'}`} />
            <span className="truncate">{key}</span>
          </div>
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100">
            {onRename && <button onClick={(e) => { e.stopPropagation(); onRename('/' + fullPath); }} className="p-0.5 text-slate-500 hover:text-cyan-300 rounded transition" title="Rename"><Pencil className="w-3 h-3" /></button>}
            <button onClick={(e) => { e.stopPropagation(); onDelete('/' + fullPath); }} className="p-0.5 text-slate-500 hover:text-red-400 rounded transition" title="Delete"><Trash2 className="w-3 h-3" /></button>
          </div>
        </div>
      );
    });
  };

  return <div className="space-y-0.5">{renderTree(tree)}</div>;
};
