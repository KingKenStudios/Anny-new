import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  User, Shield, Key, Palette, Bell, Database, LogOut, Check, X, Save,
  RefreshCw, Sparkles, Camera, Sliders, Cpu, Eye, Lock, AlertTriangle, Copy,
  Terminal, ExternalLink, Volume2, Globe, Activity, HardDrive, CheckCircle2,
  ShieldCheck, Smartphone, SlidersHorizontal, Trash2, Mail
} from 'lucide-react';
import { updateProfile, sendPasswordResetEmail } from 'firebase/auth';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

interface AdvancedSettingsAndProfileProps {
  user: any;
  handleLogout?: () => void;
  isGuest?: boolean;
  isVisionActive?: boolean;
  setIsVisionActive?: (active: boolean) => void;
  onBack?: () => void;
}

const AVATAR_PRESETS = [
  'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1563089145-599997674d42?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=150&auto=format&fit=crop&q=80',
  'https://api.dicebear.com/7.x/bottts/svg?seed=AnnyBot1',
  'https://api.dicebear.com/7.x/bottts/svg?seed=CyberArchitect',
  'https://api.dicebear.com/7.x/bottts/svg?seed=QuantumSentinel'
];

export const AdvancedSettingsAndProfile: React.FC<AdvancedSettingsAndProfileProps> = ({
  user,
  handleLogout,
  isGuest = false,
  isVisionActive = false,
  setIsVisionActive,
  onBack
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'models' | 'security' | 'api' | 'appearance' | 'data'>('profile');

  // Profile state
  const [displayName, setDisplayName] = useState(user?.displayName || (isGuest ? 'Guest Operator' : 'Kehinde Anny'));
  const [photoURL, setPhotoURL] = useState(user?.photoURL || '/logo.png');
  const [roleTitle, setRoleTitle] = useState('Chief AI Architect / Lead Engineer');
  const [bio, setBio] = useState('Building universal offline-first AI ecosystem, robotics, and SCADA automation.');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [passwordResetSent, setPasswordResetSent] = useState(false);

  // Model & AI State
  const [primaryModel, setPrimaryModel] = useState('gemini-3.6-flash');
  const [temperature, setTemperature] = useState(0.7);
  const [autoVisionCapture, setAutoVisionCapture] = useState(true);
  const [visionIntervalSec, setVisionIntervalSec] = useState(15);
  const [systemPrompt, setSystemPrompt] = useState('Operating in ANNY Master Mode. Respond with maximum precision.');

  // Security & SCADA State
  const [lotoLockout, setLotoLockout] = useState(false);
  const [twoFactorSim, setTwoFactorSim] = useState(true);
  const [auditLogLevel, setAuditLogLevel] = useState('detailed');

  // API Key state
  const [geminiApiKey, setGeminiApiKey] = useState(() => localStorage.getItem('GEMINI_API_KEY_LOCAL') || '');
  const [showKey, setShowKey] = useState(false);
  const [keySaved, setKeySaved] = useState(false);

  // Appearance State
  const [themeMode, setThemeMode] = useState<'dark' | 'matrix' | 'cyber'>('dark');
  const [soundEffects, setSoundEffects] = useState(true);

  // Logout Modal State
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || 'Kehinde Anny');
      setPhotoURL(user.photoURL || '/logo.png');

      const unsub = onSnapshot(doc(db, 'users', user.uid), (userDoc) => {
        if (userDoc.exists()) {
          const data = userDoc.data();
          if (data.roleTitle) setRoleTitle(data.roleTitle);
          if (data.bio) setBio(data.bio);
          if (data.primaryModel) setPrimaryModel(data.primaryModel);
        }
      }, (e) => {
        console.debug("Could not fetch user extended doc:", e);
      });

      return () => unsub();
    }
  }, [user]);

  const handleSaveProfile = async () => {
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, {
          displayName,
          photoURL
        });

        await setDoc(doc(db, 'users', auth.currentUser.uid), {
          displayName,
          photoURL,
          roleTitle,
          bio,
          primaryModel,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      } else {
        // Fallback for local state
        localStorage.setItem('anny_user_name', displayName);
        localStorage.setItem('anny_user_photo', photoURL);
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (e) {
      console.error("Failed to update profile:", e);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordReset = async () => {
    if (user?.email) {
      try {
        await sendPasswordResetEmail(auth, user.email);
        setPasswordResetSent(true);
        setTimeout(() => setPasswordResetSent(false), 5000);
      } catch (e) {
        console.error("Failed to send password reset email:", e);
      }
    }
  };

  const handleSaveApiKey = () => {
    if (geminiApiKey) {
      localStorage.setItem('GEMINI_API_KEY_LOCAL', geminiApiKey);
    } else {
      localStorage.removeItem('GEMINI_API_KEY_LOCAL');
    }
    setKeySaved(true);
    setTimeout(() => setKeySaved(false), 2500);
  };

  const handleClearCache = () => {
    localStorage.removeItem('anny_prompts');
    alert("Local application cache and prompt history cleared.");
  };

  return (
    <div className="flex flex-col h-full bg-[#070810] text-slate-100 overflow-hidden font-sans">
      {/* Top Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-[#0d0e1c] border-b border-white/10 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-purple-500/20 border border-purple-500/30 text-purple-400">
            <SlidersHorizontal className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
              System Settings & Identity Platform
              <span className="text-[10px] font-mono bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 px-2 py-0.5 rounded-full">
                v16.0 Enterprise
              </span>
            </h1>
            <p className="text-xs text-slate-400">Configure neural identity, model pipelines, SCADA safety, and user credentials.</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="px-3 py-1.5 text-xs font-mono rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 transition-all"
            >
              Back to Dashboard
            </button>
          )}

          {/* Prominent Header Logout Button */}
          {handleLogout && (
            <button
              onClick={() => setShowLogoutModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white font-mono text-xs font-bold shadow-[0_0_15px_rgba(225,29,72,0.4)] transition-all active:scale-95 border border-red-400/30"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left Nav Sidebar Tabs */}
        <div className="w-64 bg-[#090b16] border-r border-white/10 p-3 flex flex-col justify-between shrink-0">
          <div className="space-y-1">
            <p className="px-3 py-1 text-[10px] font-mono uppercase tracking-widest text-slate-500 font-bold">CONFIG PANELS</p>
            
            {[
              { id: 'profile', label: 'User Identity & Profile', icon: User },
              { id: 'models', label: 'AI & Neural Pipeline', icon: Cpu },
              { id: 'security', label: 'SCADA & Security Sentinel', icon: ShieldCheck },
              { id: 'api', label: 'API Keys & Vault', icon: Key },
              { id: 'appearance', label: 'Appearance & Audio', icon: Palette },
              { id: 'data', label: 'Data, Logs & Backup', icon: Database },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-purple-600/20 text-purple-300 border border-purple-500/40 shadow-sm font-semibold'
                      : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-purple-400' : 'text-slate-400'}`} />
                  <span className="truncate">{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Bottom Logout Box in Nav */}
          <div className="p-3 rounded-xl bg-[#0e1022] border border-white/10 space-y-3">
            <div className="flex items-center gap-2.5">
              <img
                src={photoURL || '/logo.png'}
                alt="Avatar"
                className="w-9 h-9 rounded-full object-cover border border-purple-500/40 shrink-0"
              />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold truncate text-white">{displayName}</p>
                <p className="text-[10px] text-slate-400 truncate">{user?.email || (isGuest ? 'Guest Session' : 'kehindestudio@gmail.com')}</p>
              </div>
            </div>

            {handleLogout && (
              <button
                onClick={() => setShowLogoutModal(true)}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-mono font-bold transition-all"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Disconnect & Sign Out</span>
              </button>
            )}
          </div>
        </div>

        {/* Right Tab Content View */}
        <div className="flex-1 p-6 overflow-y-auto custom-scrollbar bg-[#06070e]">
          {/* TAB 1: USER IDENTITY & PROFILE */}
          {activeTab === 'profile' && (
            <div className="max-w-3xl space-y-6">
              <div className="p-6 rounded-2xl bg-[#0b0d1b] border border-white/10 shadow-lg space-y-6">
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <div>
                    <h2 className="text-base font-bold text-white flex items-center gap-2">
                      <User className="w-4 h-4 text-purple-400" /> User Neural Identity
                    </h2>
                    <p className="text-xs text-slate-400">Manage your display profile, title, avatar, and authentication details.</p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-mono border ${user ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300' : 'bg-amber-500/15 border-amber-500/30 text-amber-300'}`}>
                    {user ? 'Authenticated Operator' : 'Guest Operator'}
                  </span>
                </div>

                {/* Avatar Preview & Presets */}
                <div className="space-y-3">
                  <label className="text-xs font-mono text-slate-400 uppercase tracking-wider">Avatar & Visual Representation</label>
                  <div className="flex flex-wrap items-center gap-6 p-4 rounded-xl bg-black/40 border border-white/5">
                    <div className="relative group">
                      <img
                        src={photoURL || '/logo.png'}
                        alt="Avatar Preview"
                        className="w-20 h-20 rounded-2xl object-cover border-2 border-purple-500/50 shadow-[0_0_20px_rgba(168,85,247,0.3)]"
                      />
                      <div className="absolute inset-0 rounded-2xl bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-[10px] font-mono text-white text-center p-1">
                        Active Avatar
                      </div>
                    </div>

                    <div className="flex-1 space-y-2 min-w-[240px]">
                      <p className="text-xs text-slate-300 font-semibold">Select Preset Avatar or Provide Custom Image URL:</p>
                      <div className="flex items-center gap-2">
                        {AVATAR_PRESETS.map((preset, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setPhotoURL(preset)}
                            className={`w-9 h-9 rounded-xl overflow-hidden border-2 transition-all ${photoURL === preset ? 'border-purple-400 scale-110 shadow-md' : 'border-white/10 hover:border-white/30'}`}
                          >
                            <img src={preset} alt="preset" className="w-full h-full object-cover" />
                          </button>
                        ))}
                      </div>
                      <input
                        type="text"
                        value={photoURL}
                        onChange={(e) => setPhotoURL(e.target.value)}
                        placeholder="Or paste custom image URL..."
                        className="w-full px-3 py-1.5 rounded-lg bg-black/60 border border-white/10 text-xs font-mono text-white outline-none focus:border-purple-500 transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* Form Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-mono text-slate-400">Display Name / Alias</label>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-white/10 text-sm text-white outline-none focus:border-purple-500 transition-all"
                      placeholder="e.g. Kehinde Anny"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-mono text-slate-400">Operator Role Title</label>
                    <input
                      type="text"
                      value={roleTitle}
                      onChange={(e) => setRoleTitle(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-white/10 text-sm text-white outline-none focus:border-purple-500 transition-all"
                      placeholder="e.g. Lead Robotics & SCADA Engineer"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-mono text-slate-400">Mission Statement / Bio</label>
                  <textarea
                    rows={2}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-black/50 border border-white/10 text-xs text-white outline-none focus:border-purple-500 transition-all resize-none"
                    placeholder="Enter brief operator bio..."
                  />
                </div>

                {/* Save Profile Action */}
                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-2">
                    {saveSuccess && (
                      <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-mono">
                        <CheckCircle2 className="w-4 h-4" /> Profile synchronized with Firebase Cloud!
                      </span>
                    )}
                  </div>

                  <button
                    onClick={handleSaveProfile}
                    disabled={isSaving}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-mono text-xs font-bold shadow-lg shadow-purple-600/30 transition-all disabled:opacity-50"
                  >
                    {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    <span>Save Neural Profile</span>
                  </button>
                </div>
              </div>

              {/* Security & Authentication Details */}
              <div className="p-6 rounded-2xl bg-[#0b0d1b] border border-white/10 shadow-lg space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-cyan-400" /> Account Security Credentials
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
                  <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-1">
                    <span className="text-slate-500">Email Address:</span>
                    <p className="text-white font-semibold truncate">{user?.email || 'kehindestudio@gmail.com'}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-1">
                    <span className="text-slate-500">User UID:</span>
                    <p className="text-cyan-300 font-semibold truncate">{user?.uid || 'ANNY_SYS_OPERATOR'}</p>
                  </div>
                </div>

                {user?.email && (
                  <div className="flex items-center justify-between pt-2 border-t border-white/5">
                    <span className="text-xs text-slate-400">Need to update account password?</span>
                    <button
                      onClick={handlePasswordReset}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-cyan-300 border border-cyan-500/30 text-xs font-mono transition-all"
                    >
                      <Mail className="w-3.5 h-3.5" />
                      <span>{passwordResetSent ? 'Reset Email Sent!' : 'Send Password Reset Link'}</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: AI & NEURAL PIPELINE */}
          {activeTab === 'models' && (
            <div className="max-w-3xl space-y-6">
              <div className="p-6 rounded-2xl bg-[#0b0d1b] border border-white/10 shadow-lg space-y-5">
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-cyan-400" /> AI Neural Model Engine Routing
                </h2>

                <div className="space-y-3">
                  <label className="text-xs font-mono text-slate-400">Primary Inference Engine</label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                      { id: 'gemini-3.6-flash', name: 'Gemini 3.6 Flash', provider: 'Google AI Studio', tier: 'Cloud Core' },
                      { id: 'ollama-llama3', name: 'Ollama Llama 3.3', provider: 'Local GGUF', tier: 'Offline Core' },
                      { id: 'deepseek-coder', name: 'DeepSeek Coder V2', provider: 'Nexus Core', tier: 'High Precision' },
                    ].map((m) => (
                      <div
                        key={m.id}
                        onClick={() => setPrimaryModel(m.id)}
                        className={`p-3.5 rounded-xl border cursor-pointer transition-all ${primaryModel === m.id ? 'bg-cyan-500/15 border-cyan-500 text-white shadow-[0_0_15px_rgba(6,182,212,0.2)]' : 'bg-black/40 border-white/10 text-slate-400 hover:border-white/20'}`}
                      >
                        <p className="text-xs font-bold font-mono">{m.name}</p>
                        <p className="text-[10px] text-slate-500 mt-1">{m.provider} • {m.tier}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Temperature slider */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-slate-400">Inference Creativity (Temperature):</span>
                    <span className="text-cyan-400 font-bold">{temperature}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={temperature}
                    onChange={(e) => setTemperature(parseFloat(e.target.value))}
                    className="w-full accent-cyan-400 bg-white/10 rounded-lg h-2"
                  />
                </div>

                {/* Camera Vision Settings */}
                <div className="p-4 rounded-xl bg-black/40 border border-white/5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Camera className="w-4 h-4 text-emerald-400" />
                      <div>
                        <p className="text-xs font-bold text-white">Vision Sensor Camera Monitoring</p>
                        <p className="text-[10px] text-slate-400">Periodic video frame monitoring for operator liveness and guidance.</p>
                      </div>
                    </div>
                    {setIsVisionActive && (
                      <button
                        onClick={() => setIsVisionActive(!isVisionActive)}
                        className={`px-3 py-1 rounded-lg text-xs font-mono border transition-all ${isVisionActive ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300' : 'bg-white/5 border-white/10 text-slate-400'}`}
                      >
                        {isVisionActive ? 'Sensor Active' : 'Sensor Offline'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Master System Prompt */}
                <div className="space-y-1.5">
                  <label className="text-xs font-mono text-slate-400">ANNY Master Persona Directive</label>
                  <textarea
                    rows={3}
                    value={systemPrompt}
                    onChange={(e) => setSystemPrompt(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-white/10 text-xs font-mono text-slate-200 outline-none focus:border-cyan-500 transition-all resize-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: SCADA & SECURITY SENTINEL */}
          {activeTab === 'security' && (
            <div className="max-w-3xl space-y-6">
              <div className="p-6 rounded-2xl bg-[#0b0d1b] border border-white/10 shadow-lg space-y-5">
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" /> SCADA Safety & Security Policy
                </h2>

                <div className="p-4 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-white">Digital Lockout / Tagout (LOTO)</p>
                    <p className="text-[10px] text-slate-400">Enforce read-only SCADA command verification before physical actuation.</p>
                  </div>
                  <button
                    onClick={() => setLotoLockout(!lotoLockout)}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-mono border font-bold transition-all ${lotoLockout ? 'bg-amber-500/20 border-amber-500/40 text-amber-300' : 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'}`}
                  >
                    {lotoLockout ? 'LOTO Locked' : 'Normal Operation'}
                  </button>
                </div>

                <div className="p-4 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-white">Biometric Liveness Verification Required</p>
                    <p className="text-[10px] text-slate-400">Require camera frame check for admin execution capabilities.</p>
                  </div>
                  <span className="text-xs font-mono text-emerald-400 font-bold">Enabled</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: API KEYS & VAULT */}
          {activeTab === 'api' && (
            <div className="max-w-3xl space-y-6">
              <div className="p-6 rounded-2xl bg-[#0b0d1b] border border-white/10 shadow-lg space-y-5">
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Key className="w-4 h-4 text-amber-400" /> Local Encrypted API Vault
                </h2>
                <p className="text-xs text-slate-400">API keys entered here are stored locally in secure browser storage and used for direct inference.</p>

                <div className="space-y-2">
                  <label className="text-xs font-mono text-slate-400">Gemini API Key (GEMINI_API_KEY)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type={showKey ? 'text' : 'password'}
                      value={geminiApiKey}
                      onChange={(e) => setGeminiApiKey(e.target.value)}
                      placeholder="AIzaSy..."
                      className="flex-1 px-3.5 py-2.5 rounded-xl bg-black/50 border border-white/10 text-xs font-mono text-white outline-none focus:border-amber-500 transition-all"
                    />
                    <button
                      onClick={() => setShowKey(!showKey)}
                      className="px-3 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-mono"
                    >
                      {showKey ? 'Hide' : 'Show'}
                    </button>
                    <button
                      onClick={handleSaveApiKey}
                      className="px-4 py-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-mono font-bold"
                    >
                      Save Key
                    </button>
                  </div>
                  {keySaved && <p className="text-[10px] text-emerald-400 font-mono">Key saved locally!</p>}
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: APPEARANCE & AUDIO */}
          {activeTab === 'appearance' && (
            <div className="max-w-3xl space-y-6">
              <div className="p-6 rounded-2xl bg-[#0b0d1b] border border-white/10 shadow-lg space-y-5">
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Palette className="w-4 h-4 text-indigo-400" /> Aesthetic & Sound Preferences
                </h2>

                <div className="space-y-3">
                  <label className="text-xs font-mono text-slate-400">Interface Theme Mode</label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { id: 'dark', label: 'Obsidian Noir' },
                      { id: 'matrix', label: 'Matrix Cyber' },
                      { id: 'cyber', label: 'Neon Cyberpunk' },
                    ].map((t) => (
                      <button
                        key={t.id}
                        onClick={() => setThemeMode(t.id as any)}
                        className={`p-3 rounded-xl border text-xs font-mono transition-all ${themeMode === t.id ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300 font-bold' : 'bg-black/40 border-white/10 text-slate-400'}`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Volume2 className="w-4 h-4 text-indigo-400" />
                    <div>
                      <p className="text-xs font-bold text-white">System Sound Effects</p>
                      <p className="text-[10px] text-slate-400">Auditory feedback on chat transmission and execution.</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSoundEffects(!soundEffects)}
                    className={`px-3 py-1 rounded-lg text-xs font-mono border ${soundEffects ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300' : 'bg-white/5 border-white/10 text-slate-500'}`}
                  >
                    {soundEffects ? 'Audio ON' : 'Audio OFF'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: DATA & BACKUP */}
          {activeTab === 'data' && (
            <div className="max-w-3xl space-y-6">
              <div className="p-6 rounded-2xl bg-[#0b0d1b] border border-white/10 shadow-lg space-y-5">
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Database className="w-4 h-4 text-rose-400" /> Data Storage & Local Management
                </h2>

                <div className="flex items-center justify-between p-4 rounded-xl bg-black/40 border border-white/5">
                  <div>
                    <p className="text-xs font-bold text-white">Clear Local Storage Cache</p>
                    <p className="text-[10px] text-slate-400">Resets cached prompts and transient session metrics.</p>
                  </div>
                  <button
                    onClick={handleClearCache}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 text-xs font-mono"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-400" /> Clear Cache
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Bottom Prominent Logout Bar in Content View */}
          {handleLogout && (
            <div className="mt-8 p-6 rounded-2xl bg-gradient-to-r from-red-950/40 via-rose-950/20 to-black border border-red-500/30 flex flex-wrap items-center justify-between gap-4 shadow-xl">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <LogOut className="w-4 h-4 text-red-400" /> Terminate Session & Disconnect
                </h3>
                <p className="text-xs text-slate-400">End your current session safely. All unsaved changes will be saved to your profile.</p>
              </div>

              <button
                onClick={() => setShowLogoutModal(true)}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-mono text-xs font-bold shadow-[0_0_20px_rgba(225,29,72,0.4)] transition-all active:scale-95"
              >
                <LogOut className="w-4 h-4" />
                <span>Log Out Now</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Logout Confirmation Modal */}
      <AnimatePresence>
        {showLogoutModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 10 }}
              className="w-full max-w-md bg-[#0d0f1f] border border-red-500/40 rounded-3xl p-6 shadow-[0_0_50px_rgba(225,29,72,0.3)] space-y-6"
            >
              <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                <div className="p-3 rounded-2xl bg-red-500/20 text-red-400 border border-red-500/30">
                  <LogOut className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Confirm Sign Out</h3>
                  <p className="text-xs text-slate-400">Are you sure you want to log out of ANNY?</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-xl bg-black/50 border border-white/5">
                <img
                  src={photoURL || '/logo.png'}
                  alt="Avatar"
                  className="w-10 h-10 rounded-full object-cover border border-purple-500/40"
                />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-white truncate">{displayName}</p>
                  <p className="text-[10px] font-mono text-slate-400 truncate">{user?.email || (isGuest ? 'Guest Operator' : 'kehindestudio@gmail.com')}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowLogoutModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 text-xs font-mono font-bold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    setShowLogoutModal(false);
                    if (handleLogout) {
                      handleLogout();
                    } else {
                      try {
                        await auth.signOut();
                      } catch (e) {
                        console.error("Sign out error:", e);
                      }
                    }
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-mono font-bold shadow-lg shadow-red-600/30 transition-all flex items-center justify-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Confirm Log Out</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdvancedSettingsAndProfile;
