import { useCallback, useEffect, useRef, useState } from 'react';

/** O quanto um clique anda, em fração da largura visível da faixa. */
const PASSO = 0.8;

/** Meio pixel de folga: `scrollLeft` é fracionário e raramente fecha redondo. */
const FOLGA = 1;

export interface RolagemLateral {
  /** a faixa transborda: existe rolagem, e portanto existe o que controlar */
  rola: boolean;
  /** existe conteúdo escondido à esquerda */
  antes: boolean;
  /** existe conteúdo escondido à direita */
  depois: boolean;
  rolar: (direcao: -1 | 1) => void;
}

/**
 * As duas pontas de uma faixa que rola de lado, e o botão que anda até elas.
 *
 * A rolagem das faixas é **nativa**, e continua sendo: arrasto, roda e inércia
 * vêm de graça, e nada aqui gasta um quadro de JavaScript enquanto o dedo anda.
 * O que faltava era o caminho de quem **não** arrasta — mouse sem roda
 * horizontal, trackpad em que o gesto lateral não é óbvio, e qualquer pessoa que
 * simplesmente não descobre que aquela fileira anda. Uma faixa que não diz que
 * continua é uma faixa que termina no primeiro item cortado.
 *
 * **`rola` e as pontas são coisas diferentes, e é essa separação que decide o
 * comportamento das setas.** Uma faixa que coube inteira não ganha controle
 * nenhum, porque não há o que controlar; uma que transborda ganha os dois
 * botões, e eles **apagam** nas pontas em vez de sumir, como os passos da
 * Trajetória. Sumir na ponta seria pior que inútil: `antes` e `depois` mudam
 * durante a própria rolagem, e um botão que deixa de existir enquanto está
 * focado joga o foco no `body` no meio do gesto de quem usa teclado.
 *
 * A medida vem do DOM, nunca de uma conta sobre quantos itens há: a largura do
 * item muda por faixa responsiva e o bloco inteiro ainda passa pelo `zoom` do
 * `useEscalaQueCabe`. É a mesma decisão do `useCabeNaFaixa` das formações.
 *
 * `total` entra por parâmetro porque o conteúdo chega depois: as três seções de
 * dado remoto montam a faixa vazia e a preenchem quando a resposta vem, e sem
 * ele o observador mediria uma faixa que ainda não tinha itens.
 */
export function useRolagemLateral(
  faixaRef: React.RefObject<HTMLElement | null>,
  total: number,
): RolagemLateral {
  const [pontas, setPontas] = useState({ rola: false, antes: false, depois: false });
  /** o último valor publicado, para não chamar `setState` a cada quadro de rolagem */
  const anterior = useRef(pontas);

  useEffect(() => {
    const faixa = faixaRef.current;
    if (!faixa) return;

    const medir = () => {
      const x = faixa.scrollLeft;
      const sobra = faixa.scrollWidth - faixa.clientWidth;
      const novo = { rola: sobra > FOLGA, antes: x > FOLGA, depois: x < sobra - FOLGA };
      // a rolagem dispara dezenas de vezes por gesto e o estado muda duas
      const igual = (Object.keys(novo) as (keyof typeof novo)[]).every(
        (k) => novo[k] === anterior.current[k],
      );
      if (igual) return;
      anterior.current = novo;
      setPontas(novo);
    };

    medir();
    faixa.addEventListener('scroll', medir, { passive: true });

    /**
     * A faixa muda de largura com a janela e com a escala da seção, e o conteúdo
     * dela muda com a resposta do provedor. Observar só a caixa deixaria a
     * resposta velha quando o item mudasse de tamanho, que é o que acontece em
     * toda troca de faixa responsiva.
     */
    const observador = new ResizeObserver(medir);
    observador.observe(faixa);
    if (faixa.firstElementChild) observador.observe(faixa.firstElementChild);
    return () => {
      faixa.removeEventListener('scroll', medir);
      observador.disconnect();
    };
  }, [faixaRef, total]);

  const rolar = useCallback(
    (direcao: -1 | 1) => {
      const faixa = faixaRef.current;
      if (!faixa) return;
      /**
       * Um passo é quase uma tela, e não uma tela inteira: a sobreposição deixa
       * à vista o item em que o olho estava, então o salto tem de onde ser lido.
       * Quem pediu menos movimento recebe o mesmo salto, seco.
       */
      const suave = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      faixa.scrollBy({
        left: direcao * faixa.clientWidth * PASSO,
        behavior: suave ? 'smooth' : 'auto',
      });
    },
    [faixaRef],
  );

  return { ...pontas, rolar };
}
