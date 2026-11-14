import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/ibm-plex-sans/latin-400.css';
import '@fontsource/ibm-plex-sans/latin-500.css';
import '@fontsource/ibm-plex-sans/latin-600.css';
import '@fontsource/ibm-plex-sans/latin-700.css';
import '@fontsource/ibm-plex-mono/latin-400.css';
import '@fontsource/ibm-plex-mono/latin-500.css';
import './index.css';
import './exercise.css';
import App from './App.tsx';
import { IconContext } from '@phosphor-icons/react';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <IconContext.Provider value={{ 'aria-hidden': true }}>
      <App />
    </IconContext.Provider>
  </StrictMode>,
);
