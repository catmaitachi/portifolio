import type { Placement } from '~/engine';
import type { SectionKey } from '~/content';

/**
 * A cena de cada seção, como dado.
 *
 * Cada seção ocupa uma **diagonal diferente do céu** — repetir as coordenadas de
 * um `placement` entre seções faz a troca parecer que nada mudou. As figuras
 * também não se repetem: o céu é parte da identidade da seção.
 *
 * Adicionar uma seção com céu próprio é acrescentar uma entrada aqui; o
 * `SpaceCanvas` monta uma camada por chave e a liga/desliga sozinho.
 */
export interface Ceu {
  placements: Placement[];
  /** segundos da entrada — a saída é sempre mais curta, para não atrasar a troca */
  entrada: number;
}

export const CEUS: Partial<Record<SectionKey, Ceu>> = {
  sobre: {
    entrada: 1.2,
    placements: [
      { key: 'ursaMajor', x: 0.14, y: 0.14, size: 0.3, rotate: -8 },
      { key: 'cancer', x: 0.87, y: 0.85, size: 0.2, rotate: 12 },
    ],
  },
  projetos: {
    entrada: 1.4,
    placements: [
      { key: 'orion', x: 0.11, y: 0.52, size: 0.33, rotate: -4 },
      { key: 'crux', x: 0.89, y: 0.21, size: 0.13, rotate: 8 },
    ],
  },
  experiencia: {
    entrada: 1.3,
    placements: [
      { key: 'cygnus', x: 0.24, y: 0.19, size: 0.3, rotate: 6 },
      { key: 'cassiopeia', x: 0.83, y: 0.58, size: 0.18, rotate: -10 },
    ],
  },
  contato: {
    entrada: 1.6,
    placements: [
      { key: 'pegasus', x: 0.78, y: 0.22, size: 0.3, rotate: -5 },
      { key: 'phoenix', x: 0.19, y: 0.74, size: 0.24, rotate: 9 },
    ],
  },
};

/** Nome da camada de constelações de uma seção. */
export const nomeDoCeu = (key: SectionKey): string => `ceu-${key}`;

/** Seção onde o buraco negro existe. Fora dela ele se afasta até sumir. */
export const SECAO_DO_BURACO_NEGRO: SectionKey = 'inicio';

export const DURACAO = {
  /** o buraco negro aparece um pouco mais rápido do que se afasta */
  buracoNegroEntrada: 1.5,
  buracoNegroSaida: 1.8,
  ceuSaida: 0.9,
  /**
   * Traçado das constelações: cada figura se desenha das pontas para dentro,
   * linha a linha. Um pouco mais longo que a entrada do céu, para o traço ainda
   * estar correndo quando a camada termina de aparecer.
   */
  constelacaoTraco: 1.7,
  /** intro: a câmera parte de dentro do horizonte e recua */
  cameraZoom: 1.5,
  cameraFator: 26,
  /**
   * Supernova: a onda dura bem menos que a recarga, então nunca há duas na tela
   * — é essa folga que permite ao motor guardar uma onda só.
   *
   * A recarga é o **mesmo número** que o HUD desenha no medidor do canto: o
   * `App` lê daqui e entrega aos dois lados, porque um círculo que fecha antes
   * (ou depois) de a funcionalidade voltar mente para quem está olhando.
   */
  novaOnda: 1.35,
  novaRecarga: 3,
} as const;

/**
 * Deslocamento máximo, em px, que um toque pode ter e ainda contar como toque.
 *
 * Acima disso foi arraste — e arraste é da rolagem, da órbita ou da curva do
 * tempo, nunca da supernova.
 */
export const TOQUE_PARADO = 6;
