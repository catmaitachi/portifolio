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
 * Retrato da seção Sobre. Vazio = a moldura aparece como espaço reservado.
 * Para trocar: solte o arquivo em `src/assets/` e importe aqui.
 *
 * O arquivo é local de propósito: o design apontava direto para o avatar do
 * GitHub, e uma imagem servida por terceiro deixa o retrato à mercê de uma
 * indisponibilidade — além de escapar do versionamento do Vite.
 */
export const RETRATO = retrato;
