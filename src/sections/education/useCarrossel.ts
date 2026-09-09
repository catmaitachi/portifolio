import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useReducedMotion } from '~/hooks/useReducedMotion';

/** Deslocamento mínimo do arraste para contar como um passo, em px. */
const LIMIAR_ARRASTE = 46;

/** Quanto tempo cada diploma fica na frente antes de o carrossel andar sozinho. */
export const AUTO_MS = 5600;

/**
 * Quantos diplomas aparecem de cada lado do da frente. O resto some.
 *
 * A altura do palco não depende disso — é a de um cartão só —, mas o número
 * decide o que responde ao clique e o que sai da tabulação.
 */
export const VISIVEIS_LADO = 1;

export interface GeometriaCarrossel {
  /** deslocamento horizontal, em `calc()` sobre o passo do carrossel */
  deslocamento: string;
  escala: number;
  /** empilhamento: o da frente cobre os vizinhos onde eles se sobrepõem */
  camada: number;
  opacidade: number;
  naFrente: boolean;
  /** se o diploma está na tela: fora dela ele sai do clique e da tabulação */
  visivel: boolean;
  /** distância até o da frente, para escalonar a entrada */
  ordem: number;
}

export interface Carrossel {
  palcoRef: React.RefObject<HTMLDivElement | null>;
  ativo: number;
  /** o relógio está parado: ponteiro em cima, foco dentro, ou a seção fora */
  pausado: boolean;
  andar: (delta: number) => void;
  focar: (i: number) => void;
  geometria: (i: number) => GeometriaCarrossel;
}

/**
 * O carrossel horizontal de diplomas.
 *
 * Ele substituiu uma pilha, e a troca foi de leitura: empilhados, os diplomas de
 * trás apareciam como três riscos embaixo do da frente, e nada ali dizia que
 * eram cartões inteiros esperando a vez. Deitados lado a lado, cada vizinho
 * aparece pela metade, e o que existe ali é evidente sem que ninguém precise
 * tocar em nada.
 *
 * **É um anel, e a distância é circular.** Cada diploma sabe a própria distância
 * ao da frente pelo caminho mais curto, e é dela que saem deslocamento, escala e
 * opacidade. Um trilho transladando teria de dar um salto para voltar ao começo,
 * e um carrossel automático dá essa volta a cada ciclo. É o arranjo da órbita de
 * Projetos, achatado: sem `perspective` e sem `rotateY`, porque um diploma é
 * papel e não a face de um anel.
 *
 * **Ele anda sozinho**, que é o motivo de existir: quem chega vê o carrossel
 * andar uma vez e entende que há mais para ver, sem ter de descobrir. O relógio
 * só corre com a seção ativa, e para quando o ponteiro entra no palco, quando o
 * foco cai dentro dele, quando a aba sai de vista e com `prefers-reduced-motion`.
 * Quem está lendo um diploma não pode perdê-lo para um relógio, e um cronômetro
 * que corre escondido gasta para mostrar o que ninguém vê — é a mesma regra da
 * recarga da supernova.
 *
 * **Nada de rAF**: `ativo` muda e as `transition` de `transform` e `opacity`
 * fazem o movimento, como em Projetos.
 *
 * **O arraste é o de Projetos**, e agora só no eixo X, que é o do movimento: ele
 * começa sobre o diploma da frente, é decidido no `pointerup` (curto é clique,
 * longo é passo) e o `click` que vem depois dele é engolido, senão o gesto
 * andaria o carrossel **e** o clique cairia no cartão que estava ali. O eixo
 * vertical fica com a rolagem da página (`touch-action: pan-y` no palco).
 */
