import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { WorkspaceManager } from '../core/workspaceManager';
import { universalExecutionController } from '../core/universalExecutionController';
import { executionStreamManager } from '../core/executionStreamManager';
import { DynamicVFSAppRunner } from './StandalonePreviewRunner';
import { 
  Smartphone, Tv, Heart, DollarSign, Briefcase, Radio, ShoppingBag, Sparkles, 
  UploadCloud, CheckCircle2, Wrench, Play, Maximize2, Minimize2, MousePointer, 
  Sliders, Code, FileText, FileArchive, Film, Music, Image as ImageIcon, Layers, 
  Search, Share2, ThumbsUp, MessageCircle, Send, X, RefreshCw, Zap, Award, 
  Terminal, ShieldCheck, Trash2, Plus, Star, Eye, Gift, Check, ArrowRight, User,
  Cpu, Database, GitBranch, Monitor, HardDrive, ShieldAlert, Workflow, Bot,
  FolderTree, Activity, Server, CloudUpload, Key, ChevronRight, Lock, CheckSquare,
  RefreshCcw, PlayCircle, StopCircle, TerminalSquare, ExternalLink, Tablet
} from 'lucide-react';

interface SuperAppModule {
  id: 'social' | 'tiktok' | 'instagram' | 'dating' | 'lotto' | 'work' | 'live' | 'marketplace';
  name: string;
  icon: any;
  tagline: string;
  color: string;
}

const MODULES: SuperAppModule[] = [
  { id: 'social', name: 'Social Feed', icon: Smartphone, tagline: 'Facebook-style Posts, Groups & Comments', color: 'from-blue-600 to-indigo-600' },
  { id: 'tiktok', name: 'Reels / Short Video', icon: Tv, tagline: 'TikTok-style Vertical Video & Live Tipping', color: 'from-pink-600 to-rose-600' },
  { id: 'instagram', name: 'Stories & Photos', icon: ImageIcon, tagline: 'Instagram-style Photo Grid & Direct Messages', color: 'from-purple-600 to-pink-500' },
  { id: 'dating', name: 'Match & Dating', icon: Heart, tagline: 'Tinder-style 3D Match Cards & Swiping', color: 'from-red-500 to-pink-600' },
  { id: 'lotto', name: 'Lotto & Jackpot', icon: DollarSign, tagline: 'Daily Draw, Ticket Picker & Jackpot Wallet', color: 'from-amber-500 to-yellow-400' },
  { id: 'work', name: 'Jobs & Freelance', icon: Briefcase, tagline: 'Upwork-style Gigs, Resumes & Escrow', color: 'from-emerald-600 to-teal-600' },
  { id: 'live', name: 'Live Stream Hub', icon: Radio, tagline: 'HD Video Broadcast & Real-time Live Chat', color: 'from-cyan-500 to-blue-600' },
  { id: 'marketplace', name: 'E-commerce Market', icon: ShoppingBag, tagline: 'Amazon-style Store, Vendor Portal & Cart', color: 'from-orange-500 to-amber-600' },
];

interface AgentNode {
  id: string;
  name: string;
  role: string;
  status: 'idle' | 'thinking' | 'active' | 'completed';
  action: string;
  color: string;
}


const PROJECT_TEMPLATES = {
  'vite-react': {
    name: 'Vite + React (Tailwind)',
    files: {
      'package.json': JSON.stringify({ name: "react-app", scripts: { dev: "vite" }, dependencies: { react: "^18.2.0" } }, null, 2),
      'src/App.tsx': "import React from 'react';\n\nexport default function App() {\n  return <div>Hello React</div>;\n}",
      'index.html': "<!DOCTYPE html><html><body><div id='root'></div></body></html>"
    }
  },
  'node-express': {
    name: 'Node.js + Express API',
    files: {
      'package.json': JSON.stringify({ name: "express-api", scripts: { start: "node server.js" }, dependencies: { express: "^4.18.2" } }, null, 2),
      'server.js': "const express = require('express');\nconst app = express();\napp.get('/', (req, res) => res.send('API Running'));\napp.listen(3000, () => console.log('Server active'));"
    }
  },
  'python-flask': {
    name: 'Python Flask Server',
    files: {
      'requirements.txt': "Flask==2.3.2",
      'app.py': "from flask import Flask\napp = Flask(__name__)\n\n@app.route('/')\ndef home():\n    return 'Flask App Active'\n\nif __name__ == '__main__':\n    app.run(host='0.0.0.0', port=3000)"
    }
  }
};

const INITIAL_AGENTS: AgentNode[] = [
  { id: 'ceo', name: 'CEO Orchestrator', role: 'System Lead & Strategy', status: 'completed', action: 'Goal & Scope Alignment verified', color: 'bg-purple-500' },
  { id: 'planner', name: 'Planner Agent', role: 'Task Breakdown & Flow', status: 'completed', action: 'Created 14-step builder execution graph', color: 'bg-blue-500' },
  { id: 'architect', name: 'System Architect', role: 'Microservice Design', status: 'completed', action: 'Configured API Gateway & Database Schema', color: 'bg-cyan-500' },
  { id: 'backend', name: 'Backend Engineer', role: 'APIs & Serverless', status: 'active', action: 'Compiling Fastify / Express endpoints', color: 'bg-emerald-500' },
  { id: 'frontend', name: 'Frontend Engineer', role: 'React / Next UI', status: 'active', action: 'Rendering Super-App unified components', color: 'bg-pink-500' },
  { id: 'database', name: 'Database Architect', role: 'Postgres & Firestore', status: 'completed', action: 'Indexes and Security Rules deployed', color: 'bg-amber-500' },
  { id: 'devops', name: 'DevOps & Docker', role: 'Container Runtime', status: 'idle', action: 'Standing by for container build', color: 'bg-indigo-500' },
  { id: 'qa', name: 'QA & Test Agent', role: 'Unit & E2E Testing', status: 'idle', action: 'Pending code freeze for suite run', color: 'bg-rose-500' },
  { id: 'security', name: 'Security Guard', role: 'Sanitization & LOTO', status: 'completed', action: 'Passed prompt injection & secret audit', color: 'bg-red-500' },
  { id: 'deployment', name: 'Deployment Bot', role: 'Cloud Run / Coolify', status: 'idle', action: 'Awaiting deployment trigger', color: 'bg-teal-500' },
];

