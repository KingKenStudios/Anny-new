import React from 'react';
import { AnnyApp } from '../AnnyApp';

export interface AnnyProps {
  user?: any;
  userRole?: string;
  isGuest?: boolean;
  setIsGuest?: (val: boolean) => void;
  chatHistory?: Array<{ id: string; title: string; date?: string; messages: any[] }>;
  currentChatId?: string | null;
  setCurrentChatId?: (id: string) => void;
  startNewChat?: () => void;
  deleteChat?: (id: string) => void;
  messages?: any[];
  onUpdateMessages?: (msgs: any[]) => void;
  view?: string;
  setView?: (v: any) => void;
  selectedNeuralEngine?: string;
  setSelectedNeuralEngine?: (engine: string) => void;
  isVisionActive?: boolean;
  setIsVisionActive?: (val: boolean) => void;
  isContinuousListening?: boolean;
  setIsContinuousListening?: (val: boolean) => void;
  isRobotMode?: boolean;
  setIsRobotMode?: (val: boolean) => void;
  isGuidanceActive?: boolean;
  setIsGuidanceActive?: (val: boolean) => void;
  isThinkingMode?: boolean;
  setIsThinkingMode?: (val: boolean) => void;
  isFlashMode?: boolean;
  setIsFlashMode?: (val: boolean) => void;
  voices?: SpeechSynthesisVoice[];
  selectedVoiceURI?: string;
  setSelectedVoiceURI?: (val: string) => void;
  isAutoSpeak?: boolean;
  setIsAutoSpeak?: (val: boolean) => void;
  isSupportOpen?: boolean;
  setIsSupportOpen?: (val: boolean) => void;
  handleLogout?: () => void;
  onAuthRequired?: () => void;
  onOpenAuth?: () => void;
  connectToAdminGlobal?: () => Promise<void>;
  initialPrompt?: string;
}

const VIEW_TO_SUBTAB_MAP: Record<string, string> = {
  settings: 'settings',
  '3d-generator': '3d-generator',
  '3d-studio': '3d-generator',
  agents: 'ai-agents',
  cybersecurity: 'watchdog',
  watchdog: 'watchdog',
  'media-arch-studio': 'media-arch-studio',
  studios: 'creative-studio',
  'creative-studio': 'creative-studio',
  models: 'models',
  dashboard: 'engineering-safety',
  database: 'projects',
  projects: 'projects',
  deployment: 'integrations',
  integrations: 'integrations',
  terminal: 'tools',
  tools: 'tools',
  code_editor: 'chats',
  workspace: 'chats',
  home: 'chats',
  main: 'chats',
};

export default function Anny(props: AnnyProps) {
  const userEmail = props.user?.email || 'admin@anny.ai';
  const userName = props.user?.displayName || 'ANNY Operative';
  const mappedSubTab = props.view ? (VIEW_TO_SUBTAB_MAP[props.view] || 'chats') : 'anny';

  return (
    <div className="w-full h-full bg-[#030511] text-white overflow-hidden flex flex-col">
      <AnnyApp
        user={props.user}
        userId={props.user?.uid}
        userEmail={userEmail}
        userName={userName}
        activeSubTab={mappedSubTab}
        chatHistory={props.chatHistory}
        setCurrentChatId={props.setCurrentChatId}
        currentChatId={props.currentChatId}
        startNewChat={props.startNewChat}
        deleteChat={props.deleteChat}
        messages={props.messages}
        onUpdateMessages={props.onUpdateMessages}
        selectedNeuralEngine={props.selectedNeuralEngine}
        setSelectedNeuralEngine={props.setSelectedNeuralEngine}
        isVisionActive={props.isVisionActive}
        setIsVisionActive={props.setIsVisionActive}
        isContinuousListening={props.isContinuousListening}
        setIsContinuousListening={props.setIsContinuousListening}
        isRobotMode={props.isRobotMode}
        setIsRobotMode={props.setIsRobotMode}
        isGuidanceActive={props.isGuidanceActive}
        setIsGuidanceActive={props.setIsGuidanceActive}
        voices={props.voices}
        selectedVoiceURI={props.selectedVoiceURI}
        setSelectedVoiceURI={props.setSelectedVoiceURI}
        isAutoSpeak={props.isAutoSpeak}
        setIsAutoSpeak={props.setIsAutoSpeak}
        connectToAdminGlobal={props.connectToAdminGlobal}
        initialPrompt={props.initialPrompt}
        handleLogout={props.handleLogout}
        onOpenAuth={props.onOpenAuth}
        setView={props.setView}
      />
    </div>
  );
}

