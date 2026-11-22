import React, { useState, useEffect } from 'react';
import { MobileLogoMenu } from '../MobileLogoMenu';
import {
  Brain,
  Plus,
  Trash2,
  ShieldCheck,
  Search,
  Edit3,
  Check,
  X,
  Download,
  RefreshCw
} from 'lucide-react';
import { fetchWithAuth, safeFetchJson } from '../lib/apiUtils';
import { safeStorage } from '../lib/storage';

interface MemoryEntry {
  id: string;
  category: string;
  fact: string;
  dateAdded: string;
  syncedToServer?: boolean;
}

const LOCAL_MEMORY_KEY = 'anny_memory_entries_v1';
const MEMORY_ENABLED_KEY = 'anny_memory_enabled_v1';

interface AnnyMemoryViewProps {
  onToggleMobileMenu?: () => void;
}

export const AnnyMemoryView: React.FC<AnnyMemoryViewProps> = ({
  onToggleMobileMenu,
}) => {
  const [memoryEnabled, setMemoryEnabled] = useState<boolean>(() => {
    const saved = safeStorage.getItem(MEMORY_ENABLED_KEY);
    return saved !== null ? saved === 'true' : true;
  });
  const [newFact, setNewFact] = useState('');
  const [newCategory, setNewCategory] = useState('Developer Preference');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const [memoryEntries, setMemoryEntries] = useState<MemoryEntry[]>(() => {
    try {
      const raw = safeStorage.getItem(LOCAL_MEMORY_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore corrupt storage
    }
    return [];
  });

  const persistLocal = (next: MemoryEntry[]) => {
    setMemoryEntries(next);
    safeStorage.setItem(LOCAL_MEMORY_KEY, JSON.stringify(next));
  };

  const toggleMemoryEnabled = () => {
    const next = !memoryEnabled;
    setMemoryEnabled(next);
    safeStorage.setItem(MEMORY_ENABLED_KEY, String(next));
  };

  const syncFromServer = async () => {
    setIsSyncing(true);
    const res = await safeFetchJson('/api/v1/anny/memory/context?prompt=');
    if (res.data?.success && Array.isArray(res.data.memories)) {
      const serverEntries: MemoryEntry[] = res.data.memories.map((m: any) => ({
        id: String(m.id),
        category: m.topic || m.type || 'Memory',
        fact: String(m.content || ''),
        dateAdded: m.createdAt ? new Date(m.createdAt).toLocaleString() : 'Synced',
        syncedToServer: true,
      }));

      setMemoryEntries((prev) => {
        const localOnly = prev.filter((p) => !p.syncedToServer && !serverEntries.some((s) => s.id === p.id));
        const merged = [...serverEntries, ...localOnly];
        safeStorage.setItem(LOCAL_MEMORY_KEY, JSON.stringify(merged));
        return merged;
      });
    }
    setIsSyncing(false);
  };

  useEffect(() => {
    void syncFromServer();
  }, []);

  const handleAddMemory = async () => {
    const fact = newFact.trim();
    if (!fact) return;
    setNewFact('');
    setStatusMessage(null);

    try {
      const res = await fetchWithAuth('/api/v1/anny/memory/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          manualRule: fact,
          topic: newCategory,
          projectId: 'default_project',
        }),
      });
      const json = await res.json().catch(() => ({}));
      const entry: MemoryEntry = {
        id: json?.record?.id ? String(json.record.id) : `local_${Date.now()}`,
        category: newCategory,
        fact,
        dateAdded: new Date().toLocaleString(),
        syncedToServer: Boolean(res.ok && json?.record?.id),
      };
      persistLocal([entry, ...memoryEntries]);
      setStatusMessage(entry.syncedToServer ? 'Saved to workspace and server memory.' : 'Saved locally (offline fallback).');
    } catch {
      const entry: MemoryEntry = {
        id: `local_${Date.now()}`,
        category: newCategory,
        fact,
        dateAdded: new Date().toLocaleString(),
        syncedToServer: false,
      };
      persistLocal([entry, ...memoryEntries]);
      setStatusMessage('Saved locally while offline.');
    }
  };

  const handleDeleteMemory = async (id: string) => {
    const target = memoryEntries.find((m) => m.id === id);
    const next = memoryEntries.filter((m) => m.id !== id);
    persistLocal(next);
    if (target?.syncedToServer) {
      await fetchWithAuth(`/api/v1/anny/memory/${encodeURIComponent(id)}`, { method: 'DELETE' }).catch(() => {});
    }
  };

  const handleSaveEdit = async (id: string) => {
    const updatedFact = editingText.trim();
    if (!updatedFact) return;
    const next = memoryEntries.map((m) => (m.id === id ? { ...m, fact: updatedFact } : m));
    persistLocal(next);
    setEditingId(null);
    setEditingText('');
    await fetchWithAuth('/api/v1/anny/memory/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ manualRule: updatedFact, topic: 'Updated Rule' }),
    }).catch(() => {});
  };

  const handleExportMemories = () => {
    const blob = new Blob([JSON.stringify(memoryEntries, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `anny-memory-export-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const filtered = memoryEntries.filter(
    (m) =>
      m.fact.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col h-full bg-[#040612] text-slate-100 overflow-y-auto p-4 sm:p-6 lg:p-8 custom-scrollbar">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <MobileLogoMenu onToggleMobileMenu={onToggleMobileMenu} />
            <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-semibold uppercase tracking-wider">
              Persistent Context
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white mt-1 flex items-center gap-2.5">
            <Brain className="w-7 h-7 text-cyan-400" />
            Personal Memory & Context
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Add, search, edit, or delete private workspace rules backed by ANNY memory endpoints and offline local storage.
          </p>
        </div>

        <div className="flex items-center gap-3 bg-[#080b22] border border-white/10 rounded-xl px-4 py-2.5 shrink-0">
          <span className="text-xs font-semibold text-white">Global AI Memory:</span>
          <button
            onClick={toggleMemoryEnabled}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              memoryEnabled
                ? 'bg-cyan-500/20 border border-cyan-500/40 text-cyan-300'
                : 'bg-slate-800 text-slate-400'
            }`}
          >
            {memoryEnabled ? 'ENABLED' : 'DISABLED'}
          </button>
        </div>
      </div>

      {/* Add New Memory Entry Card */}
      <div className="bg-[#080b22] border border-white/10 rounded-2xl p-6 mb-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Plus className="w-4 h-4 text-cyan-400" />
            Add Manual Memory Rule
          </h3>
          {statusMessage && <span className="text-xs font-mono text-cyan-300">{statusMessage}</span>}
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <select
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            className="bg-[#090d28] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500/50"
          >
            <option value="Developer Preference">Developer Preference</option>
            <option value="Project Architecture">Project Architecture</option>
            <option value="Design & UI">Design & UI</option>
            <option value="Safety & Domain Rule">Safety & Domain Rule</option>
          </select>
          <input
            type="text"
            value={newFact}
            onChange={(e) => setNewFact(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void handleAddMemory()}
            placeholder="e.g., 'Use metric SI units in electrical and robotics calculations'"
            className="flex-1 bg-[#090d28] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
          />
          <button
            onClick={() => void handleAddMemory()}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-cyan-500 hover:bg-cyan-400 transition-colors cursor-pointer shrink-0"
          >
            Save Memory
          </button>
        </div>
      </div>

      {/* Controls & Search */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
            Active Memory Bank ({filtered.length})
          </h3>
          <span className="text-xs text-cyan-400 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" /> Owner-Isolated Scope
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filter memories..."
              className="bg-[#080b22] border border-white/10 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/40"
            />
          </div>
          <button
            onClick={() => void syncFromServer()}
            disabled={isSyncing}
            className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-slate-300 flex items-center gap-1"
            title="Sync from server"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleExportMemories}
            disabled={memoryEntries.length === 0}
            className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-slate-300 flex items-center gap-1 disabled:opacity-40"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Saved Memories List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="p-8 rounded-2xl bg-[#080b22] border border-dashed border-white/10 text-center text-xs text-slate-400">
            No persistent memories recorded yet. Add a rule above to store across your ANNY sessions.
          </div>
        ) : (
          filtered.map((item) => (
            <div
              key={item.id}
              className="bg-[#080b22] border border-white/10 hover:border-cyan-500/30 rounded-xl p-4 flex items-start justify-between gap-4 transition-all"
            >
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono text-purple-300 bg-purple-950/40 border border-purple-800/40 inline-block">
                    {item.category}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[9px] font-mono bg-white/5 text-slate-400">
                    {item.syncedToServer ? 'SERVER + LOCAL' : 'LOCAL STORAGE'}
                  </span>
                </div>

                {editingId === item.id ? (
                  <div className="flex gap-2 mt-1">
                    <input
                      type="text"
                      value={editingText}
                      onChange={(e) => setEditingText(e.target.value)}
                      className="flex-1 bg-[#090d28] border border-cyan-500/40 rounded-lg px-3 py-1.5 text-xs text-white"
                    />
                    <button
                      onClick={() => void handleSaveEdit(item.id)}
                      className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-300"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="p-1.5 rounded-lg bg-white/5 text-slate-400"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <p className="text-xs text-white font-medium leading-relaxed">{item.fact}</p>
                )}

                <span className="text-[10px] text-slate-500 block">Added {item.dateAdded}</span>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => {
                    setEditingId(item.id);
                    setEditingText(item.fact);
                  }}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-cyan-300 hover:bg-cyan-500/10 transition-colors"
                  title="Edit memory"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => void handleDeleteMemory(item.id)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  title="Delete memory"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