export function useCarrossel(total: number, inicial: number, secaoAtiva: boolean): Carrossel {
  const palcoRef = useRef<HTMLDivElement>(null);
  const [ativo, setAtivo] = useState(inicial);
  const [detido, setDetido] = useState(false);
  const reduzido = useReducedMotion();

  const n = Math.max(1, total);
  const nRef = useRef(n);

  // escrita num efeito, nunca no corpo do componente: o render precisa ser puro
  useLayoutEffect(() => {
    nRef.current = n;
  });

  const andar = useCallback((delta: number) => {
    const t = nRef.current;
    setAtivo((atual) => (((atual + delta) % t) + t) % t);
  }, []);

  const focar = useCallback((i: number) => setAtivo(i), []);

  /**
   * A pausa vem de quatro lugares, e só um deles é estado daqui: o que o
   * ponteiro e o foco dizem. Os outros três são prop, preferência do sistema e
   * visibilidade da aba, e o efeito do relógio recompõe os quatro.
   */
  const pausado = detido || !secaoAtiva || reduzido;

  useEffect(() => {
    const el = palcoRef.current;
    if (!el) return;

    const parar = () => setDetido(true);
    const seguir = () => setDetido(false);

    el.addEventListener('pointerenter', parar);
    el.addEventListener('pointerleave', seguir);
    el.addEventListener('focusin', parar);
    el.addEventListener('focusout', seguir);
    return () => {
      el.removeEventListener('pointerenter', parar);
      el.removeEventListener('pointerleave', seguir);
      el.removeEventListener('focusin', parar);
      el.removeEventListener('focusout', seguir);
    };
  }, []);

  /**
   * O relógio, reiniciado a cada passo.
   *
   * `ativo` está nas dependências de propósito: navegar na mão devolve a espera
   * inteira ao diploma que acabou de chegar, em vez de deixá-lo com o resto de
   * um ciclo que já estava correndo. `visibilitychange` cobre a aba escondida,
   * porque `setInterval` continua andando lá e o visitante voltaria para um
   * carrossel adiantado três diplomas.
   */
  useEffect(() => {
    if (pausado || n < 2) return;

    let relogio = document.hidden ? 0 : window.setInterval(() => andar(1), AUTO_MS);
    const aoTrocarDeAba = () => {
      clearInterval(relogio);
      relogio = document.hidden ? 0 : window.setInterval(() => andar(1), AUTO_MS);
    };

    document.addEventListener('visibilitychange', aoTrocarDeAba);
    return () => {
      clearInterval(relogio);
      document.removeEventListener('visibilitychange', aoTrocarDeAba);
    };
  }, [pausado, n, andar, ativo]);

  useEffect(() => {
    const el = palcoRef.current;
    if (!el) return;

    let x0: number | null = null;
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

    // o gesto começa sobre o diploma da frente, não na largura inteira do palco
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
    };

    const fim = (e: PointerEvent) => {
      if (x0 === null) return;
      const dx = e.clientX - x0;
      x0 = null;
      if (Math.abs(dx) <= LIMIAR_ARRASTE) return;

      el.addEventListener('click', engolirClique, { capture: true, once: true });
      // nem todo gesto gera `click` (soltar fora do elemento, por exemplo), e sem
      // esta soltura o engolidor comeria o próximo clique bom
      limpeza = window.setTimeout(soltarEngolidor, 0);

      // arrastar para a esquerda traz o próximo, que é o sentido do carrossel
      andar(dx < 0 ? 1 : -1);
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
    (i: number): GeometriaCarrossel => {
      // distância circular: o caminho mais curto no anel, para os dois lados
      const bruta = (((i - ativo) % n) + n) % n;
      const d = bruta > n / 2 ? bruta - n : bruta;
      const passos = Math.abs(d);

      const opacidade = Math.max(0, Number((d === 0 ? 1 : 0.62 - 0.24 * (passos - 1)).toFixed(3)));
      return {
        deslocamento: `calc(var(--cpasso, 78%) * ${d})`,
        escala: Number(Math.max(0.6, 1 - 0.13 * passos).toFixed(3)),
        camada: 100 - passos,
        opacidade,
        naFrente: d === 0,
        visivel: passos <= VISIVEIS_LADO && opacidade > 0,
        ordem: passos,
      };
    },
    [ativo, n],
  );

  return { palcoRef, ativo, pausado, andar, focar, geometria };
}
