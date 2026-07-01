import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './App.css'
import App from './App.jsx'

// ── Service Worker Cleanup + Registration ───────────────
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(function(registrations) {
    registrations.forEach(function(reg) { reg.unregister(); });
  }).then(function() {
    window.addEventListener('load', function() {
      navigator.serviceWorker.register('/sw.js').then(function(reg) {
        console.log('GetHome SW re-registered:', reg.scope);
      }).catch(function(err) {
        console.log('SW registration failed:', err);
      });
    });
  });
}

// ── PWA Install Prompt ──────────────────────────────────
window.addEventListener('beforeinstallprompt', function(e) {
  // Prevent the mini-infobar from appearing automatically
  e.preventDefault();
  // Save the event so we can trigger it later from a button
  window.deferredPrompt = e;
  console.log('PWA is installable - beforeinstallprompt fired');
});

// ── PWA Installed Confirmation ──────────────────────────
window.addEventListener('appinstalled', function() {
  window.deferredPrompt = null;
  console.log('GetHome has been installed successfully');
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