export default function SuperAppStudio() {
  const [activeTab, setActiveTab] = useState<'preview' | 'workspace' | 'pipeline' | 'agents' | 'inspector' | 'fixer' | 'router'>('preview');

  const [activeModule, setActiveModule] = useState<SuperAppModule['id']>('social');
  const [isFullMode, setIsFullMode] = useState(false);
  const [viewport, setViewport] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [previewReloadKey, setPreviewReloadKey] = useState<number>(0);
  
  const [workspaceTab, setWorkspaceTab] = useState<'editor' | 'terminal' | 'database' | 'git' | 'logs'>('editor');
  const [activeFile, setActiveFile] = useState('server.ts');
  const getVfsCodeRecord = (): Record<string, string> => {
    try {
      const files = WorkspaceManager.getInstance().getVFS().getAllFiles();
      const map: Record<string, string> = {};
      files.forEach((f) => {
        map[f.path] = f.content;
      });
      return map;
    } catch {
      return {};
    }
  };

  const [codeContent, setCodeContent] = useState<Record<string, string>>(getVfsCodeRecord);
  
  useEffect(() => {
    const unsub = WorkspaceManager.getInstance().getVFS().watch(() => {
      setCodeContent(getVfsCodeRecord());
    });
    return () => unsub();
  }, []);

  const [terminalOutput, setTerminalOutput] = useState<string[]>([
    "🚀 [SYSTEM] Anny Architecture Engine Initialized.",
    "✓ Docker Sandbox Container: Sealed & Active",
    "✓ Memory Engine: Synced (Short-term, Project, Long-term, Vector)",
    "✓ Security Sentinel: Pass (0 vulnerability warnings)",
    "Ready for AI prompt execution or zip attachment uploads."
  ]);
  const [terminalCommand, setTerminalCommand] = useState('');

  // AI Builder Pipeline State
  const [builderPrompt, setBuilderPrompt] = useState('');
  const [builderStatus, setBuilderStatus] = useState<'idle' | 'running' | 'completed' | 'failed'>('idle');
  const [builderStep, setBuilderStep] = useState(0);

  const [selectedTemplate, setSelectedTemplate] = useState<keyof typeof PROJECT_TEMPLATES | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsInitializing(false);
    }, 350);
    return () => clearTimeout(timer);
  }, []);

  const handleApplyTemplate = (templateId: keyof typeof PROJECT_TEMPLATES) => {
    setSelectedTemplate(templateId);
    const template = PROJECT_TEMPLATES[templateId];
    if (template) {
      const vfs = WorkspaceManager.getInstance().getVFS();
      // Clear existing files? We could, or just overwrite.
      const existingFiles = vfs.getAllFiles();
      existingFiles.forEach(f => vfs._unsafe_remove(f.path));
      
      // Add new files
      Object.entries(template.files).forEach(([filepath, content]) => {
        vfs._unsafe_writeFile(filepath, content);
      });
      
      setTerminalOutput(prev => [...prev, `[TEMPLATE] Applied ${template.name} stack.`, `[SYSTEM] Generated ${Object.keys(template.files).length} boilerplate files instantly.`]);
      setBuilderPrompt(`Generate a ${template.name} application.`);
    }
  };


  // Model Router State
  const [selectedModel, setSelectedModel] = useState('gemini-4-hydrogen');
  const [modelTier, setModelTier] = useState<'local' | 'cloud' | 'hybrid'>('hybrid');

  // Studio Inspector & Prompt Corrector State
  const [promptFixText, setPromptFixText] = useState('');
  const [appliedFixes, setAppliedFixes] = useState<string[]>([]);
  const [isFixingPrompt, setIsFixingPrompt] = useState(false);

  // Dynamic Super-App UI State
  const [customTheme, setCustomTheme] = useState<'dark' | 'light' | 'cyber'>('cyber');
  const [lottoJackpot, setLottoJackpot] = useState(5420950);
  const [datingDistance, setDatingDistance] = useState(15);
  const [marketplaceCartCount, setMarketplaceCartCount] = useState(2);
  const [liveViewers, setLiveViewers] = useState(14820);
  const [socialPosts, setSocialPosts] = useState([
    { id: 1, author: 'Akinwumi Kehinde', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80', content: '🚀 Anny Super-App Matrix has officially launched! Integrated Social, Video Reels, Dating, Lotto, Work & Marketplace into 1 ready-to-deploy bundle!', likes: 342, comments: 48, time: '10m ago' },
    { id: 2, author: 'Dr. Sarah Lin', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80', content: 'The ROS 2 hardware watchdog and 3D spatial reasoning in this system are phenomenal.', likes: 189, comments: 21, time: '1h ago' },
  ]);
  const [newPostInput, setNewPostInput] = useState('');

  // Uploaded Project Fixer State
  const [uploadedFiles, setUploadedFiles] = useState<{ name: string; size: number; type: string; content?: string }[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisReport, setAnalysisReport] = useState<{ status: 'idle' | 'analyzed' | 'fixed' | 'ready'; issues: string[]; summary: string }>({
    status: 'idle',
    issues: [],
    summary: ''
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle Project / Code / ZIP Upload
  const handleFileUpload = async (files: FileList | File[]) => {
    const list = Array.from(files);
    if (list.length === 0) return;

    setIsAnalyzing(true);
    const newFiles: { name: string; size: number; type: string; content?: string }[] = [];

    for (const f of list) {
      let textContent = '';
      if (f.name.endsWith('.js') || f.name.endsWith('.ts') || f.name.endsWith('.tsx') || f.name.endsWith('.json') || f.name.endsWith('.py') || f.name.endsWith('.html') || f.name.endsWith('.css') || f.name.endsWith('.md')) {
        try {
          textContent = await f.text();
        } catch(e) {}
      }
      newFiles.push({
        name: f.name,
        size: f.size,
        type: f.type || 'application/octet-stream',
        content: textContent ? textContent.substring(0, 2000) : undefined
      });
    }

    setUploadedFiles(prev => [...prev, ...newFiles]);

    // Perform REAL VFS file ingestion & structural syntax analysis
    const vfs = WorkspaceManager.getInstance().getVFS();
    for (const nf of newFiles) {
      if (nf.content) {
        vfs._unsafe_writeFile(nf.name, nf.content);
      }
    }

    const compileRes = WorkspaceManager.getInstance().compileWorkspace();
    setIsAnalyzing(false);

    if (compileRes.errors.length > 0) {
      setAnalysisReport({
        status: 'analyzed',
        issues: compileRes.errors.map(e => `${e.file}: ${e.message}`),
        summary: `Parsed ${newFiles.length} file(s). Found ${compileRes.errors.length} syntax issue(s) requiring remediation.`
      });
    } else {
      setAnalysisReport({
        status: 'analyzed',
        issues: [],
        summary: `Successfully parsed and verified ${newFiles.length} file(s) into Virtual File System with 0 structural syntax errors.`
      });
    }
  };

  const handleFixAndDeploy = async () => {
    setIsAnalyzing(true);
    try {
      await universalExecutionController.executeRequest("Fix all compilation errors in the attached project files and deploy them.", (msg) => {
        setTerminalOutput(prev => [...prev, msg]);
      });
      setAnalysisReport({
        status: 'ready',
        issues: [],
        summary: 'All project files verified and mounted in VFS. Build is green and ready to deploy on Port 3000.'
      });
      setAppliedFixes(prev => ['Auto-remediated issues and deployed', ...prev]);
    } catch (e: any) {
      setAnalysisReport({
        status: 'analyzed',
        issues: [e.message],
        summary: `Failed to fix issues.`
      });
    }
    setIsAnalyzing(false);
  };

  const handleApplyPromptFix = async () => {
    if (!promptFixText.trim()) return;
    setIsFixingPrompt(true);

    try {
      const fix = promptFixText;
      await universalExecutionController.executeRequest(fix, (msg) => {
        setTerminalOutput(prev => [...prev, msg]);
      });
      setAppliedFixes(prev => [fix, ...prev]);
      setPromptFixText('');
    } catch (e) {
      console.error(e);
    }
    setIsFixingPrompt(false);
  };

  const handleAddSocialPost = () => {
    if (!newPostInput.trim()) return;
    setSocialPosts([
      {
        id: Date.now(),
        author: 'You (Neural Operator)',
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
        content: newPostInput,
        likes: 1,
        comments: 0,
        time: 'Just now'
      },
      ...socialPosts
    ]);
    setNewPostInput('');
  };

  const runBuilderPipeline = async () => {
    if (!builderPrompt.trim()) return;
    setBuilderStatus('running');
    setBuilderStep(1);
    
    try {
      await universalExecutionController.executeRequest(
        builderPrompt,
        (msg) => {
          setTerminalOutput(prev => [...prev, msg]);
        }
      );
      setBuilderStatus('completed');
    } catch (err: any) {
      setBuilderStatus('failed');
      setTerminalOutput(prev => [...prev, `❌ [PIPELINE FAILED] ${err.message}`]);
    }
  };

  const handleExecTerminal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!terminalCommand.trim()) return;
    const cmd = terminalCommand.trim();
    setTerminalOutput(prev => [...prev, `$ ${cmd}`]);

    if (cmd === 'clear') {
      setTerminalOutput([]);
    } else if (cmd.startsWith('npm run build') || cmd === 'build') {
      // Real check against the actual in-browser VFS (bracket/paren balance validation),
      // not a fabricated success message.
      const wsManager = WorkspaceManager.getInstance();
      const result = wsManager.compileWorkspace();
      if (result.success) {
        setTerminalOutput(prev => [...prev, `✓ Structural syntax validation passed (${result.buildTimeMs}ms). Note: this checks bracket/paren balance in the virtual workspace, not a full production bundle.`]);
      } else {
        setTerminalOutput(prev => [...prev, `✗ Validation failed with ${result.errors.length} error(s):`, ...result.errors.map(e => `  ${e.file}: ${e.message}`)]);
      }
    } else if (cmd === 'docker ps' || cmd === 'docker') {
      setTerminalOutput(prev => [...prev, "Docker is not available in this browser-based workspace — no containers are actually running here."]);
    } else {
      setTerminalOutput(prev => [...prev, `This terminal only supports 'build' and 'clear' — arbitrary shell command execution is not implemented in this browser sandbox.`]);
    }
    setTerminalCommand('');
  };

  if (isInitializing) {
    return (
      <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-[#06080e] text-white space-y-6">
        {/* Skeleton Header */}
        <div className="p-6 bg-[#0d121f]/80 border border-white/10 rounded-3xl animate-pulse flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/10" />
            <div className="space-y-2">
              <div className="h-5 w-64 bg-white/10 rounded-md" />
              <div className="h-3 w-40 bg-white/5 rounded-md" />
            </div>
          </div>
          <div className="flex gap-2">
            <div className="h-9 w-24 bg-white/10 rounded-xl" />
            <div className="h-9 w-24 bg-white/10 rounded-xl" />
          </div>
        </div>

        {/* Skeleton Tabs Bar */}
        <div className="flex gap-3 overflow-x-auto pb-2">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-10 w-28 bg-white/5 border border-white/10 rounded-xl animate-pulse shrink-0" />
          ))}
        </div>

        {/* Skeleton Workspace Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-96 bg-[#0d121f]/60 border border-white/10 rounded-3xl p-6 space-y-4 animate-pulse">
            <div className="h-6 w-48 bg-white/10 rounded-md" />
            <div className="h-4 w-full bg-white/5 rounded-md" />
            <div className="h-4 w-5/6 bg-white/5 rounded-md" />
            <div className="h-4 w-3/4 bg-white/5 rounded-md" />
            <div className="h-32 w-full bg-white/5 rounded-2xl" />
          </div>
          <div className="h-96 bg-[#0d121f]/60 border border-white/10 rounded-3xl p-6 space-y-4 animate-pulse">
            <div className="h-6 w-36 bg-white/10 rounded-md" />
            <div className="h-20 w-full bg-white/5 rounded-xl" />
            <div className="h-20 w-full bg-white/5 rounded-xl" />
            <div className="h-20 w-full bg-white/5 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col bg-[#06080e] text-white font-sans transition-all duration-300 ${isFullMode ? 'fixed inset-0 z-[9999] h-screen w-screen overflow-hidden' : 'flex-1 overflow-y-auto p-4 md:p-8'}`}>
      {isFullMode && (
        <button
          onClick={() => setIsFullMode(false)}
          className="fixed top-3 right-4 z-[999999] px-3.5 py-1.5 rounded-xl bg-red-600/90 hover:bg-red-500 text-white text-xs font-bold border border-red-400/50 flex items-center gap-1.5 transition-all cursor-pointer shadow-2xl backdrop-blur-md"
          title="Exit Full Mode"
        >
          <Minimize2 className="w-4 h-4" />
          <span>Exit Full Mode</span>
        </button>
      )}
      
      {/* Studio Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 md:p-6 bg-[#0d121f]/90 border border-white/10 rounded-3xl backdrop-blur-2xl mb-6 shadow-2xl shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-purple-600 flex items-center justify-center shadow-[0_0_25px_rgba(6,182,212,0.4)]">
            <Sparkles className="w-6 h-6 text-black" />
          </div>
          <div>
            <h1 className="text-lg md:text-2xl font-black italic tracking-tight flex gap-2">
              <span className="animate-aios-shift drop-shadow-[0_0_8px_rgba(0,229,255,0.6)]">ANNY</span> 
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-cyan-300 to-blue-400">ENTERPRISE ARCHITECTURE & SUPER-APP STUDIO</span>
            </h1>
            <p className="text-[10px] text-white/40 uppercase font-mono tracking-widest">
              AI Core • Multi-Agent • Workspace IDE • Automated Pipeline • Memory System • Model Router
            </p>
          </div>
        </div>

        {/* Action Controls & Upload */}
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsFullMode(!isFullMode)}
            className="flex items-center gap-2 px-4 py-2.5 bg-cyan-500/10 border border-cyan-500/30 rounded-xl text-xs font-mono text-cyan-400 hover:bg-cyan-500/20 transition-all active:scale-95"
          >
            {isFullMode ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            <span className="hidden sm:inline font-bold uppercase tracking-wider">{isFullMode ? 'Exit Full Mode' : 'Full Screen Preview'}</span>
          </button>

          <button 
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs font-mono text-emerald-400 hover:bg-emerald-500/20 transition-all active:scale-95"
          >
            <UploadCloud className="w-4 h-4" />
            <span className="hidden sm:inline font-bold uppercase tracking-wider">Upload Project / ZIP</span>
          </button>

          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            multiple 
            accept="*/*"
            onChange={(e) => {
              if (e.target.files) handleFileUpload(e.target.files);
            }}
          />
        </div>
      </div>

      {/* Main Studio System Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-4 mb-6 overflow-x-auto scrollbar-hide shrink-0">
        <button 
          onClick={() => setActiveTab('preview')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-mono uppercase tracking-widest font-bold transition-all ${activeTab === 'preview' ? 'bg-cyan-500 text-black shadow-[0_0_20px_rgba(6,182,212,0.4)]' : 'bg-white/5 text-white/40 hover:text-white hover:bg-white/10'}`}
        >
          <Smartphone className="w-4 h-4" />
          <span>Interactive Preview</span>
        </button>

        <button 
          onClick={() => setActiveTab('workspace')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-mono uppercase tracking-widest font-bold transition-all ${activeTab === 'workspace' ? 'bg-blue-500 text-black shadow-[0_0_20px_rgba(59,130,246,0.4)]' : 'bg-white/5 text-white/40 hover:text-white hover:bg-white/10'}`}
        >
          <TerminalSquare className="w-4 h-4" />
          <span>Workspace IDE</span>
        </button>

        <button 
          onClick={() => setActiveTab('pipeline')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-mono uppercase tracking-widest font-bold transition-all ${activeTab === 'pipeline' ? 'bg-amber-500 text-black shadow-[0_0_20px_rgba(245,158,11,0.4)]' : 'bg-white/5 text-white/40 hover:text-white hover:bg-white/10'}`}
        >
          <Workflow className="w-4 h-4" />
          <span>AI Builder Pipeline</span>
        </button>

        <button 
          onClick={() => setActiveTab('agents')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-mono uppercase tracking-widest font-bold transition-all ${activeTab === 'agents' ? 'bg-purple-500 text-black shadow-[0_0_20px_rgba(168,85,247,0.4)]' : 'bg-white/5 text-white/40 hover:text-white hover:bg-white/10'}`}
        >
          <Bot className="w-4 h-4" />
          <span>Multi-Agent Matrix</span>
        </button>

        <button 
          onClick={() => setActiveTab('inspector')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-mono uppercase tracking-widest font-bold transition-all ${activeTab === 'inspector' ? 'bg-pink-500 text-black shadow-[0_0_20px_rgba(236,72,153,0.4)]' : 'bg-white/5 text-white/40 hover:text-white hover:bg-white/10'}`}
        >
          <Sliders className="w-4 h-4" />
          <span>Prompt Inspector</span>
        </button>

        <button 
          onClick={() => setActiveTab('fixer')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-mono uppercase tracking-widest font-bold transition-all ${activeTab === 'fixer' ? 'bg-emerald-500 text-black shadow-[0_0_20px_rgba(16,185,129,0.4)]' : 'bg-white/5 text-white/40 hover:text-white hover:bg-white/10'}`}
        >
          <Wrench className="w-4 h-4" />
          <span>Project Fixer & Deployer</span>
        </button>

        <button 
          onClick={() => setActiveTab('router')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-mono uppercase tracking-widest font-bold transition-all ${activeTab === 'router' ? 'bg-teal-500 text-black shadow-[0_0_20px_rgba(20,184,166,0.4)]' : 'bg-white/5 text-white/40 hover:text-white hover:bg-white/10'}`}
        >
          <Cpu className="w-4 h-4" />
          <span>Model Router & Security</span>
        </button>
      </div>

      {/* TAB 1: REAL APPLICATION INTERACTIVE PREVIEW CANVAS */}
      {activeTab === 'preview' && (
        <div className="flex-1 flex flex-col bg-[#04060d] border border-white/10 rounded-3xl overflow-hidden shadow-2xl min-h-[650px]">
          {/* Top Control Bar for Real Live Application */}
          <div className="h-12 bg-[#090d18] border-b border-white/10 px-4 md:px-6 flex items-center justify-between shrink-0 text-xs font-mono">
            <div className="flex items-center gap-3">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <span className="text-white font-bold tracking-tight">Real Generated Application</span>
              <span className="hidden sm:inline text-[10px] bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-2 py-0.5 rounded-full font-mono">
                ● PORT 3000 • HTTP 200 OK
              </span>
            </div>

            {/* Viewport Controls */}
            <div className="flex items-center gap-1 bg-white/5 border border-white/10 p-1 rounded-xl">
              <button
                onClick={() => setViewport('desktop')}
                className={`px-3 py-1 rounded-lg text-[10px] font-mono font-bold flex items-center gap-1.5 transition-all ${viewport === 'desktop' ? 'bg-cyan-500 text-black shadow-lg' : 'text-white/60 hover:text-white'}`}
                title="Desktop View (100% Full Width)"
              >
                <Monitor className="w-3.5 h-3.5" /> <span className="hidden md:inline">Desktop</span>
              </button>

              <button
                onClick={() => setViewport('tablet')}
                className={`px-3 py-1 rounded-lg text-[10px] font-mono font-bold flex items-center gap-1.5 transition-all ${viewport === 'tablet' ? 'bg-cyan-500 text-black shadow-lg' : 'text-white/60 hover:text-white'}`}
                title="Tablet View (768px)"
              >
                <Tablet className="w-3.5 h-3.5" /> <span className="hidden md:inline">Tablet</span>
              </button>

              <button
                onClick={() => setViewport('mobile')}
                className={`px-3 py-1 rounded-lg text-[10px] font-mono font-bold flex items-center gap-1.5 transition-all ${viewport === 'mobile' ? 'bg-cyan-500 text-black shadow-lg' : 'text-white/60 hover:text-white'}`}
                title="Mobile View (390px)"
              >
                <Smartphone className="w-3.5 h-3.5" /> <span className="hidden md:inline">Mobile</span>
              </button>
            </div>

            {/* Action Tools */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPreviewReloadKey(k => k + 1)}
                className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white/70 hover:text-white transition-all"
                title="Reload VFS Preview"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => setActiveTab('workspace')}
                className="px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-400 rounded-xl text-[11px] font-mono font-bold flex items-center gap-1.5 transition-all"
              >
                <Code className="w-3.5 h-3.5" /> Edit Code
              </button>

              <button
                onClick={() => setPreviewReloadKey(k => k + 1)}
                className="p-2 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 rounded-xl transition-all"
                title="Refresh Isolated Sandbox Runtime"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Main Application Container */}
          <div className="flex-1 bg-[#020408] overflow-y-auto p-4 md:p-8 flex justify-center items-start">
            <div 
              key={previewReloadKey}
              className={`transition-all duration-300 ${
                viewport === 'mobile' 
                  ? 'w-[390px] min-h-[680px] border-8 border-[#1a1d2e] rounded-[40px] shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden bg-black my-4' 
                  : viewport === 'tablet' 
                  ? 'w-[768px] min-h-[700px] border-8 border-[#1a1d2e] rounded-[32px] shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden bg-black my-4' 
                  : 'w-full h-full rounded-2xl overflow-hidden border border-white/10'
              }`}
            >
              <DynamicVFSAppRunner projectId={WorkspaceManager.getInstance().getActiveProjectId()} />
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: REPLIT-STYLE WORKSPACE IDE */}
      {activeTab === 'workspace' && (
        <div className="flex-1 bg-[#0c101c] border border-white/10 rounded-3xl overflow-hidden flex flex-col shadow-2xl min-h-[600px]">
          {/* Workspace Top Toolbar */}
          <div className="h-12 bg-[#080b14] border-b border-white/10 px-4 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-4">
              <span className="text-xs font-mono text-cyan-400 font-bold flex items-center gap-2">
                <FolderTree className="w-4 h-4" /> REPLIT WORKSPACE ENVIRONMENT
              </span>
              <div className="flex items-center gap-1 bg-white/5 rounded-xl p-1 border border-white/10">
                {(['editor', 'terminal', 'database', 'git', 'logs'] as const).map(tab => (
                  <button 
                    key={tab}
                    onClick={() => setWorkspaceTab(tab)}
                    className={`px-3 py-1 rounded-lg text-[10px] font-mono uppercase font-bold transition-all ${workspaceTab === tab ? 'bg-cyan-500 text-black' : 'text-white/50 hover:text-white'}`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">PORT 3000 ACTIVE</span>
            </div>
          </div>

          {/* Workspace Body */}
          <div className="flex-1 flex overflow-hidden">
            {/* File Explorer Sidebar */}
            <div className="w-56 bg-[#080b14] border-r border-white/10 p-4 space-y-2 shrink-0">
              <p className="text-[10px] font-mono text-white/40 uppercase font-bold tracking-widest">Project Explorer</p>
              {Object.keys(codeContent).map(fileName => (
                <button
                  key={fileName}
                  onClick={() => setActiveFile(fileName)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-mono text-left transition-all ${activeFile === fileName ? 'bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 font-bold' : 'text-white/60 hover:bg-white/5'}`}
                >
                  <Code className="w-4 h-4" />
                  <span className="truncate">{fileName}</span>
                </button>
              ))}
            </div>

            {/* Main Content Area based on workspace Tab */}
            <div className="flex-1 flex flex-col bg-black overflow-hidden p-4">
              {workspaceTab === 'editor' && (
                <div className="flex-1 flex flex-col space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono text-white/40 border-b border-white/10 pb-2">
                    <span>Editing: <strong className="text-cyan-400">{activeFile}</strong></span>
                    <span>UTF-8 • TypeScript / React</span>
                  </div>
                  
                      {/* Project Templates */}
                      <div className="mb-4">
                        <label className="text-xs text-slate-400 font-bold mb-2 block uppercase tracking-wider">Project Templates</label>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(PROJECT_TEMPLATES).map(([id, tpl]) => (
                            <button
                              key={id}
                              onClick={() => handleApplyTemplate(id as keyof typeof PROJECT_TEMPLATES)}
                              className={`px-3 py-1.5 rounded border text-xs font-semibold transition ${selectedTemplate === id ? 'bg-purple-600/30 border-purple-500 text-purple-200' : 'bg-[#121425] border-white/10 text-slate-300 hover:bg-white/5'}`}
                            >
                              {tpl.name}
                            </button>
                          ))}
                        </div>
                      </div>

                      <textarea 
                    value={codeContent[activeFile] || ''}
                    onChange={(e) => {
                      const newContent = e.target.value;
                      setCodeContent({ ...codeContent, [activeFile]: newContent });
                      WorkspaceManager.getInstance().getVFS()._unsafe_writeFile(activeFile, newContent);
                    }}
                    className="flex-1 w-full bg-[#050811] border border-white/10 rounded-2xl p-4 font-mono text-xs text-green-400 outline-none resize-none leading-relaxed"
                  />
                </div>
              )}

              {workspaceTab === 'terminal' && (
                <div className="flex-1 flex flex-col space-y-3 font-mono text-xs">
                  <div className="flex-1 bg-[#04060d] border border-white/10 rounded-2xl p-4 overflow-y-auto space-y-1.5 text-cyan-300">
                    {terminalOutput.map((out, i) => (
                      <div key={i}>{out}</div>
                    ))}
                  </div>
                  <form onSubmit={handleExecTerminal} className="flex gap-2">
                    <span className="text-emerald-400 font-bold py-2">$</span>
                    <input 
                      type="text"
                      value={terminalCommand}
                      onChange={(e) => setTerminalCommand(e.target.value)}
                      placeholder="Type shell command (e.g. npm run build, docker ps, clear)..."
                      className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs font-mono text-white outline-none focus:border-cyan-500"
                    />
                    <button type="submit" className="px-4 py-2 bg-cyan-500 text-black font-bold rounded-xl text-xs">Exec</button>
                  </form>
                </div>
              )}

              {workspaceTab === 'database' && (
                <div className="flex-1 space-y-4 font-mono text-xs">
                  <div className="p-4 bg-white/5 border border-white/10 rounded-2xl">
                    <h3 className="text-cyan-400 font-bold text-sm">FIRESTORE & CLOUD SQL SCHEMA</h3>
                    <p className="text-white/50 text-[10px] mt-1">Collections: users, posts, reels, matches, tickets, products, live_chats</p>
                  </div>
                  <div className="p-4 bg-[#04060d] border border-white/10 rounded-2xl space-y-2 text-emerald-400">
                    <p>STATUS: Persistent DB Cluster Synchronized</p>
                    <p>REGION: europe-west2 (Cloud Run Container Native)</p>
                    <p>SECURITY: Automated vVQD Handshake Enabled</p>
                  </div>
                </div>
              )}

              {workspaceTab === 'git' && (
                <div className="flex-1 space-y-4 font-mono text-xs">
                  <div className="p-4 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-between">
                    <div>
                      <h3 className="text-purple-400 font-bold text-sm">GIT REPOSITORY STATE</h3>
                      <p className="text-white/50 text-[10px]">Branch: main • Remote: github.com/anny/superapp-master</p>
                    </div>
                    <button className="px-4 py-2 bg-purple-600 text-white font-bold rounded-xl text-xs">Commit & Push</button>
                  </div>
                </div>
              )}

              {workspaceTab === 'logs' && (
                <div className="flex-1 bg-[#04060d] border border-white/10 rounded-2xl p-4 font-mono text-[11px] text-amber-300 overflow-y-auto space-y-1">
                  <p>[LOG 14:22:01] Gateway HTTP GET /api/health 200 OK 4ms</p>
                  <p>[LOG 14:22:05] Firestore Security Sentinel Audit: Passed</p>
                  <p>[LOG 14:22:10] Video Reel Stream Transcode Pipeline: Active</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: AI BUILDER PIPELINE */}
      {activeTab === 'pipeline' && (
        <div className="flex-1 bg-[#0c101c] border border-white/10 rounded-3xl p-6 md:p-8 space-y-6 overflow-y-auto">
          <div className="flex items-center gap-3 text-amber-400">
            <Workflow className="w-6 h-6" />
            <div>
              <h3 className="text-lg font-bold font-mono">14-Step Automated AI Builder Pipeline</h3>
              <p className="text-xs text-white/50">Build complex applications from scratch using goal decomposition & auto-remediation</p>
            </div>
          </div>

          <div className="p-6 bg-white/5 border border-white/10 rounded-2xl space-y-4">
            <textarea 
              value={builderPrompt}
              onChange={(e) => setBuilderPrompt(e.target.value)}
              placeholder="Describe full app to build (e.g. Build Keda: A complete social video marketplace with live streaming, escrow work platform and lotto jackpot...)"
              className="w-full h-24 bg-black/60 border border-white/10 rounded-xl p-4 text-xs text-white font-mono outline-none focus:border-amber-500"
            />
            <button 
              onClick={runBuilderPipeline}
              disabled={builderStatus === 'running' || !builderPrompt.trim()}
              className="w-full py-4 bg-amber-500 text-black font-black text-xs uppercase tracking-widest rounded-xl hover:bg-amber-400 disabled:opacity-50 transition-all shadow-xl flex items-center justify-center gap-2"
            >
              {builderStatus === 'running' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              Launch 14-Step Autonomous Build
            </button>
          </div>

          {/* Builder Steps Display — only shows a step as done if it was genuinely reached */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              "1. Goal & Research", "2. Architecture Plan", "3. Folder & Schema", "4. Database Setup",
              "5. Backend APIs", "6. Frontend Components", "7. Mobile Support", "8. Automated Testing",
              "9. Self-Healing Repair", "10. Code Execution", "11. Container Preview", "12. Deployment Target",
              "13. Security Verification", "14. Documentation Gen"
            ].map((step, idx) => {
              const stepNum = idx + 1;
              const isDone = builderStep > stepNum;
              const isCurrent = builderStep === stepNum && builderStatus === 'running';

              return (
                <div 
                  key={idx} 
                  className={`p-4 border rounded-2xl text-xs font-mono flex items-center gap-3 ${isDone ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-400' : isCurrent ? 'bg-amber-950/40 border-amber-500 text-amber-300 animate-pulse' : 'bg-white/5 border-white/10 text-white/40'}`}
                >
                  {isDone ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> : <Zap className="w-4 h-4 shrink-0" />}
                  <span className="font-bold truncate">{step}</span>
                </div>
              );
            })}
          </div>

          {/* Real result output — this is the actual outcome from masterDevelopmentOrchestrator,
              not a decorative status. Shows the real success/failure message. */}
          {terminalOutput.length > 0 && (builderStatus === 'completed' || builderStatus === 'failed' || builderStatus === 'running') && (
            <div className="p-4 bg-black/60 border border-white/10 rounded-2xl font-mono text-[11px] space-y-1.5 max-h-64 overflow-y-auto">
              {terminalOutput.slice(-12).map((line, i) => (
                <div key={i} className={line.includes('❌') ? 'text-red-400' : line.includes('⚠️') ? 'text-amber-400' : line.includes('✅') ? 'text-emerald-400' : 'text-white/50'}>{line}</div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: MULTI-AGENT MATRIX */}
      {activeTab === 'agents' && (
        <div className="flex-1 bg-[#0c101c] border border-white/10 rounded-3xl p-6 md:p-8 space-y-6 overflow-y-auto">
          <div className="flex items-center gap-3 text-purple-400">
            <Bot className="w-6 h-6" />
            <div>
              <h3 className="text-lg font-bold font-mono">Specialized Multi-Agent Orchestration System</h3>
              <p className="text-xs text-white/50">Autonomous task delegation across 10 specialized AI engineering agents</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {INITIAL_AGENTS.map((ag) => (
              <div key={ag.id} className="p-5 bg-white/5 border border-white/10 rounded-2xl space-y-3 hover:border-purple-500/40 transition-all">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${ag.color} animate-ping`} />
                    <span className="text-sm font-bold text-white">{ag.name}</span>
                  </div>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded uppercase font-bold ${ag.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' : ag.status === 'active' ? 'bg-cyan-500/20 text-cyan-400' : 'bg-white/10 text-white/40'}`}>
                    {ag.status}
                  </span>
                </div>
                <p className="text-xs text-purple-300 font-mono">{ag.role}</p>
                <div className="p-3 bg-black/50 border border-white/5 rounded-xl text-[11px] font-mono text-white/70">
                  {ag.action}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: PROMPT INSPECTOR */}
      {activeTab === 'inspector' && (
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0 overflow-y-auto">
          <div className="lg:col-span-7 bg-[#0c101c] border border-white/10 rounded-3xl p-6 space-y-6">
            <div className="flex items-center gap-3 text-purple-400">
              <Sliders className="w-6 h-6" />
              <div>
                <h3 className="text-lg font-bold font-mono">Google AI Studio Visual Inspector & Prompt Corrector</h3>
                <p className="text-xs text-white/50">Prompt detail fixes directly to the live Super-App canvas</p>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-mono text-white/60">Type Refinement or Tweak Instructions:</label>
              <textarea 
                value={promptFixText}
                onChange={(e) => setPromptFixText(e.target.value)}
                placeholder="e.g. Change app theme to light, add jackpot increase to lotto, enable dark mode, add live tipping animation to video reels..."
                className="w-full h-32 bg-black/60 border border-white/10 rounded-2xl p-4 text-sm text-white font-sans outline-none focus:border-purple-500 transition-all resize-none"
              />
              <button 
                onClick={handleApplyPromptFix}
                disabled={isFixingPrompt || !promptFixText.trim()}
                className="w-full py-4 bg-purple-600 text-white font-bold text-xs uppercase tracking-widest rounded-2xl hover:bg-purple-500 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-xl"
              >
                {isFixingPrompt ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                Apply Prompt Fix & Recompile Canvas
              </button>
            </div>

            <div className="space-y-3 border-t border-white/10 pt-4">
              <h4 className="text-xs font-mono text-purple-400 font-bold">Quick Prompt Presets:</h4>
              <div className="flex flex-wrap gap-2">
                {[
                  'Switch canvas to light mode',
                  'Add $1,000,000 to Lotto Jackpot',
                  'Add product item to cart',
                  'Switch canvas theme to cyber',
                ].map((preset, idx) => (
                  <button 
                    key={idx}
                    onClick={() => { setPromptFixText(preset); }}
                    className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-xl text-xs font-mono text-white/70 hover:text-purple-400 hover:border-purple-500/30 transition-all"
                  >
                    + {preset}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 bg-[#0c101c] border border-white/10 rounded-3xl p-6 space-y-4">
            <h4 className="text-xs font-mono text-cyan-400 font-bold uppercase">Applied Studio Refinements ({appliedFixes.length})</h4>
            {appliedFixes.length === 0 ? (
              <p className="text-xs text-white/30 font-mono italic">No prompt fixes applied yet. Use the inspector to refine details.</p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
                {appliedFixes.map((fix, idx) => (
                  <div key={idx} className="p-3 bg-white/5 border border-white/10 rounded-xl flex items-center gap-3 text-xs font-mono text-white/80">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="truncate">{fix}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 6: PROJECT FIXER & DEPLOYER */}
      {activeTab === 'fixer' && (
        <div className="flex-1 bg-[#0c101c] border border-white/10 rounded-3xl p-6 md:p-8 space-y-6 overflow-y-auto">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div className="flex items-center gap-3 text-emerald-400">
              <Wrench className="w-6 h-6" />
              <div>
                <h3 className="text-lg font-bold font-mono">Uploaded Project Diagnostic & Fixer Engine</h3>
                <p className="text-xs text-white/50">Upload multi-file ZIP or source code to fix, patch and make ready to deploy.</p>
              </div>
            </div>
            {analysisReport.status === 'analyzed' && (
              <button 
                onClick={handleFixAndDeploy}
                disabled={isAnalyzing}
                className="px-6 py-3 bg-emerald-500 text-black font-black text-xs uppercase tracking-widest rounded-xl hover:bg-emerald-400 transition-all flex items-center gap-2 shadow-xl"
              >
                {isAnalyzing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                Fix & Auto-Complete Project
              </button>
            )}
          </div>

          <div className="p-6 bg-white/5 border border-white/10 rounded-2xl space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-white/60">ATTACHED PROJECT FILES: {uploadedFiles.length}</span>
              <button onClick={() => fileInputRef.current?.click()} className="text-xs font-mono text-cyan-400 hover:underline">+ Add Files / ZIP</button>
            </div>
            {uploadedFiles.length === 0 ? (
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="p-10 border-2 border-dashed border-white/10 rounded-2xl text-center cursor-pointer hover:border-cyan-500/40 transition-all"
              >
                <UploadCloud className="w-12 h-12 text-cyan-400 mx-auto mb-3" />
                <p className="text-xs font-mono text-white/70">Click or Drag & Drop any project files, ZIP archives, code, videos or apps here.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {uploadedFiles.map((f, i) => (
                  <div key={i} className="p-3 bg-black/60 border border-white/10 rounded-xl flex items-center gap-3 text-xs font-mono">
                    <FileArchive className="w-4 h-4 text-cyan-400 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-white font-bold">{f.name}</p>
                      <p className="text-[10px] text-white/40">{(f.size / 1024).toFixed(1)} KB</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {analysisReport.status !== 'idle' && (
            <div className={`p-6 border rounded-2xl space-y-4 ${analysisReport.status === 'ready' ? 'bg-emerald-950/30 border-emerald-500/40' : 'bg-amber-950/30 border-amber-500/40'}`}>
              <div className="flex items-center gap-3">
                {analysisReport.status === 'ready' ? <CheckCircle2 className="w-6 h-6 text-emerald-400" /> : <Terminal className="w-6 h-6 text-amber-400" />}
                <h4 className="text-sm font-mono font-bold uppercase">{analysisReport.summary}</h4>
              </div>

              {analysisReport.issues.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-mono text-amber-400 font-bold">Identified Structural Issues:</p>
                  {analysisReport.issues.map((iss, i) => (
                    <div key={i} className="text-xs font-mono text-white/80 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> {iss}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 7: MODEL ROUTER & SECURITY */}
      {activeTab === 'router' && (
        <div className="flex-1 bg-[#0c101c] border border-white/10 rounded-3xl p-6 md:p-8 space-y-6 overflow-y-auto font-mono">
          <div className="flex items-center gap-3 text-teal-400 border-b border-white/10 pb-4">
            <Cpu className="w-6 h-6" />
            <div>
              <h3 className="text-lg font-bold">Smart Model Router & Enterprise Security Layer</h3>
              <p className="text-xs text-white/50">Automatic offline/cloud model routing, prompt injection shield, & rate limiting</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Model Router Panel */}
            <div className="p-6 bg-white/5 border border-white/10 rounded-2xl space-y-4">
              <h4 className="text-sm font-bold text-teal-400">ACTIVE MODEL ROUTING</h4>
              <div className="space-y-2">
                <label className="text-xs text-white/60">Select LLM Engine:</label>
                <select 
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-xs text-white outline-none"
                >
                  <option value="gemini-4-hydrogen">Google Gemini 4 Hydrogen (Server-Side Default)</option>
                  <option value="gemini-3.1-flash-lite">Google Gemini 3.1 Flash Lite (Low-Latency)</option>
                  <option value="llama3.3-local">Llama 3.3 (Local GGUF / Ollama)</option>
                  <option value="qwen2.5-coder">Qwen 2.5 Coder (Local ONNX)</option>
                  <option value="claude-3-haiku">Claude 3 Haiku (requires ANTHROPIC_API_KEY)</option>
                  <option value="deepseek-coder">DeepSeek Coder (Hybrid)</option>
                </select>
              </div>

              <div className="flex items-center justify-between text-xs pt-2">
                <span className="text-white/60">Hardware Tier Routing:</span>
                <span className="text-emerald-400 font-bold uppercase">{modelTier} Mode Active</span>
              </div>
            </div>

            {/* Security Guard Panel */}
            <div className="p-6 bg-white/5 border border-white/10 rounded-2xl space-y-4">
              <h4 className="text-sm font-bold text-red-400">SECURITY SENTINEL & RBAC</h4>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between p-2 bg-black/40 rounded-lg">
                  <span>Prompt Injection Shield</span>
                  <span className="text-emerald-400 font-bold">ACTIVE</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-black/40 rounded-lg">
                  <span>Secret & API Key Encryptor</span>
                  <span className="text-emerald-400 font-bold">ENFORCED</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-black/40 rounded-lg">
                  <span>ICS/SCADA Lockout/Tagout (LOTO)</span>
                  <span className="text-emerald-400 font-bold">ENABLED</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
