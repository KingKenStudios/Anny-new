import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AnnyWorkspace } from './AnnyWorkspace';
import { AnnyProjectsView, type LoadedProjectPayload } from './views/AnnyProjectsView';
import { AnnySessionHistoryView } from './views/AnnySessionHistoryView';
import { AnnyAgentsView } from './views/AnnyAgentsView';
import { AnnyKnowledgeView } from './views/AnnyKnowledgeView';
import { AnnyMemoryView } from './views/AnnyMemoryView';
import { AnnyPromptsView } from './views/AnnyPromptsView';
import { AnnyModelsView } from './views/AnnyModelsView';
import { AnnyToolsView } from './views/AnnyToolsView';
import { AnnyIntegrationsView } from './views/AnnyIntegrationsView';
import { AnnySettingsView } from './views/AnnySettingsView';
import { KingKenStudiosView } from './views/KingKenStudiosView';
import { EngineeringSafetyView } from './views/EngineeringSafetyView';
import { AnnyMediaArchStudioView } from './views/AnnyMediaArchStudioView';
import CybersecurityCommand from './components/CybersecurityCommand';
import { AnnySlideMenu } from './AnnySlideMenu';
import { AnnyMenuStateProvider } from './MobileLogoMenu';

interface AnnyAppProps {
  user?: any;
  userRole?: string;
  isGuest?: boolean;
  setIsGuest?: (g: boolean) => void;
  userEmail?: string;
  userName?: string;
  userId?: string;
  activeSubTab?: string;
  onToggleMobileMenu?: () => void;
  onSelectSubTab?: (subTab: string) => void;
  chatHistory?: Array<{ id: string; title: string; date?: string; messages: any[] }>;
  currentChatId?: string | null;
  setCurrentChatId?: (id: string | null) => void;
  startNewChat?: () => void;
  deleteChat?: (id: string) => void;
  messages?: any[];
  onUpdateMessages?: (msgs: any[]) => void;
  selectedNeuralEngine?: any;
  setSelectedNeuralEngine?: (engine: any) => void;
  isVisionActive?: boolean;
  setIsVisionActive?: (val: boolean) => void;
  isContinuousListening?: boolean;
  setIsContinuousListening?: (val: boolean) => void;
  isRobotMode?: boolean;
  setIsRobotMode?: (val: boolean) => void;
  isGuidanceActive?: boolean;
  setIsGuidanceActive?: (val: boolean) => void;
  voices?: SpeechSynthesisVoice[];
  selectedVoiceURI?: string;
  setSelectedVoiceURI?: (val: string) => void;
  isAutoSpeak?: boolean;
  setIsAutoSpeak?: (val: boolean) => void;
  connectToAdminGlobal?: () => Promise<void>;
  initialPrompt?: string;
  handleLogout?: () => void;
  onOpenAuth?: () => void;
  setView?: (v: string) => void;
}

