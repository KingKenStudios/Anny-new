import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Plus, Search, Trash2, ExternalLink, Folder, Sparkles, Play, Code2, 
  CheckCircle2, Clock, Layers, Globe, Rocket, MoreVertical, Layout, 
  ShoppingBag, Server, Database, ShieldCheck, Cpu, ArrowRight
} from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';

export interface AppItem {
  id: string;
  name: string;
  description: string;
  category: 'Website' | 'Full-Stack' | 'API' | '3D / Model' | 'Dashboard';
  status: 'Live' | 'Building' | 'Draft' | 'Completed';
  lastModified: string;
  progress: number;
  tags: string[];
  prompt: string;
  thumbnailUrl?: string;
  iconName?: string;
}

const DEFAULT_APPS: AppItem[] = [
  {
    id: 'app-nexora-ecommerce',
    name: 'Nexora E-commerce Store',
    description: 'Modern luxury sneaker & apparel e-commerce store with 3D product showcase, cart, and dark aesthetics.',
    category: 'Website',
    status: 'Live',
    lastModified: 'Just now',
    progress: 100,
    tags: ['React', 'Vite', 'Tailwind', 'Motion'],
    prompt: 'Build me a modern e-commerce website with sneakers 3D showcase',
    iconName: 'ShoppingBag'
  },
  {
    id: 'app-express-rest-api',
    name: 'High-Performance REST API',
    description: 'Secure Express.js TypeScript API layer with rate-limiting, JWT authentication, and Firestore bindings.',
    category: 'API',
    status: 'Completed',
    lastModified: '2 hours ago',
    progress: 100,
    tags: ['Express', 'TypeScript', 'JWT', 'Security'],
    prompt: 'Create a REST API with secure authentication and rate limiting',
    iconName: 'Server'
  },
  {
    id: 'app-analytics-dashboard',
    name: 'Enterprise Analytics Dashboard',
    description: 'Real-time telemetry and hardware metric visualizer with dark mode data charts and live alerts.',
    category: 'Dashboard',
    status: 'Completed',
    lastModified: '1 day ago',
    progress: 95,
    tags: ['Recharts', 'Tailwind', 'TypeScript'],
    prompt: 'Design a dark mode analytics dashboard with telemetry metrics',
    iconName: 'Layout'
  },
  {
    id: 'app-supabase-auth',
    name: 'Supabase Auth & Security Engine',
    description: 'User login, OAuth providers, multi-factor authentication, and Firestore RLS security policies.',
    category: 'Full-Stack',
    status: 'Live',
    lastModified: '3 days ago',
    progress: 100,
    tags: ['Firestore', 'Auth', 'RLS'],
    prompt: 'Set up Supabase authentication and database security rules',
    iconName: 'ShieldCheck'
  }
];

interface AnnyMyAppsProps {
  user?: any;
  onOpenApp: (prompt: string, appId?: string) => void;
  onNewApp: () => void;
}

