import { useCallback, useEffect, useRef, useState } from 'react';
import { editandoTexto } from '~/hooks/useArrowKeys';

export interface SectionScroll {
  ref: React.RefObject<HTMLDivElement | null>;
  /** índice da seção ativa, dentro da ordem em vigor */
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
 *
 * O `total` vem de fora porque a ordem das seções passou a depender do perfil de
 * acesso escolhido: o hook navega por **posição**, e quem sabe o que há em cada
 * posição é o `App`.
 */
export function useSectionScroll(total: number): SectionScroll {
  const ref = useRef<HTMLDivElement>(null);
  const [indice, setIndice] = useState(0);
  const rafRef = useRef(0);
  // o handler global lê o índice sem entrar nas dependências do efeito, o que
  // manteria o listener sendo trocado a cada seção
  const indiceRef = useRef(0);
  indiceRef.current = indice;

  // o listener global de teclado é registrado uma vez; o total corrente chega
  // por ref, senão trocar de perfil o re-registraria
  const totalRef = useRef(total);
  totalRef.current = total;

  const irPara = useCallback((i: number) => {
    const el = ref.current;
    const n = totalRef.current || 1;
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
          irPara(totalRef.current - 1);
          break;
      }
    };
    window.addEventListener('keydown', aoTeclar);
    return () => window.removeEventListener('keydown', aoTeclar);
  }, [irPara]);

  return { ref, indice, irPara };
}
