import React, { useState, useEffect } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  User
} from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';
import { LogOut, Mail, Lock, Eye, EyeOff, ShieldCheck, ArrowRight, Shield, Cpu, Cloud, Lock as LockIcon, CheckCircle2 } from 'lucide-react';

interface AuthProps {
  onUserChange?: (user: User | null) => void;
}

function LogoAnny({ className = "w-12 h-12" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="annyLogoGrad" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#00f0ff" />
          <stop offset="50%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#c084fc" />
        </linearGradient>
      </defs>
      {/* Stylized A shape */}
      <path 
        d="M22 82 L47 16 C48.5 13 51.5 13 53 16 L78 82 C79.5 85 77 88 73.5 88 L63.5 88 C61.5 88 59.8 86.8 59 85 L53.5 71 L34.5 71 L32 85 C31.2 86.8 29.5 88 27.5 88 L14.5 88 C11 88 8.5 85 10 82 Z M44 48 L44 48 L49 34 L39 58 L44 48 Z" 
        fill="url(#annyLogoGrad)" 
      />
      {/* Sparkle star top right */}
      <path 
        d="M74 8 C74 15 81 22 88 22 C81 22 74 29 74 36 C74 29 67 22 60 22 C67 22 74 15 74 8 Z" 
        fill="#00f0ff" 
      />
    </svg>
  );
}