export const AnnyMyApps: React.FC<AnnyMyAppsProps> = ({ user, onOpenApp, onNewApp }) => {
  const [apps, setApps] = useState<AppItem[]>(() => {
    try {
      const saved = localStorage.getItem('anny_my_apps');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_APPS;
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem('anny_my_apps', JSON.stringify(apps));
    } catch (e) {
      console.error(e);
    }
  }, [apps]);

  // Firestore real-time backend sync
  useEffect(() => {
    if (!user || !user.uid) return;
    try {
      const q = query(collection(db, 'users', user.uid, 'apps'));
      const unsub = onSnapshot(q, (snapshot) => {
        if (!snapshot.empty) {
          const remoteApps: AppItem[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            remoteApps.push({
              id: docSnap.id,
              name: data.name || 'Untitled App',
              description: data.description || '',
              category: data.category || 'Website',
              status: data.status || 'Live',
              lastModified: data.lastModified || 'Recently',
              progress: data.progress || 100,
              tags: data.tags || ['React', 'Vite'],
              prompt: data.prompt || data.name || 'Build app',
              iconName: data.iconName || 'Globe'
            });
          });
          setApps(prev => {
            const combined = [...remoteApps];
            prev.forEach(pApp => {
              if (!combined.some(c => c.id === pApp.id)) {
                combined.push(pApp);
              }
            });
            return combined;
          });
        }
      }, (err) => console.log('Firestore apps listener:', err));
      return () => unsub();
    } catch (e) {
      console.error('Apps listener setup fail:', e);
    }
  }, [user]);

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setApps(prev => prev.filter(a => a.id !== id));
    setDeleteConfirmId(null);
  };

  const filteredApps = apps.filter(app => {
    const matchesSearch = app.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          app.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          app.tags.some(t => t.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCat = selectedCategory === 'All' || app.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="h-full w-full bg-[#070914] text-white p-6 overflow-y-auto space-y-6 custom-scrollbar font-sans">
      
      {/* TOP HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-purple-600/20 border border-purple-500/30 text-purple-300 shadow-lg shadow-purple-500/10">
              <Folder className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
                My Apps
                <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 font-bold">
                  {apps.length} Applications Built
                </span>
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                All applications, websites, and APIs created with Anny. Click any project to open and edit in workspace.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={onNewApp}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-xs font-extrabold text-white flex items-center gap-2 shadow-lg shadow-purple-500/25 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
          >
            <Plus className="w-4 h-4" />
            Build New App
          </button>
        </div>
      </div>

      {/* SEARCH AND FILTER BAR */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Search Field */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input 
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search your apps by title or tech stack..."
            className="w-full bg-[#0d0f22] border border-white/10 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/50 transition font-sans"
          />
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 custom-scrollbar text-xs font-mono">
          {['All', 'Website', 'Full-Stack', 'API', 'Dashboard'].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg transition shrink-0 ${
                selectedCategory === cat 
                  ? 'bg-purple-600 text-white font-bold shadow-md' 
                  : 'bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/5'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* APPS GRID */}
      {filteredApps.length === 0 ? (
        <div className="p-12 text-center border border-dashed border-white/10 rounded-2xl bg-[#0b0d1e] space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 mx-auto">
            <Folder className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-white text-sm">No Applications Found</h3>
            <p className="text-xs text-slate-400 mt-1">Try searching with a different keyword or create a new app.</p>
          </div>
          <button 
            onClick={onNewApp}
            className="px-4 py-2 rounded-xl bg-purple-600 text-white text-xs font-bold inline-flex items-center gap-2 hover:bg-purple-500 transition"
          >
            <Plus className="w-4 h-4" /> Start Building
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredApps.map((app) => (
            <motion.div
              key={app.id}
              whileHover={{ y: -3 }}
              className="bg-[#0e1024] border border-white/10 hover:border-purple-500/40 rounded-2xl p-5 flex flex-col justify-between space-y-4 shadow-xl relative group transition-all"
            >
              <div className="space-y-3">
                {/* Header row */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-300 font-bold shrink-0">
                      {app.category === 'Website' && <Globe className="w-5 h-5" />}
                      {app.category === 'API' && <Server className="w-5 h-5" />}
                      {app.category === 'Dashboard' && <Layout className="w-5 h-5" />}
                      {app.category === 'Full-Stack' && <Cpu className="w-5 h-5" />}
                      {app.category === '3D / Model' && <Sparkles className="w-5 h-5" />}
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-sm group-hover:text-purple-300 transition line-clamp-1">{app.name}</h3>
                      <span className="text-[10px] text-slate-400 font-mono block">{app.category} • Updated {app.lastModified}</span>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border font-bold shrink-0 ${
                    app.status === 'Live' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' :
                    app.status === 'Building' ? 'bg-amber-500/10 text-amber-400 border-amber-500/30 animate-pulse' :
                    'bg-purple-500/10 text-purple-300 border-purple-500/30'
                  }`}>
                    {app.status}
                  </span>
                </div>

                {/* Description */}
                <p className="text-slate-300 text-xs leading-relaxed line-clamp-2 font-sans">
                  {app.description}
                </p>

                {/* Tech Stack Pills */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {app.tags.map((tag, idx) => (
                    <span key={idx} className="px-2 py-0.5 bg-white/5 border border-white/10 rounded-md text-[10px] font-mono text-slate-300">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Bottom Actions Row */}
              <div className="pt-3 border-t border-white/5 flex items-center justify-between gap-2">
                <button
                  onClick={() => onOpenApp(app.prompt, app.id)}
                  className="px-3.5 py-1.5 rounded-xl bg-purple-600/30 hover:bg-purple-600 text-purple-200 hover:text-white border border-purple-500/40 text-xs font-bold flex items-center gap-1.5 transition flex-1 justify-center shadow-sm"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>Continue Building</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-auto" />
                </button>

                {deleteConfirmId === app.id ? (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => handleDelete(app.id, e)}
                      className="px-2.5 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold transition"
                    >
                      Confirm
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(null); }}
                      className="px-2 py-1.5 bg-white/10 text-slate-300 rounded-xl text-xs transition"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(app.id); }}
                    className="p-2 rounded-xl text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition"
                    title="Delete App"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};
