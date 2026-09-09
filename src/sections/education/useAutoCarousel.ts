import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useReducedMotion } from '~/hooks/useReducedMotion';

/** Pausa após qualquer interação, em ms. */
const PAUSA = 2200;
/** Velocidade da deriva automática, em px/s. */
const VELOCIDADE = 34;

export interface AutoCarousel {
  ref: React.RefObject<HTMLDivElement | null>;
  /** true quando os itens não cabem lado a lado e o trilho vira carrossel */
  ativo: boolean;
  /** desloca o trilho e pausa a deriva (usado pelas setas do teclado) */
  andar: (delta: number) => void;
}

/**
 * Carrossel que só existe quando precisa.
 *
 * Grade estática **enquanto os itens cabem**; vira carrossel só quando não
 * cabem. Um `ResizeObserver` compara a largura visível com `n·(largura+gap) −
 * gap`, e tanto a largura quanto o gap são **lidos do DOM** — nenhum número de
 * layout fica duplicado aqui, então mexer no CSS não exige mexer neste arquivo.
 *
 * O laço infinito depende de o trilho ter **duas cópias** da lista: reposicionar
 * `(scrollWidth + gap) / 2` é exatamente uma cópia mais o seu gap, e a emenda
 * fica imperceptível.
 *
 * A rolagem é nativa — swipe e inércia vêm de graça do navegador; só a deriva
 * automática é nossa.
 *
 * @param total quantidade de itens *originais* (não contando a segunda cópia)
 */
