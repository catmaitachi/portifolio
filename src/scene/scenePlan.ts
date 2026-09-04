import type { NivelNova, Placement } from '~/engine';
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
} as const;

/**
 * Os níveis da supernova, como dado.
 *
 * A tabela mora aqui, e não na fábrica da camada, porque a recarga é o **mesmo
 * número** que o HUD desenha no medidor do canto: o motor a cobra e o `App` a
 * entrega ao `NovaGauge`, e um círculo que fecha antes (ou depois) de a
 * funcionalidade voltar mente para quem está olhando. Com níveis, esse número
 * deixou de ser um só, mas continua tendo uma fonte só.
 *
 * **Os dois níveis do meio são longos de propósito.** São quatro segundos de plasma crescendo e três
 * de estrela crescendo, e é neles que a carga se vê chegando a algum lugar; sem esse trecho, cada
 * nível seria só mais um degrau logo depois do anterior.
 *
 * **E o último não aparece do nada.** Um buraco negro é o que sobra quando uma estrela massiva
 * colapsa, então a estrela vem antes: ela cresce dos 7s aos 10s e implode ali, e o horizonte nasce
 * de dentro do clarão.
 *
 * Dois valores não são livres:
 *
 * - **`recarga` > `onda`, em todos os níveis.** É essa folga que permite ao motor
 *   guardar uma onda só; quebrá-la exigiria um pool de ondas e um laço a mais por
 *   estrela no campo de estrelas.
 * - **`poco.k`.** Com o puxão de `engine/gravity` e a mola de 2.6 do campo de
 *   estrelas, o deslocamento de equilíbrio é `k · raio · 5.28 / 2.6` px. É essa
 *   conta que decide se a carga lê como gravidade forte ou como um tremor.
 */
export const NOVA_NIVEIS: readonly NivelNova[] = [
  { segurar: 0, recarga: 3, onda: 1.35, alcance: 0.55, forca: 620, poco: { reach: 150, k: 1 }, brilho: 1 },
  {
    segurar: 3,
    recarga: 4.2,
    onda: 1.7,
    alcance: 0.78,
    forca: 980,
    poco: { reach: 240, k: 2 },
    brilho: 1.45,
  },
  {
    segurar: 7,
    recarga: 5.5,
    onda: 2.1,
    alcance: 1,
    forca: 1420,
    poco: { reach: 300, k: 2.7 },
    brilho: 1.95,
  },
  {
    segurar: 10,
    recarga: 7,
    onda: 2.5,
    alcance: 1.3,
    forca: 2000,
    poco: { reach: 380, k: 3.6 },
    brilho: 2.5,
  },
] as const;

/**
 * Deslocamento máximo, em px, que um gesto pode ter e ainda contar como toque.
 *
 * Acima disso foi arraste — e arraste é da rolagem, da órbita ou da curva do
 * tempo, nunca da supernova.
 *
 * São 14px e não os 6px de antes porque o gesto passou a durar segundos: um dedo
 * (ou uma mão no mouse) segurando por três segundos não fica dentro de 6px, e a
 * carga era abortada justamente em quem estava tentando carregá-la. O limite é um
 * só e vale para o gesto inteiro, do `pointerdown` ao `pointerup`.
 */
export const TOQUE_PARADO = 14;
