import { useContext } from 'react';
import { LanguageContext, type LanguageValue } from './context';

/**
 * Acesso ao idioma e ao dicionário.
 *
 * Falha alto quando usado fora do provider: um dicionário ausente vira texto
 * vazio espalhado pela tela, o que é bem mais difícil de diagnosticar.
 */
export function useLanguage(): LanguageValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage precisa estar dentro de <LanguageProvider>');
  return ctx;
}

/** Atalho para quem só precisa do dicionário. */
export const useT = () => useLanguage().t;
