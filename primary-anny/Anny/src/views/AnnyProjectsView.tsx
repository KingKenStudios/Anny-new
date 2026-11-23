import React, { useState, useEffect } from 'react';
import { safeFetchJson } from '../lib/apiUtils';
import { MobileLogoMenu } from '../MobileLogoMenu';
import {
  Folder,
  Plus,
  Search,
  Globe,
  Clock,
  ArrowRight,
  Layers,
  Trash2,
  Loader2,
  AlertCircle,
  Play,
} from 'lucide-react';
import { auth } from '../lib/firebase';
import {
  registerCloudProjectOwnership,
  registerLocalProjectOwnership,
} from '../services/projectOwnershipService';

export interface LoadedProjectPayload {
  projectId: string;
  name: string;
  version?: number;
  files?: Record<string, string>;
  previewUrl?: string;
}

interface AnnyProjectsViewProps {
  userId?: string;
  onToggleMobileMenu?: () => void;
  onOpenChatWithProject?: (projectName: string) => void;
  onOpenProjectWorkspace?: (project: LoadedProjectPayload) => void;
}

export const AnnyProjectsView: React.FC<AnnyProjectsViewProps> = ({
  userId,
  onToggleMobileMenu,
  onOpenChatWithProject,
  onOpenProjectWorkspace,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [projects, setProjects] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);
  const [openingProjectId, setOpeningProjectId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null);
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
      setIsLoading(true);
      setActionError(null);
      const res = await safeFetchJson('/api/anny/projects');
      if (!mounted) return;
      if (res.success && res.data?.projects) {
        const signedInUid = auth?.currentUser?.uid;
        const mapped = res.data.projects.map((p: any) => {
          const pId = String(p.projectId || p.project_id || p.id || '');
          const pOwner = p.ownerUserId || p.userId || signedInUid;
          if (pId) {
            try {
              if (signedInUid && pOwner && pOwner !== 'global' && pOwner !== 'anonymous') {
                registerCloudProjectOwnership(pId, String(pOwner));
              } else {
                registerLocalProjectOwnership(pId);
              }
            } catch {
              // ignore pre-existing ownership conflicts
            }
          }

          let pType = 'website';
          const cat = String(p.projectType || p.category || '').toLowerCase();
          if (cat === 'api' || cat === 'agent') pType = 'agent';
          else if (cat === 'dashboard' || cat === 'desktop') pType = 'desktop';
          else if (cat === 'mobile') pType = 'mobile';
          else if (cat === 'game') pType = 'game';

          const rawDate = p.updatedAt || p.updated_at || p.createdAt || p.created_at;
          const formattedDate = rawDate
            ? new Date(rawDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
            : 'Saved';

          return {
            id: pId,
            name: p.name || 'Untitled Project',
            description: p.description || p.prompt || 'Generated application workspace',
            type: pType,
            typeLabel: p.projectType || p.category || 'Website',
            lastModified: formattedDate,
            version: Number(p.version) || 1,
            buildStatus: p.buildStatus || p.status || 'READY',
            previewStatus: p.previewStatus || 'STOPPED',
            filesCount: typeof p.filesCount === 'number' ? p.filesCount : typeof p.files_count === 'number' ? p.files_count : 0,
          };
        });
        setProjects(mapped);
      } else if (res.error) {
        setActionError(res.error);
      }
      setIsLoading(false);
    };
    void fetchProjects();
    return () => {
      mounted = false;
    };
  }, [userId]);

  const handleOpenInBuilder = async (project: any) => {
    if (!project?.id || openingProjectId) return;
    setActionError(null);
    setOpeningProjectId(project.id);
    try {
      const res = await safeFetchJson(`/api/anny/projects/${encodeURIComponent(project.id)}`);
      const loaded = res.data?.project;
      if (!res.success || !loaded) {
        throw new Error(res.error || 'Could not load project files from server.');
      }
      const pId = String(loaded.projectId || project.id);
      const signedInUid = auth?.currentUser?.uid;
      try {
        if (signedInUid && loaded.ownerUserId) {
          registerCloudProjectOwnership(pId, String(loaded.ownerUserId));
        } else {
          registerLocalProjectOwnership(pId);
        }
      } catch {
        // ignore pre-existing local/cloud ownership record
      }

      if (onOpenProjectWorkspace) {
        onOpenProjectWorkspace({
          projectId: pId,
          name: loaded.name || project.name,
          version: Number(loaded.version) || project.version || 1,
          files: loaded.files || {},
          previewUrl: res.data?.preview?.previewUrl,
        });
      } else if (onOpenChatWithProject) {
        onOpenChatWithProject(`Open project ${loaded.name || project.name}`);
      }
    } catch (err: any) {
      setActionError(err?.message || 'Unable to open project in Website Builder.');
    } finally {
      setOpeningProjectId(null);
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!projectId || deletingProjectId) return;
    setActionError(null);
    setDeletingProjectId(projectId);
    try {
      const res = await safeFetchJson(`/api/anny/projects/${encodeURIComponent(projectId)}`, {
        method: 'DELETE',
      });
      if (!res.success) {
        throw new Error(res.error || 'Unable to delete project.');
      }
      setProjects((prev) => prev.filter((p) => p.id !== projectId));
      setConfirmDeleteId(null);
    } catch (err: any) {
      setActionError(err?.message || 'Failed to delete project.');
    } finally {
      setDeletingProjectId(null);
    }
  };

  const handleCreateProject = () => {
    if (!newProjectName.trim()) return;
    const projName = newProjectName.trim();
    const desc = newProjectDesc.trim();
    setIsNewModalOpen(false);
    setNewProjectName('');
    setNewProjectDesc('');
    if (onOpenChatWithProject) {
      onOpenChatWithProject(`Build ${projName}${desc ? `: ${desc}` : ' website application'}`);
    }
  };

  const filteredProjects = projects.filter((p) => {
    const matchesCategory = selectedCategory === 'all' || p.type === selectedCategory;
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="flex-1 flex flex-col h-full bg-[#040612] text-slate-100 overflow-y-auto p-4 sm:p-6 lg:p-8 custom-scrollbar">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <MobileLogoMenu onToggleMobileMenu={onToggleMobileMenu} />
            <span className="text-xs font-medium text-cyan-400">
              Saved Workspaces
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white mt-1 flex items-center gap-2.5">
            <Folder className="w-7 h-7 text-cyan-400" />
            AI Projects
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Reopen, preview, edit, and manage websites and applications built with ANNY.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsNewModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-cyan-500 via-indigo-600 to-fuchsia-600 hover:brightness-110 shadow-lg transition-all cursor-pointer shrink-0 whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          <span>New AI Project</span>
        </button>
      </div>

      {actionError && (
        <div className="mb-5 px-4 py-3 rounded-xl bg-rose-950/80 border border-rose-500/40 text-rose-200 text-xs flex items-center justify-between gap-3">
          <span className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{actionError}</span>
          </span>
          <button
            type="button"
            onClick={() => setActionError(null)}
            className="text-rose-300 hover:text-white font-semibold cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Filter & Search Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search saved projects..."
            className="w-full bg-[#090d28] border border-white/10 rounded-xl pl-10 pr-4 py-2 text-[16px] sm:text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full custom-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer shrink-0 ${
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
      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-sm text-slate-400 gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
          <span>Loading saved projects...</span>
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-[#080b22] p-10 text-center space-y-3">
          <Folder className="w-10 h-10 text-slate-500 mx-auto" />
          <div className="text-sm font-semibold text-white">No saved projects match this view</div>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Ask ANNY to build a website or application and it will be automatically saved here for instant preview and editing.
          </p>
          <button
            type="button"
            onClick={() => setIsNewModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold cursor-pointer"
          >
            Start New Project
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredProjects.map((project) => {
            const isOpening = openingProjectId === project.id;
            const isConfirmingDelete = confirmDeleteId === project.id;
            const isDeleting = deletingProjectId === project.id;

            return (
              <div
                key={project.id}
                className="bg-[#080b22] border border-white/10 hover:border-cyan-500/40 rounded-2xl p-5 flex flex-col justify-between transition-all group relative overflow-hidden"
              >
                <div className="space-y-3">
                  {/* Top Row */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shrink-0">
                      <Globe className="w-5 h-5" />
                    </div>
                    <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400 tabular-nums">
                      <span>v{project.version}</span>
                      <span>·</span>
                      <span
                        className={
                          project.buildStatus === 'FAILED'
                            ? 'text-rose-400'
                            : 'text-emerald-400'
                        }
                      >
                        {project.buildStatus}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setConfirmDeleteId(isConfirmingDelete ? null : project.id)
                        }
                        className="text-slate-400 hover:text-rose-400 p-1 rounded-lg hover:bg-white/5 cursor-pointer"
                        title="Delete project"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
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

                  {isConfirmingDelete && (
                    <div className="p-2.5 rounded-xl bg-rose-950/70 border border-rose-500/40 flex items-center justify-between gap-2 text-xs">
                      <span className="text-rose-200">Delete this project?</span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          disabled={isDeleting}
                          onClick={() => void handleDeleteProject(project.id)}
                          className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold cursor-pointer disabled:opacity-50"
                        >
                          {isDeleting ? 'Deleting...' : 'Delete'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="px-2 py-1 rounded-lg bg-white/10 text-slate-300 hover:text-white cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Bottom Meta */}
                <div className="pt-4 border-t border-white/5 mt-5 space-y-3">
                  <div className="flex items-center justify-between text-[11px] text-slate-400 tabular-nums">
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
                    <span className="text-[11px] text-slate-400 truncate">
                      {project.typeLabel} · Preview {project.previewStatus.toLowerCase()}
                    </span>
                    <button
                      type="button"
                      disabled={isOpening}
                      onClick={() => void handleOpenInBuilder(project)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/35 text-xs font-semibold text-cyan-300 transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap shrink-0"
                    >
                      {isOpening ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Play className="w-3.5 h-3.5" />
                      )}
                      <span>{isOpening ? 'Opening...' : 'Open Preview'}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

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
                type="button"
                onClick={() => setIsNewModalOpen(false)}
                className="text-slate-400 hover:text-white text-lg font-bold cursor-pointer"
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
                  placeholder="e.g. KenPay Storefront"
                  className="w-full bg-[#050718] border border-white/10 rounded-xl px-3 py-2 text-[16px] sm:text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Category</label>
                <select
                  value={newProjectCategory}
                  onChange={(e) => setNewProjectCategory(e.target.value)}
                  className="w-full bg-[#050718] border border-white/10 rounded-xl px-3 py-2 text-[16px] sm:text-xs text-white focus:outline-none focus:border-cyan-500"
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
                  className="w-full bg-[#050718] border border-white/10 rounded-xl px-3 py-2 text-[16px] sm:text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsNewModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateProject}
                disabled={!newProjectName.trim()}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-cyan-500 to-indigo-600 hover:brightness-110 shadow-lg disabled:opacity-50 cursor-pointer"
              >
                Initialize &amp; Build
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

