import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { LanguageProvider } from './i18n/LanguageProvider';
import './styles/reset.css';

const raiz = document.getElementById('root');
if (!raiz) throw new Error('#root não encontrado');

createRoot(raiz).render(
  <StrictMode>
    <LanguageProvider>
      <App />
    </LanguageProvider>
  </StrictMode>,
);
