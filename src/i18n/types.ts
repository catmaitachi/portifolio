/**
 * Contratos do i18n.
 *
 * O dicionário pt-BR define as chaves válidas: adicionar um texto é
 * adicionar uma chave lá, e o TypeScript passa a exigir a tradução nos
 * demais idiomas.
 */
import type { ptBR } from './dictionaries/pt-BR';

export const LOCALES = ['pt-BR', 'en'] as const;
export type Locale = (typeof LOCALES)[number];

export type TranslationKey = keyof typeof ptBR;
export type Dictionary = Record<TranslationKey, string>;

/** Valores interpolados em `{chave}`. */
export type TranslationVars = Record<string, string | number>;

export type Translate = (key: TranslationKey, vars?: TranslationVars) => string;

/** Rótulo de cada idioma no seu próprio idioma. */
export const LOCALE_LABELS: Record<Locale, string> = {
  'pt-BR': 'Português',
  en: 'English',
};
