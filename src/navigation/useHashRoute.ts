import { useEffect, useLayoutEffect, useRef } from 'react';
import { isModo, MODO_PADRAO, secoesDoModo, type ModoKey, type SectionKey } from '~/content';

/**
 * O endereço, que aqui são duas coisas: em que lado do site o visitante está e
 * qual seção ele está lendo.
 *
 * Ele mora no **hash**, e não num caminho, porque o site é estático e um caminho
 * de verdade exigiria que o servidor devolvesse o `index.html` para qualquer
 * rota. O hash também é o que permite `base: './'` continuar valendo, com o
 * portfólio rodando em subpasta.
 *
 * Nada disso traz roteador: são duas leituras de `location.hash`, uma escrita e
 * um listener.
 */
export interface Rota {
  modo: ModoKey;
  secao: SectionKey;
}

export const CHAVE_ARMAZENAMENTO = 'portfolio.modo';

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
 * Os dois são `Record` totais, então uma seção ou um modo novo **quebra o
 * build** até ganhar nome no endereço.
 */
const SLUG_MODO: Record<ModoKey, string> = {
  pessoal: 'personal',
  profissional: 'professional',
};

const SLUG_SECAO: Record<SectionKey, string> = {
  inicio: 'home',
  sobre: 'about',
  formacao: 'education',
  projetos: 'projects',
  experiencia: 'journey',
  musica: 'music',
  jogos: 'games',
  filmes: 'films',
  contato: 'contact',
};

/** `#personal/films`, que é o que o visitante copia da barra. */
export const enderecoDe = (r: Rota): string => `#${SLUG_MODO[r.modo]}/${SLUG_SECAO[r.secao]}`;

/** O modo cujo slug é este. Oito comparações, uma vez por navegação. */
function modoDoSlug(slug: string | undefined): ModoKey | undefined {
  return (Object.keys(SLUG_MODO) as ModoKey[]).find((k) => SLUG_MODO[k] === slug);
}

/** `#personal/films` → `{ modo: 'pessoal', secao: 'filmes' }`, validando as duas partes. */
export function rotaDoHash(): Partial<Rota> {
  const cru = typeof location === 'undefined' ? '' : location.hash.replace(/^#\/?/, '');
  if (!cru) return {};
  const [m, s] = cru.split('/');
  const modo = modoDoSlug(m);
  if (!modo) return {};
  // seção que não existe naquele modo não é erro: o modo vale, o resto cai no começo
  const secao = secoesDoModo(modo).find((k) => SLUG_SECAO[k] === s);
  return secao ? { modo, secao } : { modo };
}

/**
 * A rota com que a página abre.
 *
 * O hash ganha do `localStorage`, e o `localStorage` do padrão. Um link recebido
 * agora diz mais sobre a intenção de quem clicou do que a última visita dele, e
 * abrir no lado errado é justamente o que faria um link compartilhado não valer.
 *
 * O `try/catch` cobre navegação privada e cookies bloqueados, onde só ler o
 * `localStorage` já lança. É a mesma nota de `i18n/detect.ts`.
 */
export function rotaInicial(): Rota {
  const doHash = rotaDoHash();
  if (doHash.modo) return { modo: doHash.modo, secao: doHash.secao ?? 'inicio' };

  try {
    const salvo = localStorage.getItem(CHAVE_ARMAZENAMENTO);
    if (isModo(salvo)) return { modo: salvo, secao: 'inicio' };
  } catch {
    /* armazenamento indisponível: segue para o padrão */
  }
  return { modo: MODO_PADRAO, secao: 'inicio' };
}

/**
 * A página assume a própria posição de rolagem.
 *
 * O navegador guarda onde cada área rolável estava e a devolve **depois** do
 * carregamento, o que aqui chega tarde demais: o endereço já disse em que seção
 * a página abre, e a restauração passava por cima disso — abrir
 * `#pessoal/contato` deixava o React na seção certa e a rolagem no topo, com a
 * tela mostrando uma seção inativa, isto é, vazia.
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

/** Persiste o lado escolhido. Falhar aqui não pode derrubar a troca de modo. */
export function salvarModo(modo: ModoKey): void {
  try {
    localStorage.setItem(CHAVE_ARMAZENAMENTO, modo);
  } catch {
    /* sem persistência: o modo vale só para esta visita */
  }
}

/**
 * Mantém o endereço e a página em acordo, nos dois sentidos.
 *
 * **A escrita distingue trocar de modo de rolar**, e essa é a única regra
 * importante aqui: trocar de modo é navegação, e o botão voltar deve desfazê-la;
 * rolar não pode encher o histórico, senão sair do Início e voltar pediria cinco
 * cliques em vez de um. Modo entra por `pushState`, seção por `replaceState`.
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
  const modoRef = useRef(rota.modo);

  useLayoutEffect(() => {
    aoNavegarRef.current = aoNavegar;
  });

  useEffect(() => {
    const alvo = enderecoDe(rota);
    if (location.hash === alvo) {
      modoRef.current = rota.modo;
      return;
    }
    const trocouDeModo = modoRef.current !== rota.modo;
    modoRef.current = rota.modo;
    if (trocouDeModo) history.pushState(null, '', alvo);
    else history.replaceState(null, '', alvo);
    /**
     * `rota` inteira nas dependências, e não os dois campos.
     *
     * O objeto vem de um `useMemo` sobre exatamente esses dois campos, então as
     * duas listas disparam nas mesmas trocas. A diferença é que esta é a que o
     * verificador consegue conferir, agora que o endereço é montado por
     * `enderecoDe(rota)` em vez de interpolado aqui dentro.
     */
  }, [rota]);

  useEffect(() => {
    const aoVoltar = () => {
      const r = rotaDoHash();
      if (!r.modo) return;
      aoNavegarRef.current({ modo: r.modo, secao: r.secao ?? 'inicio' });
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
