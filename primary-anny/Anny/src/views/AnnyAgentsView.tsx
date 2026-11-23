import React, { useState, useEffect } from 'react';
import { MobileLogoMenu } from '../MobileLogoMenu';
import {
  Bot,
  Plus,
  Search,
  Sparkles,
  Zap,
  Code2,
  Brain,
  Globe,
  Settings,
  ArrowRight,
  CheckCircle2,
  ShieldAlert,
  Play
} from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, onSnapshot, query } from 'firebase/firestore';

interface AnnyAgentsViewProps {
  userId?: string;
  onToggleMobileMenu?: () => void;
  onOpenAgent?: (agentName: string) => void;
}

export const AnnyAgentsView: React.FC<AnnyAgentsViewProps> = ({
  userId,
  onToggleMobileMenu,
  onOpenAgent,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [agents, setAgents] = useState<any[]>([]);

  const defaultAgents = [
    {
      id: 'agent-1',
      name: 'AKIN Architect Agent',
      role: 'Full-Stack Code & Architecture Expert',
      description: 'Generates production-grade React, Node.js, and TypeScript applications with clean modular architecture.',
      model: 'gemini-4-hydrogen',
      icon: Code2,
      color: 'from-cyan-500 to-blue-600',
      activeStatus: 'Ready',
      capabilities: ['Code Synthesis', 'Bug Fixing', 'AST Parsing', 'Testing'],
    },
    {
      id: 'agent-2',
      name: 'Deep Research Specialist',
      role: 'Autonomous Web & Document Researcher',
      description: 'Conducts thorough multi-source deep research, fact-checks, synthesizes technical papers, and generates reports.',
      model: 'gemini-4-hydrogen',
      icon: Brain,
      color: 'from-purple-500 to-indigo-600',
      activeStatus: 'Active',
      capabilities: ['Web Browsing', 'PDF Extraction', 'Citation Verification', 'Synthesis'],
    },
    {
      id: 'agent-3',
      name: 'UI/UX Design Systems Agent',
      role: 'Interface & Styling Specialist',
      description: 'Creates modern glassmorphic Tailwind CSS themes, layout animations, and responsive visual systems.',
      model: 'gemini-3.1-flash-lite',
      icon: Sparkles,
      color: 'from-fuchsia-500 to-pink-600',
      activeStatus: 'Ready',
      capabilities: ['Tailwind Styling', 'Accessibility Audit', 'Motion Rules', 'Figma Sync'],
    },
    {
      id: 'agent-4',
      name: 'Data & SQL Analytics Bot',
      role: 'Database & Metrics Engineer',
      description: 'Writes optimized PostgreSQL queries, builds schema migrations, and creates data visualization dashboards.',
      model: 'gemini-4-hydrogen',
      icon: Zap,
      color: 'from-emerald-500 to-teal-600',
      activeStatus: 'Ready',
      capabilities: ['SQL Query Gen', 'Schema DDL', 'Recharts Spec', 'CSV Import'],
    },
  ];

  useEffect(() => {
    if (!userId) {
      setAgents(defaultAgents);
      return;
    }
    const q = query(collection(db, 'users', userId, 'agents'));
    const unsub = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const remoteAgents = snapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name || 'Custom Agent',
          role: doc.data().role || 'Agent',
          description: doc.data().description || '',
          model: doc.data().model || 'Anny Core',
          icon: Bot,
          color: 'from-cyan-500 to-blue-600',
          activeStatus: 'Ready',
          capabilities: doc.data().capabilities || ['Custom Tooling'],
        }));
        setAgents([...defaultAgents, ...remoteAgents]);
      } else {
        setAgents(defaultAgents);
      }
    });
    return () => unsub();
  }, [userId]);

  return (
    <div className="flex-1 flex flex-col h-full bg-[#040612] text-slate-100 overflow-y-auto p-4 sm:p-6 lg:p-8 custom-scrollbar">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <MobileLogoMenu onToggleMobileMenu={onToggleMobileMenu} />
            <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-semibold uppercase tracking-wider">
              Anny Application
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white mt-1 flex items-center gap-2.5">
            <Bot className="w-7 h-7 text-cyan-400" />
            AI Agents
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Autonomous specialized AI agents configured for coding, research, design, and analytics.
          </p>
        </div>

        <button
          onClick={() => onOpenAgent && onOpenAgent('New Custom Agent')}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-cyan-500 via-indigo-600 to-fuchsia-600 hover:from-cyan-400 hover:via-indigo-500 hover:to-fuchsia-500 shadow-[0_0_20px_rgba(0,229,255,0.3)] transition-all cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Create Custom Agent</span>
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-md mb-6">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search AI agents..."
          className="w-full bg-[#090d28] border border-white/10 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
        />
      </div>

      {/* Agents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {agents.map((agent) => {
          const IconComp = agent.icon;
          return (
            <div
              key={agent.id}
              className="bg-[#080b22] border border-white/10 hover:border-cyan-500/40 rounded-2xl p-6 flex flex-col justify-between transition-all hover:shadow-[0_0_25px_rgba(0,229,255,0.15)] group"
            >
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${agent.color} flex items-center justify-center text-white shadow-lg shrink-0`}>
                      <IconComp className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white group-hover:text-cyan-300 transition-colors">
                        {agent.name}
                      </h3>
                      <p className="text-xs text-cyan-400 font-medium">
                        {agent.role}
                      </p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                    {agent.activeStatus}
                  </span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  {agent.description}
                </p>

                {/* Capabilities pills */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {agent.capabilities.map((cap) => (
                    <span
                      key={cap}
                      className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[10px] text-slate-300 font-mono"
                    >
                      {cap}
                    </span>
                  ))}
                </div>
              </div>

              {/* Action Footer */}
              <div className="pt-4 border-t border-white/5 mt-6 flex items-center justify-between">
                <span className="text-[10px] font-mono text-slate-400 bg-white/5 px-2 py-1 rounded">
                  Powered by {agent.model}
                </span>

                <button
                  onClick={() => onOpenAgent && onOpenAgent(agent.name)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 transition-colors cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 text-cyan-400 fill-cyan-400/20" />
                  <span>Launch Agent</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