export const AnnyApp: React.FC<AnnyAppProps> = (props) => {
  const {
    user,
    userRole,
    isGuest,
    userEmail = 'amazonpromo234@gmail.com',
    userName = 'Akin Kehinde',
    userId = '',
    activeSubTab = 'anny',
    onToggleMobileMenu,
    onSelectSubTab,
    chatHistory = [],
    currentChatId,
    setCurrentChatId,
    startNewChat,
    deleteChat,
    messages = [],
    onUpdateMessages,
    selectedNeuralEngine,
    setSelectedNeuralEngine,
    handleLogout,
    onOpenAuth,
    setView,
  } = props;
  const [internalTab, setInternalTab] = useState<string>(props.activeSubTab || 'anny');
  const [activePromptHint, setActivePromptHint] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [isProfessionalEditorActive, setIsProfessionalEditorActive] = useState<boolean>(false);
  const [isFileDragActive, setIsFileDragActive] = useState(false);
  const [pendingDroppedFiles, setPendingDroppedFiles] = useState<File[]>([]);
  const [activeLoadedProject, setActiveLoadedProject] = useState<LoadedProjectPayload | null>(null);

  useEffect(() => {
    let dragDepth = 0;
    const onDragEnter = (e: DragEvent) => {
      if (!e.dataTransfer?.types?.includes('Files')) return;
      dragDepth += 1;
      setIsFileDragActive(true);
    };
    const onDragOver = (e: DragEvent) => {
      if (!e.dataTransfer?.types?.includes('Files')) return;
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
    };
    const onDragLeave = (e: DragEvent) => {
      if (!e.dataTransfer?.types?.includes('Files')) return;
      dragDepth = Math.max(0, dragDepth - 1);
      if (dragDepth === 0) setIsFileDragActive(false);
    };
    const onDrop = (e: DragEvent) => {
      if (!e.dataTransfer?.files?.length) return;
      e.preventDefault();
      dragDepth = 0;
      setIsFileDragActive(false);
      setPendingDroppedFiles(prev => [...prev, ...Array.from(e.dataTransfer.files)]);
    };
    window.addEventListener('dragenter', onDragEnter);
    window.addEventListener('dragover', onDragOver);
    window.addEventListener('dragleave', onDragLeave);
    window.addEventListener('drop', onDrop);
    return () => {
      window.removeEventListener('dragenter', onDragEnter);
      window.removeEventListener('dragover', onDragOver);
      window.removeEventListener('dragleave', onDragLeave);
      window.removeEventListener('drop', onDrop);
    };
  }, []);

  useEffect(() => {
    if (props.activeSubTab) {
      setInternalTab(props.activeSubTab);
    }
  }, [props.activeSubTab]);

  const currentTab = internalTab;

  const handleTabChange = (tab: string) => {
    if (tab === 'new-chat') {
      setActiveLoadedProject(null);
      if (props.startNewChat) {
        props.startNewChat();
      }
      setInternalTab('chats');
      if (onSelectSubTab) onSelectSubTab('chats');
      if (setView) setView('home');
      return;
    }

    setInternalTab(tab);
    if (onSelectSubTab) {
      onSelectSubTab(tab);
    }
    if (setView) {
      setView(tab === 'chats' || tab === 'anny' ? 'home' : tab);
    }
    // When changing tabs, reset editor active state
    setIsProfessionalEditorActive(false);
  };

  const handleOpenChatWithPrompt = (promptText: string) => {
    setActivePromptHint(promptText);
    handleTabChange('chats');
  };

  const handleToggleMenu = () => {
    setIsMobileMenuOpen((prev) => !prev);
    if (onToggleMobileMenu) {
      onToggleMobileMenu();
    }
  };

  const renderActiveView = () => {
    if (currentTab === 'creative-studio' || currentTab === 'studios' || currentTab === 'king-ken-studios') {
      return (
        <KingKenStudiosView
          onToggleMobileMenu={handleToggleMenu}
          onOpenChatWithPrompt={handleOpenChatWithPrompt}
        />
      );
    }

    if (currentTab === 'projects' || currentTab === 'anny-projects') {
      return (
        <AnnyProjectsView
          userId={userId}
          onToggleMobileMenu={handleToggleMenu}
          onOpenChatWithProject={(promptStr) => handleOpenChatWithPrompt(promptStr)}
          onOpenProjectWorkspace={(loaded) => {
            setActiveLoadedProject(loaded);
            handleTabChange('chats');
          }}
        />
      );
    }

    if (currentTab === 'session-history' || currentTab === 'history' || currentTab === 'anny-history') {
      return (
        <AnnySessionHistoryView
          chatHistory={chatHistory}
          onToggleMobileMenu={handleToggleMenu}
          onSelectSession={(id) => {
             if(setCurrentChatId) setCurrentChatId(id);
             handleTabChange('chats');
          }}
          onDeleteSession={deleteChat}
          onNewChat={() => handleTabChange('new-chat')}
        />
      );
    }

    if (currentTab === 'ai-agents' || currentTab === 'agents' || currentTab === 'anny-agents') {
      return (
        <AnnyAgentsView
          userId={userId}
          onToggleMobileMenu={handleToggleMenu}
          onOpenAgent={(agentName) =>
            handleOpenChatWithPrompt(`Activate agent ${agentName} for this workspace.`)
          }
        />
      );
    }

    if (currentTab === 'knowledge' || currentTab === 'knowledge-base' || currentTab === 'anny-knowledge') {
      return <AnnyKnowledgeView onToggleMobileMenu={handleToggleMenu} />;
    }

    if (currentTab === 'memory' || currentTab === 'anny-memory') {
      return <AnnyMemoryView onToggleMobileMenu={handleToggleMenu} />;
    }

    if (currentTab === 'prompt-library' || currentTab === 'prompts' || currentTab === 'anny-prompts') {
      return <AnnyPromptsView onToggleMobileMenu={handleToggleMenu} onUsePrompt={handleOpenChatWithPrompt} />;
    }

    if (currentTab === 'models' || currentTab === 'anny-models') {
      return (
        <AnnyModelsView
          onToggleMobileMenu={handleToggleMenu}
          currentModel={selectedNeuralEngine}
          onSelectModel={(modelName) => {
            if (setSelectedNeuralEngine) setSelectedNeuralEngine(modelName);
            handleTabChange('chats');
          }}
        />
      );
    }

    if (currentTab === 'tools' || currentTab === 'anny-tools') {
      return (
        <AnnyToolsView
          onToggleMobileMenu={handleToggleMenu}
          onOpenTool={(toolName, hint) =>
            handleOpenChatWithPrompt(hint || `Launch ${toolName} tool.`)
          }
        />
      );
    }

    if (currentTab === 'engineering-safety' || currentTab === 'safety') {
      return <EngineeringSafetyView onToggleMobileMenu={handleToggleMenu} />;
    }

    if (currentTab === 'media-arch-studio' || currentTab === 'architecture' || currentTab === 'broadcast' || currentTab === 'distribution') {
      return (
        <AnnyMediaArchStudioView
          onToggleMobileMenu={handleToggleMenu}
          onOpenChatWithPrompt={handleOpenChatWithPrompt}
        />
      );
    }

    if (currentTab === 'watchdog' || currentTab === 'cybersecurity') {
      return <CybersecurityCommand onToggleMobileMenu={handleToggleMenu} />;
    }

    if (currentTab === 'integrations' || currentTab === 'anny-integrations') {
      return <AnnyIntegrationsView onToggleMobileMenu={handleToggleMenu} />;
    }

    if (currentTab === 'settings' || currentTab === 'anny-settings') {
      return <AnnySettingsView onToggleMobileMenu={handleToggleMenu} />;
    }

    // Default / Chats / New Chat -> Primary Anny Chat & Builder Workspace
    return (
      <AnnyWorkspace
        {...props}
        initialPrompt={activePromptHint || props.initialPrompt || undefined}
        onToggleMobileMenu={handleToggleMenu}
        onSelectSubTab={handleTabChange}
        onEditorStateChange={setIsProfessionalEditorActive}
        pendingDroppedFiles={pendingDroppedFiles}
        onConsumeDroppedFiles={() => setPendingDroppedFiles([])}
        activeLoadedProject={activeLoadedProject}
      />
    );
  };

  const normalizedViewKey = (() => {
    if (currentTab === 'creative-studio' || currentTab === 'studios' || currentTab === 'king-ken-studios') return 'creative-studio';
    if (currentTab === 'projects' || currentTab === 'anny-projects') return 'projects';
    if (currentTab === 'session-history' || currentTab === 'history' || currentTab === 'anny-history') return 'session-history';
    if (currentTab === 'ai-agents' || currentTab === 'agents' || currentTab === 'anny-agents') return 'ai-agents';
    if (currentTab === 'knowledge' || currentTab === 'knowledge-base' || currentTab === 'anny-knowledge') return 'knowledge';
    if (currentTab === 'memory' || currentTab === 'anny-memory') return 'memory';
    if (currentTab === 'prompt-library' || currentTab === 'prompts' || currentTab === 'anny-prompts') return 'prompt-library';
    if (currentTab === 'models' || currentTab === 'anny-models') return 'models';
    if (currentTab === 'tools' || currentTab === 'anny-tools') return 'tools';
    if (currentTab === 'engineering-safety' || currentTab === 'safety') return 'engineering-safety';
    if (currentTab === 'media-arch-studio' || currentTab === 'architecture' || currentTab === 'broadcast' || currentTab === 'distribution') return 'media-arch-studio';
    if (currentTab === 'watchdog' || currentTab === 'cybersecurity') return 'watchdog';
    if (currentTab === 'integrations' || currentTab === 'anny-integrations') return 'integrations';
    if (currentTab === 'settings' || currentTab === 'anny-settings') return 'settings';
    return 'chats';
  })();

  return (
    <AnnyMenuStateProvider isOpen={isMobileMenuOpen}>
      <div className="relative w-full h-full flex flex-col overflow-hidden">
        {isFileDragActive && (
          <div className="fixed inset-0 z-[1000] pointer-events-none flex items-center justify-center bg-cyan-400/10 backdrop-blur-[2px]">
            <div className="rounded-3xl border border-cyan-300/60 bg-slate-950/90 px-8 py-6 shadow-2xl text-center">
              <div className="text-lg font-semibold text-white">Drop files anywhere</div>
              <div className="mt-1 text-sm text-slate-300">ANNY will receive them and keep them attached to your current task.</div>
            </div>
          </div>
        )}
        {/* Active View Component with Smooth Transition */}
        <AnimatePresence mode="wait">
          <motion.div
            key={normalizedViewKey}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            className="flex-1 w-full h-full flex flex-col min-h-0 overflow-hidden"
          >
            {renderActiveView()}
          </motion.div>
        </AnimatePresence>

        {/* Global Slide-In Left Navigation Drawer */}
        <AnnySlideMenu
          isOpen={isMobileMenuOpen}
          onClose={() => setIsMobileMenuOpen(false)}
          currentTab={currentTab}
          onSelectTab={handleTabChange}
          userName={userName}
          userEmail={userEmail}
          disabled={isProfessionalEditorActive}
        />
      </div>
    </AnnyMenuStateProvider>
  );
};

