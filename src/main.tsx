// Prevent "Cannot set property fetch of #<Window> which has only a getter" error across modern browser environments
try {
  if (typeof window !== 'undefined' && window.fetch) {
    const originalFetch = window.fetch;
    Object.defineProperty(window, 'fetch', {
      value: originalFetch,
      writable: true,
      configurable: true
    });
  }
} catch (e) {
  console.warn("Failed to configure window.fetch", e);
}

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
