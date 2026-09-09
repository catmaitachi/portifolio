import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { LanguageProvider } from './i18n/LanguageProvider';
import { assumirRolagem } from './navigation/useHashRoute';
import './styles/reset.css';

// antes da primeira pintura: o endereço decide a seção, não a memória do navegador
assumirRolagem();

const raiz = document.getElementById('root');
if (!raiz) throw new Error('#root não encontrado');

createRoot(raiz).render(
  <StrictMode>
    <LanguageProvider>
      <App />
    </LanguageProvider>
  </StrictMode>,
);
