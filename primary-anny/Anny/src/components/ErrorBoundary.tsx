import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
  fallback: ReactNode;
}

interface State {
  hasError: boolean;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    const msg = (error?.message || '').toLowerCase();
    if (
      msg.includes('database is closing') ||
      msg.includes('closing/hidden') ||
      msg.includes('error 0')
    ) {
      console.warn('Ignoring transient database closing error in ErrorBoundary:', error?.message);
      return { hasError: false };
    }
    return { hasError: true };
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
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }

    return this.props.children;
  }
}
