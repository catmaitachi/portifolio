import github from '~/assets/icons/github.svg';
import instagram from '~/assets/icons/instagram.svg';
import linkedin from '~/assets/icons/linkedin.svg';
import tiktok from '~/assets/icons/tiktok.svg';
import puc from '~/assets/logos/puc.png';
import senac from '~/assets/logos/senac.png';
import ufmg from '~/assets/logos/ufmg.png';

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
 * Ícones são **glifos brancos locais, nunca CDN** — um ícone que não carrega
 * deixa o cartão de canal visualmente vazio.
 */

export const LOGOS: Record<string, string> = { senac, puc, ufmg };

export const ICONES: Record<string, string> = { github, linkedin, instagram, tiktok };

/**
 * Retrato da seção Sobre. Vazio = a moldura aparece como espaço reservado.
 * Para preencher: solte o arquivo em `src/assets/` e importe aqui.
 */
export const RETRATO = '';
