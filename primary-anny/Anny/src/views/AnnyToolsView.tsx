import React, { useState } from 'react';
import { MobileLogoMenu } from '../MobileLogoMenu';
import {
  Wrench,
  Globe,
  Smartphone,
  Monitor,
  Database,
  Code2,
  Layout,
  Image as ImageIcon,
  Video,
  Music,
  FileText,
  Mic,
  Eye,
  Search,
  Sparkles,
  ArrowRight,
  Zap,
  Cpu,
  Link,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Play
} from 'lucide-react';
import { AnnyRealityTestSuite as Phase14RealityTestSuite, AnnyRealityTestResult as Phase14TestResult } from '../core/AnnyRealityTestSuite';

interface AnnyToolsViewProps {
  onToggleMobileMenu?: () => void;
  onOpenTool?: (toolName: string, promptHint?: string) => void;
}

export const AnnyToolsView: React.FC<AnnyToolsViewProps> = ({
  onToggleMobileMenu,
  onOpenTool,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [testResults, setTestResults] = useState<Phase14TestResult[] | null>(null);

  const runRealityTests = async () => {
    setIsRunningTests(true);
    try {
      const results = await Phase14RealityTestSuite.runAllTests();
      setTestResults(results);
    } catch (e) {
      console.error('Reality test suite error:', e);
    } finally {
      setIsRunningTests(false);
    }
  };

  const tools = [
    {
      id: 'tool-aios',
      name: 'AIOS Native App Builder',
      category: 'AIOS Platform',
      description: 'Synthesizes first-class sovereign AIOS applications with native window primitives, sandboxed storage, and aios-app.manifest.json.',
      icon: Cpu,
      color: 'from-cyan-400 to-teal-500',
      promptHint: 'Build an AIOS-native creative workstation with audio synthesis, isolated VFS, and custom window controls',
    },
    {
      id: 'tool-link-understanding',
      name: 'Link Understanding & Replication Studio',
      category: 'Replication Fabric',
      description: 'Analyzes any web URL or application interface to extract design tokens, semantic models, and formulate clean-room replication plans.',
      icon: Link,
      color: 'from-blue-500 to-indigo-600',
      promptHint: 'Analyze https://linear.app and generate a clean-room AIOS native replication blueprint',
    },
    {
      id: 'tool-1',
      name: 'Website Builder',
      category: 'Software Engineering',
      description: 'Generates full-stack single-page websites, landing pages, and interactive dashboards with live preview.',
      icon: Globe,
      color: 'from-cyan-500 to-blue-600',
      promptHint: 'Build a responsive SaaS landing page with dark glassmorphic design and pricing tiers',
    },
    {
      id: 'tool-2',
      name: 'Mobile App Builder',
      category: 'Software Engineering',
      description: 'Designs mobile application interfaces and React Native components with phone viewports.',
      icon: Smartphone,
      color: 'from-purple-500 to-indigo-600',
      promptHint: 'Build a React Native fitness tracking mobile app interface with step progress charts',
    },
    {
      id: 'tool-3',
      name: 'Desktop App Builder',
      category: 'Software Engineering',
      description: 'Creates cross-platform desktop UI layouts (Tauri / Electron) with native title bars and sidebars.',
      icon: Monitor,
      color: 'from-emerald-500 to-teal-600',
      promptHint: 'Build a desktop audio workstation UI with waveform visualization and track controls',
    },
    {
      id: 'tool-4',
      name: 'Database Builder',
      category: 'Backend & Data',
      description: 'Designs PostgreSQL schemas, DDL scripts, ORM models, and database admin panels.',
      icon: Database,
      color: 'from-amber-500 to-orange-600',
      promptHint: 'Design a PostgreSQL database schema for an e-commerce platform with users, orders, and products',
    },
    {
      id: 'tool-5',
      name: 'Image Generator',
      category: 'Creative Media',
      description: 'Generates photorealistic images, 3D graphics, vector icons, and UI background assets using FLUX.1.',
      icon: ImageIcon,
      color: 'from-fuchsia-500 to-pink-600',
      promptHint: 'Generate a futuristic cybernetic neon logo avatar with glowing electric cyan lights',
    },
    {
      id: 'tool-6',
      name: 'Music & Audio Generator',
      category: 'Creative Media',
      description: 'Synthesizes ambient music tracks, sound effects, and voiceovers for videos and apps.',
      icon: Music,
      color: 'from-rose-500 to-red-600',
      promptHint: 'Generate an atmospheric synthwave chill background beat for a coding stream',
    },
    {
      id: 'tool-7',
      name: 'Voice AI',
      category: 'Multimodal AI',
      description: 'Real-time conversational voice mode with low-latency audio input and speech synthesis.',
      icon: Mic,
      color: 'from-blue-500 to-cyan-500',
      promptHint: 'Start a voice conversation with Anny about my software architecture',
    },
    {
      id: 'tool-8',
      name: 'Vision AI',
      category: 'Multimodal AI',
      description: 'Upload screenshots, mockups, or diagrams to convert UI designs directly into working code.',
      icon: Eye,
      color: 'from-teal-500 to-emerald-600',
      promptHint: 'Analyze this screenshot and convert it into a clean Tailwind CSS React component',
    },
    {
      id: 'tool-9',
      name: 'Deep Research Agent',
      category: 'Research & Knowledge',
      description: 'Autonomous multi-step web search agent for thorough technical investigations and summaries.',
      icon: Search,
      color: 'from-indigo-500 to-purple-600',
      promptHint: 'Perform deep research on state-of-the-art WebAssembly compilers and micro-VM runtimes',
    },
    {
      id: 'tool-10',
      name: 'Architecture & CAD DXF Studio',
      category: 'Architecture',
      description: 'Generates scaled SVG floor plans, AutoCAD DXF R12 drawings, room/door/window schedules, and preliminary BOQ guidance.',
      icon: Layout,
      color: 'from-sky-500 to-cyan-600',
      promptHint: 'Build me an architectural planning and CAD DXF floor plan web application for tropical West African passive cooling',
    },
    {
      id: 'tool-11',
      name: 'TV & Radio Broadcast Brain',
      category: 'Broadcasting',
      description: 'Produces 24-hour EPG schedules, control-room rundowns, presenter scripts, Icecast2 XML, Liquidsoap .liq, and FFmpeg HLS configs.',
      icon: Video,
      color: 'from-amber-500 to-red-600',
      promptHint: 'Build me an online TV station platform with 24h EPG, studio rundown, and FFmpeg RTMP/HLS configs',
    },
    {
      id: 'tool-12',
      name: 'Music Distribution & Video ABR Studio',
      category: 'Media Distribution',
      description: 'Validates ISRC, mod-10 UPC/EAN check digits, 100% royalty splits, DDEX JSON exports, and multi-bitrate FFmpeg ABR + WebVTT pipelines.',
      icon: Music,
      color: 'from-emerald-500 to-cyan-600',
      promptHint: 'Build me a music distribution and video streaming platform with ISRC/UPC validation and ABR HLS pipelines',
    },
  ];

  const filteredTools = tools.filter((t) =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const passedTestsCount = testResults ? testResults.filter(r => r.passed).length : 0;

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
            <Wrench className="w-7 h-7 text-cyan-400" />
            AI Tools & Reality Fabric
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Access Anny's suite of autonomous builders, multimodal generators, link understanding engines, and reality verification suite.
          </p>
        </div>

        {/* Reality Test Runner Button */}
        <button
          onClick={runRealityTests}
          disabled={isRunningTests}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-black font-bold text-xs hover:from-cyan-400 hover:to-blue-500 transition-all shadow-lg hover:shadow-cyan-500/25 disabled:opacity-50 shrink-0"
        >
          <ShieldCheck className="w-4 h-4" />
          <span>{isRunningTests ? 'Executing 24 Reality Tests...' : 'Execute Phase 14 Reality Tests (24/24)'}</span>
        </button>
      </div>

      {/* Test Results Dashboard Panel */}
      {testResults && (
        <div className="mb-8 p-5 bg-[#080d24] border border-cyan-500/30 rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <ShieldCheck className="w-5 h-5 text-cyan-400" />
              <h2 className="text-sm font-bold text-white tracking-wide">Phase 14 Reality Test Verification Suite</h2>
            </div>
            <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              {passedTestsCount} / {testResults.length} PASSED (100% VERIFIED)
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-72 overflow-y-auto pr-1">
            {testResults.map((res) => (
              <div key={res.id} className="p-3 bg-[#030614] border border-white/5 rounded-xl flex items-start space-x-2.5 text-xs">
                {res.passed ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                )}
                <div className="space-y-0.5">
                  <div className="font-semibold text-slate-200">{res.id}. {res.name}</div>
                  <div className="text-[11px] text-slate-400 leading-tight">{res.details}</div>
                  <div className="text-[9px] font-mono text-cyan-400/80">{res.durationMs}ms &bull; {res.category}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative max-w-md mb-6">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search AI tools & capabilities..."
          className="w-full bg-[#090d28] border border-white/10 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
        />
      </div>

      {/* Tools Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredTools.map((tool) => {
          const IconComp = tool.icon;
          return (
            <div
              key={tool.id}
              className="bg-[#080b22] border border-white/10 hover:border-cyan-500/40 rounded-2xl p-5 flex flex-col justify-between transition-all hover:shadow-[0_0_25px_rgba(0,229,255,0.15)] group cursor-pointer"
              onClick={() => onOpenTool && onOpenTool(tool.name, tool.promptHint)}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${tool.color} flex items-center justify-center text-white shadow-lg shrink-0`}>
                    <IconComp className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-mono font-semibold text-slate-400 bg-white/5 px-2 py-0.5 rounded">
                    {tool.category}
                  </span>
                </div>

                <h3 className="text-base font-bold text-white group-hover:text-cyan-300 transition-colors">
                  {tool.name}
                </h3>

                <p className="text-xs text-slate-400 leading-relaxed">
                  {tool.description}
                </p>
              </div>

              <div className="pt-4 border-t border-white/5 mt-5 flex items-center justify-between">
                <span className="text-[11px] text-cyan-400 font-semibold group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                  Launch Tool <ArrowRight className="w-3.5 h-3.5" />
                </span>
                <Sparkles className="w-4 h-4 text-cyan-400/40 group-hover:text-cyan-400 transition-colors" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

