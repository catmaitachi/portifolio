import { useEffect, useState } from 'react';

/**
 * A rampa de densidade, do vazio ao cheio.
 *
 * São dez degraus e todos são **ASCII**, pela mesma razão que o alfabeto da
 * decifragem da bio é (ver `entradas.md`): a página inteira é IBM Plex Mono, e
 * um glifo que a fonte não tem vira caixa vazia. Aqui seria pior que lá, porque
 * o desenho é feito da densidade dos glifos, e uma caixa vazia é o mais denso de
 * todos.
 */
const RAMPA = " .:-=+*#%@";

/**
 * O retrato reduzido a caracteres, uma vez.
 *
 * A conta acontece num canvas de `colunas × linhas` pixels — 58 por 44, ou
 * pouco mais de dois mil —, e o navegador faz a redução da imagem inteira para
 * essa grade de graça, no `drawImage`. Depois é uma passada de luminância por
 * célula. É barato o suficiente para não valer um worker, e acontece **uma vez
 * por imagem**, não por quadro: o que o ponteiro faz depois é opacidade em CSS.
 *
 * O recorte é o mesmo do `object-fit: cover` que a moldura usa, senão o retrato
 * em ASCII estaria esticado em relação ao que está por baixo dele.
 *
 * Falhar é devolver string vazia, e o componente simplesmente não desenha a
 * camada: um retrato sem raio-x continua sendo um retrato.
 */
export function useAsciiArt(src: string | undefined, colunas: number, linhas: number): string {
  const [arte, setArte] = useState('');

  useEffect(() => {
    if (!src) return;
    let vivo = true;

    const img = new Image();
    img.src = src;

    img
      .decode()
      .then(() => {
        if (!vivo) return;
        const canvas = document.createElement('canvas');
        canvas.width = colunas;
        canvas.height = linhas;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return;

        // `cover`: a maior das duas escalas preenche a grade e o resto sobra fora
        const escala = Math.max(colunas / img.width, linhas / img.height);
        const w = img.width * escala;
        const h = img.height * escala;
        ctx.drawImage(img, (colunas - w) / 2, (linhas - h) / 2, w, h);

        const { data } = ctx.getImageData(0, 0, colunas, linhas);
        const ultimo = RAMPA.length - 1;
        const linhasTexto: string[] = [];

        for (let y = 0; y < linhas; y++) {
          let linha = '';
          for (let x = 0; x < colunas; x++) {
            const p = (y * colunas + x) * 4;
            // luminância perceptual, não a média dos canais
            const lum = (0.2126 * data[p] + 0.7152 * data[p + 1] + 0.0722 * data[p + 2]) / 255;
            /**
             * Um pouco de contraste antes de escolher o glifo.
             *
             * O retrato é uma foto de meio-tom, e mapeada crua ela cai quase
             * toda nos degraus do meio da rampa: o resultado é uma mancha
             * uniforme em vez de um rosto. A curva abre as pontas em torno de
             * 0,5, que é onde a pele está.
             */
            const ajustada = Math.min(1, Math.max(0, (lum - 0.5) * 1.45 + 0.5));
            linha += RAMPA[Math.round(ajustada * ultimo)];
          }
          linhasTexto.push(linha);
        }

        setArte(linhasTexto.join('\n'));
      })
      .catch(() => {
        // imagem que não carrega não tem raio-x, e a moldura já cobre esse caso
      });

    return () => {
      vivo = false;
    };
  }, [src, colunas, linhas]);

  return arte;
}
