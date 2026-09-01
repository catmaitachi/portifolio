/**
 * Endereços externos vindos do dicionário.
 *
 * Uma `url` sem esquema (`clinplay.com`) num `href` **não** é um site: o
 * navegador a resolve como caminho relativo e leva o visitante para
 * `<raiz-do-portfólio>/clinplay.com`. O link parece certo no JSON, parece certo
 * no HTML e só falha no clique — que é o único lugar onde ninguém está olhando.
 *
 * Como o conteúdo é editado à mão e o campo é só uma `string`, o TypeScript não
 * tem como pegar isso. A garantia mora aqui, no ponto único em que a `url` do
 * dicionário vira `href`.
 */

/** Esquema no começo da string: `https:`, `mailto:`, `tel:`… */
const COM_ESQUEMA = /^[a-z][a-z0-9+.-]*:/i;

/**
 * Devolve a `url` pronta para um `href` externo, ou `undefined` quando o campo
 * está vazio — que é como o dicionário marca "ainda não existe".
 *
 * Sem esquema, assume `https://`: um endereço escrito à mão num JSON de conteúdo
 * é sempre um site, nunca um caminho dentro do portfólio.
 */
export function urlExterna(url: string | undefined): string | undefined {
  const limpa = url?.trim();
  if (!limpa) return undefined;
  return COM_ESQUEMA.test(limpa) || limpa.startsWith('//') ? limpa : `https://${limpa}`;
}