export function useAutoCarousel(total: number): AutoCarousel {
  const ref = useRef<HTMLDivElement>(null);
  const [ativo, setAtivo] = useState(false);
  const semMovimento = useReducedMotion();

  // lidos dentro do rAF sem entrar nas dependências do efeito
  const totalRef = useRef(total);
  const ativoRef = useRef(ativo);
  const semMovimentoRef = useRef(semMovimento);

  /**
   * Escritas num efeito, nunca no corpo: o render precisa ser puro e o React
   * pode descartá-lo. `useLayoutEffect` porque o laço da deriva lê estas refs
   * num `rAF`, e com `useEffect` haveria um quadro lendo o valor anterior.
   */
  useLayoutEffect(() => {
    totalRef.current = total;
    ativoRef.current = ativo;
    semMovimentoRef.current = semMovimento;
  });

  const pausarRef = useRef<() => void>(() => {});
  const andarRef = useRef<(d: number) => void>(() => {});

  const andar = useCallback((delta: number) => andarRef.current(delta), []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let ultimo = 0;
    let ocioso = 0;
    let arrastando = false;
    let x0 = 0;
    let s0 = 0;
    let sobra = 0; // acumulador subpixel: sem ele a deriva trava em telas lentas

    const trilho = () => el.firstElementChild as HTMLElement | null;

    /**
     * `gap` e largura do item vêm do DOM, mas só quando o DOM muda de tamanho.
     *
     * A leitura em si é cara — `getComputedStyle` a cada quadro obriga o
     * navegador a recalcular estilo dentro do rAF, e o laço precisa do gap todo
     * quadro. Medir no `ResizeObserver` e guardar o número mantém a propriedade
     * de não duplicar layout no JS (o valor continua vindo do CSS) sem pagar por
     * ela sessenta vezes por segundo.
     */
    let gapPx = 0;

    const medir = () => {
      const t = trilho();
      const bw = (t?.children[0] as HTMLElement | undefined)?.offsetWidth ?? 0;
      gapPx = t ? parseFloat(getComputedStyle(t).columnGap) || 0 : 0;
      const n = totalRef.current;
      if (!bw || !n) return;
      // -1 absorve o arredondamento sub-pixel do layout
      const precisa = el.clientWidth < n * (bw + gapPx) - gapPx - 1;
      if (precisa !== ativoRef.current) {
        if (!precisa) el.scrollLeft = 0;
        setAtivo(precisa);
      }
    };

    medir();
    const obs = new ResizeObserver(medir);
    obs.observe(el);

    const pausar = () => {
      ocioso = performance.now() + PAUSA;
    };
    pausarRef.current = pausar;
    andarRef.current = (d) => {
      el.scrollLeft += d;
      pausar();
    };

    const metade = () => (el.scrollWidth + gapPx) / 2;
    const laco = () => {
      const m = metade();
      if (m <= 0) return;
      if (el.scrollLeft >= m) el.scrollLeft -= m;
      else if (el.scrollLeft < 0) el.scrollLeft += m;
    };

    let raf: number | null = null;

    const passo = (agora: number) => {
      raf = requestAnimationFrame(passo);
      const dt = ultimo ? Math.min(0.05, (agora - ultimo) / 1000) : 0;
      ultimo = agora;
      if (!ativoRef.current) return;
      if (!arrastando && !semMovimentoRef.current && agora > ocioso) {
        sobra += dt * VELOCIDADE;
        const passos = Math.floor(sobra);
        if (passos) {
          el.scrollLeft += passos;
          sobra -= passos;
        }
      }
      laco();
    };

    const ligar = () => {
      if (raf !== null) return;
      ultimo = 0; // o primeiro quadro depois de uma pausa não tem delta
      raf = requestAnimationFrame(passo);
    };

    const desligar = () => {
      if (raf === null) return;
      cancelAnimationFrame(raf);
      raf = null;
    };

    /**
     * A deriva só corre com o carrossel na tela.
     *
     * A página tem cinco seções e uma delas está visível por vez: sem isto, o
     * trilho continuaria escrevendo `scrollLeft` a cada quadro enquanto o
     * visitante lê Contato — um rAF eterno concorrendo com a cena em canvas por
     * um movimento que ninguém vê.
     */
    const visao = new IntersectionObserver(
      ([e]) => (e.isIntersecting ? ligar() : desligar()),
      { threshold: 0 },
    );
    visao.observe(el);

    const aoRodar = (e: WheelEvent) => {
      if (!ativoRef.current) return;
      pausar();
      // roda vertical vira movimento horizontal; roda horizontal já é nativa
      if (Math.abs(e.deltaX) < Math.abs(e.deltaY)) {
        e.preventDefault();
        el.scrollLeft += e.deltaY;
        laco();
      }
    };

    const aoPressionar = (e: PointerEvent) => {
      if (!ativoRef.current) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      arrastando = true;
      x0 = e.clientX;
      s0 = el.scrollLeft;
      el.style.cursor = 'grabbing';
      // no toque, deixa o navegador cuidar do swipe e da inércia
      if (e.pointerType === 'mouse') {
        el.setPointerCapture(e.pointerId);
        e.preventDefault();
      }
    };

    const aoMover = (e: PointerEvent) => {
      if (!arrastando) return;
      el.scrollLeft = s0 - (e.clientX - x0);
      laco();
    };

    const aoSoltar = () => {
      if (!arrastando) return;
      arrastando = false;
      el.style.cursor = '';
      pausar();
    };

    el.addEventListener('wheel', aoRodar, { passive: false });
    el.addEventListener('pointerdown', aoPressionar);
    el.addEventListener('pointermove', aoMover);
    el.addEventListener('pointerup', aoSoltar);
    el.addEventListener('pointercancel', aoSoltar);
    el.addEventListener('lostpointercapture', aoSoltar);
    el.addEventListener('touchstart', pausar, { passive: true });

    return () => {
      desligar();
      visao.disconnect();
      obs.disconnect();
      el.removeEventListener('wheel', aoRodar);
      el.removeEventListener('pointerdown', aoPressionar);
      el.removeEventListener('pointermove', aoMover);
      el.removeEventListener('pointerup', aoSoltar);
      el.removeEventListener('pointercancel', aoSoltar);
      el.removeEventListener('lostpointercapture', aoSoltar);
      el.removeEventListener('touchstart', pausar);
    };
  }, []);

  return { ref, ativo, andar };
}
