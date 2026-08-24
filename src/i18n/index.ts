/**
 * Resolução de idioma e criação do tradutor.
 *
 * Sem React aqui de propósito: o motor do terminal também traduz, e ele
 * roda fora do DOM.
 */
import { en } from './dictionaries/en';
import { ptBR } from './dictionaries/pt-BR';
import { LOCALES, type Dictionary, type Locale, type Translate, type TranslationVars } from './types';

const dictionaries: Record<Locale, Dictionary> = {
  'pt-BR': ptBR,
  en,
};

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale] ?? ptBR;
}

/** Substitui `{chave}` pelos valores informados. */
function interpolate(template: string, vars?: TranslationVars): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match,
  );
}

export function createTranslator(locale: Locale): Translate {
  const dictionary = getDictionary(locale);
  return (key, vars) => interpolate(dictionary[key] ?? ptBR[key] ?? key, vars);
}

/**
 * Melhor palpite a partir do navegador, restrito aos idiomas habilitados.
 * Casa `pt-BR` exato e também só o prefixo (`pt`, `en-GB`).
 */
export function detectLocale(enabled: readonly Locale[], fallback: Locale): Locale {
  if (typeof navigator === 'undefined') return fallback;

  for (const candidate of navigator.languages ?? [navigator.language]) {
    const exact = enabled.find((locale) => locale.toLowerCase() === candidate.toLowerCase());
    if (exact) return exact;

    const prefix = candidate.split('-')[0]?.toLowerCase();
    const partial = enabled.find((locale) => locale.split('-')[0].toLowerCase() === prefix);
    if (partial) return partial;
  }
  return fallback;
}

export { LOCALES, LOCALE_LABELS } from './types';
export type { Dictionary, Locale, Translate, TranslationKey, TranslationVars } from './types';
