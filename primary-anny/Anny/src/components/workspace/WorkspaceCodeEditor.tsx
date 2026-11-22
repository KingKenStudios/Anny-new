import React from 'react';
import { File, X, Eye, Folder, FilePlus, FolderPlus, RefreshCw, Search, ChevronDown, Check } from 'lucide-react';
import { WorkspaceManager } from '../../core/workspaceManager';
import { FileTreeView } from './FileTreeView';

export interface WorkspaceCodeEditorProps {
  vfsFiles: Record<string, string>;
  fileListKeys: string[];
  activeCodeFile: string;
  setActiveCodeFile: (file: string) => void;
  openTabs: string[];
  setOpenTabs: React.Dispatch<React.SetStateAction<string[]>>;
  activeFileContent: string;
  handleCodeChange: (content: string) => void;
  handleDeleteFile: (path: string) => void;
  isAddingFile: boolean;
  setIsAddingFile: (val: boolean) => void;
  newFileName: string;
  setNewFileName: (val: string) => void;
  handleCreateNewFile: () => void;
  isAddingFolder?: boolean;
  setIsAddingFolder?: (val: boolean) => void;
  newFolderName?: string;
  setNewFolderName?: (val: string) => void;
  handleCreateNewFolder?: () => void;
  handleRenameFile?: (path: string) => void;
  handleMoveFile?: (sourcePath: string, destinationFolder: string) => void;
  fileSearch: string;
  setFileSearch: (val: string) => void;
  setRightTab: (tab: any) => void;
  setVfsFiles: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  projectName: string;
}

