import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// ─── PWA service worker update detection ─────────────────────────────
// registerType: 'autoUpdate' — when a NEW worker takes control we show a
// friendly "نیا ورژن دستیاب ہے — اپ ڈیٹ کریں" toast with a Reload button
// (handled in App.tsx). The flag avoids a false toast on the very first install.
if ('serviceWorker' in navigator) {
  let hadController = Boolean(navigator.serviceWorker.controller);
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (hadController) {
      window.dispatchEvent(new CustomEvent('app-update-available'));
    }
    hadController = true;
  });
}

// ─── Custom install banner (beforeinstallprompt) ─────────────────────
// captured here and in AppShell; consumed by Settings → Install App
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  (window as Window & { __pwaInstallPrompt?: Event & { prompt: () => Promise<void> } }).__pwaInstallPrompt =
    e as Event & { prompt: () => Promise<void> };
});

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
