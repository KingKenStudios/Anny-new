import React, { useState, useEffect } from 'react';
import { AnnyWorkspace } from './AnnyWorkspace';
import { AnnyProjectsView } from './views/AnnyProjectsView';
import { AnnySessionHistoryView } from './views/AnnySessionHistoryView';
import { AnnyAgentsView } from './views/AnnyAgentsView';
import { AnnyKnowledgeView } from './views/AnnyKnowledgeView';
import { AnnyMemoryView } from './views/AnnyMemoryView';
import { AnnyPromptsView } from './views/AnnyPromptsView';
import { AnnyModelsView } from './views/AnnyModelsView';
import { AnnyToolsView } from './views/AnnyToolsView';
import { AnnyIntegrationsView } from './views/AnnyIntegrationsView';
import { AnnySettingsView } from './views/AnnySettingsView';
import { AnnySlideMenu } from './AnnySlideMenu';
import { Phase14VerificationPanel } from './components/Phase14VerificationPanel';
import AnnyVisionDiagnostics from './components/validation/AnnyVisionDiagnostics';
import { AnnyLanguagesView } from './views/AnnyLanguagesView';
import { AnnyAiosControlView } from './views/AnnyAiosControlView';
import { AnnyCollectiveLearningView } from './views/AnnyCollectiveLearningView';
import { AnnyOrganizationsView } from './views/AnnyOrganizationsView';
import { AnnyPortableRuntimeView } from './views/AnnyPortableRuntimeView';
import { AnnyMasterIntelligenceAuditView } from './views/AnnyMasterIntelligenceAuditView';

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

  useEffect(() => {
    if (props.activeSubTab) {
      setInternalTab(props.activeSubTab);
    }
  }, [props.activeSubTab]);

  const currentTab = internalTab;

  const handleTabChange = (tab: string) => {
    if (tab === 'new-chat') {
      if (props.startNewChat) {
        props.startNewChat();
      }
      setInternalTab('chats');
      if (onSelectSubTab) onSelectSubTab('chats');
      return;
    }

    setInternalTab(tab);
    if (onSelectSubTab) {
      onSelectSubTab(tab);
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
    if (currentTab === 'projects' || currentTab === 'anny-projects') {
      return (
        <AnnyProjectsView
          userId={userId}
          onToggleMobileMenu={handleToggleMenu}
          onOpenChatWithProject={(projName) =>
            handleOpenChatWithPrompt(`Open project ${projName} and analyze architectural components.`)
          }
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

    if (currentTab === 'integrations' || currentTab === 'anny-integrations') {
      return <AnnyIntegrationsView onToggleMobileMenu={handleToggleMenu} />;
    }

    if (currentTab === 'capabilities' || currentTab === 'phase14' || currentTab === 'reality-verification') {
      return <Phase14VerificationPanel />;
    }

    if (currentTab === 'vision-diagnostics' || currentTab === 'vision_diagnostics') {
      return <AnnyVisionDiagnostics />;
    }

    if (currentTab === 'languages' || currentTab === 'anny-languages' || currentTab === 'universal-languages') {
      return (
        <AnnyLanguagesView
          onToggleMobileMenu={handleToggleMenu}
          onSelectLanguagePrompt={(prompt) => handleOpenChatWithPrompt(prompt)}
        />
      );
    }

    if (currentTab === 'aios-control' || currentTab === 'aios') {
      return <AnnyAiosControlView onToggleMobileMenu={handleToggleMenu} />;
    }

    if (currentTab === 'collective-learning' || currentTab === 'learning') {
      return <AnnyCollectiveLearningView onToggleMobileMenu={handleToggleMenu} />;
    }

    if (currentTab === 'organizations' || currentTab === 'orgs') {
      return <AnnyOrganizationsView onToggleMobileMenu={handleToggleMenu} />;
    }

    if (currentTab === 'portable-runtime' || currentTab === 'portable') {
      return <AnnyPortableRuntimeView onToggleMobileMenu={handleToggleMenu} />;
    }

    if (currentTab === 'master-audit' || currentTab === 'audit') {
      return <AnnyMasterIntelligenceAuditView onToggleMobileMenu={handleToggleMenu} />;
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
      />
    );
  };

  return (
    <div className="relative w-full h-full flex flex-col overflow-hidden">
      {/* Active View Component */}
      {renderActiveView()}

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
  );
};

