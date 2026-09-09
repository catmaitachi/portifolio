import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

/** Deslocamento mínimo do arraste para contar como um passo, em px. */
const LIMIAR_ARRASTE = 46;

/**
 * Quantos diplomas aparecem atrás do da frente. O resto some.
 *
 * A seção lê este número para dimensionar o palco: a altura dele é o cartão mais
 * o passo de cada um que pode espiar por baixo, e um número solto no CSS sairia
 * de sincronia com este no dia em que a pilha mostrasse um a mais.
 */
export const VISIVEIS_ATRAS = 3;

export interface GeometriaDeck {
  /** deslocamento vertical, em `calc()` sobre o passo da pilha */
  deslocamento: string;
  escala: number;
  /** empilhamento: quem está por cima cobre quem está por baixo */
  camada: number;
  opacidade: number;
  naFrente: boolean;
  /** se o diploma está na tela: fora dela ele sai do clique e da tabulação */
  visivel: boolean;
  /** distância até o da frente, para escalonar a entrada */
  ordem: number;
}

export interface Deck {
  palcoRef: React.RefObject<HTMLDivElement | null>;
  ativo: number;
  andar: (delta: number) => void;
  focar: (i: number) => void;
  geometria: (i: number) => GeometriaDeck;
}

/**
 * A pilha de diplomas.
 *
 * **É uma pilha, e não um anel**, e a diferença é a regra inteira: o da frente
 * está por cima, os seguintes espiam por baixo dele, e avançar tira o de cima da
 * mesa. Voltar devolve à mesa o que tinha saído, por cima — nunca traz para a
 * frente o que estava embaixo, que é o que um anel faz e é o que não se parece
 * com papel empilhado.
 *
 * Daí decorre que **a navegação não é circular**: as pontas são pontas, como na
 * linha do tempo da Trajetória. Do último não se avança para o primeiro, porque
 * não há nada embaixo do último.
 *
 * O que já passou sobe e se apaga, em vez de encolher junto com os de trás: ele
 * saiu da pilha, e continuar desenhando-o menor o poria de novo lá dentro.
 *
 * **Nada de rAF**: `ativo` muda e as `transition` de `transform` e `opacity`
 * fazem o movimento, como na órbita de Projetos.
 *
 * **O arraste é o mesmo de Projetos, e vale nos dois eixos.** Ele começa sobre o
 * diploma da frente, é decidido no `pointerup` (arraste curto é clique, longo é
 * passo) e o `click` que vem depois dele é engolido, senão o gesto andaria a
 * pilha **e** o clique cairia no cartão que estava ali.
 *
 * Os dois eixos existem por causa do toque, e não por capricho: subir o dedo é o
 * gesto natural para uma pilha vertical, mas o eixo vertical do celular é o da
 * rolagem da página, e tomá-lo exigiria `touch-action: none` sobre o maior
 * elemento da seção — o visitante perderia a rolagem justamente onde o dedo cai
 * primeiro. Com `touch-action: pan-y` no palco, o dedo continua rolando a página
 * para cima e para baixo, e é o gesto **horizontal** que anda a pilha, que é o
 * mesmo de Projetos. No mouse os dois funcionam, e vale o maior deslocamento.
 *
 * Arrastar **para cima** (ou para a esquerda) avança, que é tirar o de cima da
 * mesa; para baixo (ou para a direita) volta.
 */
export function useDeck(total: number, inicial: number): Deck {
  const palcoRef = useRef<HTMLDivElement>(null);
  const [ativo, setAtivo] = useState(inicial);

  const n = Math.max(1, total);
  const nRef = useRef(n);

  // escrita num efeito, nunca no corpo do componente: o render precisa ser puro
  useLayoutEffect(() => {
    nRef.current = n;
  });

  const andar = useCallback((delta: number) => {
    setAtivo((atual) => Math.min(nRef.current - 1, Math.max(0, atual + delta)));
  }, []);

  const focar = useCallback((i: number) => setAtivo(i), []);

  useEffect(() => {
    const el = palcoRef.current;
    if (!el) return;

    let x0: number | null = null;
    let y0 = 0;
    let limpeza: number | undefined;

    /**
     * O `click` que vem logo depois de um arraste é do mesmo gesto e morre aqui.
     * A captura no palco basta para o React nunca ver o evento: ele escuta na
     * raiz do documento e dispara `onClick` na subida, que deixa de acontecer.
     */
    const engolirClique = (ev: Event) => {
      ev.stopPropagation();
      ev.preventDefault();
    };

    const soltarEngolidor = () => {
      el.removeEventListener('click', engolirClique, true);
      clearTimeout(limpeza);
      limpeza = undefined;
    };

    // o gesto começa sobre o diploma da frente, que é o que está por cima da pilha
    const inicio = (e: PointerEvent) => {
      const frente = el.querySelector<HTMLElement>('[data-frente]');
      if (!frente) return;
      const caixa = frente.getBoundingClientRect();
      const dentro =
        e.clientX >= caixa.left &&
        e.clientX <= caixa.right &&
        e.clientY >= caixa.top &&
        e.clientY <= caixa.bottom;
      if (!dentro) return;
      x0 = e.clientX;
      y0 = e.clientY;
    };

    const fim = (e: PointerEvent) => {
      if (x0 === null) return;
      const dx = e.clientX - x0;
      const dy = e.clientY - y0;
      x0 = null;
      // vale o eixo que andou mais: no mouse os dois servem, no toque sobra o X
      const d = Math.abs(dy) >= Math.abs(dx) ? dy : dx;
      if (Math.abs(d) <= LIMIAR_ARRASTE) return;

      el.addEventListener('click', engolirClique, { capture: true, once: true });
      // nem todo gesto gera `click` (soltar fora do elemento, por exemplo), e sem
      // esta soltura o engolidor comeria o próximo clique bom
      limpeza = window.setTimeout(soltarEngolidor, 0);

      // para cima, ou para a esquerda, é tirar o de cima da mesa
      andar(d < 0 ? 1 : -1);
    };

    const cancelar = () => {
      x0 = null;
    };

    el.addEventListener('pointerdown', inicio);
    el.addEventListener('pointerup', fim);
    el.addEventListener('pointercancel', cancelar);
    return () => {
      el.removeEventListener('pointerdown', inicio);
      el.removeEventListener('pointerup', fim);
      el.removeEventListener('pointercancel', cancelar);
      soltarEngolidor();
    };
  }, [andar]);

  const geometria = useCallback(
    (i: number): GeometriaDeck => {
      const d = i - ativo;

      // já passou: sai por cima e se apaga
      if (d < 0) {
        return {
          deslocamento: `calc(var(--dsaida, 60px) * ${d})`,
          escala: 1.03,
          camada: 100 + d,
          opacidade: 0,
          naFrente: false,
          visivel: false,
          ordem: -d,
        };
      }

      const opacidade = Math.max(0, Number((d === 0 ? 1 : 0.66 - 0.22 * (d - 1)).toFixed(3)));
      return {
        deslocamento: `calc(var(--dpasso, 34px) * ${d})`,
        // encolher acompanha o afastamento: a pilha ganha profundidade sem perspectiva
        escala: Number(Math.max(0.7, 1 - 0.045 * d).toFixed(3)),
        camada: 200 - d,
        opacidade,
        naFrente: d === 0,
        visivel: d <= VISIVEIS_ATRAS && opacidade > 0,
        ordem: d,
      };
    },
    [ativo],
  );

  return { palcoRef, ativo, andar, focar, geometria };
}
