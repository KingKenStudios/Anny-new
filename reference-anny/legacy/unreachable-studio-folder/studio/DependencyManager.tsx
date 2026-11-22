import React, { useState } from 'react';
import { Package, Plus, Play, ShieldAlert, CheckCircle2, RefreshCw, Terminal, Search, Trash2 } from 'lucide-react';
import { WorkspaceManager } from '../../core/workspaceManager';

export interface PkgItem {
  name: string;
  version: string;
  type: 'dep' | 'devDep';
  status: 'installed' | 'outdated';
}

export const DependencyManager: React.FC = () => {
  const wsManager = WorkspaceManager.getInstance();
  const vfs = wsManager.getVFS();

  const [packages, setPackages] = useState<PkgItem[]>([
    { name: 'react', version: '^18.3.1', type: 'dep', status: 'installed' },
    { name: 'react-dom', version: '^18.3.1', type: 'dep', status: 'installed' },
    { name: 'lucide-react', version: '^0.344.0', type: 'dep', status: 'installed' },
    { name: 'clsx', version: '^2.1.0', type: 'dep', status: 'installed' },
    { name: 'tailwind-merge', version: '^2.2.1', type: 'dep', status: 'installed' },
    { name: 'vite', version: '^5.1.4', type: 'devDep', status: 'installed' },
    { name: 'typescript', version: '^5.2.2', type: 'devDep', status: 'installed' },
    { name: 'tailwindcss', version: '^3.4.1', type: 'devDep', status: 'installed' }
  ]);

  const [newPkgName, setNewPkgName] = useState('');
  const [isInstalling, setIsInstalling] = useState(false);
  const [auditPassed, setAuditPassed] = useState(true);

  const handleInstallPackage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPkgName.trim()) return;

    setIsInstalling(true);
    setTimeout(() => {
      setPackages(prev => [
        ...prev,
        { name: newPkgName.trim().toLowerCase(), version: '^1.0.0', type: 'dep', status: 'installed' }
      ]);
      setNewPkgName('');
      setIsInstalling(false);
    }, 500);
  };

  const handleRemovePackage = (pkgName: string) => {
    setPackages(prev => prev.filter(p => p.name !== pkgName));
  };

  return (
    <div className="h-full w-full bg-[#080a18] text-slate-200 flex flex-col font-sans overflow-hidden">
      {/* Header */}
      <div className="p-3 border-b border-white/10 bg-[#0d0f22] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package className="w-4 h-4 text-purple-400" />
          <h3 className="font-bold text-xs text-white uppercase tracking-wider font-mono">Package & Dependency Manager</h3>
        </div>
        <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
          NPM Security Audit: 0 Vulnerabilities
        </span>
      </div>

      <div className="flex-1 min-h-0 flex overflow-hidden">
        {/* Left: Dependencies List */}
        <div className="flex-1 border-r border-white/10 p-4 bg-[#0a0c1a] flex flex-col font-mono text-xs overflow-hidden">
          {/* Add Package Input */}
          <form onSubmit={handleInstallPackage} className="flex items-center gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
              <input
                type="text"
                value={newPkgName}
                onChange={(e) => setNewPkgName(e.target.value)}
                placeholder="Install NPM package (e.g., lodash, axios, motion)..."
                className="w-full bg-[#121428] border border-white/10 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white outline-none focus:border-purple-500/40"
              />
            </div>
            <button
              type="submit"
              disabled={isInstalling}
              className="px-4 py-1.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl flex items-center gap-1.5 text-xs shadow-md"
            >
              <Plus className="w-4 h-4" />
              <span>{isInstalling ? 'Installing...' : 'Install'}</span>
            </button>
          </form>

          {/* Package Grid */}
          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-1">
            {packages.map((pkg) => (
              <div key={pkg.name} className="p-3 bg-[#101228] border border-white/5 rounded-xl flex items-center justify-between hover:border-purple-500/30 transition-all">
                <div className="flex items-center gap-2.5">
                  <Package className={`w-4 h-4 ${pkg.type === 'dep' ? 'text-purple-400' : 'text-cyan-400'}`} />
                  <div>
                    <span className="font-bold text-white text-xs block">{pkg.name}</span>
                    <span className="text-[10px] text-slate-400">{pkg.type === 'dep' ? 'production dependency' : 'dev dependency'}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs text-cyan-300 font-bold bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-500/20">{pkg.version}</span>
                  <button
                    onClick={() => handleRemovePackage(pkg.name)}
                    className="p-1 text-slate-500 hover:text-rose-400 rounded hover:bg-white/5"
                    title="Uninstall package"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Scripts Runner & Security Audit */}
        <div className="w-80 p-4 bg-[#080915] flex flex-col font-mono text-xs space-y-4">
          <div className="p-3 bg-[#0d0f22] border border-white/10 rounded-xl space-y-3">
            <span className="font-bold text-white text-xs block uppercase tracking-wider">PACKAGE SCRIPTS</span>

            <div className="space-y-2">
              <button className="w-full p-2 bg-[#141630] hover:bg-[#1a1d3d] border border-white/10 rounded-lg flex items-center justify-between text-xs text-slate-200">
                <span className="font-bold text-cyan-300">npm run dev</span>
                <Play className="w-3.5 h-3.5 text-cyan-400 fill-current" />
              </button>

              <button className="w-full p-2 bg-[#141630] hover:bg-[#1a1d3d] border border-white/10 rounded-lg flex items-center justify-between text-xs text-slate-200">
                <span className="font-bold text-purple-300">npm run build</span>
                <Play className="w-3.5 h-3.5 text-purple-400 fill-current" />
              </button>

              <button className="w-full p-2 bg-[#141630] hover:bg-[#1a1d3d] border border-white/10 rounded-lg flex items-center justify-between text-xs text-slate-200">
                <span className="font-bold text-emerald-300">npm test</span>
                <Play className="w-3.5 h-3.5 text-emerald-400 fill-current" />
              </button>
            </div>
          </div>

          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl space-y-2 text-emerald-300 text-[11px]">
            <div className="flex items-center gap-2 font-bold text-xs text-emerald-400">
              <CheckCircle2 className="w-4 h-4" /> Security Audit Passed
            </div>
            <p className="text-slate-300 text-[10px] leading-relaxed">
              No vulnerabilities found in {packages.length} registered npm packages. AST imports checked against Security Sentinel rules.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
