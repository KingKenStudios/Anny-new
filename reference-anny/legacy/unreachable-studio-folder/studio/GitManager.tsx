import React, { useState } from 'react';
import { GitBranch, GitCommit, GitPullRequest, Check, Plus, Minus, ArrowUp, ArrowDown, RefreshCw, CheckCircle2 } from 'lucide-react';
import { WorkspaceManager } from '../../core/workspaceManager';

export interface GitCommitItem {
  hash: string;
  message: string;
  author: string;
  date: string;
}

export const GitManager: React.FC = () => {
  const wsManager = WorkspaceManager.getInstance();
  const vfs = wsManager.getVFS();

  const [activeBranch, setActiveBranch] = useState('main');
  const [commitMessage, setCommitMessage] = useState('');
  const [commits, setCommits] = useState<GitCommitItem[]>([
    { hash: 'a1b2c3d', message: 'feat: master orchestrator autonomous pipeline initialization', author: 'Anny', date: '10m ago' },
    { hash: 'e4f5g6h', message: 'chore: virtual file system ast syntax checker configuration', author: 'Anny', date: '25m ago' },
    { hash: 'i7j8k9l', message: 'init: workspace container creation & package.json bootstrap', author: 'Anny', date: '1h ago' }
  ]);

  const [stagedFiles, setStagedFiles] = useState<string[]>([
    '/src/App.tsx',
    '/src/api/routes.ts',
    '/src/db/schema.ts'
  ]);
  const [isCommitted, setIsCommitted] = useState(false);

  const handleCommit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commitMessage.trim()) return;

    const newCommit: GitCommitItem = {
      hash: Math.random().toString(16).substring(2, 9),
      message: commitMessage.trim(),
      author: 'Anny',
      date: 'Just now'
    };

    setCommits([newCommit, ...commits]);
    setCommitMessage('');
    setIsCommitted(true);
    setTimeout(() => setIsCommitted(false), 3000);
  };

  return (
    <div className="h-full w-full bg-[#080a18] text-slate-200 flex flex-col font-sans overflow-hidden">
      {/* Header */}
      <div className="p-3 border-b border-white/10 bg-[#0d0f22] flex items-center justify-between font-mono text-xs">
        <div className="flex items-center gap-2">
          <GitBranch className="w-4 h-4 text-purple-400" />
          <h3 className="font-bold text-white uppercase tracking-wider">Git Source Control & History</h3>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2.5 py-0.5 rounded flex items-center gap-1.5 font-bold">
            <GitBranch className="w-3 h-3 text-cyan-400" /> Branch: {activeBranch}
          </span>
          <span className="text-emerald-400 font-bold">Ahead 1 • Behind 0</span>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex overflow-hidden">
        {/* Left: Staged Files & Commit Input */}
        <div className="w-80 border-r border-white/10 p-4 bg-[#0a0c1a] flex flex-col font-mono text-xs space-y-4">
          <form onSubmit={handleCommit} className="space-y-2.5">
            <span className="font-bold text-white text-xs block">COMMIT CHANGES</span>
            <input
              type="text"
              value={commitMessage}
              onChange={(e) => setCommitMessage(e.target.value)}
              placeholder="Commit message (e.g., feat: add component inspector)..."
              className="w-full bg-[#121428] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-purple-500/40"
            />
            <button
              type="submit"
              className={`w-full py-2 rounded-xl font-bold flex items-center justify-center gap-2 text-xs transition-all shadow-md ${
                isCommitted
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 text-white'
              }`}
            >
              {isCommitted ? <Check className="w-4 h-4" /> : <GitCommit className="w-4 h-4" />}
              <span>{isCommitted ? 'Committed & Pushed!' : 'Commit & Push'}</span>
            </button>
          </form>

          {/* Staged files */}
          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2">
            <div className="flex justify-between text-[10px] text-slate-400 font-bold uppercase">
              <span>STAGED CHANGES ({stagedFiles.length})</span>
              <span className="text-emerald-400">+48 -12</span>
            </div>

            {stagedFiles.map((file) => (
              <div key={file} className="p-2.5 bg-[#101228] border border-white/5 rounded-xl flex items-center justify-between">
                <span className="text-cyan-300 font-bold truncate text-[11px]">{file}</span>
                <span className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 rounded text-[9px] font-bold">STAGED</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Commit History Timeline */}
        <div className="flex-1 p-4 bg-[#080915] flex flex-col font-mono text-xs space-y-4 overflow-y-auto custom-scrollbar">
          <h4 className="font-bold text-white text-xs uppercase tracking-wider flex items-center gap-2">
            <GitPullRequest className="w-4 h-4 text-cyan-400" /> Commit History Log
          </h4>

          <div className="space-y-3">
            {commits.map((c) => (
              <div key={c.hash} className="p-3.5 bg-[#0a0c1a] border border-white/10 rounded-2xl flex items-center justify-between hover:border-cyan-500/30 transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-purple-500/10 border border-purple-500/30 flex items-center justify-center shrink-0">
                    <GitCommit className="w-4 h-4 text-purple-400" />
                  </div>
                  <div>
                    <span className="font-bold text-white text-xs block">{c.message}</span>
                    <span className="text-[10px] text-slate-400">{c.author} • {c.date}</span>
                  </div>
                </div>
                <span className="text-xs text-cyan-400 font-bold bg-cyan-950/40 px-2.5 py-1 rounded-lg border border-cyan-500/20">{c.hash}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
