import { useEffect, useLayoutEffect, useRef } from 'react';
import {
  TELA_PADRAO,
  telaDe,
  telaPorChave,
  type SectionKey,
  type TelaKey,
} from '~/content';

/**
 * O endereço: em que tela o visitante está e qual seção dela ele está lendo.
 *
 * Ele mora no **hash**, e não num caminho, porque o site é estático e um caminho
 * de verdade exigiria que o servidor devolvesse o `index.html` para qualquer
 * rota. O hash também é o que permite `base: './'` continuar valendo, com o site
 * rodando em subpasta.
 *
 * Nada disso traz roteador: são duas leituras de `location.hash`, uma escrita e
 * um listener.
 */
export interface Rota {
  tela: TelaKey;
  parte: SectionKey;
}

/**
 * O que o endereço mostra, em inglês.
 *
 * As chaves do projeto são em português — é a língua em que ele é escrito, e o
 * conteúdo é bilíngue por dicionário, não por chave. **O endereço não é chave**:
 * ele é a única parte da página que um estrangeiro lê fora do site, num link
 * colado numa mensagem ou numa candidatura, e ali o inglês alcança os dois
 * idiomas. Trocar o slug por idioma seria pior: o mesmo lugar teria dois
 * endereços, e um link mudaria de sentido conforme a preferência de quem o
 * abriu.
 *
 * Os dois são `Record` totais, então uma tela ou uma seção nova **quebra o
 * build** até ganhar nome no endereço.
 */
const SLUG_TELA: Record<TelaKey, string> = {
  dossie: 'profile',
  hobbies: 'hobbies',
  trajetoria: 'journey',
};

const SLUG_SECAO: Record<SectionKey, string> = {
  inicio: 'home',
  sobre: 'about',
  projetos: 'projects',
  experiencia: 'career',
  musica: 'music',
  jogos: 'games',
  filmes: 'films',
  contato: 'contact',
};

/**
 * Os endereços antigos, que já circularam em candidaturas, e continuam levando
 * ao lugar certo.
 *
 * - **O site de dois lados**: `#professional/journey`, `#personal/music`. O
 *   primeiro pedaço era o lado e o segundo a seção; os lados não existem mais, e
 *   a seção leva à tela em que ela mora hoje. `journey` era o slug da
 *   experiência, e `education` era a Formação, que virou um bloco do Sobre.
 * - **Os nomes de antes da renomeação** (Identidade, Interesses, Trajetória):
 *   `#dossier` virou `#profile`, e `#journey/work` virou `#journey` (a Carreira
 *   abre a Trajetória).
 */
const LADOS_ANTIGOS = new Set(['personal', 'professional']);
const TELA_ANTIGA: Record<string, TelaKey> = { dossier: 'dossie' };
const SLUG_ANTIGO: Record<string, SectionKey> = {
  journey: 'experiencia',
  work: 'experiencia',
  education: 'sobre',
};

const secaoDoSlug = (slug: string | undefined): SectionKey | undefined =>
  (Object.keys(SLUG_SECAO) as SectionKey[]).find((k) => SLUG_SECAO[k] === slug);

const telaDoSlug = (slug: string | undefined): TelaKey | undefined =>
  (Object.keys(SLUG_TELA) as TelaKey[]).find((k) => SLUG_TELA[k] === slug);

/**
 * `#hobbies/music`, que é o que o visitante copia da barra.
 *
 * A primeira seção de uma tela não se escreve: `#profile` e não `#profile/home`.
 * É o endereço que se compartilha quando se quer mandar alguém ao site, e ele
 * deve ser o mais curto.
 */
export const enderecoDe = (r: Rota): string => {
  const primeira = telaPorChave(r.tela).partes[0];
  return r.parte === primeira
    ? `#${SLUG_TELA[r.tela]}`
    : `#${SLUG_TELA[r.tela]}/${SLUG_SECAO[r.parte]}`;
};

/** A primeira seção de uma tela, que é onde ela abre. */
const inicioDe = (tela: TelaKey): Rota => ({ tela, parte: telaPorChave(tela).partes[0] });