export const WorkspaceCodeEditor: React.FC<WorkspaceCodeEditorProps> = ({
  vfsFiles,
  fileListKeys,
  activeCodeFile,
  setActiveCodeFile,
  openTabs,
  setOpenTabs,
  activeFileContent,
  handleCodeChange,
  handleDeleteFile,
  isAddingFile,
  setIsAddingFile,
  newFileName,
  setNewFileName,
  handleCreateNewFile,
  isAddingFolder = false,
  setIsAddingFolder,
  newFolderName = '',
  setNewFolderName,
  handleCreateNewFolder,
  handleRenameFile,
  handleMoveFile,
  fileSearch,
  setFileSearch,
  setRightTab,
  setVfsFiles,
  projectName
}) => {
  return (
    <div className="w-full h-full flex flex-row overflow-hidden bg-[#080a16]">
      {/* Left File Explorer Sidebar inside Code Mode */}
      <div className="w-64 bg-[#0a0c1a] border-r border-white/10 flex flex-col shrink-0 overflow-hidden font-mono text-xs">
        {/* Explorer Header */}
        <div className="p-3 border-b border-white/10 flex items-center justify-between bg-[#0d0f22] text-slate-300">
          <span className="font-bold flex items-center gap-1.5 text-white">
            <Folder className="w-3.5 h-3.5 text-purple-400" /> EXPLORER
          </span>
          <div className="flex items-center gap-1">
            <button 
              onClick={() => setIsAddingFile(!isAddingFile)} 
              className="p-1 hover:text-white rounded hover:bg-white/10" 
              title="New File"
            >
              <FilePlus className="w-3.5 h-3.5" />
            </button>
            {setIsAddingFolder && <button onClick={() => setIsAddingFolder(!isAddingFolder)} className="p-1 hover:text-white rounded hover:bg-white/10" title="New Folder"><FolderPlus className="w-3.5 h-3.5" /></button>}
            <button 
              onClick={() => {
                const allFiles = WorkspaceManager.getInstance().getVFS().getAllFiles();
                const map: Record<string, string> = {};
                allFiles.forEach(f => {
                  const cleanPath = f.path.startsWith('/') ? f.path.slice(1) : f.path;
                  map[cleanPath] = f.content;
                });
                setVfsFiles(map);
              }} 
              className="p-1 hover:text-white rounded hover:bg-white/10" 
              title="Refresh VFS"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Search Input Box */}
        <div className="p-2 border-b border-white/10 bg-[#080916]">
          <div className="bg-[#121428] border border-white/10 rounded-lg px-2 py-1 flex items-center gap-1.5 text-slate-400 focus-within:border-purple-500/40">
            <Search className="w-3 h-3" />
            <input 
              type="text" 
              placeholder="Filter files..." 
              value={fileSearch}
              onChange={(e) => setFileSearch(e.target.value)}
              className="w-full bg-transparent text-[11px] text-white focus:outline-none placeholder-slate-500"
            />
          </div>
        </div>

        {/* New File Inline Form */}
        {isAddingFile && (
          <div className="p-2 border-b border-white/10 bg-[#12142a] flex items-center gap-1">
            <input 
              type="text" 
              placeholder="path/to/file.tsx" 
              value={newFileName} 
              onChange={(e) => setNewFileName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateNewFile()}
              className="flex-1 bg-white/5 border border-white/20 rounded px-2 py-1 text-[11px] text-white focus:outline-none"
              autoFocus
            />
            <button onClick={handleCreateNewFile} className="p-1 bg-purple-600 text-white rounded"><Check className="w-3 h-3" /></button>
            <button onClick={() => setIsAddingFile(false)} className="p-1 hover:text-white"><X className="w-3 h-3" /></button>
          </div>
        )}

        {isAddingFolder && setNewFolderName && handleCreateNewFolder && (
          <div className="p-2 border-b border-white/10 bg-[#101329] flex items-center gap-1">
            <input type="text" placeholder="folder/path" value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleCreateNewFolder()} className="flex-1 bg-white/5 border border-white/20 rounded px-2 py-1 text-[11px] text-white focus:outline-none" autoFocus />
            <button onClick={handleCreateNewFolder} className="p-1 bg-cyan-600 text-white rounded"><Check className="w-3 h-3" /></button>
            <button onClick={() => setIsAddingFolder(false)} className="p-1 hover:text-white"><X className="w-3 h-3" /></button>
          </div>
        )}

        {/* Root Workspace Folder Title */}
        <div className="px-3 py-1.5 bg-[#090b18] border-b border-white/5 text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
          <ChevronDown className="w-3 h-3 text-purple-400" />
          <span>{(() => {
            try {
              const vfs = WorkspaceManager.getInstance().getVFS();
              const pkgStr = vfs.readFile('/package.json');
              if (pkgStr) {
                const parsed = JSON.parse(pkgStr);
                if (parsed.name && parsed.name !== 'ecommerce-website' && parsed.name !== 'anny-project') {
                  return parsed.name;
                }
              }
            } catch (e) {
              // ignore
            }
            return projectName 
              ? projectName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') 
              : 'anny-project';
          })()}</span>
        </div>

        {/* File List Tree View */}
        <div className="flex-1 overflow-y-auto p-1 custom-scrollbar text-[11px]">
          {fileListKeys.length === 0 ? (
            <div className="p-4 text-slate-500 text-center text-xs">No matching files in VFS</div>
          ) : (
            <FileTreeView 
              files={fileListKeys}
              folders={WorkspaceManager.getInstance().getVFS().getAllDirectories().map(d => d.path)}
              activeFile={activeCodeFile} 
              onSelect={setActiveCodeFile} 
              openTabs={openTabs} 
              setOpenTabs={setOpenTabs} 
              onDelete={handleDeleteFile}
              onRename={handleRenameFile}
              onMove={handleMoveFile}
            />
          )}
        </div>

        {/* Explorer Bottom Sync Indicator */}
        <div className="h-8 bg-[#0c0e20] border-t border-white/10 px-3 flex items-center justify-between text-[10px] text-slate-400 shrink-0">
          <span className="flex items-center gap-1 text-emerald-400 font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> VFS Synced
          </span>
          <span>{Object.keys(vfsFiles).length} files</span>
        </div>
      </div>

      {/* Main Code Editor & Tabs View */}
      <div className="flex-1 h-full min-w-0 flex flex-col overflow-hidden bg-[#0a0c1a]">
        {/* Open File Tabs Header Bar */}
        <div className="h-10 bg-[#0d0f22] border-b border-white/10 flex items-center justify-between overflow-x-auto custom-scrollbar shrink-0 px-2">
          <div className="flex items-center gap-1 overflow-x-auto">
            {openTabs.map(tabPath => {
              const isActive = activeCodeFile === tabPath || activeCodeFile === '/' + tabPath;
              return (
                <div
                  key={tabPath}
                  onClick={() => setActiveCodeFile(tabPath)}
                  className={`h-8 px-3 rounded-t-lg flex items-center gap-2 text-xs font-mono cursor-pointer shrink-0 transition-all ${
                    isActive
                      ? 'bg-[#0a0c1a] text-purple-300 font-bold border-t-2 border-t-purple-500 border-x border-x-white/10'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <File className="w-3.5 h-3.5 text-purple-400" />
                  <span className="truncate max-w-[150px]">{tabPath.split('/').pop()}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const filtered = openTabs.filter(t => t !== tabPath);
                      setOpenTabs(filtered);
                      if (isActive && filtered.length > 0) {
                        setActiveCodeFile(filtered[0]);
                      }
                    }}
                    className="p-0.5 hover:bg-white/10 rounded text-slate-400 hover:text-white"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>

          <div className="flex items-center gap-2 text-slate-400 pr-2">
            <button onClick={() => setRightTab('preview')} className="px-2 py-1 bg-purple-600/30 text-purple-300 rounded text-[11px] font-mono hover:bg-purple-600/50 flex items-center gap-1">
              <Eye className="w-3 h-3" /> Switch to Preview
            </button>
          </div>
        </div>

        {/* Code Editor Body */}
        <div className="flex-1 overflow-y-auto p-4 font-mono text-xs leading-relaxed text-slate-300 custom-scrollbar bg-[#080916]">
          <div className="flex gap-4 min-h-full">
            {/* Line Numbers */}
            <div className="text-slate-600 text-right select-none pr-3 border-r border-white/5 space-y-1 font-mono">
              {(activeFileContent || '').split('\n').map((_, idx) => (
                <div key={idx}>{idx + 1}</div>
              ))}
            </div>

            {/* Code Area */}
            <div className="flex-1 overflow-x-auto text-slate-200 relative">
              <textarea
                value={activeFileContent}
                onChange={(e) => handleCodeChange(e.target.value)}
                className="w-full h-full min-h-[500px] bg-transparent text-xs font-mono text-slate-200 outline-none resize-none leading-relaxed"
                spellCheck={false}
              />
            </div>
          </div>
        </div>

        {/* Editor Bottom Bar */}
        <div className="h-6 bg-[#0c0e20] border-t border-white/10 px-4 flex items-center justify-between text-[10px] font-mono text-slate-400 shrink-0">
          <div className="flex items-center gap-4">
            <span>Ln 1, Col 1</span>
            <span>UTF-8</span>
            <span className="text-purple-300 font-bold">{activeCodeFile.split('.').pop()?.toUpperCase() || 'FILE'}</span>
          </div>
          <div className="flex items-center gap-3">
            {(() => {
              const result = WorkspaceManager.getInstance().compileWorkspace();
              const fileErrors = result.errors.filter(e => e.file === activeCodeFile || e.file === activeCodeFile.replace(/^\//, ''));
              return fileErrors.length === 0 ? (
                <span className="text-emerald-400 font-bold">✓ No Syntax Errors</span>
              ) : (
                <span className="text-red-400 font-bold">✗ {fileErrors.length} Syntax Error(s)</span>
              );
            })()}
          </div>
        </div>
      </div>
    </div>
  );
};
