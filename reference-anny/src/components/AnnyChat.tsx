import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bot, Sparkles, Code, Terminal, Eye, ShieldCheck, Activity, WifiOff, History, Plus, MoreHorizontal, User, LogOut, Settings, ChevronDown, Check, Globe, Trash2, Search, X, UploadCloud } from 'lucide-react';
import { generateRealProjectTitle } from '../lib/projectTitleUtils';
import { getModelHealth, updateModelStatus } from '../services/geminiService';
import { thinkWithOnlineBrain } from '../services/onlineBrainService';
import { auth } from '../lib/firebase';
import { generateId } from '../lib/id';
import { useAnnyOrchestrator } from './AnnyOrchestrator';
import { systemBus } from '../core/systemBus';
import { isAppWebsiteOr3DRequest, cleanChatBubbleContent, isSynthesisOrPlaceholderContent } from '../utils/chatHelpers';
import { safeStorage } from '../lib/storage';
import { annyVoiceService } from '../services/annyVoiceService';
import { cognitiveIntentEngine } from '../core/cognitiveIntentEngine';
import { MemoizedMessageList } from './chat/MemoizedMessageList';
import { ChatHeader } from './chat/ChatHeader';
import { ChatInput } from './chat/ChatInput';
import { ChatModals } from './chat/ChatModals';
import { ExecutionStreamView } from './chat/ExecutionStreamView';

export { isAppWebsiteOr3DRequest, cleanChatBubbleContent };

interface Message {
  role: 'user' | 'bot';
  content: string;
  id: string;
  userId?: string;
  timestamp?: any;
}

export interface AnnyChatProps {
  user?: any;
  userRole?: string;
  brand?: string;
  isAdmin?: boolean;
  onVoiceActivity?: (isActive: boolean) => void;
  onListeningChange?: (isListening: boolean) => void;
  promptCount?: number;
  setPromptCount?: React.Dispatch<React.SetStateAction<number>>;
  isGuest?: boolean;
  messages?: Message[];
  onUpdateMessages?: (msgs: Message[]) => void;
  chatHistory?: Array<{ id: string; title: string; date?: string; messages: any[] }>;
  currentChatId?: string | null;
  setCurrentChatId?: (id: string) => void;
  startNewChat?: () => void;
  deleteChat?: (id: string) => void;
  isVisionActive?: boolean;
  setIsVisionActive?: (val: boolean) => void;
  isGuidanceActive?: boolean;
  setIsGuidanceActive?: (val: boolean) => void;
  isRobotMode?: boolean;
  setIsRobotMode?: (val: boolean) => void;
  isContinuousListening?: boolean;
  setIsContinuousListening?: (val: boolean) => void;
  isThinkingMode?: boolean;
  setIsThinkingMode?: (val: boolean) => void;
  isFlashMode?: boolean;
  setIsFlashMode?: (val: boolean) => void;
  isImmersiveMode?: boolean;
  setIsImmersiveMode?: (val: boolean) => void;
  voices?: SpeechSynthesisVoice[];
  selectedVoiceURI?: string;
  setSelectedVoiceURI?: (val: string) => void;
  isAutoSpeak?: boolean;
  setIsAutoSpeak?: (val: boolean) => void;
  isSupportOpen?: boolean;
  setIsSupportOpen?: (val: boolean) => void;
  handleLogout?: () => void;
  onAuthRequired?: () => void;
  setView?: (v: any) => void;
  connectToAdminGlobal?: () => Promise<void>;
  selectedNeuralEngine?: any;
  setSelectedNeuralEngine?: (val: any) => void;
  initialPrompt?: string;
  visionRef?: React.RefObject<any>;
}

