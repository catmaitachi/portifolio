import { useCallback, useEffect, useRef, useState } from 'react';
import { SECOES } from '~/content';
import { editandoTexto } from '~/hooks/useArrowKeys';

export interface SectionScroll {
  ref: React.RefObject<HTMLDivElement | null>;
  /** índice da seção ativa, dentro de `SECOES` */
  indice: number;
  irPara: (i: number) => void;
}

/**
 * Rolagem por seções: leitura do índice ativo e navegação por teclado.
 *
 * O índice sai de um rAF por rajada de scroll, e o `setState` só acontece quando
 * ele **muda** — sem isso, cada quadro de uma rolagem suave dispararia um render
 * da árvore inteira.
 *
 * O teclado é global (↑/↓, PageUp/Down, Home/End) para funcionar sem que o
 * visitante precise clicar em nada primeiro, mas sai do caminho quando o foco
 * está num campo de texto.
 */
export function useSectionScroll(): SectionScroll {
  const ref = useRef<HTMLDivElement>(null);
  const [indice, setIndice] = useState(0);
  const rafRef = useRef(0);
  // o handler global lê o índice sem entrar nas dependências do efeito, o que
  // manteria o listener sendo trocado a cada seção
  const indiceRef = useRef(0);
  indiceRef.current = indice;

  const irPara = useCallback((i: number) => {
    const el = ref.current;
    const n = SECOES.length || 1;
    const alvo = Math.max(0, Math.min(n - 1, i));
    el?.scrollTo({ top: alvo * el.clientHeight, behavior: 'smooth' });
    setIndice(alvo);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const aoRolar = () => {
      if (rafRef.current) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = 0;
        if (!el.clientHeight) return;
        const i = Math.round(el.scrollTop / el.clientHeight);
        setIndice((atual) => (atual === i ? atual : i));
      });
    };

    el.addEventListener('scroll', aoRolar, { passive: true });
    return () => {
      el.removeEventListener('scroll', aoRolar);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => {
      if (editandoTexto(e.target)) return;
      switch (e.key) {
        case 'ArrowDown':
        case 'PageDown':
          e.preventDefault();
          irPara(indiceRef.current + 1);
          break;
        case 'ArrowUp':
        case 'PageUp':
          e.preventDefault();
          irPara(indiceRef.current - 1);
          break;
        case 'Home':
          e.preventDefault();
          irPara(0);
          break;
        case 'End':
          e.preventDefault();
          irPara(SECOES.length - 1);
          break;
      }
    };
    window.addEventListener('keydown', aoTeclar);
    return () => window.removeEventListener('keydown', aoTeclar);
  }, [irPara]);

  return { ref, indice, irPara };
}
