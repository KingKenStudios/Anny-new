import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CreditCard, Check, Zap, ShieldCheck, ArrowLeft, Clock, AlertTriangle, X, Download, MessageSquare } from 'lucide-react';
import { db, auth } from '../lib/firebase';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import SupportChat from './SupportChat';
import { copyToClipboard } from '../lib/clipboard';

interface Plan {
  id: string;
  name: string;
  price: string;
  features: string[];
  isPro?: boolean;
}

const CURRENCIES = [
  { code: 'USD', symbol: '$', rate: 1 },
  { code: 'EUR', symbol: '€', rate: 0.92 },
  { code: 'GBP', symbol: '£', rate: 0.79 },
  { code: 'JPY', symbol: '¥', rate: 150 },
  { code: 'NGN', symbol: '₦', rate: 1500 },
  { code: 'CAD', symbol: 'C$', rate: 1.35 },
  { code: 'AUD', symbol: 'A$', rate: 1.52 }
];

export default function Subscription({ onBack }: { onBack?: () => void }) {
  const [loading, setLoading] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [currency, setCurrency] = useState(CURRENCIES[0]);
  const [rates, setRates] = useState<Record<string, number>>({});
  const [globalConfig, setGlobalConfig] = useState({ proPrice: 49, enterprisePrice: 'Contact', paymentMethods: [] as any[] });
  const [activeSupportId, setActiveSupportId] = useState<string | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState<any>(null);
  const user = auth.currentUser;

  useEffect(() => {
    const unsubConfig = onSnapshot(doc(db, 'config', 'global'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setGlobalConfig({
          proPrice: data.subscriptionPrice !== undefined ? Number(data.subscriptionPrice) : 49,
          enterprisePrice: data.enterprisePrice || 'Contact',
          paymentMethods: data.paymentMethods || []
        });
      }
    }, (error) => {
      console.warn("Global config fetch error in Subscription Matrix:", error);
    });

    // Fetch real-time rates
    fetch('https://open.er-api.com/v6/latest/USD')
      .then(res => res.json())
      .then(data => {
        if (data.rates) {
          setRates(data.rates);
        }
      }).catch(e => console.log('Rates sync failed, using internal matrix'));

    return () => unsubConfig();
  }, []);

  const plans = [
    {
      id: 'free',
      tier: 'NEURAL_PUBLIC',
      name: 'Essential Core',
      price: 0,
      features: ['Standard Model Access', 'Basic API', 'Unlimited requests/day', 'Neural Support'],
      buttonText: 'Activated'
    },
    {
      id: 'pro',
      tier: 'NEURAL_PRO',
      name: 'Elite Matrix',
      isPro: true,
      price: 0,
      features: ['Advanced Models', 'Claude 3.5 Integration', 'Full API Access', 'Unlimited requests/day', 'High-speed Synapse'],
      buttonText: 'Activated'
    },
    {
      id: 'enterprise',
      tier: 'NEURAL_ELITE',
      name: 'Master Core',
      price: 0,
      features: ['Custom Models', 'Dedicated Server', 'Unlimited Requests', 'Zero Latency Link', 'Universal API Access'],
      buttonText: 'Activated'
    }
  ];

  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(doc(db, 'users', user.uid), (doc) => {
      setUserProfile(doc.data());
    }, (error) => {
      console.warn("User profile fetch error in Subscription:", error);
    });
    return () => unsub();
  }, [user]);

  const handleAction = async (plan: any) => {
    if (!user) return;
    if (plan.id === 'free') return;
    if (plan.id === 'enterprise') {
      setActiveSupportId(user.uid);
      return;
    }

    setLoading(true);
    setShowPaymentModal(plan);
    setLoading(false);
  };

  const isSubscribed = userProfile?.isUnlimited && 
    userProfile?.subscriptionExpiry && 
    new Date(userProfile.subscriptionExpiry) > new Date();

  const convertPrice = (usd: number) => {
    if (typeof usd !== 'number') return usd;
    const rate = rates[currency.code] || currency.rate;
    const converted = usd * rate;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.code,
      maximumFractionDigits: 0
    }).format(converted);
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white p-4 md:p-10 font-sans">
      <div className="max-w-6xl mx-auto space-y-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <button 
              onClick={onBack}
              className="p-3 rounded-full bg-white/5 border border-white/10 hover:bg-white/20 transition-all"
            >
              <ArrowLeft className="w-5 h-5 text-cyan-400" />
            </button>
            <div>
              <h1 className="text-3xl font-black tracking-tighter uppercase font-mono italic">Anny_Neural_Store</h1>
              <p className="text-[10px] text-white/40 uppercase tracking-[0.4em] font-bold">Protocol Subscription Matrix</p>
            </div>
          </div>

          <div className="flex items-center gap-2 p-1 bg-white/5 rounded-lg border border-white/10 overflow-x-auto">
            {CURRENCIES.map(c => (
              <button
                key={c.code}
                onClick={() => setCurrency(c)}
                className={`px-3 py-1.5 rounded-md text-[10px] font-mono transition-all ${currency.code === c.code ? 'bg-cyan-500 text-black font-bold' : 'text-white/40 hover:text-white'}`}
              >
                {c.code}
              </button>
            ))}
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <motion.div 
              key={plan.id}
              whileHover={{ y: -5 }}
              className={`relative p-8 rounded-3xl border flex flex-col group transition-all ${
                plan.isPro 
                  ? 'bg-gradient-to-b from-cyan-950/20 to-black border-cyan-500/30' 
                  : plan.id === 'enterprise'
                    ? 'bg-gradient-to-b from-purple-950/20 to-black border-purple-500/30'
                    : 'bg-white/5 border-white/10'
              }`}
            >
              <div className="mb-8">
                <span className={`text-[10px] font-mono font-black tracking-[0.3em] uppercase mb-2 block ${
                  plan.isPro ? 'text-cyan-400' : plan.id === 'enterprise' ? 'text-purple-400' : 'text-white/40'
                }`}>
                  {plan.tier}
                </span>
                <h3 className="text-2xl font-bold mb-4">{plan.name}</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black">
                    {typeof plan.price === 'number' ? (plan.price === 0 ? '$0' : convertPrice(plan.price)) : plan.price}
                  </span>
                  {typeof plan.price === 'number' && plan.price > 0 && <span className="text-xs text-white/40">/ mo</span>}
                </div>
              </div>

              <div className="flex-1 space-y-4 mb-10">
                {plan.features.map((feature, i) => (
                  <div key={i} className="flex gap-3 text-sm text-white/60">
                    <Check className={`w-4 h-4 shrink-0 mt-0.5 ${
                      plan.isPro ? 'text-cyan-400' : plan.id === 'enterprise' ? 'text-purple-400' : 'text-emerald-400'
                    }`} />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>

              <button 
                disabled={loading || (plan.id === 'free' && !userProfile?.tier) || (userProfile?.tier === plan.id)}
                onClick={() => handleAction(plan)}
                className={`w-full py-4 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all flex items-center justify-center gap-2 ${
                  plan.isPro 
                    ? 'bg-cyan-500 text-black hover:bg-cyan-400' 
                    : plan.id === 'enterprise'
                      ? 'bg-purple-600 text-white hover:bg-purple-500'
                      : 'bg-white/10 text-white hover:bg-white/20'
                } disabled:opacity-30 disabled:cursor-not-allowed`}
              >
                {loading && <Zap className="w-4 h-4 animate-spin" />}
                {userProfile?.tier === plan.id ? 'Active Matrix' : plan.buttonText}
              </button>
            </motion.div>
          ))}
        </div>


        {/* Footer Info */}
        <div className="p-4 bg-cyan-500/5 border border-cyan-500/20 rounded-xl flex gap-4">
           <Zap className="w-5 h-5 text-cyan-500 shrink-0" />
           <p className="text-[10px] text-cyan-500/80 leading-relaxed uppercase font-mono">
             Neural Policy Update: All protocols are now unlocked for life. Anny Group Architecture has decentralized the neural matrix. No fees, no limits, total intelligence.
           </p>
        </div>
      </div>

      {/* Payment Instructions Modal */}
      <AnimatePresence>
        {showPaymentModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="w-full max-w-lg bg-[#0a0a0a] border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-white/10 bg-white/5 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold tracking-tight">Acquisition Protocol</h2>
                  <p className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest mt-1">Tier: {showPaymentModal.tier}</p>
                </div>
                <button 
                  onClick={() => setShowPaymentModal(null)}
                  className="p-2 hover:bg-white/10 rounded-full text-white/40 hover:text-white transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                <div className="text-center space-y-2">
                  <p className="text-sm text-white/60">Total Neural Contribution Required:</p>
                  <p className="text-4xl font-black text-white">{convertPrice(showPaymentModal.price)}</p>
                </div>

                <div className="space-y-4">
                  <p className="text-[10px] font-mono text-white/40 uppercase tracking-widest text-center">Available Transact Vectors</p>
                  <div className="space-y-3">
                    {globalConfig.paymentMethods.length > 0 ? (
                      globalConfig.paymentMethods.map((pm: any, idx: number) => (
                        <div key={idx} className="p-4 bg-white/5 border border-white/10 rounded-2xl space-y-2 hover:border-cyan-500/30 transition-all">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-mono px-2 py-1 bg-cyan-500/10 text-cyan-400 rounded uppercase tracking-tighter">{pm.type}</span>
                            <span className="text-xs font-bold text-white">{pm.label}</span>
                          </div>
                          <div className="bg-black/50 p-3 rounded-xl border border-white/5 relative group">
                            <code className="text-[10px] font-mono text-white/80 break-all">{pm.details}</code>
                            <button 
                              onClick={async () => {
                                await copyToClipboard(pm.details);
                                alert("Vector copied to neural clipboard.");
                              }}
                              className="absolute top-2 right-2 p-1.5 bg-white/5 hover:bg-white/10 rounded-md transition-all"
                            >
                              <Download className="w-3 h-3 text-white/40" />
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-8 text-center border border-dashed border-white/10 rounded-2xl text-white/20 font-mono text-[10px] uppercase">
                        No vectors currently registered. Contact high command.
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-5 bg-white/5 rounded-2xl border border-white/10 space-y-4">
                  <div className="flex gap-3">
                    <div className="w-10 h-10 rounded-full bg-cyan-500/10 flex items-center justify-center shrink-0">
                      <MessageSquare className="w-5 h-5 text-cyan-400" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white uppercase mb-1">Upload Clearance</p>
                      <p className="text-[10px] text-white/40 leading-relaxed uppercase font-mono">After initiating the transact, send the proof of neural transfer to our advisors via the secure link below.</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      setShowPaymentModal(null);
                      setActiveSupportId(user?.uid || null);
                    }}
                    className="w-full py-4 bg-white text-black font-black uppercase tracking-widest text-[10px] rounded-xl hover:bg-cyan-400 transition-all"
                  >
                    Establish Secure Proof Link
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Support Chat Overlay */}
      <AnimatePresence>
        {activeSupportId && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-2 md:p-4 bg-black/80 backdrop-blur-sm"
          >
            <div className="w-full max-w-md h-full max-h-[600px] md:h-[600px]">
              <SupportChat 
                chatId={activeSupportId} 
                userEmail={user?.email || ''} 
                userName={user?.displayName || 'User'} 
                userPhotoURL={user?.photoURL || ''}
                type="enterprise"
                onClose={() => setActiveSupportId(null)} 
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
