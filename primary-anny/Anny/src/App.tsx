import React, { useState, useEffect, useRef } from 'react';
import ThreeRobot from './components/ThreeRobot';
import AdminPanel from './components/AdminPanel';
import LivenessVerification from './components/LivenessVerification';
import HardwareSimulator from './components/HardwareSimulator';
import IndustrialDiagnostics from './components/IndustrialDiagnostics';
import NeuralLab from './components/NeuralLab';
import CybersecurityCommand from './components/CybersecurityCommand';
import Subscription from './components/Subscription';
import SuperAppStudio from './components/SuperAppStudio';
import Auth from './components/Auth';
import ErrorBoundary from './components/ErrorBoundary';
import Anny from './components/Anny';
import TerminalComponent from './components/Terminal';
import PlatformPages from './components/PlatformPages';
import { auth, db } from './lib/firebase';
import { User, updateProfile } from 'firebase/auth';
import { generateId } from './lib/id';
import { safeStorage } from './lib/storage';
import { safeFetchJson, fetchWithAuth, ensureGuestSessionToken, clearGuestSession } from './lib/apiUtils';
import SupportChat from './components/SupportChat';
import { onSnapshot, doc, setDoc, getDoc, serverTimestamp, collection, addDoc, query, where, orderBy, limit, Timestamp } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, Shield, Zap, Menu, Activity, History, Plus, MessageSquare, Trash2, LogOut, Bot, Volume2, ChevronDown, Download, Monitor, Terminal, Laptop, Smartphone, Tablet, Edit2, Save, X, LifeBuoy, Box, WifiOff, CheckSquare, Square, Search, Clock, Check } from 'lucide-react';
import { logAudit } from './lib/auditLogger';
import { StandalonePreviewRunner } from './components/StandalonePreviewRunner';
import { classifySessionTag, exportSessionAsJson, exportSessionAsTxt, getRelativeTimeFromSession, SessionTag } from './lib/sessionUtils';
import { WorkspaceManager } from './core/workspaceManager';
import { AnnyOrchestrator } from './components/AnnyOrchestrator';

