import { fastSin } from './math';

/**
 * O campo de plasma, num lugar só.
 *
 * Duas camadas o desenham — o buraco negro do Início e a carga da supernova, a
 * partir do nível 2 — e nenhuma pode importar a outra. É o mesmo arranjo de
 * `engine/gravity`: o desenho mora aqui e cada camada guarda o seu buffer.
 *
 * O contrato de desempenho é o que dá a forma do módulo. O efeito é por pixel,
 * então ele vive num buffer pequeno repintado **abaixo de 60fps** e ampliado pela
 * GPU no `drawImage`; a máscara, o raio de cada pixel e a curva de contraste são
 * constantes e ficam tabelados na criação, não por quadro. O `ImageData` é criado
 * uma vez e reescrito no lugar.
 */
export interface Plasma {
  /** o buffer pronto para `drawImage`; ampliar é trabalho da GPU */
  readonly canvas: HTMLCanvasElement;
  /** repinta o buffer para o instante dado, em segundos já multiplicados pela velocidade */
  pintar(time: number): void;
}

/**
 * Escala do campo de senos em pixels do buffer.
 *
 * Vem do valor original (96px de buffer sobre 13) e é aplicada como razão, para
 * que um buffer menor mostre o **mesmo** padrão em escala, e não um recorte dele.
 */
const ESCALA = 96 / 13;

export function criarPlasma(size = 96): Plasma {
  const P = size;
  const S = P / ESCALA;

  const cv = document.createElement('canvas');
  cv.width = P;
  cv.height = P;
  const ctx = cv.getContext('2d')!;
  const img = ctx.createImageData(P, P);
  const d = img.data;

  // máscara (anel) e raio pré-calculados: constantes por pixel, não por quadro
  const mask = new Float32Array(P * P);
  const rad = new Float32Array(P * P);
  for (let y = 0; y < P; y++) {
    for (let x = 0; x < P; x++) {
      const nx = (x - P / 2) / (P / 2);
      const ny = (y - P / 2) / (P / 2);
      const r = Math.sqrt(nx * nx + ny * ny);
      mask[y * P + x] =
        Math.max(0, Math.min(1, (r - 0.11) / 0.1)) * Math.max(0, 1 - Math.pow(r / 0.95, 1.7));
      const dx = (x - P / 2) / S;
      const dy = (y - P / 2) / S;
      rad[y * P + x] = Math.sqrt(dx * dx + dy * dy) * 1.6;
    }
  }

  // curva de contraste, também em tabela
  const POW = new Float32Array(257);
  for (let i = 0; i <= 256; i++) POW[i] = Math.pow(i / 256, 3.2) * 255;

  return {
    canvas: cv,
    pintar(time: number) {
      const cos = Math.cos(time * 0.3);
      const sin = Math.sin(time * 0.3);
      const t1 = time;
      const t2 = time * 0.7;
      const t3 = time * 1.4;
      const t4 = time * 0.5;
      for (let y = 0; y < P; y++) {
        const dy = (y - P / 2) / S;
        const bx = -dy * sin;
        const by = dy * cos;
        for (let x = 0; x < P; x++) {
          const dx = (x - P / 2) / S;
          const rx = dx * cos + bx;
          const ry = dx * sin + by;
          const k = y * P + x;
          const v =
            fastSin(rx + t1) +
            fastSin(ry * 0.9 - t2) +
            fastSin(rad[k] - t3) +
            fastSin((rx + ry) * 0.7 + t4);
          let q = ((v + 4) * 32) | 0;
          if (q < 0) q = 0;
          else if (q > 256) q = 256;
          const g = POW[q];
          const i = k * 4;
          d[i] = g;
          d[i + 1] = g;
          d[i + 2] = g;
          d[i + 3] = g * mask[k];
        }
      }
      ctx.putImageData(img, 0, 0);
    },
  };
}
