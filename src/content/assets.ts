import github from '~/assets/icons/github.svg';
import instagram from '~/assets/icons/instagram.svg';
import letterboxd from '~/assets/icons/letterboxd.svg';
import linkedin from '~/assets/icons/linkedin.svg';
import tiktok from '~/assets/icons/tiktok.svg';
import spotify from '~/assets/icons/spotify.svg';
import steam from '~/assets/icons/steam.svg';
import clinplay from '~/assets/logos/clinplay.svg';
import puc from '~/assets/logos/puc.png';
import senac from '~/assets/logos/senac.png';
import retrato from '~/assets/retrato.jpg';
import lgTypescript from '~/assets/linguagens/typescript.svg';
import lgJava from '~/assets/linguagens/openjdk.svg';
import lgCss from '~/assets/linguagens/css.svg';
import lgC from '~/assets/linguagens/c.svg';
import lgPython from '~/assets/linguagens/python.svg';
import lgJavascript from '~/assets/linguagens/javascript.svg';
import lgHtml from '~/assets/linguagens/html5.svg';
import lgTex from '~/assets/linguagens/latex.svg';
import lgGo from '~/assets/linguagens/go.svg';
import lgRust from '~/assets/linguagens/rust.svg';
import lgCpp from '~/assets/linguagens/cplusplus.svg';
import lgCsharp from '~/assets/linguagens/csharp.svg';
import lgPhp from '~/assets/linguagens/php.svg';
import lgRuby from '~/assets/linguagens/ruby.svg';
import lgKotlin from '~/assets/linguagens/kotlin.svg';
import lgSwift from '~/assets/linguagens/swift.svg';
import lgDart from '~/assets/linguagens/dart.svg';
import lgShell from '~/assets/linguagens/shell.svg';
import lgLua from '~/assets/linguagens/lua.svg';

/**
 * Registro de imagens.
 *
 * JSON não importa arquivo, e o Vite precisa do `import` para versionar o asset
 * no build. Por isso o conteúdo referencia uma **chave** (`"senac"`, `"github"`)
 * e a resolução do caminho mora aqui.
 *
 * Adicionar uma formação: o arquivo em `assets/logos/`, uma linha em `LOGOS`,
 * a escala em `shared.json → logos` e a entrada nos dois dicionários.
 *
 * Adicionar a marca de uma experiência: o arquivo em `assets/logos/`, uma linha
 * em `LOGOS` e o campo `logo` com a **mesma chave** nos dois dicionários.
 *
 * Ícones são **glifos brancos locais, nunca CDN** — um ícone que não carrega
 * deixa o cartão de canal visualmente vazio.
 */

/**
 * Logos de instituição e de empresa.
 *
 * Os de formação são desenhados como imagem no crachá e por isso precisam ser
 * brancos sobre transparente. Os da Trajetória são pintados por máscara no fundo
 * da ficha, e ali qualquer cor serve: o que aparece é a silhueta.
 */
export const LOGOS: Record<string, string> = { senac, puc, clinplay };

export const ICONES: Record<string, string> = {
  github,
  linkedin,
  instagram,
  tiktok,
  spotify,
  steam,
  letterboxd,
};

/**
 * Os ícones das linguagens da seção GitHub, pela chave que o GitHub usa (o nome
 * que o Linguist dá à linguagem). Vêm do Simple Icons (CC0), pretos: a nuvem os
 * pinta de branco no canvas. Linguagem sem ícone aparece pela sigla.
 */
export const LINGUAGENS: Record<string, string> = {
  TypeScript: lgTypescript,
  Java: lgJava,
  CSS: lgCss,
  C: lgC,
  Python: lgPython,
  JavaScript: lgJavascript,
  HTML: lgHtml,
  TeX: lgTex,
  Go: lgGo,
  Rust: lgRust,
  'C++': lgCpp,
  'C#': lgCsharp,
  PHP: lgPhp,
  Ruby: lgRuby,
  Kotlin: lgKotlin,
  Swift: lgSwift,
  Dart: lgDart,
  Shell: lgShell,
  Lua: lgLua,
};

/**
 * Retrato da seção Sobre. Vazio = a moldura aparece como espaço reservado.
 * Para trocar: solte o arquivo em `src/assets/` e importe aqui.
 *
 * O arquivo é local de propósito: o design apontava direto para o avatar do
 * GitHub, e uma imagem servida por terceiro deixa o retrato à mercê de uma
 * indisponibilidade — além de escapar do versionamento do Vite.
 */
export const RETRATO = retrato;
