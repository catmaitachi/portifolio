import { useEffect, useRef } from 'react';

/**
 * Arrastar a faixa de crachás **enquanto ela anda**.
 *
 * O deslocamento do dedo mora num elemento próprio, por fora do que carrega a
 * animação: são dois `transform` que se compõem, um escrito pelo CSS e outro
 * pelo JS. No mesmo elemento eles se apagariam, que é a razão de o `<g>` da
 * curva da Trajetória e a entrada do cartão de projeto viverem separados do que
 * o JS escreve.
 *
 * **O deslocamento dá a volta**, e é isso que o mantém dentro do trilho: ele é
 * reduzido ao resto da divisão por uma volta da lista, medida no DOM. O salto de
 * uma volta inteira é invisível porque a faixa é periódica, e a lista aparece
 * **três** vezes justamente para isso: com duas cópias, o deslocamento do dedo
 * somado ao da animação podia chegar a duas voltas, e ali a faixa acabava e
 * sobrava vazio na borda. Com três, os dois cabem.
 *
 * A volta é medida entre o primeiro crachá e o primeiro da cópia seguinte, por
 * `offsetLeft`, que é medida de **layout**: ela não acompanha os `transform` que
 * estão em cima dela, então não muda enquanto a faixa anda nem enquanto o dedo
 * arrasta. Escrita como conta de tokens do CSS, ela sairia de sincronia na
 * primeira faixa responsiva.
 *
 * **Não há inércia, e não deveria haver.** A faixa já está em movimento por
 * conta própria: um empurrão com desaceleração se somaria a ele e o gesto
 * deixaria de ser "eu movo isto" para virar "eu chuto isto". Soltar devolve a
 * faixa ao passo dela, de onde o dedo a deixou.
 */
export function useArrastarFaixa(
  palcoRef: React.RefObject<HTMLDivElement | null>,
  /** quantos crachás tem **uma** volta, para achar onde a cópia começa */
  total: number,
  ligado: boolean,
) {
  const trilhoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const palco = palcoRef.current;
    const trilho = trilhoRef.current;
    if (!palco || !trilho || !ligado) return;

    let dx = 0;
    let x0 = 0;
    let ponteiro: number | null = null;

    /** O comprimento de uma volta, em px de layout. */
    const volta = () => {
      const filhos = trilho.firstElementChild?.children;
      if (!filhos || filhos.length <= total) return 0;
      return (filhos[total] as HTMLElement).offsetLeft - (filhos[0] as HTMLElement).offsetLeft;
    };

    const aplicar = () => {
      const l = volta();
      if (l > 0) {
        dx %= l;
        // sempre em (-uma volta, 0]: para a direita a faixa nunca descobre a ponta
        if (dx > 0) dx -= l;
      }
      trilho.style.transform = `translateX(${dx.toFixed(1)}px)`;
    };

    const inicio = (e: PointerEvent) => {
      ponteiro = e.pointerId;
      x0 = e.clientX;
      palco.setPointerCapture(e.pointerId);
    };

    const mover = (e: PointerEvent) => {
      if (ponteiro !== e.pointerId) return;
      dx += e.clientX - x0;
      x0 = e.clientX;
      aplicar();
    };

    const fim = (e: PointerEvent) => {
      if (ponteiro !== e.pointerId) return;
      ponteiro = null;
      if (palco.hasPointerCapture(e.pointerId)) palco.releasePointerCapture(e.pointerId);
    };

    palco.addEventListener('pointerdown', inicio);
    palco.addEventListener('pointermove', mover);
    palco.addEventListener('pointerup', fim);
    palco.addEventListener('pointercancel', fim);
    return () => {
      palco.removeEventListener('pointerdown', inicio);
      palco.removeEventListener('pointermove', mover);
      palco.removeEventListener('pointerup', fim);
      palco.removeEventListener('pointercancel', fim);
      trilho.style.transform = '';
    };
  }, [palcoRef, total, ligado]);

  return trilhoRef;
}
