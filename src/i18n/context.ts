import { createContext } from 'react';
import type { Dictionary, Lang } from '~/content';

export interface LanguageValue {
  lang: Lang;
  /** dicionário do idioma corrente — nenhuma string literal fora daqui */
  t: Dictionary;
  alternar: () => void;
  definir: (lang: Lang) => void;
}

/**
 * Contexto do idioma. Fica num arquivo `.ts` separado do provider `.tsx` para
 * que o módulo do provider exporte só componentes — requisito do Fast Refresh.
 */
export const LanguageContext = createContext<LanguageValue | null>(null);
