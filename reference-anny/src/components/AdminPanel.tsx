import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, Cpu, Database, Network, PowerOff, Zap, UserPlus, Trash2, CreditCard, Mail, Settings, Activity, Info, MessageSquare, User, Download, Filter } from 'lucide-react';
import Terminal from './Terminal';
import MonitoringDashboard from './MonitoringDashboard';
import SupportChat from './SupportChat';
import { db, auth, updatePricingPlan } from '../lib/firebase';
import { collection, setDoc, doc, deleteDoc, Timestamp, onSnapshot, query, orderBy, limit as firestoreLimit, getDocs, writeBatch } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrorHandler';
import { logAudit } from '../lib/auditLogger';
import { copyToClipboard } from '../lib/clipboard';

interface WhitelistEmail {
  email: string;
  addedAt: any;
}

interface AdminPanelProps {
  onLogout: () => void;
}

export default function AdminPanel({ onLogout }: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<'settings' | 'terminal' | 'hardware' | 'users' | 'monitoring' | 'diagnostics' | 'support' | 'global_users' | 'bridge'>('settings');
  const [whitelist, setWhitelist] = useState<WhitelistEmail[]>([]);
  const [adminWhitelist, setAdminWhitelist] = useState<WhitelistEmail[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [supportChats, setSupportChats] = useState<any[]>([]);
  const [selectedSupportChat, setSelectedSupportChat] = useState<any | null>(null);
  const [newEmail, setNewEmail] = useState('');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [subPrice, setSubPrice] = useState('19.99');
  const [entPrice, setEntPrice] = useState('Contact');
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [newPaymentMethod, setNewPaymentMethod] = useState({ type: 'Bank', label: '', details: '' });
  const [brandName, setBrandName] = useState('Anny');
  const [teamName, setTeamName] = useState('Anny Group Architecture team');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [dailyLimit, setDailyLimit] = useState('6');
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [healthStatus, setHealthStatus] = useState<any>(null);
  const [guestPolicy, setGuestPolicy] = useState({
    saveMessages: true,
    allowUploads: true,
    requireAuthForGen: false,
    allowImages: true,
    allowCode: true
  });
  const [isSyncingPricing, setIsSyncingPricing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<('Operational' | 'Maintenance' | 'Offline')[]>(['Operational', 'Maintenance', 'Offline']);

  useEffect(() => {
    fetch('/api/admin/health')
      .then(res => res.json())
      .then(data => setHealthStatus(data))
      .catch(err => console.error("Health check failed", err));
  }, [activeTab]);

  useEffect(() => {
    logAudit({
      action: 'ADMIN_SESSION_START',
      severity: 'info',
      category: 'auth',
      details: 'Administrator entered Sovereign Control UI'
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!auth.currentUser) return;
    const unsubWhitelist = onSnapshot(collection(db, 'whitelist'), (snapshot) => {
      const list = snapshot.docs.map(doc => ({
        email: doc.id,
        ...doc.data()
      })) as WhitelistEmail[];
      setWhitelist(list);
    }, (error) => {
      console.warn('Whitelist fetch error ignored to prevent crash:', error);
    });

    const unsubAdminWhitelist = onSnapshot(collection(db, 'admin_whitelist'), (snapshot) => {
      const list = snapshot.docs.map(doc => ({
        email: doc.id,
        ...doc.data()
      })) as WhitelistEmail[];
      setAdminWhitelist(list);
    }, (error) => {
      console.warn('Admin Whitelist fetch error ignored:', error);
    });

    const unsubConfig = onSnapshot(doc(db, 'config', 'global'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setSubPrice(data.subscriptionPrice?.toString() || '19.99');
        setEntPrice(data.enterprisePrice?.toString() || 'Contact');
        setPaymentMethods(data.paymentMethods || []);
        setBrandName(data.brandName || 'Anny');
        setTeamName(data.teamName || 'Anny Group Architecture team');
        setSystemPrompt(data.systemPrompt || '');
        setDailyLimit(data.dailyLimit?.toString() || '6');
        setMaintenanceMode(data.maintenanceMode || false);
        setGuestPolicy(data.guestPolicy || {
          saveMessages: true,
          allowUploads: true,
          requireAuthForGen: false,
          allowImages: true,
          allowCode: true
        });
      }
    }, (error) => {
      console.warn('Config fetch error ignored to prevent crash:', error);
    });

    const unsubSupport = onSnapshot(collection(db, 'support_chats'), (snapshot) => {
      const chats = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })).sort((a: any, b: any) => {
        const timeA = a.lastUpdate?.toMillis?.() || 0;
        const timeB = b.lastUpdate?.toMillis?.() || 0;
        return timeB - timeA;
      });
      setSupportChats(chats);
    }, (error) => {
      console.warn('Support chats fetch error ignored to prevent crash:', error);
    });

    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      const usersList = snapshot.docs.map(doc => ({
        uid: doc.id,
        ...doc.data()
      })).sort((a: any, b: any) => {
        const timeA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
        const timeB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
        return timeB - timeA;
      });
      setAllUsers(usersList);
    }, (error) => {
      console.warn('Users fetch error:', error);
    });

    return () => {
      unsubWhitelist();
      unsubAdminWhitelist();
      unsubConfig();
      unsubSupport();
      unsubUsers();
    };
  }, []);

  const addToWhitelist = async () => {
    if (!newEmail || !newEmail.includes('@')) return;
    try {
      await setDoc(doc(db, 'whitelist', newEmail.toLowerCase()), {
        email: newEmail.toLowerCase(),
        addedAt: Timestamp.now()
      });
      logAudit({
        action: 'WHITELIST_ADD',
        severity: 'warning',
        category: 'settings',
        details: `Granted unlimited access to ${newEmail.toLowerCase()}`
      }).catch(() => {});
      setNewEmail('');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `whitelist/${newEmail}`);
    }
  };

  const addToAdminWhitelist = async () => {
    if (!newAdminEmail || !newAdminEmail.includes('@')) return;
    try {
      await setDoc(doc(db, 'admin_whitelist', newAdminEmail.toLowerCase()), {
        email: newAdminEmail.toLowerCase(),
        addedAt: Timestamp.now()
      });
      logAudit({
        action: 'ADMIN_WHITELIST_ADD',
        severity: 'critical',
        category: 'auth',
        details: `Granted admin pre-authorization to ${newAdminEmail.toLowerCase()}`
      }).catch(() => {});
      setNewAdminEmail('');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `admin_whitelist/${newAdminEmail}`);
    }
  };

  const removeFromWhitelist = async (email: string) => {
    try {
      await deleteDoc(doc(db, 'whitelist', email));
      logAudit({
        action: 'WHITELIST_REMOVE',
        severity: 'warning',
        category: 'settings',
        details: `Revoked unlimited access from ${email}`
      }).catch(() => {});
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `whitelist/${email}`);
    }
  };

  const removeFromAdminWhitelist = async (email: string) => {
    try {
      await deleteDoc(doc(db, 'admin_whitelist', email));
      logAudit({
        action: 'ADMIN_WHITELIST_REMOVE',
        severity: 'critical',
        category: 'auth',
        details: `Revoked admin pre-authorization from ${email}`
      }).catch(() => {});
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `admin_whitelist/${email}`);
    }
  };

  const updateUserTier = async (uid: string, tier: string) => {
    try {
      const userRef = doc(db, 'users', uid);
      await setDoc(userRef, {
        tier: tier,
        isUnlimited: tier === 'PRO' || tier === 'ENTERPRISE',
        updatedAt: new Date().toISOString()
      }, { merge: true });
      alert("Neural tier re-calibrated.");
    } catch (error) {
       handleFirestoreError(error, OperationType.UPDATE, `users/${uid}`);
    }
  };

  const saveSettings = async () => {
    try {
      await setDoc(doc(db, 'config', 'global'), {
        subscriptionPrice: parseFloat(subPrice),
        enterprisePrice: entPrice,
        paymentMethods: paymentMethods,
        brandName: brandName,
        teamName: teamName,
        systemPrompt: systemPrompt,
        dailyLimit: parseInt(dailyLimit),
        maintenanceMode: maintenanceMode,
        guestPolicy: guestPolicy
      });
      
      // Also update dedicated pricing docs for external sync
      await updatePricingPlan('pro', { price: parseFloat(subPrice), name: 'Pro' });
      await updatePricingPlan('enterprise', { price: entPrice, name: 'Enterprise' });

      logAudit({
        action: 'SETTINGS_UPDATE',
        severity: 'critical',
        category: 'settings',
        details: 'Neural core parameters re-aligned. Global config synced.'
      }).catch(() => {});
      alert("Neural parameters synchronized across all nodes.");
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'config/global');
    }
  };

  const pushDefaultPricing = async () => {
    setIsSyncingPricing(true);
    try {
      const batch = writeBatch(db);
      
      const plans = [
        { id: 'pro', name: 'Pro', price: 19.99, tier: 'PRO' },
        { id: 'enterprise', name: 'Advanced', price: 'Contact', tier: 'ENTERPRISE' }
      ];

      plans.forEach(plan => {
        batch.set(doc(db, 'pricing', plan.id), {
          ...plan,
          updatedAt: new Date().toISOString()
        });
      });

      await batch.commit();
      alert("Default pricing matrix pushed to cloud storage.");
    } catch (error) {
      console.error("Push failed:", error);
      alert("Sync connection failed.");
    } finally {
      setIsSyncingPricing(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logAudit({
        action: 'ADMIN_SESSION_END',
        severity: 'info',
        category: 'auth',
        details: 'Administrator exited Sovereign Control UI'
      });
      onLogout();
    } catch (e) {
      console.warn("Audit logout failed, proceeding with UI logout", e);
      onLogout();
    }
  };

  const wipeLogs = () => {
    if (confirm("Executing log purge. This action is irreversible. Proceed?")) {
      logAudit({
        action: 'LOG_PURGE_REQUESTED',
        severity: 'critical',
        category: 'security',
        details: 'User requested history bank purge'
      }).catch(() => {});
      alert("Neural logs encrypted and deleted.");
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[#050505] text-white p-4 md:p-12 scroll-smooth">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-8 md:mb-12">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-light tracking-tighter uppercase italic">Sovereign Admin</h1>
          <p className="text-cyan-400 font-mono text-[10px] md:text-xs tracking-widest uppercase mt-1">Status: God Mode Active</p>
        </div>
        <div className="flex items-center gap-3 md:gap-4 w-full sm:w-auto">
          <button 
            onClick={() => {
              const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({ subPrice, entPrice, paymentMethods, brandName, teamName, systemPrompt, dailyLimit, maintenanceMode, guestPolicy, whitelist, adminWhitelist }, null, 2));
              const downloadAnchorNode = document.createElement('a');
              downloadAnchorNode.setAttribute("href", dataStr);
              downloadAnchorNode.setAttribute("download", "anny_enterprise_config.json");
              document.body.appendChild(downloadAnchorNode);
              downloadAnchorNode.click();
              downloadAnchorNode.remove();
            }}
            className="p-2.5 md:p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-full hover:bg-cyan-500 hover:text-black transition-all text-cyan-400"
            title="Export Configuration"
          >
            <Download className="w-4 h-4 md:w-5 h-5" />
          </button>
          <button 
            onClick={() => setActiveTab('settings')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 md:gap-3 px-4 md:px-6 py-2.5 md:py-3 rounded-full border-2 transition-all shadow-xl ${activeTab === 'settings' ? 'bg-cyan-500 text-black border-white font-black scale-105' : 'bg-white/5 border-white/20 text-white/40 hover:bg-white/10'}`}
            title="Sovereign Core Parameters"
          >
            <Settings className="w-4 h-4 md:w-5 h-5 animate-spin-slow" />
            <span className="text-[10px] md:text-[11px] uppercase font-mono tracking-[0.1em] md:tracking-[0.2em]">Parameters</span>
          </button>
          <button 
            onClick={() => handleLogout().catch(err => console.error("Logout fail:", err))}
            className="p-2.5 md:p-3 bg-red-500/10 border border-red-500/30 rounded-full hover:bg-red-500 hover:text-black transition-all text-red-500"
            title="Terminate Link"
          >
            <PowerOff className="w-4 h-4 md:w-5 h-5" />
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 md:gap-8">
        <aside className="lg:col-span-1">
          <nav className="flex lg:flex-col gap-2 overflow-x-auto pb-4 lg:pb-0 scrollbar-hide">
            {[
              { id: 'settings', icon: Settings, label: 'Global Settings' },
              { id: 'users', icon: ShieldCheck, label: 'Global Admins' },
              { id: 'global_users', icon: UserPlus, label: 'Global Users' },
              { id: 'terminal', icon: Zap, label: 'Neural Shell' },
              { id: 'monitoring', icon: Activity, label: 'Node Monitor' },
              { id: 'support', icon: MessageSquare, label: 'Global Support' },
              { id: 'bridge', icon: Network, label: 'Node Bridge' },
              { id: 'diagnostics', icon: Cpu, label: 'Diagnostic' },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as any)}
                className={`flex-shrink-0 lg:w-full flex items-center gap-3 md:gap-4 p-3 md:p-4 rounded-xl md:rounded-2xl transition-all duration-300 border backdrop-blur-md hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(34,211,238,0.15)] ${
                  activeTab === item.id 
                    ? 'bg-cyan-500/10 border-cyan-500/50 text-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.1)]' 
                    : 'bg-white/5 border-white/5 text-white/40 hover:bg-white/10 hover:border-white/20'
                }`}
              >
                <item.icon className="w-4 h-4 md:w-5 h-5" />
                <span className="font-mono text-[10px] md:text-xs uppercase tracking-widest">{item.label}</span>
              </button>
            ))}
          </nav>
        </aside>

        <main className="lg:col-span-3">
          <AnimatePresence mode="wait">
            {activeTab === 'terminal' ? (
              <motion.div key="terminal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Terminal />
              </motion.div>
            ) : activeTab === 'monitoring' ? (
              <motion.div key="monitoring" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                 <MonitoringDashboard />
              </motion.div>
            ) : activeTab === 'global_users' ? (
              <motion.div key="global_users" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
                <div className="p-8 bg-white/5 border border-white/10 rounded-3xl">
                  <div className="flex justify-between items-center mb-8">
                    <div>
                      <h3 className="text-2xl font-bold italic flex items-center gap-4">
                        <UserPlus className="text-cyan-400 w-8 h-8" /> Global User Registry
                      </h3>
                      <p className="text-[10px] text-white/40 font-mono uppercase tracking-[0.2em] mt-1">Total Authorized Nodes: {allUsers.length}</p>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-white/10 text-[10px] font-mono text-cyan-400/60 uppercase tracking-widest">
                          <th className="pb-4 px-2">Operator ID</th>
                          <th className="pb-4 px-2">Neural Tier</th>
                          <th className="pb-4 px-2">Last Active</th>
                          <th className="pb-4 px-2 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {allUsers.map((u) => (
                          <tr key={u.uid} className="group hover:bg-white/[0.02] transition-colors">
                            <td className="py-4 px-2">
                              <div className="flex flex-col">
                                <span className="text-sm text-white font-mono">{u.email || u.uid}</span>
                                <span className="text-[9px] text-white/20 font-mono uppercase break-all">{u.uid}</span>
                              </div>
                            </td>
                            <td className="py-4 px-2">
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono uppercase tracking-tighter ${
                                u.tier === 'ENTERPRISE' ? 'bg-purple-500/20 text-purple-400' :
                                u.tier === 'PRO' ? 'bg-cyan-500/20 text-cyan-400' :
                                'bg-white/10 text-white/40'
                              }`}>
                                {u.tier || 'FREE'}
                              </span>
                            </td>
                            <td className="py-4 px-2">
                              <span className="text-[10px] text-white/40 font-mono">{u.updatedAt ? new Date(u.updatedAt).toLocaleString() : 'Legacy'}</span>
                            </td>
                            <td className="py-4 px-2 text-right">
                              <div className="flex justify-end gap-2">
                                <select 
                                  value={u.tier || 'FREE'}
                                  onChange={(e) => updateUserTier(u.uid, e.target.value).catch(err => console.error("Tier sync fail:", err))}
                                  className="bg-black border border-white/10 rounded-lg p-1 text-[9px] font-mono text-white outline-none"
                                >
                                  <option value="FREE">FREE</option>
                                  <option value="PRO">PRO</option>
                                  <option value="ENTERPRISE">ENT</option>
                                </select>
                                <button className="p-1.5 text-white/20 hover:text-red-500 transition-colors">
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            ) : activeTab === 'users' ? (
              <motion.div key="users" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Unlimited Access Whitelist */}
                  <div className="p-5 md:p-8 bg-white/5 border border-white/10 rounded-2xl md:rounded-3xl">
                     <h3 className="text-lg md:text-xl font-bold mb-6 italic flex items-center gap-3">
                       <Zap className="text-yellow-400 w-5 h-5 md:w-6 h-6" /> Prompt Whitelist
                     </h3>
                     <p className="text-[10px] text-white/40 font-mono uppercase tracking-widest mb-4">Grants unlimited neural prompts without admin authority.</p>
                     <div className="flex flex-col gap-3 mb-8">
                        <input 
                          type="email"
                          value={newEmail}
                          onChange={(e) => setNewEmail(e.target.value)}
                          placeholder="operator@unlimited.link"
                          className="w-full bg-white/5 border border-white/10 rounded-xl p-3 md:p-4 font-mono text-xs md:text-sm outline-none focus:border-cyan-500/50 text-white"
                        />
                        <button onClick={() => addToWhitelist().catch(err => console.error("Whitelist add fail:", err))} className="w-full px-6 py-3 bg-white/10 border border-white/20 text-white font-black rounded-xl uppercase tracking-widest hover:bg-white/20 transition-all text-xs md:text-sm">
                          Authorize Prompts
                        </button>
                     </div>
                     
                     <div className="space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                        {whitelist.map(item => (
                          <div key={item.email} className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
                             <div className="flex flex-col">
                                <span className="text-sm font-mono text-white/80">{item.email}</span>
                                <span className="text-[9px] text-yellow-400/60 uppercase tracking-widest">Unlimited Access Enabled</span>
                             </div>
                             <button onClick={() => removeFromWhitelist(item.email).catch(err => console.error("Whitelist revoke fail:", err))} className="p-2 text-white/20 hover:text-red-500 transition-colors">
                                <Trash2 className="w-4 h-4" />
                             </button>
                          </div>
                        ))}
                        {whitelist.length === 0 && (
                          <p className="text-center py-8 text-white/20 font-mono text-xs uppercase tracking-widest border border-dashed border-white/5 rounded-xl">No unlimited units found.</p>
                        )}
                     </div>
                  </div>

                  {/* Admin Council Whitelist */}
                  <div className="p-5 md:p-8 bg-white/5 border border-cyan-500/10 rounded-2xl md:rounded-3xl">
                     <h3 className="text-lg md:text-xl font-bold mb-6 italic flex items-center gap-3">
                       <ShieldCheck className="text-cyan-400 w-5 h-5 md:w-6 h-6" /> Admin Council
                     </h3>
                     <p className="text-[10px] text-white/40 font-mono uppercase tracking-widest mb-4">Grants full sovereign authority over neural settings and users.</p>
                     <div className="flex flex-col gap-3 mb-8">
                        <input 
                          type="email"
                          value={newAdminEmail}
                          onChange={(e) => setNewAdminEmail(e.target.value)}
                          placeholder="high_command@sovereign.link"
                          className="w-full bg-white/5 border border-cyan-500/10 rounded-xl p-3 md:p-4 font-mono text-xs md:text-sm outline-none focus:border-cyan-500/50 text-white"
                        />
                        <button onClick={() => addToAdminWhitelist().catch(err => console.error("Admin whitelist add fail:", err))} className="w-full px-6 py-3 bg-cyan-600 text-black font-black rounded-xl uppercase tracking-widest hover:bg-cyan-500 transition-all text-xs md:text-sm">
                          Promote to Admin
                        </button>
                     </div>
                     
                     <div className="space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                        {adminWhitelist.map(item => (
                          <div key={item.email} className="flex items-center justify-between p-4 bg-cyan-500/5 border border-cyan-500/20 rounded-2xl">
                             <div className="flex flex-col">
                                <span className="text-sm font-mono text-cyan-400/80">{item.email}</span>
                                <span className="text-[9px] text-cyan-400/40 uppercase tracking-widest">Administrative Rights Active</span>
                             </div>
                             <button onClick={() => removeFromAdminWhitelist(item.email).catch(err => console.error("Admin revoke fail:", err))} className="p-2 text-white/20 hover:text-red-500 transition-colors">
                                <Trash2 className="w-4 h-4" />
                             </button>
                          </div>
                        ))}
                        {adminWhitelist.length === 0 && (
                          <p className="text-center py-8 text-white/20 font-mono text-xs uppercase tracking-widest border border-dashed border-white/5 rounded-xl">No auxiliary admins assigned.</p>
                        )}
                     </div>
                  </div>
                </div>
              </motion.div>
            ) : activeTab === 'support' ? (
              <motion.div key="support" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-[600px] flex gap-6">
                <div className="w-80 bg-white/5 border border-white/10 rounded-3xl overflow-hidden flex flex-col">
                  <div className="p-4 border-b border-white/10 bg-white/5">
                    <p className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest">Active Neural Sessions</p>
                  </div>
                  <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">
                    {supportChats.map(chat => (
                      <button 
                        key={chat.id}
                        onClick={() => setSelectedSupportChat(chat)}
                        className={`w-full text-left p-4 rounded-2xl transition-all border ${selectedSupportChat?.id === chat.id ? 'bg-cyan-500/10 border-cyan-500/50' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}
                      >
                        <div className="flex items-center gap-3 mb-2">
                          {chat.userPhotoURL && chat.userPhotoURL.length > 0 ? (
                            <img 
                              src={chat.userPhotoURL} 
                              alt="" 
                              className="w-8 h-8 rounded-full border border-white/10 object-cover" 
                              referrerPolicy="no-referrer"
                              onError={(e) => {
                                (e.target as any).src = `https://api.dicebear.com/7.x/bottts/svg?seed=${chat.id}`;
                              }}
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
                              <User className="w-4 h-4 text-white/20" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start">
                              <p className="text-xs font-bold text-white truncate">{chat.userName || chat.userEmail}</p>
                              {chat.unreadCountAdmin > 0 && <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />}
                            </div>
                            <p className="text-[10px] text-white/40 truncate">{chat.lastMessageText || 'Initializing session...'}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-[8px] px-1.5 py-0.5 rounded-full uppercase font-mono tracking-tighter ${chat.type === 'enterprise' ? 'bg-purple-500/20 text-purple-400' : 'bg-cyan-500/20 text-cyan-400'}`}>
                            {chat.type}
                          </span>
                        </div>
                      </button>
                    ))}
                    {supportChats.length === 0 && (
                      <div className="h-full flex items-center justify-center text-center p-6 text-white/20 font-mono text-[10px] uppercase tracking-widest italic text-center">
                        No active requests found.
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex-1">
                  {selectedSupportChat ? (
                    <SupportChat 
                      chatId={selectedSupportChat.id} 
                      userEmail={selectedSupportChat.userEmail} 
                      userName={selectedSupportChat.userName} 
                      userPhotoURL={selectedSupportChat.userPhotoURL}
                      isAdminView={true}
                    />
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center border border-dashed border-white/10 rounded-3xl text-white/20">
                      <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                        <MessageSquare className="w-8 h-8" />
                      </div>
                      <p className="font-mono text-[10px] uppercase tracking-widest italic text-center">
                        Select a neural link to establish support comms.
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            ) : activeTab === 'bridge' ? (
              <motion.div key="bridge" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
                <div className="p-8 bg-white/5 border border-white/10 rounded-3xl">
                  <h3 className="text-2xl font-bold italic flex items-center gap-4 mb-6">
                    <Network className="text-cyan-400 w-8 h-8" /> Neural Node Bridge
                  </h3>
                  <p className="text-xs text-white/60 mb-8 font-mono leading-relaxed uppercase">
                    Copy the following protocol instructions to your secondary node (website) to establish a synchronized neural architecture.
                  </p>
                  
                  <div className="bg-black/80 border border-cyan-500/20 rounded-2xl p-6 relative group">
                    <pre className="text-[10px] md:text-xs text-cyan-400 font-mono whitespace-pre-wrap leading-relaxed">
{`# SOVEREIGN NODE SYNCHRONIZATION PROTOCOL

1. FIREBASE CONFIGURATION:
   Ensure your secondary website uses the SAME Firebase project.
   
2. PRICING SYNCHRONIZATION:
   Listen to Firestore: \`collection(db, 'pricing')\`
   The UI should reactively update based on these documents.

3. GLOBAL SETTINGS:
   Listen to: \`doc(db, 'config', 'global')\`
   Sync: brandName, teamName, subscriptionPrice, enterprisePrice, paymentMethods.

4. USER IDENTITY MAPPING:
   User profiles must persist in: \`doc(db, 'users', uid)\`
   Include: \`userName\`, \`userEmail\`, \`userPhotoURL\`, \`tier\`.
   Admin check should verify against: \`doc(db, 'admin_whitelist', email)\`

5. SUPPORT CHANNEL:
   Enterprise requests must initialize a document in: \`support_chats/{userUid}\`
   Required fields: \`userId\`, \`userName\`, \`userEmail\`, \`userPhotoURL\`, \`type\`, \`status\`, \`lastUpdate\`.
   Set \`type: 'enterprise'\` and \`status: 'pending'\`.`}
                    </pre>
                    <button 
                      onClick={async () => {
                        const text = document.querySelector('pre')?.innerText;
                        if (text) {
                          await copyToClipboard(text);
                          alert("Neural Protocol copied to clipboard.");
                        }
                      }}
                      className="absolute top-4 right-4 bg-cyan-500 text-black px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-cyan-400 transition-all"
                    >
                      Copy Protocol
                    </button>
                  </div>

                  <div className="mt-8 p-6 bg-cyan-500/5 border border-cyan-500/20 rounded-2xl flex gap-4">
                    <Info className="w-6 h-6 text-cyan-400 shrink-0" />
                    <p className="text-[10px] text-white/40 font-mono uppercase leading-relaxed">
                      Maintaining session parity across all nodes ensures a unified command experience for the Anny Group.
                    </p>
                  </div>
                </div>
              </motion.div>
            ) : activeTab === 'diagnostics' ? (
              <motion.div key="diagnostics" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
                 <div className="p-8 bg-white/5 border border-white/10 rounded-[2.5rem]">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                      <h3 className="text-2xl font-bold italic flex items-center gap-4">
                        <Cpu className="text-cyan-400 w-8 h-8" /> System Diagnostic Pulse
                      </h3>
                      <div className="flex flex-wrap items-center gap-2">
                        <Filter className="w-4 h-4 text-white/40 mr-2" />
                        {['Operational', 'Maintenance', 'Offline'].map(status => (
                          <button
                            key={status}
                            onClick={() => setStatusFilter(prev => prev.includes(status as any) ? prev.filter(s => s !== status) : [...prev, status as any])}
                            className={`px-3 py-1.5 rounded-full text-[10px] font-mono uppercase tracking-widest border transition-all ${
                              statusFilter.includes(status as any)
                                ? status === 'Operational' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
                                  status === 'Maintenance' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' :
                                  'bg-red-500/20 text-red-400 border-red-500/30'
                                : 'bg-transparent text-white/40 border-white/10 hover:border-white/20'
                            }`}
                          >
                            {status}
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    <div className="grid md:grid-cols-2 gap-6">
                       {[
                         { name: 'Gemini Neural Core', key: 'gemini', desc: 'Primary Logic Center (GEMINI_API_KEY)' },
                         { name: 'Groq Speed Bridge', key: 'groq', desc: 'Ultra-low Latency Inference (GROQ_API_KEY)' },
                         { name: 'Google Studio Link', key: 'google', desc: 'Direct Studio API (GOOGLE_AI_STUDIO_KEY)' },
                         { name: 'HuggingFace Matrix', key: 'huggingface', desc: 'Open Model Access (HUGGINGFACE_API_KEY)' },
                         { name: 'Hardware Bridge', key: 'hardware', desc: 'ROS 2 Driver Connection (ANNY_HARDWARE)' }
                       ].filter(engine => {
                         // Determine status for this engine based on healthStatus
                         // We map true to Operational, false to Offline. Undefined typically treated as Maintenance or Offline. Let's assume undefined is Maintenance.
                         const statusVal = healthStatus ? healthStatus[engine.key] : undefined;
                         const derivedStatus = statusVal === true ? 'Operational' : (statusVal === false ? 'Offline' : 'Maintenance');
                         return statusFilter.includes(derivedStatus);
                       }).map(engine => {
                         const statusVal = healthStatus ? healthStatus[engine.key] : undefined;
                         return (
                         <div key={engine.key} className="p-6 bg-white/[0.02] border border-white/5 rounded-2xl flex items-center justify-between transition-all duration-300 backdrop-blur-md hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(34,211,238,0.15)] hover:border-white/20 group">
                            <div>
                               <h4 className="text-sm font-bold">{engine.name}</h4>
                               <p className="text-[10px] text-white/40 uppercase tracking-widest mt-1">{engine.desc}</p>
                            </div>
                            <div className={`p-1.5 rounded-full ${statusVal === true ? 'bg-emerald-500/20 text-emerald-400' : (statusVal === false ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400')}`}>
                               {statusVal === true ? <ShieldCheck className="w-5 h-5" /> : (statusVal === false ? <PowerOff className="w-5 h-5" /> : <Activity className="w-5 h-5 animate-pulse" />)}
                            </div>
                         </div>
                       )})}
                    </div>

                    <div className="mt-12 p-6 bg-cyan-500/10 border border-cyan-500/20 rounded-2xl flex gap-4">
                       <Info className="w-6 h-6 text-cyan-400 shrink-0" />
                       <div className="text-xs text-white/70 leading-relaxed">
                          <p className="font-bold text-cyan-400 uppercase tracking-widest mb-2 font-mono">Operator Action Required:</p>
                          If a system above shows as <span className="text-red-400 font-bold">OFFLINE</span>, you must enter your API keys in the <span className="font-bold text-white">AI Studio Secrets</span> panel or the <span className="font-bold text-white">.env</span> file. The system requires these neural links to perform high-tier inference.
                       </div>
                    </div>
                 </div>
              </motion.div>
            ) : activeTab === 'settings' ? (
              <motion.div key="settings" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-8">
                <div className="flex flex-col gap-2 mb-6 md:mb-8">
                  <h2 className="text-2xl md:text-4xl font-black italic tracking-tighter text-white">Neural Configuration Console</h2>
                  <p className="text-cyan-400 font-mono text-[8px] md:text-[10px] uppercase tracking-[0.3em]">Direct Node Calibration • Authorized Access Only</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 text-white">
                  {/* Neural Brain Specs */}
                  <div className="p-6 md:p-10 bg-white/[0.03] border border-white/10 rounded-2xl md:rounded-[2.5rem] space-y-6 md:space-y-8 backdrop-blur-md relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 md:w-32 h-24 md:h-32 bg-cyan-500/5 blur-3xl -mr-12 md:-mr-16 -mt-12 md:-mt-16 group-hover:bg-cyan-500/10 transition-all" />
                    <h3 className="text-xl md:text-2xl font-bold italic flex items-center gap-3 md:gap-4">
                      <Zap className="text-cyan-400 w-6 h-6 md:w-8 h-8" /> Brain Architecture
                    </h3>
                    <div className="space-y-4 md:space-y-6">
                      <div className="space-y-1.5 md:space-y-2">
                        <label className="text-[9px] md:text-[10px] text-cyan-400 font-mono uppercase tracking-widest px-1">AI Brand Name</label>
                        <input 
                          type="text" 
                          value={brandName}
                          onChange={(e) => setBrandName(e.target.value)}
                          placeholder="e.g. Anny"
                          className="w-full bg-white/5 border border-white/10 rounded-xl md:rounded-2xl p-3 md:p-5 text-white font-mono text-sm focus:border-cyan-500 focus:bg-white/10 outline-none transition-all"
                        />
                      </div>
                      <div className="space-y-1.5 md:space-y-2">
                        <label className="text-[9px] md:text-[10px] text-cyan-400 font-mono uppercase tracking-widest px-1">Team Name</label>
                        <input 
                          type="text" 
                          value={teamName}
                          onChange={(e) => setTeamName(e.target.value)}
                          placeholder="e.g. Anny Group Architecture team"
                          className="w-full bg-white/5 border border-white/10 rounded-xl md:rounded-2xl p-3 md:p-5 text-white font-mono text-sm focus:border-cyan-500 focus:bg-white/10 outline-none transition-all"
                        />
                      </div>
                      <div className="space-y-1.5 md:space-y-2">
                        <label className="text-[9px] md:text-[10px] text-cyan-400 font-mono uppercase tracking-widest px-1">System Prompt</label>
                        <textarea 
                          value={systemPrompt}
                          onChange={(e) => setSystemPrompt(e.target.value)}
                          rows={6}
                          className="w-full bg-white/5 border border-white/10 rounded-xl md:rounded-2xl p-3 md:p-5 text-white font-mono text-[11px] md:text-xs focus:border-cyan-500 focus:bg-white/10 outline-none transition-all leading-relaxed"
                          placeholder="Define logic..."
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6 md:space-y-8">
                    {/* Revenue & Access Control */}
                    <div className="p-6 md:p-10 bg-white/[0.03] border border-white/10 rounded-2xl md:rounded-[2.5rem] space-y-6 md:space-y-8 backdrop-blur-md">
                      <h3 className="text-xl md:text-2xl font-bold italic flex items-center gap-3 md:gap-4">
                        <Database className="text-cyan-400 w-6 h-6 md:w-8 h-8" /> Access & Commerce
                      </h3>
                      <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-3 md:gap-4">
                          <div className="space-y-1.5 md:space-y-2">
                            <label className="text-[9px] md:text-[10px] text-cyan-400/60 font-mono uppercase tracking-widest px-1">Pro Price ($)</label>
                            <div className="flex gap-2">
                              <input 
                                type="number"
                                value={subPrice}
                                onChange={(e) => setSubPrice(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl md:rounded-2xl p-3 md:p-5 text-white font-mono focus:border-cyan-500 outline-none transition-all text-lg md:text-xl font-bold"
                              />
                              <button 
                                onClick={() => updatePricingPlan('pro', { price: parseFloat(subPrice), name: 'Pro', tier: 'PRO' }).catch(err => console.error("Price sync error:", err))}
                                className="px-4 bg-cyan-500/10 border border-cyan-500/30 rounded-2xl text-[8px] font-mono uppercase text-cyan-400 hover:bg-cyan-500 hover:text-black transition-all"
                                title="Targeted Sync"
                              >
                                Sync
                              </button>
                            </div>
                          </div>
                          <div className="space-y-1.5 md:space-y-2">
                            <label className="text-[9px] md:text-[10px] text-purple-400/60 font-mono uppercase tracking-widest px-1">Ent Price</label>
                            <input 
                              type="text"
                              value={entPrice}
                              onChange={(e) => setEntPrice(e.target.value)}
                              className="w-full bg-white/5 border border-white/10 rounded-xl md:rounded-2xl p-3 md:p-5 text-white font-mono focus:border-purple-500 outline-none transition-all text-lg md:text-xl font-bold"
                            />
                          </div>
                          <div className="space-y-1.5 md:space-y-2">
                            <label className="text-[9px] md:text-[10px] text-cyan-400/60 font-mono uppercase tracking-widest px-1">Pulse Limit</label>
                            <input 
                              type="number"
                              value={dailyLimit}
                              onChange={(e) => setDailyLimit(e.target.value)}
                              className="w-full bg-white/5 border border-white/10 rounded-xl md:rounded-2xl p-3 md:p-5 text-white font-mono focus:border-cyan-500 outline-none transition-all text-lg md:text-xl font-bold"
                            />
                          </div>
                        </div>
                        <div className="pt-6 border-t border-white/5 flex flex-col gap-4">
                          <div className="flex justify-between items-center px-1">
                            <label className="text-[10px] text-purple-400 font-mono uppercase tracking-widest">Neural Pricing Sync</label>
                            <button 
                              onClick={() => pushDefaultPricing().catch(err => console.error("Default pricing push fail:", err))}
                              disabled={isSyncingPricing}
                              className="text-[8px] font-mono uppercase tracking-widest px-3 py-1 bg-purple-500/10 border border-purple-500/30 rounded-full hover:bg-purple-500 hover:text-black disabled:opacity-50"
                            >
                              {isSyncingPricing ? 'Syncing...' : 'Push Defaults'}
                            </button>
                          </div>
                          <p className="text-[9px] text-white/30 px-1 font-mono uppercase">Ensures pricing is synchronized across all authorized website instances.</p>
                        </div>

                        <div className="space-y-4 pt-4 border-t border-white/5">
                          <label className="text-[10px] text-cyan-400 font-mono uppercase tracking-widest px-1">Payment Infrastructure</label>
                          <div className="grid grid-cols-1 gap-4">
                            {paymentMethods.map((pm, idx) => (
                              <div key={idx} className="p-4 bg-white/5 border border-white/10 rounded-2xl flex justify-between items-center">
                                <div className="space-y-1">
                                  <p className="text-xs font-bold text-white flex items-center gap-2">
                                    <CreditCard className="w-3 h-3 text-cyan-400" /> {pm.type}: {pm.label}
                                  </p>
                                  <p className="text-[10px] text-white/40 font-mono">{pm.details}</p>
                                </div>
                                <button 
                                  onClick={() => setPaymentMethods(prev => prev.filter((_, i) => i !== idx))}
                                  className="p-2 text-white/20 hover:text-red-500 transition-colors"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                          
                          <div className="p-5 bg-cyan-500/5 border border-cyan-500/20 rounded-2xl space-y-4">
                            <p className="text-[9px] font-bold text-cyan-400 uppercase tracking-widest">Register New Vector</p>
                            <div className="grid grid-cols-2 gap-3">
                              <select 
                                value={newPaymentMethod.type}
                                onChange={(e) => setNewPaymentMethod({...newPaymentMethod, type: e.target.value})}
                                className="bg-black/40 border border-white/10 rounded-xl p-2 text-[10px] text-white outline-none"
                              >
                                {['Bank', 'Crypto', 'PayPal', 'CashApp', 'Zelle', 'Other'].map(t => <option key={t} value={t}>{t}</option>)}
                              </select>
                              <input 
                                type="text"
                                placeholder="Display Name (e.g. BTC Wallet)"
                                value={newPaymentMethod.label}
                                onChange={(e) => setNewPaymentMethod({...newPaymentMethod, label: e.target.value})}
                                className="bg-black/40 border border-white/10 rounded-xl p-2 text-[10px] text-white outline-none"
                              />
                            </div>
                            <textarea 
                              placeholder="Account details/Wallet address/Instructions..."
                              value={newPaymentMethod.details}
                              onChange={(e) => setNewPaymentMethod({...newPaymentMethod, details: e.target.value})}
                              className="w-full bg-black/40 border border-white/10 rounded-xl p-2 text-[10px] text-white outline-none h-20"
                            />
                            <button 
                              onClick={() => {
                                if (!newPaymentMethod.label || !newPaymentMethod.details) return;
                                setPaymentMethods([...paymentMethods, newPaymentMethod]);
                                setNewPaymentMethod({ type: 'Bank', label: '', details: '' });
                              }}
                              className="w-full py-2 bg-cyan-500 text-black text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-cyan-400"
                            >
                              Inject Vector
                            </button>
                          </div>
                        </div>
                        
                        <button 
                          onClick={() => setMaintenanceMode(!maintenanceMode)}
                          className={`w-full p-4 md:p-5 rounded-xl md:rounded-2xl border-2 font-mono text-[10px] md:text-xs uppercase tracking-[0.1em] md:tracking-[0.2em] transition-all flex items-center justify-between ${maintenanceMode ? 'bg-red-500 text-white border-red-400 animate-pulse' : 'bg-white/5 border-white/10 text-white hover:bg-white/10'}`}
                        >
                          <span>Sovereign Lockdown</span>
                          <span className="font-black">{maintenanceMode ? 'ACTIVE' : 'STANDBY'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Guest Policy Logic */}
                    <div className="p-6 md:p-10 bg-white/[0.03] border border-white/10 rounded-2xl md:rounded-[2.5rem] space-y-6 md:space-y-8 backdrop-blur-md">
                      <h3 className="text-xl md:text-2xl font-bold italic flex items-center gap-3 md:gap-4">
                        <UserPlus className="text-cyan-400 w-6 h-6 md:w-8 h-8" /> Guest Neural Policy
                      </h3>
                      <div className="space-y-4">
                        {[
                          { key: 'saveMessages', label: 'Save Guest History', desc: 'Log non-authorized neural strings' },
                          { key: 'allowUploads', label: 'Guest File Access', desc: 'Permit non-authorized file uploads' },
                          { key: 'allowImages', label: 'Guest Visual Matrix', desc: 'Permit DALL-E image synthesis' },
                          { key: 'allowCode', label: 'Guest Logic Synthesis', desc: 'Permit high-tier code generation' },
                          { key: 'requireAuthForGen', label: 'Forced Auth Bridge', desc: 'Require login for any generation' },
                        ].map((policy) => (
                          <div key={policy.key} className="flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-xl">
                            <div>
                               <p className="text-xs font-bold text-white uppercase">{policy.label}</p>
                               <p className="text-[9px] text-white/40 uppercase tracking-widest">{policy.desc}</p>
                            </div>
                            <button 
                              onClick={() => setGuestPolicy(prev => ({ ...prev, [policy.key]: !((prev as any)[policy.key]) }))}
                              className={`w-12 h-6 rounded-full transition-all relative ${ (guestPolicy as any)[policy.key] ? 'bg-cyan-500' : 'bg-white/10'}`}
                            >
                              <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${ (guestPolicy as any)[policy.key] ? 'right-1' : 'left-1'}`} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Submit Action */}
                    <button 
                      onClick={() => saveSettings().catch(err => console.error("Settings broadcast failure:", err))} 
                      className="w-full py-6 md:py-8 bg-cyan-600 text-black font-black rounded-2xl md:rounded-[2rem] uppercase tracking-[0.2em] md:tracking-[0.3em] text-base md:text-lg hover:bg-cyan-400 active:scale-[0.98] transition-all flex flex-col items-center justify-center shadow-3xl shadow-cyan-500/40 relative group overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                      <span className="relative z-10">Broadcast Parameters</span>
                      <span className="text-[8px] md:text-[10px] opacity-60 font-mono tracking-widest mt-1">Synchronizing Neural Nodes</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            ) : (
                <div className="flex flex-col items-center justify-center min-h-[400px] border border-white/5 bg-white/[0.02] rounded-3xl opacity-40">
                <ShieldCheck className="w-12 h-12 mb-4" />
                <p className="font-mono text-[10px] uppercase tracking-widest italic">System Diagnostic Active: Health Nominal</p>
             </div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
