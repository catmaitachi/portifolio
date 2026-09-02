import type { Placement } from '~/engine';
import type { SectionKey } from '~/content';

/**
 * A cena de cada seção, como dado.
 *
 * **Uma figura por seção.** Duas enchiam o céu e disputavam o olho com o
 * conteúdo, que é o que a página existe para mostrar — e o campo de estrelas já
 * dá densidade suficiente para o fundo não ficar vazio.
 *
 * Com uma só, o **canto** passa a ser a identidade da seção, e os quatro estão
 * ocupados: Sobre no inferior direito, Projetos no superior direito, Trajetória
 * no superior esquerdo e Contato no inferior esquerdo. Repetir as coordenadas de
 * um `placement` entre seções faz a troca parecer que nada mudou, e agora que a
 * figura é única isso vale ainda mais. As figuras também não se repetem: o céu é
 * parte da identidade da seção.
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
    placements: [{ key: 'cancer', x: 0.87, y: 0.85, size: 0.22, rotate: 12 }],
  },
  projetos: {
    entrada: 1.4,
    placements: [{ key: 'crux', x: 0.89, y: 0.21, size: 0.16, rotate: 8 }],
  },
  experiencia: {
    entrada: 1.3,
    placements: [{ key: 'ursaMajor', x: 0.14, y: 0.14, size: 0.32, rotate: -8 }],
  },
  contato: {
    entrada: 1.6,
    placements: [{ key: 'phoenix', x: 0.15, y: 0.8, size: 0.26, rotate: 9 }],
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