/**
 * O hash, lido. Devolve `null` quando não há o que ler, e nunca uma rota que não
 * exista: uma seção pedida numa tela que não a tem cai no começo daquela tela.
 */
export function rotaDoHash(): Rota | null {
  const cru = typeof location === 'undefined' ? '' : location.hash.replace(/^#\/?/, '');
  if (!cru) return null;
  const [a, b] = cru.split('/');

  const tela = telaDoSlug(a) ?? TELA_ANTIGA[a];
  if (tela) {
    const parte = secaoDoSlug(b) ?? (b ? SLUG_ANTIGO[b] : undefined);
    return parte && telaPorChave(tela).partes.includes(parte) ? { tela, parte } : inicioDe(tela);
  }

  if (LADOS_ANTIGOS.has(a)) {
    const parte = (b && SLUG_ANTIGO[b]) ?? secaoDoSlug(b);
    return parte ? { tela: telaDe(parte).key, parte } : inicioDe(TELA_PADRAO);
  }

  return null;
}

/** A rota com que a página abre: o endereço, ou o começo do site. */
export const rotaInicial = (): Rota => rotaDoHash() ?? inicioDe(TELA_PADRAO);

/**
 * A página assume a própria posição de rolagem.
 *
 * O navegador guarda onde cada área rolável estava e a devolve **depois** do
 * carregamento, o que aqui chega tarde demais: o endereço já disse onde a página
 * abre, e a restauração passava por cima disso.
 *
 * `manual` diz que quem decide é a aplicação, e é verdade: quem decide é o hash.
 * Precisa ser chamado antes da primeira pintura, por isso mora no `main` e não
 * num efeito.
 */
export function assumirRolagem(): void {
  if (typeof history !== 'undefined' && 'scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
  }
}

/**
 * Mantém o endereço e a página em acordo, nos dois sentidos.
 *
 * **A escrita distingue trocar de tela de andar dentro dela**, e essa é a única
 * regra importante aqui: trocar de tela é navegação, e o botão voltar deve
 * desfazê-la; rolar o Dossiê ou trocar de aba não pode encher o histórico. Tela
 * entra por `pushState`, seção por `replaceState`.
 *
 * **Nada é escrito quando o hash já diz o que se quer escrever**, e isso resolve
 * de graça o caso que pediria um sinalizador: ao voltar pelo histórico, o hash já
 * é o do destino, então o efeito não cria uma entrada nova em cima da que o
 * visitante acabou de alcançar.
 *
 * `aoNavegar` chega por ref, escrita num efeito de layout, para que o listener
 * seja registrado uma vez só e não a cada render. É o padrão que `react.md`
 * fixou: a ref é o instrumento certo, escrevê-la durante o render é o que está
 * errado.
 */
export function useHashRoute(rota: Rota, aoNavegar: (r: Rota) => void): void {
  const aoNavegarRef = useRef(aoNavegar);
  const telaRef = useRef(rota.tela);

  useLayoutEffect(() => {
    aoNavegarRef.current = aoNavegar;
  });

  useEffect(() => {
    const alvo = enderecoDe(rota);
    const trocouDeTela = telaRef.current !== rota.tela;
    telaRef.current = rota.tela;
    if (location.hash === alvo) return;
    if (trocouDeTela) history.pushState(null, '', alvo);
    else history.replaceState(null, '', alvo);
  }, [rota]);

  useEffect(() => {
    const aoVoltar = () => {
      const r = rotaDoHash();
      aoNavegarRef.current(r ?? inicioDe(TELA_PADRAO));
    };
    // `hashchange` cobre quem edita o endereço na barra; `popstate`, o botão voltar
    window.addEventListener('hashchange', aoVoltar);
    window.addEventListener('popstate', aoVoltar);
    return () => {
      window.removeEventListener('hashchange', aoVoltar);
      window.removeEventListener('popstate', aoVoltar);
    };
  }, []);
}

