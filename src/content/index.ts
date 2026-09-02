import en from './en.json';
import pt from './pt.json';
import sharedJson from './shared.json';
import type { Dictionary, Lang, PerfilKey, SectionKey, Shared } from './types';

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

/**
 * Ordem canônica das seções.
 *
 * Continua sendo a referência do conteúdo, mas **não é mais a ordem de rolagem**:
 * quem manda nela é o perfil escolhido (ver `secoesDoPerfil`). Ela é a ordem do
 * perfil `explorar`, e é contra ela que os outros perfis são conferidos.
 */
export const SECOES = shared.secoes;
export const PERFIS = shared.perfis;
export const CANAIS = shared.canais;
export const LOGO_ESCALAS = shared.logos;

/** Perfil de quem não escolheu nenhum: a ordem canônica, sem promessa nenhuma. */
export const PERFIL_PADRAO: PerfilKey = 'explorar';

export const isPerfil = (v: unknown): v is PerfilKey =>
  PERFIS.some((p) => p.key === v);

/**
 * A ordem de seções de um perfil.
 *
 * Devolve sempre uma lista utilizável: um perfil desconhecido — um
 * `localStorage` de uma versão anterior, por exemplo — cai na ordem canônica em
 * vez de deixar a página sem seções.
 */
export const secoesDoPerfil = (key: PerfilKey): SectionKey[] =>
  PERFIS.find((p) => p.key === key)?.secoes ?? SECOES.map((s) => s.key);

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

export type {
  Canal,
  Dictionary,
  Experiencia,
  Formacao,
  Lang,
  Perfil,
  PerfilKey,
  Projeto,
  SectionKey,
  Shared,
} from './types';
export { BANNERS, ICONES, LOGOS, RETRATO } from './assets';
export { urlExterna } from './links';

