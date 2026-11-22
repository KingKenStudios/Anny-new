import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ShieldAlert, RefreshCw, AlertTriangle, Terminal } from 'lucide-react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  isLogging: boolean;
}

export default class ChatErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    isLogging: false
  };

  public static getDerivedStateFromError(error: Error): State {
    const msg = (error?.message || '').toLowerCase();
    if (
      msg.includes('database is closing') ||
      msg.includes('closing/hidden') ||
      msg.includes('error 0')
    ) {
      console.warn('Ignoring transient database closing error in ChatErrorBoundary:', error?.message);
      return { hasError: false, error: null, errorInfo: null, isLogging: false };
    }
    return { hasError: true, error, errorInfo: null, isLogging: false };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const msg = (error?.message || '').toLowerCase();
    if (
      msg.includes('database is closing') ||
      msg.includes('closing/hidden') ||
      msg.includes('error 0')
    ) {
      console.warn('Suppressed transient database closing error:', error?.message);
      return;
    }

    console.error("ChatErrorBoundary caught runtime exception:", error, errorInfo);
    this.setState({ errorInfo, isLogging: true });

    // Log runtime exception to Firestore asynchronously
    try {
      const currentUser = auth.currentUser;
      addDoc(collection(db, 'ui_runtime_errors'), {
        errorMessage: error?.message || 'Unknown UI Exception',
        errorStack: error?.stack || '',
        componentStack: errorInfo?.componentStack || '',
        userUid: currentUser?.uid || 'guest',
        userEmail: currentUser?.email || 'guest',
        timestamp: serverTimestamp(),
        userAgent: navigator.userAgent,
        url: window.location.href
      }).catch(err => {
        console.warn("Failed to write runtime error to Firestore:", err);
      }).finally(() => {
        this.setState({ isLogging: false });
      });
    } catch (e) {
      console.warn("Error logging exception:", e);
      this.setState({ isLogging: false });
    }
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full min-h-[300px] flex flex-col items-center justify-center p-6 bg-[#0c0d1e]/90 border border-rose-500/30 rounded-2xl text-center space-y-4 my-auto">
          <div className="w-14 h-14 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
            <ShieldAlert className="w-7 h-7" />
          </div>

          <div className="space-y-1.5 max-w-md">
            <h3 className="text-lg font-bold text-white">
              {this.props.fallbackTitle || "Neural Interface Exception Trapped"}
            </h3>
            <p className="text-xs text-slate-300">
              An unexpected UI runtime error occurred. The exception details have been safely captured and logged for diagnostics.
            </p>
          </div>

          {this.state.error && (
            <div className="w-full max-w-xl p-3 bg-black/60 border border-white/10 rounded-xl text-left font-mono text-[11px] text-rose-300 overflow-x-auto max-h-28 custom-scrollbar">
              <span className="text-slate-500 block text-[9px] uppercase tracking-wider mb-1">Error Details</span>
              {this.state.error.message}
            </div>
          )}

          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={this.handleReset}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold font-mono shadow-lg transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reset Chat Interface Engine</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
