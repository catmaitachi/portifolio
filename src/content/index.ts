import en from './en.json';
import pt from './pt.json';
import sharedJson from './shared.json';
import type { Dictionary, Lang, SectionKey, Shared } from './types';

/**
 * Ponto único de acesso ao conteúdo.
 *
 * Os `satisfies` abaixo são o portão de qualidade: se `pt.json` e `en.json`
 * divergirem da forma declarada em `types.ts` — chave faltando, estado inventado,
 * campo com o tipo errado — o build quebra aqui, e não na tela do visitante.
 */

export const DICT = {
  pt: pt as Dictionary,
  en: en as Dictionary,
} satisfies Record<Lang, Dictionary>;

const shared = sharedJson as unknown as Shared;

/** Ordem canônica das seções. É ela que define a ordem de rolagem e do menu. */
export const SECOES = shared.secoes;
export const CANAIS = shared.canais;
export const LOGO_ESCALAS = shared.logos;

export const LANGS = ['pt', 'en'] as const;

export const isLang = (v: unknown): v is Lang => v === 'pt' || v === 'en';

/**
 * Interpola `{marcadores}` de um texto do dicionário.
 *
 * Existe para que a ordem das palavras venha do próprio idioma:
 * `"Contato pelo portfólio — {nome}"` em PT e `"Portfolio contact — {nome}"` em
 * EN produzem frases corretas sem nenhuma concatenação no código.
 */
export function format(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (m, k: string) => vars[k] ?? m);
}

export type { Canal, Dictionary, Experiencia, Formacao, Lang, Projeto, SectionKey, Shared } from './types';
export { BANNERS, ICONES, LOGOS, RETRATO } from './assets';

/** Índice de uma seção pela chave; -1 se ela não estiver em `SECOES`. */
export const indiceDaSecao = (key: SectionKey): number =>
  SECOES.findIndex((s) => s.key === key);