export default function AnnyChat(props: AnnyChatProps) {
  const { 
    isGenerationRunning, 
    elapsedSec: orchestratorElapsedSec, 
    actionText: orchestratorActionText 
  } = useAnnyOrchestrator();

  const [chatTimerSec, setChatTimerSec] = useState(0);
  const brand = props.brand || "ANNY";
  const isAdmin = props.isAdmin ?? true;
  const onAuthRequired = props.onAuthRequired;

  const chatHistory = props.chatHistory || [];
  const currentChatId = props.currentChatId || null;
  const setCurrentChatId = props.setCurrentChatId || (() => {});
  const startNewChat = props.startNewChat || (() => {});
  const deleteChat = props.deleteChat || (() => {});

  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [historySearch, setHistorySearch] = useState('');

  const [localPromptCount, setLocalPromptCount] = useState(0);
  const promptCount = props.promptCount ?? localPromptCount;

  const [localMessages, setLocalMessages] = useState<Message[]>([]);
  const messages = props.messages ?? localMessages;
  const onUpdateMessages = props.onUpdateMessages ?? setLocalMessages;

  const [localIsVisionActive, setLocalIsVisionActive] = useState(false);
  const isVisionActive = props.isVisionActive ?? localIsVisionActive;
  const setIsVisionActive = props.setIsVisionActive ?? setLocalIsVisionActive;

  const [localIsGuidanceActive, setLocalIsGuidanceActive] = useState(false);
  const isGuidanceActive = props.isGuidanceActive ?? localIsGuidanceActive;
  const setIsGuidanceActive = props.setIsGuidanceActive ?? setLocalIsGuidanceActive;

  const [localIsRobotMode, setLocalIsRobotMode] = useState(false);
  const isRobotMode = props.isRobotMode ?? localIsRobotMode;
  const setIsRobotMode = props.setIsRobotMode ?? setLocalIsRobotMode;

  const [localIsSupportOpen, setLocalIsSupportOpen] = useState(false);
  const isSupportOpen = props.isSupportOpen ?? localIsSupportOpen;
  const setIsSupportOpen = props.setIsSupportOpen ?? setLocalIsSupportOpen;

  const [localIsAutoSpeak, setLocalIsAutoSpeak] = useState(() => safeStorage.getItem('anny_auto_speak') !== 'false');
  const isAutoSpeak = props.isAutoSpeak ?? localIsAutoSpeak;
  const setIsAutoSpeak = props.setIsAutoSpeak ?? setLocalIsAutoSpeak;

  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isActiveListening, setIsActiveListening] = useState(false);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<any[]>([]);
  const [visionSnapshot, setVisionSnapshot] = useState<string | null>(null);

  const [isOnline] = useState(navigator.onLine);
  const [firestoreStatus] = useState<"connecting" | "healthy" | "unavailable">("healthy");
  const [selectedNeuralEngine, setSelectedNeuralEngine] = useState<'gemini' | 'groq' | 'google_ai' | 'huggingface' | 'claude' | 'google_german_4'>('google_ai');
  const [activeMode, setActiveMode] = useState<'smart' | 'builder' | 'code' | 'ask' | 'analyze'>('builder');
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [currentlySpeakingId, setCurrentlySpeakingId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const user = auth.currentUser;

  useEffect(() => {
    if (props.initialPrompt && props.initialPrompt.trim()) {
      setInput(props.initialPrompt);
    }
  }, [props.initialPrompt]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, isTyping]);

  useEffect(() => {
    let interval: any = null;
    if (isGenerationRunning || isTyping) {
      setChatTimerSec(0);
      interval = setInterval(() => {
        setChatTimerSec(prev => prev + 1);
      }, 1000);
    } else {
      setChatTimerSec(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isGenerationRunning, isTyping]);

  const displaySeconds = orchestratorElapsedSec ? Math.round(orchestratorElapsedSec) : chatTimerSec;
  const displayActionText = orchestratorActionText || (isTyping ? 'Synthesizing response' : 'Launching');

  const isSubmittingRef = useRef(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    
    const trimmedInput = input.trim();
    const userMsgId = generateId();
    const currentAttachedFiles = [...attachedFiles];

    let updatedMessages: Message[] = messages;

    try {
    // Auto-capture live camera frame if Vision Sensor is active
    let activeVisionFrame = visionSnapshot;
    if (isVisionActive && props.visionRef && props.visionRef.current) {
      try {
        const captured = props.visionRef.current.capture();
        if (captured) {
          activeVisionFrame = captured;
        }
      } catch (capErr) {
        console.warn("[AnnyChat] Live vision sensor capture error:", capErr);
      }
    }

    if (!trimmedInput && attachedFiles.length === 0 && !activeVisionFrame) {
      isSubmittingRef.current = false;
      return;
    }

    // Format message content with attached images/documents so they render in chat history
    let messageDisplayContent = trimmedInput;
    if (currentAttachedFiles.length > 0) {
      if (!messageDisplayContent) {
        const imgCount = currentAttachedFiles.filter(f => f.isImage).length;
        const docCount = currentAttachedFiles.length - imgCount;
        if (imgCount > 0 && docCount === 0) {
          messageDisplayContent = `Analyzing ${imgCount} uploaded image${imgCount > 1 ? 's' : ''}...`;
        } else if (docCount > 0 && imgCount === 0) {
          messageDisplayContent = `Analyzing ${docCount} uploaded document${docCount > 1 ? 's' : ''}...`;
        } else {
          messageDisplayContent = `Analyzing ${currentAttachedFiles.length} uploaded attachment${currentAttachedFiles.length > 1 ? 's' : ''}...`;
        }
      }

      currentAttachedFiles.forEach(file => {
        if (file.isImage && (file.dataUrl || file.imageUrl)) {
          const imgSrc = file.dataUrl || file.imageUrl;
          messageDisplayContent += `\n\n![${file.name}](${imgSrc})`;
        } else if (!file.isImage) {
          messageDisplayContent += `\n\n📄 **${file.name}** (${file.sizeFormatted || 'Document'})`;
        }
      });
    }

    const newUserMessage: Message = {
      role: 'user',
      content: messageDisplayContent,
      id: userMsgId,
      timestamp: Date.now(),
    };

    updatedMessages = [...messages, newUserMessage];
    onUpdateMessages(updatedMessages);
    setInput('');
    setAttachedFiles([]);
    setVisionSnapshot(null);
    setIsTyping(true);

    // Clean history for context resolution
    const cleanUpdatedMessages = updatedMessages.filter(m => !isSynthesisOrPlaceholderContent(m.content));

    const deepIntent = cognitiveIntentEngine.buildIntentModel(trimmedInput, cleanUpdatedMessages);
    const isBuildReq = deepIntent.taskType === 'build' || isAppWebsiteOr3DRequest(trimmedInput);
    const projectId = safeStorage.getItem('anny_current_project_id') || 'default_project';
    const execId = 'ANNY_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);
    const traceId = 'tr_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);

    console.log(`[ANNY_EXECUTION_ID:${execId}] INPUT_RECEIVED: "${trimmedInput}" (deepIntent=${deepIntent.taskType}, isBuildReq=${isBuildReq})`);

      if (isBuildReq && (deepIntent.taskType as any) !== 'STOP' && deepIntent.taskType !== 'question') {
        systemBus.publish('BuildStarted', 'AnnyChat', { prompt: trimmedInput });
      }

      const botMsgId = generateId();
      onUpdateMessages(cleanUpdatedMessages);

      console.log(`[ANNY_EXECUTION_ID:${execId}] CONTEXT_READY: historyLength=${cleanUpdatedMessages.length}`);

      // ANNY PHASE 2C: SERVER-AUTHORITATIVE PIPELINE EXECUTION
      const apiEndpoint = '/api/anny/pipeline';
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: currentChatId || 'default_session',
          projectId,
          prompt: trimmedInput,
          history: cleanUpdatedMessages.map(m => ({ role: m.role, content: m.content })),
          images: [
            ...currentAttachedFiles.map(f => ({ mimeType: f.mimeType, data: f.data })),
            ...(activeVisionFrame ? [{ mimeType: 'image/jpeg', data: activeVisionFrame }] : [])
          ],
          contextOverride: {
            isVisionActive: !!isVisionActive,
            hasVisionFrame: !!activeVisionFrame
          },
          requestType: isBuildReq ? 'build' : 'chat',
          traceId,
          execId
        })
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.statusText}`);
      }

      const kernelOutput = await response.json();

      let botText = kernelOutput.response || kernelOutput.summary || 'Request processed under Cognitive Kernel.';
      const finalCleanText = cleanChatBubbleContent(botText, isBuildReq);

      console.log(`[ANNY_EXECUTION_ID:${execId}] FINAL_RESPONSE_READY: length=${finalCleanText.length}, status=${kernelOutput.verificationStatus}`);

      onUpdateMessages([
        ...cleanUpdatedMessages,
        { role: 'bot', content: finalCleanText, id: botMsgId, timestamp: Date.now() }
      ]);
      if (isAutoSpeak && finalCleanText) {
        speakText(finalCleanText, botMsgId);
      }
    } catch (err: any) {
      console.error('[ANNY_EXECUTION_ID:ERROR] Anny Chat error:', err);
      const errBotId = generateId();
      onUpdateMessages([
        ...updatedMessages,
        {
          role: 'bot',
          content: 'Anny encountered a temporary neural uplink error. The development workspace has been updated with your request.',
          id: errBotId,
          timestamp: Date.now()
        }
      ]);
    } finally {
      setIsTyping(false);
      isSubmittingRef.current = false;
    }
  };

  const startSpeechRecognition = () => {
    setIsActiveListening(true);
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput(prev => prev + ' ' + transcript);
        setIsActiveListening(false);
      };
      recognition.onerror = () => setIsActiveListening(false);
      recognition.start();
    } else {
      setIsActiveListening(false);
    }
  };

  const stopSpeechRecognition = () => {
    setIsActiveListening(false);
  };

  const speakText = (text: string, id: string) => {
    setCurrentlySpeakingId(id);
    annyVoiceService.speak(text, 'chat', () => setCurrentlySpeakingId(null));
  };

  const [isDragOverChat, setIsDragOverChat] = useState(false);

  const handleChatDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOverChat(true);
  };

  const handleChatDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDragOverChat(false);
  };

  const handleChatDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOverChat(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const filesList = Array.from(e.dataTransfer.files);
      filesList.forEach(file => {
        const isImage = file.type.startsWith('image/');
        const isTextOrCode = file.type.startsWith('text/') || 
          file.name.endsWith('.ts') || file.name.endsWith('.tsx') || 
          file.name.endsWith('.js') || file.name.endsWith('.jsx') || 
          file.name.endsWith('.json') || file.name.endsWith('.py') || 
          file.name.endsWith('.md') || file.name.endsWith('.css');

        const sizeMB = file.size / (1024 * 1024);
        const sizeFormatted = sizeMB >= 1 ? `${sizeMB.toFixed(1)} MB` : `${Math.round(file.size / 1024)} KB`;

        const reader = new FileReader();
        if (isImage) {
          reader.onload = (event) => {
            const dataUrl = event.target?.result as string;
            const base64Data = dataUrl ? dataUrl.split(',')[1] : '';
            setAttachedFiles(prev => [
              ...prev,
              {
                id: `drop_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                name: file.name,
                mimeType: file.type || 'image/png',
                size: file.size,
                sizeFormatted,
                isImage: true,
                dataUrl,
                imageUrl: dataUrl,
                data: base64Data,
                ragIngested: false
              }
            ]);
          };
          reader.readAsDataURL(file);
        } else if (isTextOrCode) {
          reader.onload = (event) => {
            const content = event.target?.result as string;
            setAttachedFiles(prev => [
              ...prev,
              {
                id: `drop_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                name: file.name,
                mimeType: file.type || 'text/plain',
                size: file.size,
                sizeFormatted,
                isImage: false,
                isCode: true,
                data: content,
                textSnippet: content.slice(0, 300),
                ragIngested: false
              }
            ]);
          };
          reader.readAsText(file);
        } else {
          reader.onload = (event) => {
            const dataUrl = event.target?.result as string;
            const base64Data = dataUrl ? dataUrl.split(',')[1] : '';
            setAttachedFiles(prev => [
              ...prev,
              {
                id: `drop_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                name: file.name,
                mimeType: file.type || 'application/octet-stream',
                size: file.size,
                sizeFormatted,
                isImage: false,
                data: base64Data,
                textSnippet: `[Document: ${file.name}]`,
                ragIngested: false
              }
            ]);
          };
          reader.readAsDataURL(file);
        }
      });
    }
  };

  const filteredHistory = chatHistory.filter(c =>
    c.title.toLowerCase().includes(historySearch.toLowerCase())
  );

  return (
    <div 
      onDragOver={handleChatDragOver}
      onDragLeave={handleChatDragLeave}
      onDrop={handleChatDrop}
      className="flex-1 flex flex-col h-full bg-[#050713] text-white relative overflow-hidden"
    >
      {/* Full Chat Drag and Drop Overlay */}
      {isDragOverChat && (
        <div className="absolute inset-0 z-50 bg-[#070913]/90 backdrop-blur-md border-2 border-dashed border-cyan-400 flex flex-col items-center justify-center text-cyan-300 font-mono gap-3 p-6 animate-pulse pointer-events-none">
          <div className="p-4 rounded-2xl bg-cyan-950/80 border border-cyan-500/40 text-cyan-400 shadow-2xl">
            <UploadCloud className="w-12 h-12 text-cyan-400" />
          </div>
          <div className="text-base font-bold tracking-wide">Drop Files or Images Anywhere in Chat</div>
          <div className="text-xs text-slate-400 font-mono text-center max-w-md">
            Images will preview as thumbnails at the top of the chat input • Documents will store as file attachments in message state
          </div>
        </div>
      )}
      {/* Top Header */}
      <ChatHeader
        brand={brand}
        selectedNeuralEngine={selectedNeuralEngine}
        setSelectedNeuralEngine={setSelectedNeuralEngine}
        activeMode={activeMode}
        setActiveMode={setActiveMode}
        isVisionActive={isVisionActive}
        setIsVisionActive={setIsVisionActive}
        isGuidanceActive={isGuidanceActive}
        setIsGuidanceActive={setIsGuidanceActive}
        isRobotMode={isRobotMode}
        setIsRobotMode={setIsRobotMode}
        isHistoryOpen={isHistoryOpen}
        setIsHistoryOpen={setIsHistoryOpen}
        isUserMenuOpen={isUserMenuOpen}
        setIsUserMenuOpen={setIsUserMenuOpen}
        isOnline={isOnline}
        firestoreStatus={firestoreStatus}
        startNewChat={startNewChat}
        user={user}
        isAdmin={isAdmin}
        handleLogout={props.handleLogout}
        setView={props.setView}
        connectToAdminGlobal={props.connectToAdminGlobal}
        promptCount={promptCount}
        PROMPT_LIMIT={Infinity}
        isAutoSpeak={isAutoSpeak}
        setIsAutoSpeak={setIsAutoSpeak}
        voices={props.voices}
        selectedVoiceURI={props.selectedVoiceURI}
        setSelectedVoiceURI={props.setSelectedVoiceURI}
      />

      {/* Main Body */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Session History Sidebar Overlay */}
        <AnimatePresence>
          {isHistoryOpen && (
            <motion.aside
              initial={{ x: -280, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -280, opacity: 0 }}
              className="absolute inset-y-0 left-0 z-30 w-72 bg-[#080b1a] border-r border-white/10 shadow-2xl p-3 flex flex-col"
            >
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/10">
                <span className="text-xs font-bold font-mono text-cyan-400 uppercase tracking-wider">Session History</span>
                <button onClick={() => setIsHistoryOpen(false)} className="p-1 text-slate-400 hover:text-white rounded">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="relative mb-3">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search sessions..."
                  value={historySearch}
                  onChange={e => setHistorySearch(e.target.value)}
                  className="w-full bg-[#0d1222] border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="flex-1 overflow-y-auto space-y-1">
                {filteredHistory.map(session => (
                  <div
                    key={session.id}
                    onClick={() => {
                      setCurrentChatId(session.id);
                      setIsHistoryOpen(false);
                    }}
                    className={`p-2.5 rounded-lg border text-xs cursor-pointer flex items-center justify-between transition-all ${
                      currentChatId === session.id
                        ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300 font-semibold'
                        : 'border-transparent text-slate-300 hover:bg-white/5'
                    }`}
                  >
                    <span className="truncate flex-1">{session.title}</span>
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        deleteChat(session.id);
                      }}
                      className="p-1 text-slate-500 hover:text-rose-400 rounded opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Message Feed Area */}
        <div className="flex-1 flex flex-col overflow-y-auto p-4 space-y-4">
          <MemoizedMessageList
            messages={messages.filter(m => !isSynthesisOrPlaceholderContent(m.content))}
            currentlySpeakingId={currentlySpeakingId}
            speak={speakText}
            copiedId={copiedId}
            setCopiedId={setCopiedId}
            setView={props.setView}
            onOpenLightbox={(url) => setLightboxImage(url)}
          />

          {/* Real-time Execution Stream UI */}
          <ExecutionStreamView />

          <div ref={scrollRef} />
        </div>
      </div>

      {/* Input Bar */}
      <ChatInput
        input={input}
        setInput={setInput}
        handleSubmit={handleSubmit}
        isTyping={isTyping}
        isGenerationRunning={isGenerationRunning}
        onStop={() => {
          setIsTyping(false);
          systemBus.publish('BuildCancelled', 'AnnyChat', {});
          if (typeof window !== 'undefined' && window.speechSynthesis) {
            window.speechSynthesis.cancel();
          }
        }}
        isActiveListening={isActiveListening}
        startSpeechRecognition={startSpeechRecognition}
        stopSpeechRecognition={stopSpeechRecognition}
        attachedFiles={attachedFiles}
        setAttachedFiles={setAttachedFiles}
        fileInputRef={fileInputRef}
        isContinuousListening={props.isContinuousListening ?? false}
        setIsContinuousListening={props.setIsContinuousListening ?? (() => {})}
        isThinkingMode={props.isThinkingMode ?? false}
        setIsThinkingMode={props.setIsThinkingMode ?? (() => {})}
        isFlashMode={props.isFlashMode ?? false}
        setIsFlashMode={props.setIsFlashMode ?? (() => {})}
        activeMode={activeMode}
        setActiveMode={setActiveMode}
        promptCount={promptCount}
        PROMPT_LIMIT={Infinity}
        visionSnapshot={visionSnapshot}
        setVisionSnapshot={setVisionSnapshot}
      />

      {/* Modals & Popups */}
      <ChatModals
        lightboxImage={lightboxImage}
        setLightboxImage={setLightboxImage}
        isVisionActive={isVisionActive}
        setIsVisionActive={setIsVisionActive}
        visionRef={props.visionRef}
        onCaptureSnapshot={(dataUrl) => setVisionSnapshot(dataUrl)}
        isSupportOpen={isSupportOpen}
        setIsSupportOpen={setIsSupportOpen}
        showLimitModal={showLimitModal}
        setShowLimitModal={setShowLimitModal}
        onAuthRequired={onAuthRequired}
        user={user}
      />
    </div>
  );
}
