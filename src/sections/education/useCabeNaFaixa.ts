import { useLayoutEffect, useState } from 'react';

/**
 * Se os crachás cabem todos no palco, sem precisar desfilar.
 *
 * A faixa só anda quando **não cabe**, e é isso que faz o movimento ser
 * consequência da falta de espaço em vez de enfeite: numa tela larga os três
 * ficam parados e centrados, à vista de uma vez, que é o melhor estado
 * possível; num celular não há largura para isso a não ser encolhendo o texto
 * até o ilegível, e aí a faixa passa cada um pelo meio.
 *
 * **A medida vem do DOM, nunca de uma conta.** A largura do crachá muda por
 * media query e o bloco inteiro ainda passa pelo `zoom` do `useEscalaQueCabe`;
 * qualquer número escrito aqui erraria na primeira dessas mudanças. Medir os
 * dois lados com `getBoundingClientRect` também resolve o `zoom` de graça, já
 * que ele entra nas duas pontas da comparação.
 *
 * Só a **primeira volta** é medida (`total` crachás), e não a faixa inteira: a
 * cópia existe justamente para o laço fechar sem salto, e contá-la faria a
 * resposta ser sempre "não cabe". A distância entre a borda esquerda do
 * primeiro e a direita do último não muda enquanto a animação corre, porque
 * translação não altera diferença.
 *
 * `useLayoutEffect` para que a correção aconteça antes da pintura: o primeiro
 * render assume que não cabe, e sem isso haveria um quadro com a faixa desfilando
 * numa tela em que ela nunca deveria ter se mexido.
 *
 * A faixa entra por `ref`, e não por `firstElementChild` do palco: entre os dois
 * existe o trilho do arraste, e um caminho escrito em termos de "o primeiro
 * filho" quebraria em silêncio na próxima camada que aparecesse ali.
 */
export function useCabeNaFaixa(
  palcoRef: React.RefObject<HTMLDivElement | null>,
  faixaRef: React.RefObject<HTMLDivElement | null>,
  total: number,
): boolean {
  const [cabe, setCabe] = useState(false);

  useLayoutEffect(() => {
    const palco = palcoRef.current;
    const faixa = faixaRef.current;
    if (!palco || !faixa) return;

    const medir = () => {
      const n = Math.min(total, faixa.children.length);
      if (n < 1) return;
      const primeiro = faixa.children[0].getBoundingClientRect();
      const ultimo = faixa.children[n - 1].getBoundingClientRect();
      // meio pixel de folga: a soma das larguras raramente fecha em número redondo
      setCabe(ultimo.right - primeiro.left <= palco.getBoundingClientRect().width + 0.5);
    };

    medir();

    /**
     * O palco muda de largura com a janela; o crachá muda de tamanho com as
     * media queries e com a escala da seção. São as duas pontas da comparação, e
     * observar só uma deixaria a resposta velha quando a outra mudasse.
     */
    const observador = new ResizeObserver(medir);
    observador.observe(palco);
    if (faixa.firstElementChild) observador.observe(faixa.firstElementChild);
    return () => observador.disconnect();
  }, [palcoRef, faixaRef, total]);

  return cabe;
}
