import clinplay from '~/assets/banners/clinplay.svg';
import github from '~/assets/icons/github.svg';
import instagram from '~/assets/icons/instagram.svg';
import linkedin from '~/assets/icons/linkedin.svg';
import tiktok from '~/assets/icons/tiktok.svg';
import puc from '~/assets/logos/puc.png';
import senac from '~/assets/logos/senac.png';
import ufmg from '~/assets/logos/ufmg.png';
import retrato from '~/assets/retrato.jpg';

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
 * Adicionar um banner de projeto: o arquivo em `assets/banners/`, uma linha em
 * `BANNERS` e o campo `banner` com a **mesma chave** nos dois dicionários.
 *
 * Ícones são **glifos brancos locais, nunca CDN** — um ícone que não carrega
 * deixa o cartão de canal visualmente vazio.
 */

export const LOGOS: Record<string, string> = { senac, puc, ufmg };

export const ICONES: Record<string, string> = { github, linkedin, instagram, tiktok };

/**
 * Banners dos cartões de projeto. Chave ausente = a moldura de espaço reservado.
 *
 * São **marcas dos próprios projetos**, e por isso escapam da paleta
 * monocromática pela mesma razão que o vermelho da UFMG: identidade de terceiro
 * não se repinta. O `scrim` do cartão escurece topo e base para o índice e o
 * glifo continuarem legíveis sobre qualquer imagem.
 */
export const BANNERS: Record<string, string> = { clinplay };

/**
 * Retrato da seção Sobre. Vazio = a moldura aparece como espaço reservado.
 * Para trocar: solte o arquivo em `src/assets/` e importe aqui.
 *
 * O arquivo é local de propósito: o design apontava direto para o avatar do
 * GitHub, e uma imagem servida por terceiro deixa o retrato à mercê de uma
 * indisponibilidade — além de escapar do versionamento do Vite.
 */
export const RETRATO = retrato;
