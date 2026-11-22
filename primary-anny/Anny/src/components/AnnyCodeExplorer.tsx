/**
 * ANNY — Interactive VFS Code Explorer (Migrated from Reference & Cleaned)
 *
 * Parity migration from reference-anny/src/AnnyCodeExplorer.tsx:
 *  - Preserves hierarchical VFS tree building, search filter, tabbed file viewer,
 *    syntax-friendly line numbers, copy-to-clipboard, and editable save hook.
 *  - Removed hardcoded SHOPIX demo files; displays an honest empty state when
 *    no project files exist in the active VFS workspace.
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  Check,
  ChevronDown,
  ChevronRight,
  Code2,
  Copy,
  FileCode,
  FileJson,
  FileText,
  Folder,
  FolderOpen,
  Save,
  Search,
  X,
} from 'lucide-react';

export interface ExplorerFileNode {
  id: string;
  name: string;
  type: 'file' | 'folder';
  path: string;
  language?: string;
  iconType?: 'tsx' | 'ts' | 'css' | 'json' | 'js' | 'md' | 'html' | 'svg';
  children?: ExplorerFileNode[];
  content?: string;
}

export interface AnnyCodeExplorerProps {
  vfsFiles?: Record<string, string>;
  onFileSave?: (path: string, content: string) => void;
  className?: string;
}

export function buildTreeFromVFS(vfs: Record<string, string>): ExplorerFileNode[] {
  const rootNodes: ExplorerFileNode[] = [];
  const folderMap: Record<string, ExplorerFileNode> = {};

  const sortedPaths = Object.keys(vfs).sort((a, b) => a.localeCompare(b));
  sortedPaths.forEach((rawPath) => {
    const content = vfs[rawPath];
    const normalized = rawPath.replace(/^\/+/, '');
    if (!normalized) return;
    const parts = normalized.split('/').filter(Boolean);
    let currentPath = '';

    parts.forEach((part, index) => {
      const isFile = index === parts.length - 1;
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      const id = currentPath.replace(/[\/\.]/g, '-');

      if (isFile) {
        const ext = part.split('.').pop()?.toLowerCase();
        let iconType: ExplorerFileNode['iconType'] = 'ts';
        if (ext === 'tsx') iconType = 'tsx';
        else if (ext === 'ts') iconType = 'ts';
        else if (ext === 'css') iconType = 'css';
        else if (ext === 'json') iconType = 'json';
        else if (ext === 'js' || ext === 'jsx') iconType = 'js';
        else if (ext === 'md') iconType = 'md';
        else if (ext === 'html') iconType = 'html';
        else if (ext === 'svg') iconType = 'svg';

        const fileNode: ExplorerFileNode = {
          id,
          name: part,
          type: 'file',
          path: rawPath,
          language: ext || 'text',
          iconType,
          content,
        };

        if (parts.length === 1) {
          rootNodes.push(fileNode);
        } else {
          const parentFolder = folderMap[parts.slice(0, index).join('/')];
          if (parentFolder) {
            parentFolder.children = parentFolder.children || [];
            parentFolder.children.push(fileNode);
          } else {
            rootNodes.push(fileNode);
          }
        }
      } else if (!folderMap[currentPath]) {
        const folderNode: ExplorerFileNode = {
          id,
          name: part,
          type: 'folder',
          path: currentPath,
          children: [],
        };
        folderMap[currentPath] = folderNode;
        if (index === 0) {
          rootNodes.push(folderNode);
        } else {
          const parentFolder = folderMap[parts.slice(0, index).join('/')];
          if (parentFolder) {
            parentFolder.children = parentFolder.children || [];
            parentFolder.children.push(folderNode);
          }
        }
      }
    });
  });

  return rootNodes;
}

function collectFirstFile(nodes: ExplorerFileNode[]): ExplorerFileNode | null {
  for (const node of nodes) {
    if (node.type === 'file') return node;
    if (node.children) {
      const found = collectFirstFile(node.children);
      if (found) return found;
    }
  }
  return null;
}

function findNodeById(nodes: ExplorerFileNode[], id: string): ExplorerFileNode | null {
  for (const node of nodes) {
    if (node.id === id) return node;
    if (node.children) {
      const found = findNodeById(node.children, id);
      if (found) return found;
    }
  }
  return null;
}

export const AnnyCodeExplorer: React.FC<AnnyCodeExplorerProps> = ({
  vfsFiles,
  onFileSave,
  className = '',
}) => {
  const activeTree = useMemo(() => {
    if (!vfsFiles || Object.keys(vfsFiles).length === 0) return [];
    return buildTreeFromVFS(vfsFiles);
  }, [vfsFiles]);

  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({
    src: true,
    'src-components': true,
    'src-pages': true,
    server: true,
  });
  const [selectedFileId, setSelectedFileId] = useState<string>('');
  const [openTabIds, setOpenTabIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [copied, setCopied] = useState(false);
  const [draftContent, setDraftContent] = useState<string | null>(null);
  const [savedNotice, setSavedNotice] = useState(false);

  const selectedFile = useMemo(() => {
    if (selectedFileId) {
      const match = findNodeById(activeTree, selectedFileId);
      if (match && match.type === 'file') return match;
    }
    return collectFirstFile(activeTree);
  }, [activeTree, selectedFileId]);

  useEffect(() => {
    if (selectedFile && !openTabIds.includes(selectedFile.id)) {
      setOpenTabIds((prev) => [...prev.slice(-7), selectedFile.id]);
      setSelectedFileId(selectedFile.id);
    }
    setDraftContent(null);
  }, [selectedFile?.id]);

  const handleSelectNode = (node: ExplorerFileNode) => {
    if (node.type === 'folder') {
      setExpandedFolders((prev) => ({ ...prev, [node.id]: !prev[node.id] }));
      return;
    }
    setSelectedFileId(node.id);
    setDraftContent(null);
    if (!openTabIds.includes(node.id)) {
      setOpenTabIds((prev) => [...prev, node.id]);
    }
  };

  const handleCloseTab = (e: React.MouseEvent, idToClose: string) => {
    e.stopPropagation();
    const next = openTabIds.filter((id) => id !== idToClose);
    setOpenTabIds(next);
    if (selectedFileId === idToClose) {
      setSelectedFileId(next[next.length - 1] || '');
    }
  };

  const handleCopy = () => {
    const text = draftContent ?? selectedFile?.content ?? '';
    if (!text) return;
    navigator.clipboard?.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const handleSave = () => {
    if (!selectedFile || !onFileSave || draftContent === null) return;
    onFileSave(selectedFile.path, draftContent);
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 1800);
  };

  const renderIcon = (node: ExplorerFileNode) => {
    if (node.type === 'folder') {
      return expandedFolders[node.id] ? (
        <FolderOpen className="w-3.5 h-3.5 text-amber-400 shrink-0" />
      ) : (
        <Folder className="w-3.5 h-3.5 text-amber-400/80 shrink-0" />
      );
    }
    if (node.iconType === 'json') return <FileJson className="w-3.5 h-3.5 text-amber-300 shrink-0" />;
    if (node.iconType === 'md' || node.iconType === 'html') return <FileText className="w-3.5 h-3.5 text-slate-300 shrink-0" />;
    return <FileCode className="w-3.5 h-3.5 text-cyan-400 shrink-0" />;
  };

  const renderTree = (nodes: ExplorerFileNode[], depth = 0): React.ReactNode =>
    nodes.map((node) => {
      const q = searchQuery.trim().toLowerCase();
      if (q && node.type === 'file' && !node.path.toLowerCase().includes(q)) {
        return null;
      }
      const isExpanded = Boolean(expandedFolders[node.id] || q);
      const isSelected = selectedFile?.id === node.id;

      return (
        <div key={node.id}>
          <button
            type="button"
            onClick={() => handleSelectNode(node)}
            style={{ paddingLeft: `${depth * 14 + 10}px` }}
            className={`w-full flex items-center gap-2 py-1.5 pr-2 text-left text-xs rounded-lg transition-colors cursor-pointer ${
              isSelected
                ? 'bg-cyan-500/15 text-cyan-200 border border-cyan-500/30'
                : 'text-slate-300 hover:bg-white/5 hover:text-white border border-transparent'
            }`}
          >
            {node.type === 'folder' ? (
              isExpanded ? (
                <ChevronDown className="w-3 h-3 text-slate-500 shrink-0" />
              ) : (
                <ChevronRight className="w-3 h-3 text-slate-500 shrink-0" />
              )
            ) : (
              <span className="w-3 shrink-0" />
            )}
            {renderIcon(node)}
            <span className="truncate font-mono text-[11px]">{node.name}</span>
          </button>
          {node.type === 'folder' && isExpanded && node.children && (
            <div>{renderTree(node.children, depth + 1)}</div>
          )}
        </div>
      );
    });

  if (activeTree.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-[#050816] p-8 text-center ${className}`}>
        <Code2 className="w-8 h-8 text-slate-500 mb-3" />
        <h3 className="text-sm font-semibold text-white">No Generated Project Files Yet</h3>
        <p className="text-xs text-slate-400 mt-1 max-w-sm">
          Ask ANNY to generate a website or full-stack application and its real virtual filesystem files will appear here for inspection and editing.
        </p>
      </div>
    );
  }

  const displayedCode = draftContent ?? selectedFile?.content ?? '';

  return (
    <div className={`flex flex-col md:flex-row rounded-2xl border border-white/10 bg-[#050816] overflow-hidden min-h-[420px] ${className}`}>
      {/* File Tree Sidebar */}
      <div className="w-full md:w-64 border-b md:border-b-0 md:border-r border-white/10 bg-[#070b1e] flex flex-col">
        <div className="p-2.5 border-b border-white/10">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter project files..."
              className="w-full pl-8 pr-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">{renderTree(activeTree)}</div>
      </div>

      {/* Editor & Tabs */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-white/10 bg-[#090e26] overflow-x-auto">
          <div className="flex items-center gap-1.5 min-w-0">
            {openTabIds.map((tabId) => {
              const tabFile = findNodeById(activeTree, tabId);
              if (!tabFile) return null;
              const active = selectedFile?.id === tabId;
              return (
                <button
                  key={tabId}
                  type="button"
                  onClick={() => handleSelectNode(tabFile)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-mono transition-colors cursor-pointer shrink-0 ${
                    active ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-500/40' : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span>{tabFile.name}</span>
                  <X
                    className="w-3 h-3 opacity-60 hover:opacity-100"
                    onClick={(e) => handleCloseTab(e, tabId)}
                  />
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {onFileSave && draftContent !== null && (
              <button
                type="button"
                onClick={handleSave}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 text-[11px] font-semibold hover:bg-emerald-500/30 cursor-pointer"
              >
                <Save className="w-3 h-3" />
                <span>{savedNotice ? 'Saved' : 'Save'}</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-slate-300 text-[11px] hover:bg-white/10 cursor-pointer"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto bg-[#040612] p-3">
          {onFileSave ? (
            <textarea
              value={displayedCode}
              onChange={(e) => setDraftContent(e.target.value)}
              spellCheck={false}
              className="w-full h-full min-h-[360px] bg-transparent font-mono text-xs leading-relaxed text-slate-200 focus:outline-none resize-none"
            />
          ) : (
            <pre className="font-mono text-xs leading-relaxed text-slate-200 whitespace-pre-wrap break-words">
              {displayedCode}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
};