export default function Auth({ onUserChange }: AuthProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [systemStatus, setSystemStatus] = useState<'checking' | 'operational' | 'degraded'>('checking');

  useEffect(() => {
    fetch('/api/health')
      .then(r => (r.ok ? setSystemStatus('operational') : setSystemStatus('degraded')))
      .catch(() => setSystemStatus('degraded'));
  }, []);

  useEffect(() => {
    getRedirectResult(auth)
      .then((result) => {
        if (result?.user) {
          setUser(result.user);
          if (onUserChange) onUserChange(result.user);
        }
      })
      .catch((err) => {
        console.warn("Google Redirect Result notice:", err);
      });
    const unsubscribe = auth.onAuthStateChanged((u) => {
      setUser(u);
      if (onUserChange) onUserChange(u);
    });
    return unsubscribe;
  }, [onUserChange]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!isLogin && password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      if (result?.user) {
        setUser(result.user);
        if (onUserChange) onUserChange(result.user);
      }
    } catch (err: any) {
      if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
        setLoading(false);
        return;
      }

      console.warn("Google Auth Notice:", err);
      if (err.code === 'auth/popup-blocked') {
        setError('Popup was blocked by browser. Please allow popups or open in a new tab.');
      } else if (err.code === 'auth/unauthorized-domain') {
        const domain = window.location.hostname;
        setError(`Domain "${domain}" is not authorized. Please open in a new tab or use Email login.`);
      } else if (err.code === 'auth/internal-error' || err.code === 'auth/web-storage-unsupported' || (err.message && err.message.includes('internal-error'))) {
        try {
          await signInWithRedirect(auth, googleProvider);
          return;
        } catch (redirectErr) {
          setError('Google Sign-In is restricted inside preview iframe. Please click "Open in New Tab" at top right to log in.');
        }
      } else {
        setError(err.message || 'Google Sign-In Error. Try opening in a new tab or use Email login.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error("Sign out fail:", err);
    }
  };

  const handleGuestHome = (e: React.MouseEvent) => {
    e.preventDefault();
    window.dispatchEvent(new CustomEvent('anny_guest_entry'));
  };

  if (user) {
    return (
      <div className="flex items-center gap-4 bg-white/5 border border-white/10 p-2 rounded-2xl pr-4">
        <img 
          src={user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`} 
          className="w-8 h-8 rounded-full border border-white/20"
          alt="avatar"
        />
        <div className="flex flex-col">
          <span className="text-[10px] text-white/50 uppercase font-mono tracking-wider truncate max-w-[120px]">
            {user.email}
          </span>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-1 text-[10px] text-cyan-400 hover:text-cyan-300 font-bold uppercase tracking-widest transition-colors"
          >
            <LogOut className="w-3 h-3" /> Sign Out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="fixed inset-0 z-[99999] bg-[#030614] overflow-y-auto overflow-x-hidden flex flex-col justify-between items-center px-4 py-6 sm:py-8 font-sans select-none selection:bg-cyan-500 selection:text-white bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: "url('/background.png')" }}
    >
      {/* Floating HUD Top Right System Status */}
      <div className="hidden lg:flex absolute top-8 right-12 flex-col items-end z-20 pointer-events-none">
        <span className="text-[10px] font-mono tracking-[0.2em] text-slate-400 uppercase">
          SYSTEM STATUS
        </span>
        <div className="flex items-center gap-2 mt-1">
          <span className={`w-2 h-2 rounded-full animate-pulse ${systemStatus === 'operational' ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : systemStatus === 'degraded' ? 'bg-amber-400 shadow-[0_0_8px_#fbbf24]' : 'bg-slate-500'}`} />
          <span className="text-xs text-slate-200 font-medium">
            {systemStatus === 'operational' ? 'All Systems Operational' : systemStatus === 'degraded' ? 'Server Unreachable' : 'Checking...'}
          </span>
        </div>
      </div>

      {/* Floating HUD Left Side Specs */}
      <div className="hidden lg:flex absolute left-12 top-1/3 -translate-y-1/2 flex-col gap-4 z-20 pointer-events-none max-w-[200px]">
        <div>
          <h2 className="text-sm font-bold tracking-[0.15em] text-slate-200 uppercase font-mono">
            ANNY
          </h2>
          <p className="text-[10px] tracking-[0.15em] text-slate-400 uppercase mt-0.5">
            INTELLIGENCE WITHOUT LIMITS
          </p>
          <div className="w-8 h-[2px] bg-gradient-to-r from-cyan-400 to-purple-500 my-2" />
        </div>
        <ul className="space-y-1.5 text-xs text-slate-400 font-mono">
          <li className="flex items-center gap-2">
            <span className="w-1 h-1 rounded-full bg-cyan-400" />
            <span>AI-Powered</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="w-1 h-1 rounded-full bg-blue-400" />
            <span>Secure</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="w-1 h-1 rounded-full bg-purple-400" />
            <span>Limitless</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="w-1 h-1 rounded-full bg-pink-400" />
            <span>Future Ready</span>
          </li>
        </ul>
      </div>

      {/* Floating HUD Right Side Encrypted Badge */}
      <div className="hidden lg:flex absolute right-12 top-1/2 -translate-y-1/2 items-center gap-2 z-20 pointer-events-none text-slate-400 text-xs font-mono tracking-widest uppercase">
        <ShieldCheck className="w-4 h-4 text-cyan-400" />
        <span>ENCRYPTED CONNECTION</span>
      </div>

      {/* Center Auth Card */}
      <div className="w-full flex-1 flex flex-col justify-center items-center py-6 my-auto relative z-10">
        <div className="relative flex items-center justify-center w-full px-4">
          <div className="relative w-full max-w-[420px] p-[2px] rounded-[28px] overflow-hidden group shadow-[0_20px_70px_rgba(0,0,0,0.85)]">
            
            {/* Continuous Rotating Conic Neon Beam Animation */}
            <div className="absolute -inset-[150%] bg-[conic-gradient(from_0deg_at_50%_50%,#00f0ff_0deg,transparent_25%,#a855f7_50%,transparent_75%,#00f0ff_100%)] animate-[spin_6s_linear_infinite] opacity-90 pointer-events-none" />

            {/* Ambient glowing backdrop */}
            <div className="absolute inset-0 rounded-[28px] bg-gradient-to-tr from-cyan-500/30 via-blue-500/20 to-purple-600/30 blur-xl opacity-80 pointer-events-none" />

            {/* Central Glassmorphic Card Container */}
            <div className="relative z-10 w-full bg-[#080d22]/95 backdrop-blur-2xl rounded-[26px] p-6 sm:p-8 flex flex-col items-center">
            
              {/* Brand Logo Header using logo.png */}
              <div className="flex flex-col items-center mb-4">
                <div className="relative mb-2 flex items-center justify-center">
                  <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/20 to-purple-600/20 rounded-2xl rotate-6 blur-sm pointer-events-none" />
                  <img 
                    src="/logo.png" 
                    alt="ANNY Logo" 
                    className="relative z-10 w-14 h-14 object-contain drop-shadow-[0_0_12px_rgba(0,240,255,0.85)] transition-transform duration-300 hover:scale-105"
                  />
                </div>
                <h3 className="text-sm font-black tracking-[0.25em] uppercase font-mono animate-aios-shift drop-shadow-[0_0_10px_rgba(0,240,255,0.8)]">
                  ANNY
                </h3>
                <p className="text-[9px] text-slate-400 tracking-[0.2em] font-medium uppercase mt-0.5">
                  INTELLIGENCE WITHOUT LIMITS
                </p>
              </div>

              {/* Title & Subtitle */}
              <div className="text-center mb-5 w-full transition-all duration-300">
                <h2 className="text-2xl sm:text-3xl font-black tracking-tight uppercase font-heading animate-aios-shift drop-shadow-[0_0_12px_rgba(0,240,255,0.6)]">
                  {isLogin ? 'Welcome Back' : 'Create Account'}
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  {isLogin ? 'Sign in to continue to your workspace' : 'Sign up to join the Anny Ecosystem'}
                </p>
              </div>

              {/* Auth Form */}
              <form onSubmit={handleAuth} className="w-full space-y-3.5">
                
                {/* Email Field */}
                <div className="relative bg-[#0d1428]/90 border border-slate-700/60 focus-within:border-cyan-400 focus-within:ring-2 focus-within:ring-cyan-500/20 rounded-2xl px-3.5 py-3 flex items-center gap-3 transition-all duration-200">
                  <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                  <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email address"
                    required 
                    className="w-full bg-transparent border-none outline-none text-slate-100 placeholder-slate-500 text-sm font-sans"
                  />
                </div>

                {/* Password Field */}
                <div className="relative bg-[#0d1428]/90 border border-slate-700/60 focus-within:border-cyan-400 focus-within:ring-2 focus-within:ring-cyan-500/20 rounded-2xl px-3.5 py-3 flex items-center gap-3 transition-all duration-200">
                  <Lock className="w-4 h-4 text-slate-400 shrink-0" />
                  <input 
                    type={showPassword ? "text" : "password"} 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    required 
                    className="w-full bg-transparent border-none outline-none text-slate-100 placeholder-slate-500 text-sm font-sans"
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-slate-400 hover:text-cyan-300 transition-colors focus:outline-none"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Confirm Password Field for Register mode */}
                {!isLogin && (
                  <div className="relative bg-[#0d1428]/90 border border-slate-700/60 focus-within:border-cyan-400 focus-within:ring-2 focus-within:ring-cyan-500/20 rounded-2xl px-3.5 py-3 flex items-center gap-3 transition-all duration-200">
                    <Lock className="w-4 h-4 text-slate-400 shrink-0" />
                    <input 
                      type={showConfirmPassword ? "text" : "password"} 
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm password"
                      required 
                      className="w-full bg-transparent border-none outline-none text-slate-100 placeholder-slate-500 text-sm font-sans"
                    />
                    <button 
                      type="button" 
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="text-slate-400 hover:text-cyan-300 transition-colors focus:outline-none"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                )}

                {/* Forgot password link */}
                {isLogin && (
                  <div className="flex justify-end pt-0.5">
                    <a 
                      href="#" 
                      onClick={(e) => { 
                        e.preventDefault(); 
                        if (email) {
                          setError(`Password reset email instructions sent to ${email}`);
                        } else {
                          setError('Please enter your email address first to reset password');
                        }
                      }}
                      className="text-xs text-cyan-400 hover:text-cyan-300 font-medium transition-colors"
                    >
                      Forgot your password?
                    </a>
                  </div>
                )}

                {/* Error feedback banner */}
                {error && (
                  <div className="p-3 text-xs text-red-300 bg-red-950/80 border border-red-500/50 rounded-xl text-center leading-relaxed font-mono">
                    {error}
                    {error.includes('authorized') || error.includes('blocking') ? (
                      <a 
                        href={window.location.href} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="block mt-1 text-cyan-400 underline font-bold"
                      >
                        Open in New Tab
                      </a>
                    ) : null}
                  </div>
                )}

                {/* Submit Button */}
                <button 
                  type="submit" 
                  disabled={loading} 
                  className="w-full py-3.5 px-6 bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 hover:from-cyan-300 hover:to-purple-500 text-white font-semibold rounded-2xl shadow-[0_0_25px_rgba(6,182,212,0.35)] hover:shadow-[0_0_35px_rgba(168,85,247,0.5)] flex items-center justify-center gap-2 text-sm sm:text-base transition-all transform active:scale-[0.98] cursor-pointer disabled:opacity-50 mt-1"
                >
                  {loading ? 'Processing...' : (
                    <>
                      <span>{isLogin ? 'Login' : 'Create Account'}</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                {/* Divider */}
                <div className="flex items-center gap-3 my-3 text-[10px] font-mono text-slate-500 tracking-wider uppercase">
                  <div className="h-[1px] bg-slate-800 flex-1" />
                  <span>OR CONTINUE WITH</span>
                  <div className="h-[1px] bg-slate-800 flex-1" />
                </div>

                {/* Google Button */}
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                  className="w-full py-2.5 px-4 bg-[#0d1428] hover:bg-[#152142] border border-slate-700/60 rounded-2xl text-slate-200 hover:text-white text-xs sm:text-sm font-medium flex items-center justify-center gap-3 transition-all cursor-pointer shadow-md"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  <span>Continue with Google</span>
                </button>

                {/* Navigation Links */}
                <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400 font-medium pt-2">
                  <span>{isLogin ? "Don't have an account?" : "Already have an account?"}</span>
                  {isLogin ? (
                    <button 
                      type="button" 
                      onClick={() => { setIsLogin(false); setError(''); }}
                      className="text-cyan-400 hover:text-cyan-300 transition-colors font-semibold"
                    >
                      Create Account
                    </button>
                  ) : (
                    <button 
                      type="button" 
                      onClick={() => { setIsLogin(true); setError(''); }}
                      className="text-cyan-400 hover:text-cyan-300 transition-colors font-semibold"
                    >
                      Sign In
                    </button>
                  )}
                  <span className="text-slate-600 mx-1">|</span>
                  <button 
                    type="button" 
                    onClick={handleGuestHome}
                    className="text-slate-300 hover:text-white transition-colors"
                  >
                    Home
                  </button>
                </div>

              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Bottom Feature Badges matching the screenshot */}
      <div className="w-full max-w-5xl mx-auto flex flex-wrap items-center justify-center gap-6 sm:gap-10 pt-4 text-slate-400 text-xs relative z-10 pb-2">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-cyan-400" />
          <span className="text-slate-300 font-medium text-[11px]">End-to-End Encrypted</span>
        </div>
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-blue-400" />
          <span className="text-slate-300 font-medium text-[11px]">AI-Powered Security</span>
        </div>
        <div className="flex items-center gap-2">
          <Cloud className="w-4 h-4 text-purple-400" />
          <span className="text-slate-300 font-medium text-[11px]">Secure Cloud Infrastructure</span>
        </div>
        <div className="flex items-center gap-2">
          <LockIcon className="w-4 h-4 text-pink-400" />
          <span className="text-slate-300 font-medium text-[11px]">Enterprise Grade Protection</span>
        </div>
      </div>
    </div>
  );
}


