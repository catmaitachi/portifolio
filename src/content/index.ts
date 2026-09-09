import en from './en.json';
import pt from './pt.json';
import sharedJson from './shared.json';
import type { Canal, Dictionary, Lang, ModoKey, SectionKey, Shared } from './types';

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
 * quem manda nela é o modo em vigor (ver `secoesDoModo`). Ela é a lista completa,
 * e é contra ela que as listas dos modos são conferidas.
 */
export const SECOES = shared.secoes;
export const MODOS = shared.modos;
export const PERFIS = shared.perfis;
export const CANAIS = shared.canais;
export const LOGO_ESCALAS = shared.logos;

/**
 * O lado em que o site abre para quem não pediu nenhum.
 *
 * É o profissional porque é o que o endereço promete a quem chega sem contexto:
 * um link de portfólio compartilhado numa candidatura não deve cair na lista de
 * filmes. O pessoal se alcança pelo cabeçalho ou por `#pessoal`.
 */
export const MODO_PADRAO: ModoKey = 'profissional';

export const isModo = (v: unknown): v is ModoKey => MODOS.some((m) => m.key === v);

/**
 * As seções de um modo, na ordem em que rolam.
 *
 * Devolve sempre uma lista utilizável: um modo desconhecido — um `localStorage`
 * de uma versão anterior, ou um hash digitado errado — cai na ordem canônica em
 * vez de deixar a página sem seção nenhuma.
 */
export const secoesDoModo = (key: ModoKey): SectionKey[] =>
  MODOS.find((m) => m.key === key)?.secoes ?? SECOES.map((s) => s.key);

/**
 * Os canais de contato de um modo, na ordem em que o modo os lista.
 *
 * A ordem é a do modo, não a de `canais`, porque é ela que decide qual cartão
 * fica no meio da grade — e é da distância ao meio que sai o escalonamento da
 * entrada. Chave que não casa com canal nenhum é ignorada, e um modo sem canais
 * cai na lista inteira.
 */
export const canaisDoModo = (key: ModoKey): Canal[] => {
  const chaves = MODOS.find((m) => m.key === key)?.canais;
  if (!chaves?.length) return CANAIS;
  const lista: Canal[] = [];
  for (const k of chaves) {
    const c = CANAIS.find((canal) => canal.key === k);
    if (c) lista.push(c);
  }
  return lista.length ? lista : CANAIS;
};

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
  DadoPessoal,
  Dictionary,
  Experiencia,
  Formacao,
  Lang,
  Modo,
  ModoKey,
  Perfil,
  Projeto,
  SectionKey,
  Shared,
} from './types';
export { BANNERS, ICONES, LOGOS, RETRATO } from './assets';
export { urlExterna } from './links';
