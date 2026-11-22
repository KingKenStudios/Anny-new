import React, { useState, useEffect } from 'react';
import { safeFetchJson } from '../lib/apiUtils';
import { MobileLogoMenu } from '../MobileLogoMenu';
import {
  Folder,
  Plus,
  Search,
  Code2,
  Globe,
  Smartphone,
  Monitor,
  Database,
  Gamepad2,
  Bot,
  ExternalLink,
  MoreVertical,
  Clock,
  Sparkles,
  ArrowRight,
  ChevronRight,
  Filter,
  CheckCircle2,
  Layers
} from 'lucide-react';
import { db, auth } from '../lib/firebase';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { registerCloudProjectOwnership } from '../services/projectOwnershipService';

interface AnnyProjectsViewProps {
  userId?: string;
  onToggleMobileMenu?: () => void;
  onOpenChatWithProject?: (projectName: string) => void;
}

export const AnnyProjectsView: React.FC<AnnyProjectsViewProps> = ({
  userId,
  onToggleMobileMenu,
  onOpenChatWithProject,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [projects, setProjects] = useState<any[]>([]);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [newProjectCategory, setNewProjectCategory] = useState('website');

  const categories = [
    { id: 'all', label: 'All Projects' },
    { id: 'website', label: 'Websites' },
    { id: 'mobile', label: 'Mobile Apps' },
    { id: 'desktop', label: 'Desktop Apps' },
    { id: 'agent', label: 'AI Agents' },
    { id: 'game', label: 'Games' },
  ];

  useEffect(() => {
    let mounted = true;
    const fetchProjects = async () => {
      const res = await safeFetchJson('/api/anny/projects');
      if (mounted && res.success && res.data?.projects) {
        const verifiedUid = auth?.currentUser?.uid || userId;
        const remoteApps = res.data.projects.map((p: any) => {
          const pId = p.projectId || p.project_id || p.id;
          const pOwner = p.ownerUserId || p.userId || verifiedUid;
          if (pId && pOwner && pOwner !== 'global' && pOwner !== 'anonymous') {
            try {
              registerCloudProjectOwnership(String(pId), String(pOwner));
            } catch {
              // ignore non-standard legacy IDs
            }
          }
          let pType = 'website';
          if (p.category === 'API') pType = 'agent';
          if (p.category === 'Dashboard') pType = 'desktop';

          return {
            id: p.id || p.project_id,
            name: p.name || 'Untitled App',
            description: p.description || '',
            type: pType,
            typeLabel: p.category || 'Website',
            icon: Globe,
            color: 'from-cyan-500 to-blue-600',
            lastModified: p.updated_at || p.created_at || 'Recently',
            modelUsed: p.model || 'Anny Core',
            status: p.status || 'Active',
            filesCount: p.files_count || 10,
          };
        });
        setProjects(remoteApps);
      } else if (res.error) {
        console.warn("[ProjectsView] Projects fetch status:", res.error);
      }
    };
    fetchProjects();
    return () => { mounted = false; };
  }, [userId]);

  const handleCreateProject = () => {
    if (!newProjectName.trim()) return;
    const projName = newProjectName.trim();
    const newProjObj = {
      id: `proj_${Date.now()}`,
      name: projName,
      description: newProjectDesc.trim() || 'AI Generated Project',
      type: newProjectCategory,
      typeLabel: newProjectCategory.toUpperCase(),
      icon: Globe,
      color: 'from-cyan-500 to-indigo-600',
      lastModified: 'Just now',
      modelUsed: 'Anny Core',
      status: 'Active',
      filesCount: 1,
    };
    setProjects(prev => [newProjObj, ...prev]);
    setIsNewModalOpen(false);
    setNewProjectName('');
    setNewProjectDesc('');
    if (onOpenChatWithProject) {
      onOpenChatWithProject(`Build ${projName}: ${newProjectDesc || 'Full-stack application'}`);
    }
  };

  const filteredProjects = projects.filter((p) => {
    const matchesCategory = selectedCategory === 'all' || p.type === selectedCategory;
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="flex-1 flex flex-col h-full bg-[#040612] text-slate-100 overflow-y-auto p-4 sm:p-6 lg:p-8 custom-scrollbar">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <MobileLogoMenu onToggleMobileMenu={onToggleMobileMenu} />
            <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-semibold uppercase tracking-wider">
              Anny Application
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white mt-1 flex items-center gap-2.5">
            <Folder className="w-7 h-7 text-cyan-400" />
            AI Projects
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Manage, launch, and edit software generated by Anny.
          </p>
        </div>

        <button
          onClick={() => setIsNewModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-cyan-500 via-indigo-600 to-fuchsia-600 hover:from-cyan-400 hover:via-indigo-500 hover:to-fuchsia-500 shadow-[0_0_20px_rgba(0,229,255,0.3)] transition-all transform active:scale-95 cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>New AI Project</span>
        </button>
      </div>

      {/* Filter & Search Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search AI projects..."
            className="w-full bg-[#090d28] border border-white/10 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
          />
        </div>

        {/* Categories Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full custom-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === cat.id
                  ? 'bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 font-semibold'
                  : 'bg-[#0a0e2a] border border-white/5 text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredProjects.map((project) => {
          const IconComp = project.icon;
          return (
            <div
              key={project.id}
              className="bg-[#080b22] border border-white/10 hover:border-cyan-500/40 rounded-2xl p-5 flex flex-col justify-between transition-all hover:shadow-[0_0_25px_rgba(0,229,255,0.15)] group relative overflow-hidden"
            >
              <div className="space-y-4">
                {/* Top Row */}
                <div className="flex items-start justify-between gap-3">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${project.color} flex items-center justify-center text-white shadow-lg shrink-0`}>
                    <IconComp className="w-5 h-5" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                      {project.status}
                    </span>
                    <button className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/5">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Content */}
                <div>
                  <h3 className="text-base font-bold text-white group-hover:text-cyan-300 transition-colors line-clamp-1">
                    {project.name}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1.5 leading-relaxed line-clamp-2">
                    {project.description}
                  </p>
                </div>
              </div>

              {/* Bottom Meta */}
              <div className="pt-4 border-t border-white/5 mt-5 space-y-3">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-cyan-400" />
                    {project.lastModified}
                  </span>
                  <span className="flex items-center gap-1 font-mono text-[10px] text-slate-300">
                    <Layers className="w-3 h-3 text-purple-400" />
                    {project.filesCount} files
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2 pt-1">
                  <span className="text-[10px] font-mono text-cyan-400/80 bg-cyan-950/50 px-2 py-0.5 rounded border border-cyan-800/40">
                    {project.modelUsed}
                  </span>
                  <button
                    onClick={() => onOpenChatWithProject && onOpenChatWithProject(project.name)}
                    className="flex items-center gap-1.5 text-xs font-semibold text-cyan-400 hover:text-cyan-300 transition-colors group/btn cursor-pointer"
                  >
                    <span>Open in Anny</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover/btn:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* New Project Modal */}
      {isNewModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#0b0e2d] border border-cyan-500/40 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h2 className="text-lg font-extrabold text-white flex items-center gap-2">
                <Folder className="w-5 h-5 text-cyan-400" />
                <span>Create New AI Project</span>
              </h2>
              <button
                onClick={() => setIsNewModalOpen(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ×
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Project Name</label>
                <input
                  type="text"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="e.g. KenPay Mobile Wallet"
                  className="w-full bg-[#050718] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Category</label>
                <select
                  value={newProjectCategory}
                  onChange={(e) => setNewProjectCategory(e.target.value)}
                  className="w-full bg-[#050718] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="website">Website / Web App</option>
                  <option value="mobile">Mobile Application</option>
                  <option value="desktop">Desktop Software</option>
                  <option value="agent">AI Agent / Service</option>
                  <option value="game">Game / Interactive</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Description / Requirements</label>
                <textarea
                  rows={3}
                  value={newProjectDesc}
                  onChange={(e) => setNewProjectDesc(e.target.value)}
                  placeholder="Describe the application features, layout, and purpose..."
                  className="w-full bg-[#050718] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setIsNewModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateProject}
                disabled={!newProjectName.trim()}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-cyan-500 to-indigo-600 hover:brightness-110 shadow-lg disabled:opacity-50 cursor-pointer"
              >
                Initialize & Build
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