export function AnnyMainApp() {
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [isGuest, setIsGuest] = useState(true);
  const [view, setView] = useState<string>('home');
  const [authLoading, setAuthLoading] = useState(false);
  const [brand, setBrand] = useState("Anny / Robot");
  const [teamName, setTeamName] = useState("Anny Group Architecture team");
  const [isHardwareMode, setIsHardwareMode] = useState(false);
  const [isPulsing, setIsPulsing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const connectToAdminGlobal = async () => {
    if (isGlobalSupportOpen) {
      setIsGlobalSupportOpen(false);
      return;
    }
    if (!user) {
      setView('auth');
      return;
    }
    
    // Notify admin
    try {
      const chatRef = doc(db, 'support_chats', user.uid);
      await setDoc(chatRef, {
        userId: user.uid,
        userEmail: user.email || null,
        userName: user.displayName || 'Neural Operator',
        userPhotoURL: user.photoURL || null,
        status: 'pending',
        type: 'support',
        lastMessageText: 'User initiated direct support request.',
        lastUpdate: serverTimestamp(),
        unreadCountAdmin: 1
      }, { merge: true });

      const msgsRef = collection(db, 'support_chats', user.uid, 'messages');
      await addDoc(msgsRef, {
        text: 'SYSTEM_ALERT: Digital intervention requested by operator.',
        senderId: 'system',
        senderType: 'system',
        timestamp: serverTimestamp()
      });

      setIsGlobalSupportOpen(true);
      setIsMenuOpen(false);
    } catch (error) {
      console.error("Support escalation failed:", error);
    }
  };
  const [userRole, setUserRole] = useState<'standard' | 'admin'>('standard');
  const [serverAdminVerified, setServerAdminVerified] = useState<boolean>(false);
  const [isVerifyingAdmin, setIsVerifyingAdmin] = useState<boolean>(false);
  const [adminLoginError, setAdminLoginError] = useState<string | null>(null);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [promptCount, setPromptCount] = useState(0);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isGlobalSupportOpen, setIsGlobalSupportOpen] = useState(false);
  const [chatHistory, setChatHistory] = useState<{ id: string; title: string; messages: any[] }[]>([]);
  const [currentChatId, setCurrentChatIdState] = useState<string | null>(null);
  const currentChatIdRef = useRef<string | null>(null);

  const setCurrentChatId = (id: string | null) => {
    currentChatIdRef.current = id;
    setCurrentChatIdState(id);
    const activeKey = user ? `anny_active_chat_id_${user.uid}` : 'anny_active_chat_id_guest';
    if (id) {
      safeStorage.setItem(activeKey, id);
      const sessionObj = chatHistory.find(c => c.id === id);
      const activeWsId = WorkspaceManager.getInstance().getActiveProjectId();
      if (!activeWsId || !activeWsId.startsWith('proj_')) {
        WorkspaceManager.getInstance().switchWorkspace(id, sessionObj?.title || 'Session Workspace');
      }
    } else {
      safeStorage.removeItem(activeKey);
    }
  };
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ displayName: '', photoURL: '' });
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // System Controls
  const [isVisionActive, setIsVisionActive] = useState(false);
  const [isGuidanceActive, setIsGuidanceActive] = useState(false);
  const [isRobotMode, setIsRobotMode] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleConnect = () => setIsOnline(true);
    const handleDisconnect = () => setIsOnline(false);
    window.addEventListener('online', handleConnect);
    window.addEventListener('offline', handleDisconnect);
    return () => {
      window.removeEventListener('online', handleConnect);
      window.removeEventListener('offline', handleDisconnect);
    };
  }, []);
  const [isThinkingMode, setIsThinkingMode] = useState(false);
  const [isFlashMode, setIsFlashMode] = useState(false);
  const [isContinuousListening, setIsContinuousListening] = useState(false);
  const [isImmersiveMode, setIsImmersiveMode] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState<string>("");
  const [selectedNeuralEngine, setSelectedNeuralEngine] = useState<any>(null);
  const [isAutoSpeak, setIsAutoSpeak] = useState<boolean>(() => {
    const saved = safeStorage.getItem('anny_auto_speak');
    return saved !== null ? saved === 'true' : true;
  });

  useEffect(() => {
    safeStorage.setItem('anny_auto_speak', isAutoSpeak.toString());
  }, [isAutoSpeak]);

  const [speechRate, setSpeechRate] = useState<number>(() => {
    const saved = safeStorage.getItem('anny_speech_rate');
    return saved ? parseFloat(saved) : 1.0;
  });
  const [speechPitch, setSpeechPitch] = useState<number>(() => {
    const saved = safeStorage.getItem('anny_speech_pitch');
    return saved ? parseFloat(saved) : 1.0;
  });
  const [sideMenuSearchTerm, setSideMenuSearchTerm] = useState('');
  const [isSideMenuSelectMode, setIsSideMenuSelectMode] = useState(false);
  const [selectedSideMenuSessionIds, setSelectedSideMenuSessionIds] = useState<string[]>([]);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState<string>('');

  const currentChat = chatHistory.find(c => c.id === currentChatId);
  const messages = currentChat?.messages || [];

  useEffect(() => {
    // Check for user-only mode in URL (from installer)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('mode') === 'user_only' || urlParams.get('mode') === 'user') {
      // In a real app we might use a global state or force a setting
      safeStorage.setItem('anny_user_only_mode', 'true');
    }
  }, []);

  const isUserOnlyMode = import.meta.env.VITE_USER_ONLY_MODE === 'true' || safeStorage.getItem('anny_user_only_mode') === 'true';
  const isAdmin = !isUserOnlyMode && serverAdminVerified && userRole === 'admin';

  const refreshAdminSession = React.useCallback(async (): Promise<boolean> => {
    if (isUserOnlyMode) {
      setServerAdminVerified(false);
      setUserRole('standard');
      return false;
    }
    try {
      const res = await fetchWithAuth('/api/admin/session');
      if (!res.ok) {
        setServerAdminVerified(false);
        setUserRole('standard');
        return false;
      }
      const data = await res.json();
      const verified = Boolean(data?.authenticated && data?.isAdmin);
      setServerAdminVerified(verified);
      setUserRole(verified ? 'admin' : 'standard');
      return verified;
    } catch {
      setServerAdminVerified(false);
      setUserRole('standard');
      return false;
    }
  }, [isUserOnlyMode]);

  useEffect(() => {
    safeStorage.removeItem('admin_verified');
    refreshAdminSession();
  }, [user?.uid, refreshAdminSession]);

  useEffect(() => {
    if (user) {
      logAudit({
        action: 'USER_LOGIN',
        severity: 'info',
        category: 'auth',
        details: `User ${user.email} authenticated via Neural Link`
      }).catch(err => console.debug('Login audit failed:', err));
    }
  }, [user?.uid]);

  // Real-time Firestore synchronization for user messages
  useEffect(() => {
    if (!user?.uid) return;

    const q = query(
      collection(db, "messages"),
      where("userId", "==", user.uid)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (!snapshot || snapshot.empty) return;

        const liveMsgs = snapshot.docs
          .map((docSnap) => {
            const raw = docSnap.data();
            return {
              id: docSnap.id,
              role: raw.role,
              content: raw.content,
              userId: raw.userId,
              sessionId: raw.sessionId || 'default-session',
              timestamp: raw.timestamp,
              ...(raw.projectBuild ? { projectBuild: raw.projectBuild } : {}),
              ...(raw.generatedImages ? { generatedImages: raw.generatedImages } : {}),
              ...(raw.generatedVideo ? { generatedVideo: raw.generatedVideo } : {}),
              ...(raw.generatedAudio ? { generatedAudio: raw.generatedAudio } : {}),
              ...(raw.attachedFiles ? { attachedFiles: raw.attachedFiles } : {}),
              ...(raw.sources ? { sources: raw.sources } : {}),
            };
          })
          .filter(
            (m) =>
              !m.id?.toString().startsWith('init-') &&
              !m.content?.includes('Reviewing tech headlines') &&
              !m.content?.includes('add an attachment to the meeting') &&
              !m.content?.includes('Meeting scheduled. Anything else?')
          )
          .sort((a, b) => {
            const getMillis = (ts: any) => {
              if (!ts) return 0;
              if (typeof ts.toMillis === 'function') return ts.toMillis();
              if (ts.seconds) return ts.seconds * 1000;
              if (typeof ts === 'string' || typeof ts === 'number') return new Date(ts).getTime();
              return 0;
            };
            return getMillis(a.timestamp) - getMillis(b.timestamp);
          });

        if (liveMsgs.length > 0) {
          // Group live messages by sessionId to prevent cross-session contamination
          const msgsBySession: Record<string, any[]> = {};
          liveMsgs.forEach((msg) => {
            const sId = msg.sessionId || 'default-session';
            if (!msgsBySession[sId]) msgsBySession[sId] = [];
            msgsBySession[sId].push(msg);
          });

          setChatHistory((prevHistory) => {
            let updated = [...prevHistory];
            let changed = false;

            Object.entries(msgsBySession).forEach(([sId, sMsgs]) => {
              const existingIndex = updated.findIndex((c) => c.id === sId);
              if (existingIndex >= 0) {
                const currentMsgs = updated[existingIndex].messages || [];
                // Merge rich local metadata (especially projectBuild, generatedImages, etc.) onto incoming Firestore messages
                const mergedMsgs = sMsgs.map((remoteMsg) => {
                  const localMatch = currentMsgs.find(
                    (cm: any) =>
                      cm &&
                      (cm.id === remoteMsg.id ||
                        (cm.role === remoteMsg.role && cm.content === remoteMsg.content)),
                  );
                  if (!localMatch) return remoteMsg;
                  return {
                    ...localMatch,
                    ...remoteMsg,
                    projectBuild: remoteMsg.projectBuild || localMatch.projectBuild,
                    generatedImages: remoteMsg.generatedImages || localMatch.generatedImages,
                    generatedVideo: remoteMsg.generatedVideo || localMatch.generatedVideo,
                    generatedAudio: remoteMsg.generatedAudio || localMatch.generatedAudio,
                    attachedFiles: remoteMsg.attachedFiles || localMatch.attachedFiles,
                    sources: remoteMsg.sources || localMatch.sources,
                  };
                });

                // Keep any local messages with projectBuild that have not yet round-tripped through Firestore
                for (const localMsg of currentMsgs) {
                  if (
                    localMsg?.projectBuild &&
                    !mergedMsgs.some(
                      (m: any) =>
                        m.id === localMsg.id ||
                        m.projectBuild?.projectId === localMsg.projectBuild?.projectId,
                    )
                  ) {
                    mergedMsgs.push(localMsg);
                  }
                }

                if (
                  mergedMsgs.length !== currentMsgs.length ||
                  mergedMsgs.some(
                    (m, idx) =>
                      !currentMsgs[idx] ||
                      currentMsgs[idx].id !== m.id ||
                      Boolean(currentMsgs[idx].projectBuild) !== Boolean(m.projectBuild),
                  )
                ) {
                  updated[existingIndex] = {
                    ...updated[existingIndex],
                    messages: mergedMsgs,
                  };
                  changed = true;
                }
              } else {
                // If it's a historical session in Firestore not yet in local history
                const firstUserMsg = sMsgs.find((m: any) => m.role === 'user');
                const title = firstUserMsg?.content
                  ? (firstUserMsg.content.slice(0, 30) + "...")
                  : "Neural Session " + new Date().toLocaleDateString();
                updated.push({
                  id: sId,
                  title: title,
                  messages: sMsgs,
                });
                changed = true;
              }
            });

            if (changed) {
              const storageKey = user ? `anny_chat_history_${user.uid}` : 'anny_chat_history_guest';
              safeStorage.setItem(storageKey, JSON.stringify(updated));
            }
            return updated;
          });
        }
      },
      (error) => {
        console.warn("Real-time Firestore sync warning:", error);
      }
    );

    return () => unsubscribe();
  }, [user?.uid]);

  useEffect(() => {
    if (user === undefined) return; // Wait for auth to initialize

    const storageKey = user ? `anny_chat_history_${user.uid}` : 'anny_chat_history_guest';
    const history = safeStorage.getItem(storageKey);
    let parsedChats: any[] = [];
    
    if (history) {
      try {
        const parsed = JSON.parse(history);
        // Deduplicate and sanitize IDs, filtering out legacy mockup messages
        const sanitized = parsed.map((chat: any) => ({
          ...chat,
          id: chat.id || generateId(),
          messages: (chat.messages || [])
            .filter((msg: any) => 
              !msg.id?.toString().startsWith('init-') && 
              !msg.content?.includes('Reviewing tech headlines') &&
              !msg.content?.includes('add an attachment to the meeting') &&
              !msg.content?.includes('Meeting scheduled. Anything else?')
            )
            .map((msg: any, idx: number) => ({
              ...msg,
              id: msg.id || `repaired-${generateId()}-${idx}`
            }))
        }));

        parsedChats = sanitized.filter((chat: any, index: number, self: any[]) => 
          chat.messages && chat.messages.length > 0 &&
          index === self.findIndex((t) => t.id === chat.id)
        );
      } catch (e) {
        console.error("Failed to parse chat history");
      }
    }

    // Always create a fresh new session as the landing page on login / guest entry
    const newSessionId = generateId();
    const newSession = {
      id: newSessionId,
      title: "New Session",
      messages: []
    };

    const combinedChats = [newSession, ...parsedChats.filter((c: any) => c.id !== newSessionId)];
    setChatHistory(combinedChats);
    setCurrentChatId(newSessionId);
    
    // Only persist non-empty sessions on initialization
    const nonAlteredChats = parsedChats.filter((c: any) => c.messages && c.messages.length > 0);
    safeStorage.setItem(storageKey, JSON.stringify(nonAlteredChats));
  }, [user?.uid]);

  const saveChatHistory = (history: any[]) => {
    const storageKey = user ? `anny_chat_history_${user.uid}` : 'anny_chat_history_guest';
    // Deduplicate before saving
    const distinct = history.filter((chat, index, self) => 
      chat.id && index === self.findIndex((t) => t.id === chat.id)
    );
    // Filter out chats with no conversation (messages is empty) from localStorage, but keep them in React state so they remain visible while active
    const persistentChats = distinct.filter((chat: any) => chat.messages && chat.messages.length > 0);
    safeStorage.setItem(storageKey, JSON.stringify(persistentChats));
    setChatHistory(distinct);
  };

  const startNewChat = async () => {
    const newId = generateId();
    const newTitle = "New Session " + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const newChat = {
      id: newId,
      title: newTitle,
      messages: []
    };
    
    // Switch workspace in memory without eagerly posting to server database yet
    WorkspaceManager.getInstance().switchWorkspace(newId, newTitle);
    
    // Filter out other empty sessions from in-memory state to prevent clutter
    const nonAlteredChats = chatHistory.filter((c: any) => c.messages && c.messages.length > 0);
    const updatedHistory = [newChat, ...nonAlteredChats];
    saveChatHistory(updatedHistory);
    setCurrentChatId(newId);
    setIsMenuOpen(false);
  };

  const deleteChat = async (id: string) => {
    await safeFetchJson(`/api/anny/sessions/${id}`, { method: "DELETE" });
    const updatedHistory = chatHistory.filter(c => c.id !== id);
    saveChatHistory(updatedHistory);
    if (currentChatId === id) {
      setCurrentChatId(updatedHistory[0]?.id || null);
    }
  };

  const renameChat = (id: string, newTitle: string) => {
    if (!newTitle.trim()) return;
    const updatedHistory = chatHistory.map(c => 
      c.id === id ? { ...c, title: newTitle.trim() } : c
    );
    saveChatHistory(updatedHistory);
  };

  const handleUpdateMessages = React.useCallback((newMessages: any) => {
    let activeId = currentChatIdRef.current;
    const storageKey = user ? `anny_chat_history_${user.uid}` : 'anny_chat_history_guest';
    
    // If we don't have an active chat ID, assign one immediately
    if (!activeId) {
      activeId = generateId();
      currentChatIdRef.current = activeId;
      setCurrentChatIdState(activeId);
    }

    setChatHistory(prevHistory => {
      const exists = prevHistory.some(chat => chat.id === activeId);
      const activeChat = prevHistory.find(chat => chat.id === activeId);
      const currentMsgs = activeChat?.messages || [];

      const resolvedMessages = typeof newMessages === 'function'
        ? newMessages(currentMsgs)
        : (Array.isArray(newMessages) ? newMessages : []);

      const firstUserMsg = resolvedMessages.find((m: any) => m && m.role === 'user');
      const defaultTitle = firstUserMsg?.content 
        ? (firstUserMsg.content.slice(0, 30) + "...") 
        : "New Session";

      // Lazily create the conversation in the database only when the first message is sent
      const isFirstMessage = (!activeChat || !activeChat.messages || activeChat.messages.length === 0) && resolvedMessages.length > 0;
      if (isFirstMessage) {
        safeFetchJson("/api/anny/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: activeId, title: defaultTitle })
        });
      }

      let next: typeof prevHistory;
      if (!exists) {
        const newChat = {
          id: activeId!,
          title: defaultTitle,
          messages: resolvedMessages
        };
        next = [newChat, ...prevHistory];
      } else {
        next = prevHistory.map(chat => {
          if (chat.id === activeId) {
            const newTitle = (chat.title === "Quick Chat" || chat.title.startsWith("New Session")) && firstUserMsg 
              ? (firstUserMsg.content.slice(0, 30) + "...") 
              : chat.title;
            return { ...chat, messages: resolvedMessages, title: newTitle };
          }
          return chat;
        });
      }

      // Verification deduplication
      const distinct = next.filter((chat, index, self) => 
        chat.id && index === self.findIndex((t) => t.id === chat.id)
      );

      // Only save non-empty sessions to local storage
      const persistentChats = distinct.filter((chat: any) => chat.messages && chat.messages.length > 0);
      safeStorage.setItem(storageKey, JSON.stringify(persistentChats));
      return distinct;
    });
  }, [user]);

  useEffect(() => {
    const handleGuest = () => {
      setIsGuest(true);
      setView('home');
    };
    window.addEventListener('anny_guest_entry', handleGuest);

    const handleAdminTrigger = async () => {
      if (isUserOnlyMode) return;
      const verified = await refreshAdminSession();
      if (verified) {
        setView('admin_dashboard');
      } else {
        setAdminLoginError(null);
        setView('admin_login');
      }
    };
    window.addEventListener('anny_admin_trigger', handleAdminTrigger);

    return () => {
      window.removeEventListener('anny_guest_entry', handleGuest);
      window.removeEventListener('anny_admin_trigger', handleAdminTrigger);
    };
  }, [isUserOnlyMode, refreshAdminSession]);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((u) => {
      console.log('Auth state changed:', u ? u.email : 'null');
      setUser(u);
      setAuthLoading(false);

      if (u) {
        clearGuestSession();
        setIsGuest(false);
      } else {
        setServerAdminVerified(false);
        setUserRole('standard');
        setIsGuest(true);
        void ensureGuestSessionToken(false);
      }
    }, (error) => {
      console.error('Auth state error:', error);
      setAuthLoading(false);
    });

    // Safety timeout for loading screen
    const loadingTimeout = setTimeout(() => {
      setAuthLoading(false);
    }, 5000);

    return () => {
      unsubscribe();
      clearTimeout(loadingTimeout);
    };
  }, []);

  // Protect admin_dashboard view strictly with serverAdminVerified
  useEffect(() => {
    if ((view === 'admin_dashboard' || view === 'admin_liveness') && !serverAdminVerified) {
      setView('admin_login');
    }
    if (user && (view === 'auth' || !view)) {
      if (isAdmin && serverAdminVerified) {
        setView('admin_dashboard');
      } else {
        setView('home');
      }
    }
  }, [user, isAdmin, serverAdminVerified, view]);

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'config', 'global'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.brandName) setBrand(data.brandName);
        if (data.teamName) setTeamName(data.teamName);
        setMaintenanceMode(data.maintenanceMode || false);
      }
    }, (error) => {
      console.warn('App config fetch error ignored:', error);
    });

    safeStorage.removeItem('admin_verified');

    const storedPrompts = safeStorage.getItem('anny_prompts');
    if (storedPrompts) setPromptCount(parseInt(storedPrompts));

    // Voice Initialization
    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      if (availableVoices.length > 0) {
        const uniqueVoices = Array.from(new Map(availableVoices.map(v => [v.voiceURI, v])).values());
        setVoices(uniqueVoices);
        
        const englishVoice = uniqueVoices.find(v => v.name.includes('Google') && v.lang.startsWith('en')) 
          || uniqueVoices.find(v => v.lang.startsWith('en'));
        
        const defaultV = englishVoice || uniqueVoices[0];
        const voicePref = safeStorage.getItem('anny_voice_uri');
        if (voicePref) {
          setSelectedVoiceURI(voicePref);
        } else if (defaultV) {
          setSelectedVoiceURI(defaultV.voiceURI);
          safeStorage.setItem('anny_voice_uri', defaultV.voiceURI);
        }
      }
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    const voiceInterval = setInterval(() => {
      if (window.speechSynthesis.getVoices().length > 0) {
        loadVoices();
        clearInterval(voiceInterval);
      }
    }, 500);

    return () => {
      unsubscribe();
      clearInterval(voiceInterval);
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  const handleAdminLoginSubmit = async () => {
    if (isUserOnlyMode) {
      setAdminLoginError('Administrator console is disabled in user-only mode.');
      return;
    }
    setAdminLoginError(null);
    setIsVerifyingAdmin(true);
    try {
      const res = await fetchWithAuth('/api/admin/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: loginForm.username.trim(),
          password: loginForm.password
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.authenticated || !data?.isAdmin) {
        setServerAdminVerified(false);
        setUserRole('standard');
        setAdminLoginError(data?.error === 'ADMIN_VERIFICATION_FAILED' ? 'Invalid administrator credentials.' : (data?.error || 'Server administrator verification failed.'));
        return;
      }

      setLoginForm({ username: '', password: '' });
      setServerAdminVerified(true);
      setUserRole('admin');
      setView('admin_dashboard');

      await logAudit({
        action: 'ADMIN_AUTHENTICATED',
        severity: 'info',
        category: 'auth',
        details: `Server-verified admin session established for ${data.uid || user?.email || 'operator'}`
      }).catch(() => {});
    } catch (err: any) {
      setServerAdminVerified(false);
      setUserRole('standard');
      setAdminLoginError(err?.message || 'Unable to verify administrator credentials.');
    } finally {
      setIsVerifyingAdmin(false);
    }
  };

  const handleAdminSuccess = async () => {
    const verified = await refreshAdminSession();
    if (!verified) {
      console.warn('Admin access denied: server session is not verified.');
      setView('admin_login');
      return;
    }
    setView('admin_dashboard');
    try {
      if (user) {
        await logAudit({
          action: 'ADMIN_AUTHENTICATED',
          severity: 'info',
          category: 'auth',
          details: `Verified admin ${user.email || user.uid} entered sovereign control`
        });
      }
    } catch (e) {
      console.warn('Admin authentication audit failed:', e);
    }
  };

  const handleLogout = async () => {
    try {
      safeStorage.removeItem('admin_verified');
      clearGuestSession();
      await fetchWithAuth('/api/admin/logout', { method: 'POST' }).catch(() => {});
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' }).catch(() => {});
      setServerAdminVerified(false);
      setUserRole('standard');
      setIsGuest(false);
      setChatHistory([]);
      setCurrentChatId(null);
      await auth.signOut();
      setUser(null);
      setView('auth');
    } catch (error) {
      console.error("Sign out error:", error);
      setServerAdminVerified(false);
      setUserRole('standard');
      setUser(null);
      setView('auth');
    }
  };

  const resetUsage = () => {
    safeStorage.removeItem('anny_prompts');
    setPromptCount(0);
    console.log("Usage metrics cleared");
  };

  const resetSystem = () => {
    safeStorage.clear();
    setPromptCount(0);
    setUserRole('standard');
    setView('home');
    window.location.reload();
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setIsSavingProfile(true);
    try {
      await updateProfile(user, {
        displayName: profileForm.displayName,
        photoURL: profileForm.photoURL
      });
      
      await setDoc(doc(db, 'users', user.uid), {
        displayName: profileForm.displayName,
        photoURL: profileForm.photoURL,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      logAudit({
        action: 'UPDATE_PROFILE',
        severity: 'info',
        category: 'settings',
        details: `User ${user.email} updated neural profile identity`
      });
      
      setIsEditingProfile(false);
    } catch (error) {
      console.error("Profile update failed:", error);
    } finally {
      setIsSavingProfile(false);
    }
  };

  if (authLoading) {
    return (
      <div className="h-screen bg-black flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-6 w-full max-w-xs text-center">
          <div className="w-12 h-12 md:w-16 md:h-16 border-4 border-cyan-500/10 border-t-cyan-500 rounded-full animate-spin" />
          <div className="flex flex-col items-center gap-2">
            <p className="text-[9px] md:text-[10px] text-cyan-500 font-mono uppercase tracking-[0.4em] animate-pulse">Initializing Neural Link...</p>
            <p className="text-[7px] md:text-[8px] text-white/20 font-mono uppercase tracking-widest leading-relaxed">Establishing encrypted connection to sovereign core</p>
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2.5 bg-white/5 border border-white/10 text-[9px] md:text-[10px] font-mono text-white/40 uppercase tracking-widest hover:text-cyan-400 transition-all rounded-lg active:scale-95"
          >
            Manual Override: Force Reload
          </button>
        </div>
      </div>
    );
  }

  if (maintenanceMode && !isAdmin) {
    return (
      <div className="h-screen bg-black flex flex-col items-center justify-center p-12 text-center overflow-hidden">
         <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}>
            <Zap className="w-16 h-16 text-yellow-500 mb-6 mx-auto animate-pulse" />
            <h1 className="text-4xl font-black italic tracking-tighter mb-4">Neural Maintenance Active</h1>
            <p className="text-white/40 font-mono text-xs uppercase tracking-widest leading-loose max-w-sm mx-auto">
               The {teamName} is performing core neural link optimization. Global brain access is temporarily suspended.
            </p>
         </motion.div>
      </div>
    );
  }

  return (
    <ErrorBoundary fallback={
      <div className="h-screen bg-black flex items-center justify-center text-cyan-500 font-mono p-10 text-center">
        NEURAL LINK CRASH: SYSTEM FAILURE DETECTED. PLEASE REFRESH THE COGNITIVE LINK.
      </div>
    }>
      <AnnyOrchestrator>
        <div className="h-screen bg-[#050505] text-white flex flex-col selection:bg-cyan-500/30 overflow-hidden">
        {/* Offline Status Neural Shield */}
        <AnimatePresence>
          {!isOnline && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-red-500 text-white text-[10px] md:text-xs font-mono uppercase tracking-[0.2em] py-2 px-4 flex items-center justify-center gap-3 z-[100] relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-white/20 animate-pulse" />
              <WifiOff className="w-4 h-4 animate-bounce relative z-10" />
              <span className="relative z-10">Neural Link Severed • Local Relay Mode Active • Persistence Protocol Engaged</span>
            </motion.div>
          )}
        </AnimatePresence>
        {/* Side Menu Overlay */}
        <AnimatePresence>
          {isMenuOpen && (
            <>
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsMenuOpen(false)}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
              />
              <motion.div 
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="fixed top-0 right-0 h-full w-full max-w-xs md:max-w-sm bg-[#0a0a0a] border-l border-white/10 z-[70] shadow-2xl flex flex-col pt-8"
              >
                <div className="flex items-center justify-between mb-8 px-8">
                   <h2 className="text-xl font-bold tracking-tighter italic text-cyan-400">CORE_SETTINGS</h2>
                   <button onClick={() => setIsMenuOpen(false)} className="text-white/20 hover:text-white uppercase font-mono text-[10px] tracking-widest">Close</button>
                </div>

                <div className="flex-1 space-y-8 overflow-y-auto scrollbar-hide px-8 pb-10">
                   {/* Profile Section - NOW AT TOP */}
                   <div className="p-5 md:p-6 rounded-2xl bg-white/5 border border-white/10 shadow-inner">
                      {isEditingProfile ? (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <p className="text-[10px] text-cyan-400 font-mono uppercase tracking-widest">Update Identity</p>
                            <button onClick={() => setIsEditingProfile(false)} className="text-white/20 hover:text-white p-2"><X className="w-5 h-5" /></button>
                          </div>
                          <div className="space-y-3">
                            <div className="space-y-1">
                              <label className="text-[8px] text-white/40 uppercase font-mono ml-1">Bios_Name</label>
                              <input 
                                type="text" 
                                value={profileForm.displayName}
                                onChange={(e) => setProfileForm(prev => ({ ...prev, displayName: e.target.value }))}
                                placeholder="Display Name"
                                className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-sm text-white outline-none focus:border-cyan-500/50 transition-all"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[8px] text-white/40 uppercase font-mono ml-1">Avatar_URL</label>
                              <input 
                                type="text" 
                                value={profileForm.photoURL}
                                onChange={(e) => setProfileForm(prev => ({ ...prev, photoURL: e.target.value }))}
                                placeholder="Photo URL"
                                className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-sm text-white outline-none focus:border-cyan-500/50 transition-all"
                              />
                            </div>
                            <button 
                              onClick={() => handleSaveProfile().catch(err => console.error("Profile update failed", err))}
                              disabled={isSavingProfile}
                              className="w-full py-3 bg-cyan-500 text-black font-black text-[10px] uppercase tracking-widest rounded-lg flex items-center justify-center gap-2 hover:bg-cyan-400 disabled:opacity-50 transition-all mt-2"
                            >
                              {isSavingProfile ? <div className="w-3 h-3 border-2 border-black/20 border-t-black rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                              Synchronize Neural ID
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-4 mb-6">
                            <div className="relative shrink-0">
                               <div className="w-14 h-14 rounded-full bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center overflow-hidden">
                                  {user ? (
                                    <img 
                                      src={user.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.uid}`} 
                                      className="w-14 h-14 object-cover" 
                                      alt="profile" 
                                    />
                                  ) : (
                                    <div className="w-6 h-6 rounded-full bg-white/10" />
                                  )}
                               </div>
                               <div className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-[#0a0a0a] ${user ? 'bg-green-500' : 'bg-white/10'}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                               <div className="flex items-center justify-between gap-1">
                                  <p className="text-sm font-bold truncate">{user?.displayName || (isGuest ? 'Guest Operator' : 'Unit Offline')}</p>
                                  <div className="flex items-center gap-1">
                                    {user && (
                                      <button 
                                        onClick={() => {
                                          setProfileForm({ 
                                            displayName: user.displayName || '', 
                                            photoURL: user.photoURL || '' 
                                          });
                                          setIsEditingProfile(true);
                                        }}
                                        className="p-2.5 hover:bg-cyan-500/10 rounded-lg text-cyan-400/60 hover:text-cyan-400 transition-all active:scale-90"
                                        title="Edit Profile"
                                      >
                                        <Edit2 className="w-4 h-4" />
                                      </button>
                                    )}
                                    {user && (
                                      <button 
                                        onClick={async () => {
                                          try {
                                            safeStorage.removeItem('admin_verified');
                                            await fetchWithAuth('/api/admin/logout', { method: 'POST' }).catch(() => {});
                                            setServerAdminVerified(false);
                                            setUserRole('standard');
                                            setChatHistory([]);
                                            setCurrentChatId(null);
                                            await auth.signOut();
                                            setIsMenuOpen(false);
                                            setView('auth');
                                          } catch (e) {
                                            console.error("Sign out process failed:", e);
                                            setView('auth');
                                          }
                                        }}
                                        className="p-2.5 hover:bg-red-500/10 rounded-lg text-red-400/60 hover:text-red-400 transition-all active:scale-90"
                                        title="Terminate Session"
                                      >
                                        <LogOut className="w-4 h-4" />
                                      </button>
                                    )}
                                  </div>
                               </div>
                               <p className="text-[9px] text-white/30 font-mono italic tracking-tight uppercase">{userRole}_ACCESS</p>
                            </div>
                          </div>
                          
                          {!user && (
                            <div className="space-y-3">
                               <p className="text-[10px] text-white/20 uppercase font-mono tracking-widest px-2">Access_Node</p>
                               <button 
                                 onClick={() => { setIsMenuOpen(false); setView('auth'); }}
                                 className="w-full p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center gap-4 hover:bg-cyan-500/20 transition-all text-left text-cyan-400 group active:scale-[0.98]"
                               >
                                  <ShieldCheck className="w-5 h-5" />
                                  <span className="text-[10px] font-mono uppercase tracking-widest">Neural Override Login</span>
                                </button>
                            </div>
                          )}
                        </>
                      )}
                   </div>

                   {/* Voice Selection - CRITICAL REINSTATEMENT AS ASKED */}
                   <div className="p-5 rounded-2xl bg-cyan-500/5 border border-cyan-500/20 space-y-4">
                      <div className="flex items-center justify-between">
                         <div className="flex items-center gap-2">
                           <Volume2 className="w-4 h-4 text-cyan-400" />
                           <p className="text-[10px] text-cyan-400/80 uppercase font-mono tracking-widest font-bold">Neural_Voice_Core</p>
                         </div>
                         <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                      </div>
                      <div className="relative group">
                        <select 
                          value={selectedVoiceURI}
                          onChange={(e) => {
                            setSelectedVoiceURI(e.target.value);
                            safeStorage.setItem('anny_voice_uri', e.target.value);
                          }}
                          className="w-full bg-[#050505] border border-white/10 rounded-xl p-4 text-[11px] font-mono text-cyan-400 outline-none focus:border-cyan-500/50 appearance-none cursor-pointer hover:border-white/20 transition-all pr-12 shadow-2xl"
                        >
                          {voices.length === 0 ? (
                            <option disabled>Initializing Neural Phonemes...</option>
                          ) : (
                            voices.map(voice => (
                              <option key={voice.voiceURI} value={voice.voiceURI} className="bg-[#0a0a0a] py-2">
                                {voice.name.replace('Google ', '')} ({voice.lang})
                              </option>
                            ))
                          )}
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-cyan-400/30 group-hover:text-cyan-400/60 transition-colors">
                          <ChevronDown className="w-5 h-5" />
                        </div>
                      </div>

                      {/* Web Speech API Output Rate & Pitch Range Sliders */}
                      <div className="space-y-3 pt-3 border-t border-cyan-500/20">
                        <div className="flex items-center justify-between text-[10px] font-mono text-cyan-300">
                          <span>Speech Rate: {speechRate.toFixed(1)}x</span>
                          <span>Speech Pitch: {speechPitch.toFixed(1)}x</span>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-[9px] text-slate-400 font-mono block mb-1">Rate (Speed)</label>
                            <input 
                              type="range" 
                              min="0.5" 
                              max="2.0" 
                              step="0.1" 
                              value={speechRate} 
                              onChange={(e) => {
                                const val = parseFloat(e.target.value);
                                setSpeechRate(val);
                                safeStorage.setItem('anny_speech_rate', val.toString());
                              }}
                              className="w-full accent-cyan-400 h-1 bg-white/10 rounded cursor-pointer"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] text-slate-400 font-mono block mb-1">Pitch (Tone)</label>
                            <input 
                              type="range" 
                              min="0.5" 
                              max="1.5" 
                              step="0.1" 
                              value={speechPitch} 
                              onChange={(e) => {
                                const val = parseFloat(e.target.value);
                                setSpeechPitch(val);
                                safeStorage.setItem('anny_speech_pitch', val.toString());
                              }}
                              className="w-full accent-purple-400 h-1 bg-white/10 rounded cursor-pointer"
                            />
                          </div>
                        </div>
                      </div>

                      <p className="text-[8px] text-white/20 font-mono italic px-1 uppercase tracking-tighter">Current selection saved to local neural matrix.</p>
                   </div>

                   {/* Chat History Section */}
                   <div className="space-y-4">
                      <div className="flex items-center justify-between">
                         <p className="text-[10px] text-white/20 uppercase font-mono tracking-[0.3em] font-bold">Neural_Sessions</p>
                         <div className="flex items-center gap-1.5">
                           <button
                              onClick={() => {
                                setIsSideMenuSelectMode(!isSideMenuSelectMode);
                                setSelectedSideMenuSessionIds([]);
                              }}
                              className={`p-1.5 rounded-lg border text-[10px] font-mono transition-all ${
                                isSideMenuSelectMode
                                  ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                                  : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                              }`}
                              title={isSideMenuSelectMode ? "Cancel Select Mode" : "Select Sessions"}
                           >
                              <CheckSquare className="w-3.5 h-3.5" />
                           </button>
                           <button 
                              onClick={startNewChat}
                              className="p-1.5 bg-cyan-500/10 border border-cyan-500/20 rounded-lg hover:bg-cyan-500/20 text-cyan-400 group transition-all"
                              title="New Session"
                           >
                              <Plus className="w-3.5 h-3.5 group-hover:rotate-90 transition-transform" />
                           </button>
                         </div>
                      </div>

                      {/* Search Input for Side Menu */}
                      <div className="relative">
                         <input
                            type="text"
                            placeholder="Search past sessions..."
                            value={sideMenuSearchTerm}
                            onChange={(e) => setSideMenuSearchTerm(e.target.value)}
                            className="w-full bg-[#050505] border border-white/10 rounded-xl py-2 px-3 pl-8 text-[11px] font-mono text-slate-200 placeholder-slate-500 outline-none focus:border-cyan-500/50"
                         />
                         <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                         {sideMenuSearchTerm && (
                           <button 
                             onClick={() => setSideMenuSearchTerm('')}
                             className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white text-xs"
                           >
                             ✕
                           </button>
                         )}
                      </div>

                      {/* Select All / Deselect All Toolbar in Select Mode */}
                      {isSideMenuSelectMode && (
                         <div className="flex items-center justify-between py-1.5 px-3 bg-white/5 border border-white/10 rounded-xl text-[10px] font-mono">
                           <button
                             onClick={() => {
                               const filtered = chatHistory.filter(c => !sideMenuSearchTerm || c.title?.toLowerCase().includes(sideMenuSearchTerm.toLowerCase()));
                               if (selectedSideMenuSessionIds.length === filtered.length) {
                                 setSelectedSideMenuSessionIds([]);
                               } else {
                                 setSelectedSideMenuSessionIds(filtered.map(c => c.id));
                               }
                             }}
                             className="text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-1.5 font-semibold"
                           >
                             <CheckSquare className="w-3.5 h-3.5" />
                             <span>{selectedSideMenuSessionIds.length === chatHistory.filter(c => !sideMenuSearchTerm || c.title?.toLowerCase().includes(sideMenuSearchTerm.toLowerCase())).length ? "Deselect All" : "Select All"}</span>
                           </button>
                           <span className="text-slate-400">({selectedSideMenuSessionIds.length} selected)</span>
                         </div>
                      )}

                      {/* Batch Delete Banner in Select Mode */}
                      {isSideMenuSelectMode && selectedSideMenuSessionIds.length > 0 && (
                         <button
                            onClick={() => {
                              selectedSideMenuSessionIds.forEach(id => deleteChat(id));
                              setSelectedSideMenuSessionIds([]);
                              setIsSideMenuSelectMode(false);
                            }}
                            className="w-full py-1.5 px-3 rounded-xl bg-red-500/20 border border-red-500/40 text-red-300 hover:bg-red-500/30 text-xs font-mono flex items-center justify-center gap-2 transition-all"
                         >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Delete Selected ({selectedSideMenuSessionIds.length})</span>
                         </button>
                      )}
                      
                      <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                         {chatHistory.length === 0 ? (
                            <button 
                               onClick={startNewChat}
                               className="w-full py-6 text-center border border-dashed border-white/5 rounded-xl hover:bg-white/5 transition-all"
                            >
                                <p className="text-[9px] text-white/10 uppercase font-mono tracking-widest">No active sessions. Start New?</p>
                            </button>
                         ) : (
                            chatHistory
                              .filter(chat => !sideMenuSearchTerm || chat.title?.toLowerCase().includes(sideMenuSearchTerm.toLowerCase()))
                              .map((chat, idx) => {
                                 const isSelected = selectedSideMenuSessionIds.includes(chat.id);
                                 const relativeTime = getRelativeTimeFromSession(chat);

                                 return (
                                    <div 
                                      key={`${chat.id}-${idx}`}
                                      className={`group flex items-center gap-2 p-2.5 rounded-xl border transition-all ${chat.id === currentChatId ? 'bg-cyan-500/10 border-cyan-500/30' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}
                                      onClick={() => {
                                        if (isSideMenuSelectMode) {
                                          setSelectedSideMenuSessionIds(prev => 
                                            prev.includes(chat.id) ? prev.filter(x => x !== chat.id) : [...prev, chat.id]
                                          );
                                        }
                                      }}
                                    >
                                       {isSideMenuSelectMode ? (
                                         <button 
                                           onClick={(e) => {
                                             e.stopPropagation();
                                             setSelectedSideMenuSessionIds(prev => 
                                               prev.includes(chat.id) ? prev.filter(x => x !== chat.id) : [...prev, chat.id]
                                             );
                                           }}
                                           className="p-1 text-cyan-400 shrink-0"
                                         >
                                           {isSelected ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5 text-slate-500" />}
                                         </button>
                                       ) : (
                                         <MessageSquare className={`w-3.5 h-3.5 shrink-0 ${chat.id === currentChatId ? 'text-cyan-400' : 'text-white/20'}`} />
                                       )}

                                       {editingSessionId === chat.id ? (
                                         <div className="flex-1 flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                                           <input
                                             type="text"
                                             value={editingTitle}
                                             onChange={(e) => setEditingTitle(e.target.value)}
                                             onKeyDown={(e) => {
                                               if (e.key === 'Enter') {
                                                 renameChat(chat.id, editingTitle);
                                                 setEditingSessionId(null);
                                               } else if (e.key === 'Escape') {
                                                 setEditingSessionId(null);
                                               }
                                             }}
                                             autoFocus
                                             className="flex-1 bg-[#0a0a0a] border border-cyan-500/50 rounded-lg px-2 py-1 text-[10px] font-mono text-cyan-200 outline-none"
                                           />
                                           <button
                                             onClick={() => {
                                               renameChat(chat.id, editingTitle);
                                               setEditingSessionId(null);
                                             }}
                                             className="p-1 text-emerald-400 hover:text-emerald-300 shrink-0"
                                             title="Save Title"
                                           >
                                             <Check className="w-3 h-3" />
                                           </button>
                                           <button
                                             onClick={() => setEditingSessionId(null)}
                                             className="p-1 text-slate-400 hover:text-white shrink-0"
                                             title="Cancel"
                                           >
                                             <X className="w-3 h-3" />
                                           </button>
                                         </div>
                                       ) : (
                                         <div className="flex-1 flex flex-col min-w-0">
                                           <div className="flex items-center gap-1.5 group/title">
                                             <span 
                                               onClick={() => {
                                                 if (!isSideMenuSelectMode) {
                                                   setCurrentChatId(chat.id);
                                                   setIsMenuOpen(false);
                                                 }
                                               }}
                                               className={`text-[10px] font-mono tracking-tight truncate cursor-pointer ${chat.id === currentChatId ? 'text-cyan-400 font-semibold' : 'text-slate-300 hover:text-white'}`}
                                               title="Click to view session"
                                             >
                                               {chat.title || "Untitled Session"}
                                             </span>
                                             {!isSideMenuSelectMode && (
                                               <button
                                                 onClick={(e) => {
                                                   e.stopPropagation();
                                                   setEditingSessionId(chat.id);
                                                   setEditingTitle(chat.title || '');
                                                 }}
                                                 className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-500 hover:text-cyan-400 transition-opacity shrink-0"
                                                 title="Rename Session"
                                               >
                                                 <Edit2 className="w-2.5 h-2.5" />
                                               </button>
                                             )}
                                           </div>
                                           {/* Timestamp Display */}
                                           <span className="text-[8px] font-mono text-slate-500 mt-0.5 flex items-center gap-1">
                                             <Clock className="w-2.5 h-2.5 opacity-60 shrink-0" />
                                             <span>{relativeTime}</span>
                                           </span>
                                         </div>
                                       )}

                                       {!isSideMenuSelectMode && editingSessionId !== chat.id && (
                                         <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity shrink-0" onClick={(e) => e.stopPropagation()}>
                                           <button 
                                             onClick={() => exportSessionAsJson(chat)}
                                             className="p-1 text-slate-400 hover:text-cyan-400 transition-colors"
                                             title="Export Session (JSON)"
                                           >
                                             <Download className="w-3 h-3" />
                                           </button>
                                           <button 
                                             onClick={() => deleteChat(chat.id)}
                                             className="p-1 text-slate-400 hover:text-red-400 transition-colors"
                                             title="Delete Session"
                                           >
                                             <Trash2 className="w-3 h-3" />
                                           </button>
                                         </div>
                                       )}
                                    </div>
                                 );
                              })
                         )}
                      </div>
                   </div>

                   {/* System Control Hub */}
                   <div className="space-y-6 pb-20">
                      <p className="text-[10px] text-white/20 uppercase font-mono tracking-[0.3em] font-bold">System_Controls</p>
                      <div className="grid gap-3">
                         <button 
                           onClick={() => { setIsMenuOpen(false); setView('diagnostics'); }}
                           className="w-full p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-between group transition-all"
                         >
                            <div className="flex items-center gap-3">
                              <Activity className="w-5 h-5 text-cyan-400" />
                              <span className="text-[10px] font-mono uppercase tracking-widest">Industrial Diagnostics</span>
                            </div>
                            <div className="w-2 h-2 rounded-full bg-green-500/40" />
                         </button>

                         <button 
                           onClick={() => { setIsMenuOpen(false); setView('neural_lab'); }}
                           className="w-full p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-between group transition-all"
                         >
                            <div className="flex items-center gap-3">
                              <Box className="w-5 h-5 text-purple-400" />
                              <span className="text-[10px] font-mono uppercase tracking-widest">Neural 3D Lab</span>
                            </div>
                            <Zap className="w-3 h-3 text-purple-400 opacity-20 group-hover:opacity-100 transition-opacity" />
                         </button>

                         <button 
                           onClick={() => { setIsMenuOpen(false); setView('cybersecurity'); }}
                           className="w-full p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-between group transition-all"
                         >
                            <div className="flex items-center gap-3">
                              <Shield className="w-5 h-5 text-green-400" />
                              <span className="text-[10px] font-mono uppercase tracking-widest">Cyber_Security Command</span>
                            </div>
                            <div className="w-2 h-2 rounded-full bg-cyan-500/40" />
                         </button>

                         <button 
                           onClick={() => { setIsMenuOpen(false); setView('super_app_studio'); }}
                           className="w-full p-4 rounded-xl bg-gradient-to-r from-cyan-500/20 to-blue-600/20 hover:from-cyan-500/30 hover:to-blue-600/30 border border-cyan-500/40 flex items-center justify-between group transition-all shadow-xl"
                         >
                            <div className="flex items-center gap-3">
                              <Box className="w-5 h-5 text-cyan-400 animate-pulse" />
                              <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-300 font-bold">Super-App Studio & Fixer</span>
                            </div>
                            <span className="text-[8px] font-mono px-2 py-0.5 bg-cyan-400 text-black rounded-md font-bold">NEW</span>
                         </button>

                        {isAdmin && (
                          <button 
                            onClick={() => { setIsMenuOpen(false); setView('admin_dashboard'); }}
                            className="w-full p-4 rounded-xl bg-cyan-500/5 hover:bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-between group transition-all"
                          >
                             <div className="flex items-center gap-3">
                               <ShieldCheck className="w-5 h-5 text-cyan-400" />
                               <span className="text-[10px] font-mono uppercase tracking-widest">Neural Control Core</span>
                             </div>
                             <Activity className="w-3 h-3 text-cyan-400 opacity-20 group-hover:opacity-100 transition-opacity" />
                          </button>
                        )}

                    <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-4">
                           <div className="flex items-center justify-between px-1">
                              <p className="text-[10px] text-white/20 uppercase font-mono tracking-widest">Neural_Voice_Selection</p>
                              <Volume2 className="w-3 h-3 text-cyan-400/40" />
                           </div>
                           <div className="relative group">
                             <select 
                               value={selectedVoiceURI}
                               onChange={(e) => {
                                 setSelectedVoiceURI(e.target.value);
                                 safeStorage.setItem('anny_voice_uri', e.target.value);
                               }}
                               className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg p-3 text-[10px] font-mono text-cyan-400 outline-none focus:border-cyan-500/40 appearance-none cursor-pointer hover:border-white/20 transition-all pr-10"
                             >
                               {voices.length === 0 ? (
                                 <option disabled>Initializing voices...</option>
                               ) : (
                                 voices.map(voice => (
                                   <option key={voice.voiceURI} value={voice.voiceURI} className="bg-[#0a0a0a]">
                                     {voice.name.replace('Google ', '')} ({voice.lang})
                                   </option>
                                 ))
                               )}
                             </select>
                             <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-white/20 group-hover:text-cyan-400/40 transition-colors">
                               <ChevronDown className="w-4 h-4" />
                             </div>
                           </div>
                        </div>

                        <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-4">
                           <p className="text-[10px] text-white/20 uppercase font-mono tracking-widest px-1">System_Direct_Link</p>
                           <div className="grid grid-cols-2 gap-2">
                              {[
                                 { label: 'Vision Matrix', icon: ShieldCheck, active: isVisionActive, action: () => setIsVisionActive(!isVisionActive) },
                                 { label: 'Vocal Link', icon: Activity, active: isContinuousListening, action: () => setIsContinuousListening(!isContinuousListening) },
                                 { label: 'Neural Guidance', icon: Bot, active: isGuidanceActive, action: () => setIsGuidanceActive(!isGuidanceActive) },
                                 { label: 'Robot Link', icon: Zap, active: isRobotMode, color: 'orange', action: () => {
                                   const next = !isRobotMode;
                                   setIsRobotMode(next);
                                   if(next) logAudit({ action: 'ROBOT_LINK_ESTABLISHED', severity: 'critical', category: 'security', details: 'ROS 2 Heartbeat detected via Menu.' });
                                 }}
                              ].map((btn, i) => (
                                 <button 
                                   key={i}
                                   onClick={btn.action}
                                   className={`p-3 rounded-lg border flex flex-col items-center gap-2 transition-all ${btn.active ? (btn.color === 'orange' ? 'bg-orange-500/20 border-orange-500/40 text-orange-400' : 'bg-cyan-500/20 border-cyan-500/40 text-cyan-400') : 'bg-white/5 border-white/5 text-white/20 hover:text-white/40'}`}
                                 >
                                    <btn.icon className={`w-4 h-4 ${btn.active ? 'animate-pulse' : ''}`} />
                                    <span className="text-[8px] font-mono tracking-tighter uppercase whitespace-nowrap">{btn.label}</span>
                                 </button>
                              ))}
                           </div>
                           <button 
                             onClick={() => { if(confirm("Neural wipe current session history?")) handleUpdateMessages([]); }}
                             className="w-full p-3 rounded-lg bg-red-500/5 border border-red-500/10 flex items-center gap-3 hover:bg-red-500/10 transition-all group"
                           >
                              <History className="w-4 h-4 text-red-500/60" />
                              <span className="text-[9px] font-mono uppercase tracking-widest text-red-500/60">Neural Wipe</span>
                           </button>
                        </div>

                         <button 
                           onClick={() => { setIsMenuOpen(false); setView('subscription'); }}
                           className="w-full p-4 rounded-xl bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 flex items-center justify-between group transition-all"
                         >
                            <div className="flex items-center gap-3">
                              <Zap className="w-5 h-5 text-cyan-400 animate-pulse" />
                              <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-400 font-bold">Upgrade Neural Access</span>
                            </div>
                            <ChevronDown className="w-3 h-3 text-cyan-400 -rotate-90" />
                         </button>

                        <button 
                          onClick={() => { if(confirm("Neural wipe current usage metrics?")) resetUsage(); }}
                          className="w-full p-4 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between hover:bg-white/10 transition-all group"
                        >
                           <div className="flex items-center gap-3">
                             <Zap className="w-5 h-5 text-yellow-500/60 group-hover:text-yellow-500 transition-colors" />
                             <span className="text-[10px] font-mono uppercase tracking-widest text-white/60">Reset Brain Cache</span>
                           </div>
                         </button>

                        {isAdmin && (
                          <div className="p-4 rounded-xl bg-cyan-500/5 border border-cyan-500/20 space-y-6">
                             <div>
                                <div className="flex items-center gap-2 mb-2">
                                   <Download className="w-4 h-4 text-cyan-400" />
                                   <p className="text-[10px] text-cyan-400 uppercase font-mono tracking-widest font-bold">Admin_Neural_Installer</p>
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                   <a 
                                     href="/setup.bat?mode=admin" 
                                     download 
                                     className="flex flex-col items-center justify-center gap-1.5 p-2 bg-black/40 border border-white/10 rounded-lg hover:border-cyan-500/50 hover:bg-cyan-500/10 transition-all group text-center"
                                   >
                                      <Monitor className="w-4 h-4 text-white/40 group-hover:text-cyan-400" />
                                      <span className="text-[7px] font-mono text-white/40 group-hover:text-cyan-400 uppercase leading-none">Windows</span>
                                   </a>
                                   <a 
                                     href="/setup.sh?mode=admin" 
                                     download 
                                     className="flex flex-col items-center justify-center gap-1.5 p-2 bg-black/40 border border-white/10 rounded-lg hover:border-cyan-500/50 hover:bg-cyan-500/10 transition-all group text-center"
                                   >
                                      <Laptop className="w-4 h-4 text-white/40 group-hover:text-cyan-400" />
                                      <span className="text-[7px] font-mono text-white/40 group-hover:text-cyan-400 uppercase leading-none">Mac OS</span>
                                   </a>
                                   <a 
                                     href="/setup.sh?mode=admin" 
                                     download 
                                     className="flex flex-col items-center justify-center gap-1.5 p-2 bg-black/40 border border-white/10 rounded-lg hover:border-cyan-500/50 hover:bg-cyan-500/10 transition-all group text-center"
                                   >
                                      <Terminal className="w-4 h-4 text-white/40 group-hover:text-cyan-400" />
                                      <span className="text-[7px] font-mono text-white/40 group-hover:text-cyan-400 uppercase leading-none">Linux</span>
                                   </a>
                                   <button 
                                      onClick={() => alert("To install on Android:\n1. Open this page in Chrome\n2. Tap the three dots (⋮) top-right\n3. Select 'Install app' or 'Add to Home screen'") }
                                      className="flex flex-col items-center justify-center gap-1.5 p-2 bg-black/40 border border-white/10 rounded-lg hover:border-cyan-500/50 hover:bg-cyan-500/10 transition-all group text-center"
                                   >
                                      <Bot className="w-4 h-4 text-white/40 group-hover:text-cyan-400" />
                                      <span className="text-[7px] font-mono text-white/40 group-hover:text-cyan-400 uppercase leading-none">Android</span>
                                   </button>
                                   <button 
                                      onClick={() => alert("To install on iPhone:\n1. Open this page in Safari\n2. Tap the 'Share' icon (square with arrow)\n3. Scroll down and select 'Add to Home Screen'")}
                                      className="flex flex-col items-center justify-center gap-1.5 p-2 bg-black/40 border border-white/10 rounded-lg hover:border-cyan-500/50 hover:bg-cyan-500/10 transition-all group text-center"
                                   >
                                      <Smartphone className="w-4 h-4 text-white/40 group-hover:text-cyan-400" />
                                      <span className="text-[7px] font-mono text-white/40 group-hover:text-cyan-400 uppercase leading-none">iPhone</span>
                                   </button>
                                   <button 
                                      onClick={() => alert("To install on iPad:\n1. Open this page in Safari\n2. Tap the 'Share' icon top-right\n3. Select 'Add to Home Screen'")}
                                      className="flex flex-col items-center justify-center gap-1.5 p-2 bg-black/40 border border-white/10 rounded-lg hover:border-cyan-500/50 hover:bg-cyan-500/10 transition-all group text-center"
                                   >
                                      <Tablet className="w-4 h-4 text-white/40 group-hover:text-cyan-400" />
                                      <span className="text-[7px] font-mono text-white/40 group-hover:text-cyan-400 uppercase leading-none">iPad</span>
                                   </button>
                                </div>
                                <a 
                                  href="/anny_neural_admin.zip" 
                                  download 
                                  className="w-full mt-4 p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center gap-3 hover:bg-cyan-500/20 transition-all group"
                                >
                                   <Download className="w-4 h-4 text-cyan-400 animate-bounce" />
                                   <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-cyan-400">Download Universal Admin Bundle (.ZIP)</span>
                                </a>
                             </div>

                             <div className="pt-4 border-t border-white/5">
                                <div className="flex items-center gap-2 mb-2">
                                   <Zap className="w-4 h-4 text-emerald-400" />
                                   <p className="text-[10px] text-emerald-400 uppercase font-mono tracking-widest font-bold">User_Neural_Installer</p>
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                   <a 
                                     href="/setup.bat?mode=user" 
                                     download 
                                     className="flex flex-col items-center justify-center gap-1.5 p-2 bg-black/40 border border-white/10 rounded-lg hover:border-emerald-500/50 hover:bg-emerald-500/10 transition-all group text-center"
                                   >
                                      <Monitor className="w-4 h-4 text-white/40 group-hover:text-emerald-400" />
                                      <span className="text-[7px] font-mono text-white/40 group-hover:text-emerald-400 uppercase leading-none">Windows</span>
                                   </a>
                                   <a 
                                     href="/setup.sh?mode=user" 
                                     download 
                                     className="flex flex-col items-center justify-center gap-1.5 p-2 bg-black/40 border border-white/10 rounded-lg hover:border-emerald-500/50 hover:bg-emerald-500/10 transition-all group text-center"
                                   >
                                      <Laptop className="w-4 h-4 text-white/40 group-hover:text-emerald-400" />
                                      <span className="text-[7px] font-mono text-white/40 group-hover:text-emerald-400 uppercase leading-none">Mac OS</span>
                                   </a>
                                   <a 
                                     href="/setup.sh?mode=user" 
                                     download 
                                     className="flex flex-col items-center justify-center gap-1.5 p-2 bg-black/40 border border-white/10 rounded-lg hover:border-emerald-500/50 hover:bg-emerald-500/10 transition-all group text-center"
                                   >
                                      <Terminal className="w-4 h-4 text-white/40 group-hover:text-emerald-400" />
                                      <span className="text-[7px] font-mono text-white/40 group-hover:text-emerald-400 uppercase leading-none">Linux</span>
                                   </a>
                                   <button 
                                      onClick={() => alert("To install on Android:\n1. Open this page in Chrome\n2. Tap the three dots (⋮) top-right\n3. Select 'Install app' or 'Add to Home screen'") }
                                      className="flex flex-col items-center justify-center gap-1.5 p-2 bg-black/40 border border-white/10 rounded-lg hover:border-emerald-500/50 hover:bg-emerald-500/10 transition-all group text-center"
                                   >
                                      <Bot className="w-4 h-4 text-white/40 group-hover:text-emerald-400" />
                                      <span className="text-[7px] font-mono text-white/40 group-hover:text-emerald-400 uppercase leading-none">Android</span>
                                   </button>
                                   <button 
                                      onClick={() => alert("To install on iPhone:\n1. Open this page in Safari\n2. Tap the 'Share' icon (square with arrow)\n3. Scroll down and select 'Add to Home Screen'")}
                                      className="flex flex-col items-center justify-center gap-1.5 p-2 bg-black/40 border border-white/10 rounded-lg hover:border-emerald-500/50 hover:bg-emerald-500/10 transition-all group text-center"
                                   >
                                      <Smartphone className="w-4 h-4 text-white/40 group-hover:text-emerald-400" />
                                      <span className="text-[7px] font-mono text-white/40 group-hover:text-emerald-400 uppercase leading-none">iPhone</span>
                                   </button>
                                   <button 
                                      onClick={() => alert("To install on iPad:\n1. Open this page in Safari\n2. Tap the 'Share' icon top-right\n3. Select 'Add to Home Screen'")}
                                      className="flex flex-col items-center justify-center gap-1.5 p-2 bg-black/40 border border-white/10 rounded-lg hover:border-emerald-500/50 hover:bg-emerald-500/10 transition-all group text-center"
                                   >
                                      <Tablet className="w-4 h-4 text-white/40 group-hover:text-emerald-400" />
                                      <span className="text-[7px] font-mono text-white/40 group-hover:text-emerald-400 uppercase leading-none">iPad</span>
                                   </button>
                                </div>
                                <a 
                                  href="/anny_neural_user.zip" 
                                  download 
                                  className="w-full mt-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center gap-3 hover:bg-emerald-500/20 transition-all group"
                                >
                                   <Zap className="w-4 h-4 text-emerald-400 animate-pulse" />
                                   <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-emerald-400">Download Universal User Bundle (.ZIP)</span>
                                </a>
                             </div>

                             <div className="pt-4 border-t border-white/5">
                                <div className="flex items-center gap-2 mb-2">
                                   <ShieldCheck className="w-4 h-4 text-orange-400" />
                                   <p className="text-[10px] text-orange-400 uppercase font-mono tracking-widest font-bold">Native_Platform_Build_Engine</p>
                                </div>
                                <div className="p-3 bg-black/40 border border-white/5 rounded-lg space-y-3">
                                   <div className="flex items-center justify-between">
                                      <span className="text-[7px] font-mono text-white/40 uppercase">Target: Windows/Mac/iOS/Android</span>
                                      <div className="flex items-center gap-1">
                                        <div className="w-1 h-1 rounded-full bg-green-500 animate-pulse" />
                                        <span className="text-[7px] font-mono text-green-400 uppercase">Compiler Ready</span>
                                      </div>
                                   </div>
                                   
                                   <div className="grid grid-cols-2 gap-2">
                                      <button 
                                         onClick={() => alert("DESKTOP BUILD ENGINE:\n\n1. Download the Universal Bundle (.zip)\n2. Extract and open terminal in folder\n3. Run: npm install\n4. Run: npx nativefier --name \"Anny\" --icon public/logo.png --single-instance \"" + window.location.origin + "\"\n\nThis will generate a native .EXE or .APP folder instantly.")}
                                         className="p-2 bg-orange-500/10 border border-orange-500/20 rounded text-[7px] font-mono text-orange-400 uppercase hover:bg-orange-500/20 transition-all flex items-center justify-center gap-2"
                                      >
                                         <Monitor className="w-3 h-3" />
                                         Desktop Binary
                                      </button>
                                      
                                      <button 
                                         onClick={() => alert("iOS APP STORE PUBLISHING:\n\n1. Download the Universal Bundle (.zip)\n2. Extract and run 'npm install'\n3. Run: npx cap add ios\n4. Run: npx cap open ios\n\nThis will open Xcode. Configure your Team/Certificate and hit 'Archive' to upload to App Store.")}
                                         className="p-2 bg-blue-500/10 border border-blue-500/20 rounded text-[7px] font-mono text-blue-400 uppercase hover:bg-blue-500/20 transition-all flex items-center justify-center gap-2"
                                      >
                                         <Smartphone className="w-3 h-3" />
                                         iOS App Store
                                      </button>

                                      <button 
                                         onClick={() => alert("GOOGLE PLAY PUBLISHING:\n\n1. Download the Universal Bundle (.zip)\n2. Extract and run 'npm install'\n3. Run: npx cap add android\n4. Run: npx cap open android\n\nThis will open Android Studio. Go to Build > Generate Signed Bundle / APK to upload to Play Store.")}
                                         className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded text-[7px] font-mono text-emerald-400 uppercase hover:bg-emerald-500/20 transition-all flex items-center justify-center gap-2"
                                      >
                                         <Bot className="w-3 h-3" />
                                         Google Play
                                      </button>

                                      <button 
                                         onClick={() => alert("UNIVERSAL PWA (BROWSER INSTALL):\n\nUsers can install the app directly via their browser (Chrome/Safari) without using the App Store, thanks to our pre-configured Service Worker and Manifest.")}
                                         className="p-2 bg-purple-500/10 border border-purple-500/20 rounded text-[7px] font-mono text-purple-400 uppercase hover:bg-purple-500/20 transition-all flex items-center justify-center gap-2"
                                      >
                                         <Zap className="w-3 h-3" />
                                         PWA Direct
                                      </button>
                                   </div>
                                </div>
                             </div>
                          </div>
                        )}

                        <button 
                          onClick={() => { if(confirm("Full system re-initialization? This clears ALL local data.")) resetSystem(); }}
                          className="w-full p-4 rounded-xl bg-red-500/5 border border-red-500/10 flex items-center justify-between hover:bg-red-500/10 transition-all group"
                        >
                           <div className="flex items-center gap-3">
                             <History className="w-5 h-5 text-red-500/60" />
                             <span className="text-[10px] font-mono uppercase tracking-widest text-red-500/60">Factory Sync Level</span>
                           </div>
                        </button>
                      </div>
                   </div>

                   <div className="pt-10 border-t border-white/5">
                      <p className="text-[9px] text-white/20 uppercase font-mono tracking-widest mb-4">System Identity</p>
                      <div className="space-y-2">
                         <div className="flex justify-between text-[10px] font-mono">
                            <span className="text-white/20">Version</span>
                            <span className="text-white/40">v2.4.0-Neural</span>
                         </div>
                         <div className="flex justify-between text-[10px] font-mono">
                            <span className="text-white/20">Protocol</span>
                            <span className="text-white/40">Sovereign_0x7</span>
                         </div>
                      </div>
                   </div>
                </div>

                <div className="mt-auto pt-8 flex items-center justify-center">
                   <p className="text-[8px] text-white/10 uppercase font-mono tracking-[0.5em]">&copy; 2026 ANNY_GROUPS</p>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {isGlobalSupportOpen && (user || isGuest) && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              onClick={() => setIsGlobalSupportOpen(false)}
              className="fixed inset-0 z-[100] flex items-center justify-center p-2 md:p-4 bg-black/80 backdrop-blur-sm cursor-pointer"
            >
              <div 
                className="w-full max-w-md h-full max-h-[600px] md:h-[600px] cursor-default"
                onClick={(e) => e.stopPropagation()}
              >
                <SupportChat 
                  chatId={user?.uid || 'guest-session'} 
                  userEmail={user?.email || 'guest@anny.internal'} 
                  userName={user?.displayName || 'Guest Operator'} 
                  userPhotoURL={user?.photoURL || ''}
                  type="support"
                  onClose={() => setIsGlobalSupportOpen(false)} 
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <main className="flex-1 flex flex-col relative z-20 min-h-0 scroll-smooth overflow-hidden">
          <AnimatePresence mode="wait">
            {/* View Dispatcher */}
            {(!user && (view === 'auth' || (!isGuest && view === 'main'))) ? (
              <motion.div
                key="auth"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full flex-1 flex items-center justify-center p-4 overflow-auto z-50 relative"
              >
                <Auth />
              </motion.div>
            ) : view === 'admin_login' ? (
              <motion.div 
                 key="admin_login"
                 initial={{ opacity: 0, y: 20 }}
                 animate={{ opacity: 1, y: 0 }}
                 exit={{ opacity: 0, scale: 0.95 }}
                 className="flex-1 w-full flex items-center justify-center p-4 overflow-y-auto"
              >
                 <div className="w-full max-w-md bg-black/80 backdrop-blur-3xl p-6 md:p-10 rounded-3xl md:rounded-[2.5rem] border border-white/10 shadow-3xl relative z-50 mx-4">
                  <div className="text-center mb-6 md:mb-8">
                    <h2 className="text-xl md:text-2xl font-bold italic mb-2">NEURAL AUTHENTICATION</h2>
                    <p className="text-[8px] md:text-[10px] text-white/30 uppercase font-mono tracking-widest">Server-verified operator credentials required</p>
                  </div>

                  {adminLoginError && (
                    <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs font-mono text-center">
                      {adminLoginError}
                    </div>
                  )}

                 <div className="space-y-4 mb-6 md:mb-8">
                    <div className="space-y-1">
                      <label className="text-[9px] md:text-[10px] text-cyan-400 font-mono uppercase tracking-[0.2em] ml-2">Operator Alias</label>
                      <input 
                        type="text"
                        value={loginForm.username}
                        onChange={(e) => setLoginForm(prev => ({ ...prev, username: e.target.value }))}
                        onKeyDown={(e) => { if (e.key === 'Enter' && !isVerifyingAdmin) handleAdminLoginSubmit(); }}
                        className="w-full bg-white/5 border border-white/10 rounded-xl md:rounded-2xl p-3 md:p-4 text-white font-mono focus:border-cyan-500/50 outline-none transition-all text-sm"
                        placeholder="Username..."
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] md:text-[10px] text-cyan-400 font-mono uppercase tracking-[0.2em] ml-2">Secure Key</label>
                      <input 
                        type="password"
                        value={loginForm.password}
                        onChange={(e) => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
                        onKeyDown={(e) => { if (e.key === 'Enter' && !isVerifyingAdmin) handleAdminLoginSubmit(); }}
                        className="w-full bg-white/5 border border-white/10 rounded-xl md:rounded-2xl p-3 md:p-4 text-white font-mono focus:border-cyan-500/50 outline-none transition-all text-sm"
                        placeholder="Password..."
                      />
                    </div>
                 </div>

                   <div className="space-y-3 md:space-y-4">
                    <button 
                      disabled={isVerifyingAdmin}
                      onClick={handleAdminLoginSubmit}
                      className="w-full py-4 md:py-5 bg-cyan-500 disabled:opacity-50 text-black font-black rounded-xl md:rounded-2xl tracking-[0.1em] md:tracking-[0.2em] hover:bg-cyan-400 active:scale-[0.98] transition-all text-sm"
                    >
                      {isVerifyingAdmin ? 'VERIFYING...' : 'VERIFY & PROCEED'}
                    </button>
                  </div>

                 <button 
                    onClick={() => { setAdminLoginError(null); setView('home'); }}
                    className="w-full mt-4 text-[10px] text-white/20 uppercase font-mono hover:text-white transition-colors"
                 >
                    Cancel Authentication
                 </button>
                </div>
              </motion.div>
            ) : view === 'admin_liveness' ? (
              <motion.div 
                 key="admin_liveness"
                 initial={{ opacity: 0, scale: 0.9 }}
                 animate={{ opacity: 1, scale: 1 }}
                 exit={{ opacity: 0, scale: 1.1 }}
                 className="flex-1 flex flex-col items-center justify-center p-4 overflow-auto"
              >
                 <div className="text-center mb-12">
                    <h2 className="text-4xl font-bold italic mb-4">Sovereignty Challenge</h2>
                    <p className="text-white/40 font-mono text-xs uppercase tracking-widest">Perform optical liveness check on verified session</p>
                 </div>
                 <LivenessVerification 
                   mode="liveness"
                   onSuccess={() => handleAdminSuccess().catch(err => console.error("Liveness success sync fail:", err))}
                   onFail={(msg) => { setAdminLoginError(msg); setView('admin_login'); }}
                 />
                 <button 
                   onClick={() => setView('home')}
                   className="mt-8 text-[10px] text-white/30 uppercase font-mono hover:text-white transition-colors"
                 >
                   Abort Authentication
                 </button>
              </motion.div>
            ) : view === 'admin_dashboard' && isAdmin && serverAdminVerified ? (
              <motion.div
                key="admin_dashboard"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 w-full h-full relative flex flex-col overflow-auto"
              >
                <div className="px-4 py-2 bg-black/80 border-b border-white/10 flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-400">Sovereign Control Core</span>
                  <button
                    onClick={() => setView('home')}
                    className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-[10px] font-mono uppercase text-white/60 hover:text-white"
                  >
                    Return to Workspace
                  </button>
                </div>
                <AdminPanel onLogout={handleLogout} />
              </motion.div>
            ) : view === 'super_app_studio' ? (
              <motion.div
                key="super_app_studio"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 w-full h-full relative flex flex-col overflow-hidden"
              >
                <SuperAppStudio />
              </motion.div>
            ) : (
              <motion.div 
                key={view}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 w-full h-full relative flex flex-col overflow-hidden"
              >
                <Anny
                  user={user}
                  userRole={userRole}
                  isGuest={isGuest}
                  setIsGuest={setIsGuest}
                  chatHistory={chatHistory}
                  currentChatId={currentChatId}
                  setCurrentChatId={setCurrentChatId}
                  startNewChat={startNewChat}
                  deleteChat={deleteChat}
                  messages={messages}
                  onUpdateMessages={handleUpdateMessages}
                  view={view}
                  setView={setView}
                  selectedNeuralEngine={selectedNeuralEngine}
                  setSelectedNeuralEngine={setSelectedNeuralEngine}
                  isVisionActive={isVisionActive}
                  setIsVisionActive={setIsVisionActive}
                  isContinuousListening={isContinuousListening}
                  setIsContinuousListening={setIsContinuousListening}
                  isRobotMode={isRobotMode}
                  setIsRobotMode={setIsRobotMode}
                  isGuidanceActive={isGuidanceActive}
                  setIsGuidanceActive={setIsGuidanceActive}
                  voices={voices}
                  selectedVoiceURI={selectedVoiceURI}
                  setSelectedVoiceURI={setSelectedVoiceURI}
                  isAutoSpeak={isAutoSpeak}
                  setIsAutoSpeak={setIsAutoSpeak}
                  connectToAdminGlobal={connectToAdminGlobal}
                  handleLogout={handleLogout}
                  onOpenAuth={() => setView('auth')}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
      </AnnyOrchestrator>
    </ErrorBoundary>
  );
}

export default function App() {
  const isStandalonePreview = typeof window !== 'undefined' && (
    window.location.search.includes('preview=standalone') ||
    window.location.search.includes('preview_mode=true') ||
    (window.location.search.includes('preview=true') && !window.location.search.includes('showPreview=true'))
  );

  if (isStandalonePreview) {
    const params = new URLSearchParams(window.location.search);
    const projId = params.get('project') || params.get('projectId');
    return <StandalonePreviewRunner projectId={projId} />;
  }

  return <AnnyMainApp />;
}
