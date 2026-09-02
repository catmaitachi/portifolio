import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { calcularJanela, janelaQueContem, type Janela } from './timelineGeometry';
import { useVagas } from './useVagas';

export interface Timeline {
  curvaRef: React.RefObject<HTMLDivElement | null>;
  /** índice do evento ativo (o mais recente quando nada foi escolhido) */
  ativa: number;
  janela: Janela;
  arrastando: boolean;
  /** anda `d` eventos, deslizando a janela o mínimo para o alvo caber */
  mudar: (d: number) => void;
  focar: (i: number) => void;
  noInicio: boolean;
  noFim: boolean;
}

/**
 * Janela deslizante da linha do tempo.
 *
 * A navegação **não é circular**: as pontas são pontas. Uma linha do tempo que
 * dá a volta do último para o primeiro evento mente sobre a cronologia.
 *
 * `ativa` começa em `null` e é resolvida como "a mais recente" — assim o valor
 * inicial continua correto quando um evento novo é acrescentado ao conteúdo.
 */
export function useTimeline(total: number): Timeline {
  const curvaRef = useRef<HTMLDivElement>(null);
  const [ativaBruta, setAtiva] = useState<number | null>(null);
  const [desl, setDesl] = useState(0);
  const [arrastando, setArrastando] = useState(false);

  const vagas = useVagas();
  const n = Math.max(1, total);
  const ativa = ativaBruta === null ? n - 1 : Math.min(Math.max(ativaBruta, 0), n - 1);
  const janela = useMemo(() => calcularJanela(n, desl, vagas), [n, desl, vagas]);

  // o arraste lê os valores correntes sem re-registrar os listeners a cada quadro
  const janelaRef = useRef(janela);
  janelaRef.current = janela;
  const ativaRef = useRef(ativa);
  ativaRef.current = ativa;
  const nRef = useRef(n);
  nRef.current = n;

  /**
   * A janela mudou de tamanho com a largura da tela (uma rotação, tipicamente).
   *
   * O deslocamento é contado em eventos, e `calcularJanela` já o limita ao novo
   * máximo — mas limitar não basta: com menos vagas o evento ativo pode ter
   * ficado fora da janela, e girar o aparelho não pode apagar da tela justamente
   * o que estava sendo lido. Puxa o deslocamento de volta o mínimo para contê-lo.
   */
  useEffect(() => {
    setDesl((d) => janelaQueContem(calcularJanela(nRef.current, d, vagas), ativaRef.current));
  }, [vagas]);

  const mudar = useCallback((d: number) => {
    const total = nRef.current;
    const alvo = Math.max(0, Math.min(total - 1, ativaRef.current + d));
    const proximoDesl = janelaQueContem(janelaRef.current, alvo);
    if (alvo === ativaRef.current && proximoDesl === janelaRef.current.desl) return;
    setAtiva(alvo);
    setDesl(proximoDesl);
  }, []);

  const focar = useCallback((i: number) => setAtiva(i), []);

  /**
   * Arrastar a curva = navegar no tempo.
   *
   * A largura da curva vale `vagas − 1` passos, então arrastar 1/5 da largura
   * move um evento no desktop e 1/3 dela move um no mobile — o gesto acompanha o
   * espaçamento que está na tela, em vez de um número fixo. O deslocamento é
   * **fracionário** enquanto o dedo está na tela: a curva segue o movimento em
   * vez de saltar de evento em evento.
   */
  useEffect(() => {
    const el = curvaRef.current;
    if (!el) return;

    let x0: number | null = null;
    let desl0 = 0;
    let larg = 1;
    let ultimo = 0;
    let pendente = 0;

    const aplicar = () => {
      pendente = 0;
      const j = janelaRef.current;
      if (x0 === null) return;
      const alvo = desl0 + ((ultimo - x0) / larg) * (j.vagas - 1);
      setDesl(Math.max(0, Math.min(j.maxDesl, alvo)));
    };

    const inicio = (e: PointerEvent) => {
      const j = janelaRef.current;
      // sem deslocamento possível não há o que arrastar
      if (!j.maxDesl) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      x0 = e.clientX;
      ultimo = e.clientX;
      desl0 = j.desl;
      larg = el.clientWidth || 1;
      el.setPointerCapture(e.pointerId);
      setArrastando(true);
    };

    const mover = (e: PointerEvent) => {
      if (x0 === null) return;
      ultimo = e.clientX;
      if (!pendente) pendente = requestAnimationFrame(aplicar);
    };

    const soltar = () => {
      if (x0 === null) return;
      x0 = null;
      setArrastando(false);
    };

    el.addEventListener('pointerdown', inicio);
    el.addEventListener('pointermove', mover);
    el.addEventListener('pointerup', soltar);
    el.addEventListener('pointercancel', soltar);
    el.addEventListener('lostpointercapture', soltar);
    return () => {
      el.removeEventListener('pointerdown', inicio);
      el.removeEventListener('pointermove', mover);
      el.removeEventListener('pointerup', soltar);
      el.removeEventListener('pointercancel', soltar);
      el.removeEventListener('lostpointercapture', soltar);
      if (pendente) cancelAnimationFrame(pendente);
    };
  }, []);

  return {
    curvaRef,
    ativa,
    janela,
    arrastando,
    mudar,
    focar,
    noInicio: ativa <= 0,
    noFim: ativa >= n - 1,
  };
}
