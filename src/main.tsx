import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { getSavedLanguage } from './utils/language'

if (typeof document !== 'undefined' && document.documentElement) {
  document.documentElement.lang = getSavedLanguage();
}

const rootEl = document.getElementById('root');
if (rootEl) {
  if (rootEl.hasChildNodes()) {
    hydrateRoot(
      rootEl,
      <StrictMode>
        <App />
      </StrictMode>
    );
  } else {
    createRoot(rootEl).render(
      <StrictMode>
        <App />
      </StrictMode>
    );
  }
}
