import React, { useState, useEffect } from 'react';
import { safeFetchJson } from '../lib/apiUtils';
import { MobileLogoMenu } from '../MobileLogoMenu';
import {
  History,
  Search,
  MessageSquare,
  Folder,
  Trash2,
  Download,
  Star,
  Clock,
  Sparkles,
  ArrowRight,
  Filter,
  MoreVertical,
  Calendar,
  Plus,
  ChevronDown,
  ChevronRight,
  Layers
} from 'lucide-react';

interface AnnySessionHistoryViewProps {
  chatHistory?: Array<{ id: string; title: string; date?: string; messages: any[] }>;
  onToggleMobileMenu?: () => void;
  onSelectSession?: (sessionId: string) => void;
  onDeleteSession?: (sessionId: string) => void;
  onNewChat?: () => void;
}

export const AnnySessionHistoryView: React.FC<AnnySessionHistoryViewProps> = ({
  chatHistory = [],
  onToggleMobileMenu,
  onSelectSession,
  onDeleteSession,
  onNewChat,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'starred' | 'code' | 'design'>('all');
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const [backendSessions, setBackendSessions] = useState<any[]>([]);

  useEffect(() => {
    let mounted = true;
    const fetchSessions = async () => {
      const res = await safeFetchJson('/api/anny/sessions');
      if (mounted && res.success && res.data?.sessions) {
        setBackendSessions(res.data.sessions);
      } else if (res.error) {
        console.warn("[SessionHistoryView] Sessions fetch status:", res.error);
      }
    };
    fetchSessions();
    return () => { mounted = false; };
  }, []);

  const mappedSessions = (backendSessions.length > 0 ? backendSessions : chatHistory).map((c) => {
    let preview = 'New Session';
    if (c.messages && c.messages.length > 0) {
      preview = c.messages[c.messages.length - 1]?.content?.slice(0, 100) || '...';
    } else if (c.prompt) {
      preview = c.prompt.slice(0, 100);
    }
    return {
      id: c.id,
      title: c.title || c.prompt?.slice(0, 30) || 'Untitled Session',
      preview: preview,
      date: c.date || c.created_at || 'Recent',
      model: c.model || 'Anny Core',
      messagesCount: c.messages?.length || 0,
      starred: false,
      category: 'code'
    };
  });

  const todaySessions: typeof mappedSessions = [];
  const yesterdaySessions: typeof mappedSessions = [];
  const weekSessions: typeof mappedSessions = [];
  const olderSessions: typeof mappedSessions = [];

  mappedSessions.forEach((s) => {
    const lowerDate = (s.date || '').toLowerCase();
    if (lowerDate.includes('today') || lowerDate.includes('recent') || lowerDate.includes('just now') || !s.date) {
      todaySessions.push(s);
    } else if (lowerDate.includes('yesterday')) {
      yesterdaySessions.push(s);
    } else if (lowerDate.includes('day') || lowerDate.includes('ago')) {
      weekSessions.push(s);
    } else {
      olderSessions.push(s);
    }
  });

  const sessionGroups = [
    { groupName: 'Today', sessions: todaySessions.length > 0 ? todaySessions : mappedSessions },
    ...(yesterdaySessions.length > 0 ? [{ groupName: 'Yesterday', sessions: yesterdaySessions }] : []),
    ...(weekSessions.length > 0 ? [{ groupName: 'Previous 7 Days', sessions: weekSessions }] : []),
    ...(olderSessions.length > 0 ? [{ groupName: 'Older Sessions', sessions: olderSessions }] : [])
  ];

  const toggleGroupCollapse = (groupName: string) => {
    setCollapsedGroups(prev => ({
      ...prev,
      [groupName]: !prev[groupName]
    }));
  };

  const collapseAll = () => {
    const next: Record<string, boolean> = {};
    sessionGroups.forEach(g => { next[g.groupName] = true; });
    setCollapsedGroups(next);
  };

  const expandAll = () => {
    setCollapsedGroups({});
  };

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
            <History className="w-7 h-7 text-cyan-400" />
            Session History
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Browse and manage all conversation history with collapsible date grouping.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onNewChat && (
            <button
              onClick={() => onNewChat()}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-cyan-500 to-indigo-600 hover:brightness-110 transition-all cursor-pointer shadow-lg active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>New Chat Session</span>
            </button>
          )}

          <button
            onClick={() => {
              const exportData = JSON.stringify(mappedSessions, null, 2);
              const blob = new Blob([exportData], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `anny-session-history-${Date.now()}.json`;
              a.click();
              URL.revokeObjectURL(url);
            }}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-300 bg-[#0a0f2c] border border-white/10 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4 text-cyan-400" />
            <span>Export History</span>
          </button>
        </div>
      </div>

      {/* Filter, Search & Collapse Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search chat sessions..."
            className="w-full bg-[#090d28] border border-white/10 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={collapseAll}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#080d28] border border-white/10 text-slate-300 hover:text-white hover:border-cyan-500/40 transition-all cursor-pointer"
          >
            Collapse All
          </button>
          <button
            onClick={expandAll}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#080d28] border border-white/10 text-slate-300 hover:text-white hover:border-cyan-500/40 transition-all cursor-pointer"
          >
            Expand All
          </button>
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all ${
              activeFilter === 'all'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'bg-[#0a0e2a] text-slate-400 border border-white/5 hover:text-white'
            }`}
          >
            All Sessions
          </button>
          <button
            onClick={() => setActiveFilter('starred')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all flex items-center gap-1.5 ${
              activeFilter === 'starred'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'bg-[#0a0e2a] text-slate-400 border border-white/5 hover:text-white'
            }`}
          >
            <Star className="w-3.5 h-3.5 fill-amber-400/20 text-amber-400" />
            Starred
          </button>
        </div>
      </div>

      {/* Session Groups List */}
      <div className="space-y-6">
        {sessionGroups.map((group) => {
          const filteredSessions = group.sessions.filter((s) => {
            const matchesSearch = s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
              s.preview.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesStar = activeFilter === 'starred' ? s.starred : true;
            return matchesSearch && matchesStar;
          });

          if (filteredSessions.length === 0) return null;
          const isCollapsed = collapsedGroups[group.groupName];

          return (
            <div key={group.groupName} className="space-y-3">
              {/* Group Header with Collapse Toggle */}
              <div
                onClick={() => toggleGroupCollapse(group.groupName)}
                className="flex items-center justify-between text-xs font-bold text-slate-300 uppercase tracking-wider bg-[#080c28] border border-white/10 hover:border-cyan-500/40 px-4 py-2.5 rounded-xl cursor-pointer select-none transition-all hover:bg-[#0b1035]"
              >
                <div className="flex items-center gap-2">
                  {isCollapsed ? (
                    <ChevronRight className="w-4 h-4 text-cyan-400 shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-cyan-400 shrink-0" />
                  )}
                  <Calendar className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span>{group.groupName}</span>
                  <span className="text-cyan-400/80 font-mono text-[11px] bg-cyan-950/60 px-2 py-0.5 rounded-md border border-cyan-800/40">
                    {filteredSessions.length} {filteredSessions.length === 1 ? 'session' : 'sessions'}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono font-normal">
                  {isCollapsed ? 'Click to expand' : 'Click to collapse'}
                </span>
              </div>

              {/* Collapsible Session Cards */}
              {!isCollapsed && (
                <div className="grid grid-cols-1 gap-3 pt-1">
                  {filteredSessions.map((session) => (
                    <div
                      key={session.id}
                      onClick={() => onSelectSession && onSelectSession(session.id)}
                      className="bg-[#080b22] border border-white/10 hover:border-cyan-500/40 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:bg-[#0a0e2d] cursor-pointer group"
                    >
                      <div className="flex items-start gap-3.5 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0 mt-0.5">
                          <MessageSquare className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors truncate">
                              {session.title}
                            </h3>
                            {session.starred && (
                              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 shrink-0" />
                            )}
                          </div>
                          <p className="text-xs text-slate-400 mt-1 truncate max-w-2xl">
                            {session.preview}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 border-t sm:border-t-0 border-white/5 pt-2 sm:pt-0">
                        <div className="flex items-center gap-3 text-right">
                          <span className="text-[10px] font-mono text-slate-400 bg-white/5 px-2 py-0.5 rounded border border-white/10">
                            {session.model}
                          </span>
                          <span className="text-[11px] text-slate-400 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-cyan-400" />
                            {session.date}
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirmDeleteId === session.id) {
                                if (onDeleteSession) onDeleteSession(session.id);
                                setBackendSessions((prev) => prev.filter((s) => s.id !== session.id));
                                setConfirmDeleteId(null);
                              } else {
                                setConfirmDeleteId(session.id);
                              }
                            }}
                            className={`px-2 py-1.5 rounded-lg text-xs transition-all cursor-pointer flex items-center gap-1 shrink-0 ${
                              confirmDeleteId === session.id
                                ? 'bg-red-500/20 border border-red-500/50 text-red-300 hover:bg-red-500/30 font-bold'
                                : 'text-slate-400 hover:text-red-400 hover:bg-red-500/10'
                            }`}
                            title={confirmDeleteId === session.id ? "Click again to confirm" : "Delete Session"}
                          >
                            <Trash2 className="w-4 h-4 shrink-0" />
                            {confirmDeleteId === session.id && (
                              <span className="text-[10px] uppercase font-mono font-bold tracking-wider">Confirm</span>
                            )}
                          </button>
                          <ArrowRight className="w-4 h-4 text-cyan-400 group-hover:translate-x-1 transition-transform ml-1" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
