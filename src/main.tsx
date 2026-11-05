import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { getSavedLanguage } from './utils/language'

if (typeof document !== 'undefined' && document.documentElement) {
  document.documentElement.lang = getSavedLanguage();
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
