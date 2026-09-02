import { useLayoutEffect, useRef } from 'react';

/**
 * Anima uma mudança de posição no layout — a técnica FLIP.
 *
 * Não existe propriedade CSS que interpole a posição de um filho num flex: se a
 * ordem muda, ou se um irmão entra e desloca os outros, os elementos saltam. O
 * FLIP contorna isso invertendo o resultado — quando o efeito roda o React já
 * escreveu o layout novo, então cada filho é puxado de volta para onde estava
 * com a transição desligada e solto no quadro seguinte, deslizando de uma
 * posição à outra.
 *
 * Quem usa marca cada filho com `data-flip="<chave estável>"` e declara a
 * transição de `transform` no CSS — é ela que faz o deslize; aqui só se escreve
 * o ponto de partida.
 *
 * **Filhos fora do fluxo não participam.** Um elemento com `data-oculto` está
 * absoluto ou recolhido, e sua posição não é comparável com a de quando ele
 * estava no layout: animá-lo daria um deslocamento inventado, e ele já tem a
 * própria entrada em `opacity`/`transform`.
 *
 * Três detalhes que fazem a diferença entre funcionar e tremer:
 *
 * - `useLayoutEffect`, nunca `useEffect`: a inversão precisa entrar **antes** da
 *   pintura, senão o elemento aparece um quadro no lugar novo e só então volta;
 * - as medidas são `offsetTop`/`offsetLeft`, coordenadas de **layout** — imunes
 *   a qualquer `transform` já aplicado ao contêiner ou aos próprios filhos, que
 *   é justamente o que este hook escreve. `getBoundingClientRect` se
 *   realimentaria;
 * - **um reflow só** para todos: ler o contêiner uma vez entre inverter e soltar
 *   fixa o estado invertido. Ler filho a filho seriam N reflows por troca.
 */
export function useFlip(
  ref: React.RefObject<HTMLElement | null>,
  dependencia: unknown,
): void {
  const posRef = useRef(new Map<string, { x: number; y: number }>());

  useLayoutEffect(() => {
    const alvo = ref.current;
    if (!alvo) return;

    const antes = posRef.current;
    const agora = new Map<string, { x: number; y: number }>();
    const mover: Array<[HTMLElement, number, number]> = [];

    for (const filho of Array.from(alvo.children) as HTMLElement[]) {
      const chave = filho.dataset.flip;
      if (!chave || filho.dataset.oculto !== undefined) continue;
      const pos = { x: filho.offsetLeft, y: filho.offsetTop };
      agora.set(chave, pos);

      const anterior = antes.get(chave);
      if (!anterior) continue;
      const dx = anterior.x - pos.x;
      const dy = anterior.y - pos.y;
      if (dx || dy) mover.push([filho, dx, dy]);
    }

    posRef.current = agora;
    if (!mover.length) return;

    for (const [el, dx, dy] of mover) {
      el.style.transition = 'none';
      el.style.transform = `translate(${dx}px, ${dy}px)`;
    }
    void alvo.offsetHeight;
    for (const [el] of mover) {
      el.style.transition = '';
      el.style.transform = '';
    }
  }, [ref, dependencia]);
}
