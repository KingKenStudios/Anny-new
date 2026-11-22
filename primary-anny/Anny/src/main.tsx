import { Buffer } from 'buffer';
if (typeof window !== 'undefined') {
  (window as any).Buffer = (window as any).Buffer || Buffer;
  (window as any).global = (window as any).global || window;
}

import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import '@google/model-viewer';

// Register Service Worker for PWA support (only in top-level browser windows)
if ('serviceWorker' in navigator && typeof window !== 'undefined' && window.self === window.top) {
  window.addEventListener('load', () => {
    try {
      navigator.serviceWorker.register('/sw.js').catch(err => {
        console.warn('Service Worker registration skipped or failed: ', err);
      });
    } catch (e) {
      console.warn('Service Worker registration unavailable:', e);
    }
  });
}

// Global error handling for unhandled promises and window errors to prevent SDK assertion crashes & cross-origin script errors
window.addEventListener('error', (event) => {
  const msg = (event.message || '') + ' ' + (event.error?.message || '');
  const lower = msg.toLowerCase();
  if (
    !msg ||
    msg === 'Script error.' ||
    lower.includes('script error') ||
    lower.includes('firestore') ||
    lower.includes('cloud firestore') ||
    lower.includes('could not reach') ||
    lower.includes('code=unavailable') ||
    lower.includes('unavailable') ||
    lower.includes('database is closing') ||
    lower.includes('closing/hidden') ||
    lower.includes('error 0') ||
    lower.includes('internal assertion failed') ||
    lower.includes('resizeobserver') ||
    lower.includes('load failed')
  ) {
    event.preventDefault();
    console.warn('Caught background/cross-origin window event:', msg || 'Script error.');
  }
});

window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason;
  const msg = reason instanceof Error ? reason.message : String(reason || '');
  const lower = msg.toLowerCase();
  event.preventDefault();
  if (
    lower.includes('database is closing') ||
    lower.includes('closing/hidden') ||
    lower.includes('error 0') ||
    lower.includes('firestore') ||
    lower.includes('unavailable')
  ) {
    console.warn('Handled background database closing promise rejection:', msg);
    return;
  }
  if (reason instanceof Error) {
    console.warn('Handled promise rejection:', reason.message);
  } else if (typeof reason === 'string') {
    console.warn('Handled promise rejection:', reason);
  } else {
    console.warn('Handled promise rejection:', String(reason || 'Unknown background async operation'));
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
