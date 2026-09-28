import en from './en.json';
import pt from './pt.json';
import sharedJson from './shared.json';
import type { Dictionary, Lang, SectionKey, Shared, Tela, TelaKey } from './types';

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

/** Lista canônica das seções, contra a qual `telas` é conferida por `check:i18n`. */
export const SECOES = shared.secoes;
export const TELAS = shared.telas;
export const PERFIS = shared.perfis;
export const CANAIS = shared.canais;
export const LOGO_ESCALAS = shared.logos;

/**
 * Os repositórios da seção Projetos, escolhidos a dedo.
 *
 * Mora em `shared.json`, e não num dicionário, porque é a mesma escolha nos dois
 * idiomas; o que o GitHub diz de cada um chega em tempo de execução
 * (`api/github`).
 */
export const PROJETOS = shared.projetos;

/** A tela em que o site abre, e a que recebe qualquer endereço que não se entende. */
export const TELA_PADRAO: TelaKey = TELAS[0].key;

/** A tela em que uma seção mora. Cada seção está em uma tela só (`check:i18n`). */
export const telaDe = (parte: SectionKey): Tela =>
  TELAS.find((t) => t.partes.includes(parte)) ?? TELAS[0];

export const telaPorChave = (key: TelaKey): Tela => TELAS.find((t) => t.key === key) ?? TELAS[0];

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
  EstadoFormacao,
  Experiencia,
  Formacao,
  Lang,
  Perfil,
  SecaoDossie,
  SectionKey,
  Shared,
  Tela,
  TelaKey,
  TipoExperiencia,
} from './types';
export { ICONES, LOGOS, RETRATO } from './assets';
export { urlExterna } from './links';
