import { useEffect } from 'react';

/**
 * Campos onde as setas pertencem ao cursor de texto, não à navegação.
 *
 * Mora aqui, e não em cada consumidor, porque a regra é a mesma para todo mundo
 * que escuta o teclado na janela: rolagem de seções, órbita de projetos e linha
 * do tempo. Duplicada, ela sairia de sincronia no dia em que um campo novo
 * aparecesse.
 */
export function editandoTexto(alvo: EventTarget | null): boolean {
  if (!(alvo instanceof HTMLElement)) return false;
  const tag = alvo.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || alvo.isContentEditable;
}

/**
 * ←/→ na janela enquanto a seção está ativa.
 *
 * **Sem exigir foco.** Uma seção que tem uma única coisa a navegar (a órbita de
 * Projetos, a curva da Trajetória) não pode pedir um clique antes de responder
 * à seta: quem chegou rolando não tem foco em lugar nenhum, e a tecla morreria
 * no vazio. É por isso que o listener é global e ligado a `ativo` — fora da
 * seção ele nem existe, então duas seções nunca disputam a mesma tecla.
 *
 * As seções vizinhas continuam de fora: ↑/↓ são da rolagem (`useSectionScroll`)
 * e ←/→ são de quem está na tela.
 */
export function useArrowKeys(ativo: boolean, andar: (delta: number) => void): void {
  useEffect(() => {
    if (!ativo) return;
    const aoTeclar = (e: KeyboardEvent) => {
      if (editandoTexto(e.target)) return;
      const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (!d) return;
      e.preventDefault();
      andar(d);
    };
    window.addEventListener('keydown', aoTeclar);
    return () => window.removeEventListener('keydown', aoTeclar);
  }, [ativo, andar]);
}
