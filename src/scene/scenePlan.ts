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
 * no superior esquerdo e Contato no inferior esquerdo. Os dois modos têm cinco
 * seções com céu cada um, então cada um tem também um lugar que não é canto
 * (Formação à esquerda, Filmes à direita), e nos dois ele fica na altura de dois terços, abaixo do
 * miolo onde o conteúdo mora. Repetir as coordenadas de
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
  /**
   * Formação fica na **esquerda a dois terços**, que não é canto.
   *
   * No lado profissional a sequência é Sobre (inferior direito), Formação,
   * Projetos (superior direito), Trajetória (superior esquerdo) e Contato
   * (inferior esquerdo): cinco seções com céu para quatro cantos, o mesmo aperto
   * que Filmes resolveu do lado pessoal. Aqui a vaga do meio cai entre Sobre e
   * Projetos, que estão os dois à direita, então a figura vai para a esquerda e
   * as duas trocas atravessam a tela.
   *
   * `pegasus` era a única figura do catálogo sem uso, e o Grande Quadrado é
   * grande o bastante para sustentar uma borda inteira sem canto para se apoiar.
   */
  formacao: {
    entrada: 1.3,
    placements: [{ key: 'pegasus', x: 0.12, y: 0.62, size: 0.22, rotate: -9 }],
  },
  projetos: {
    entrada: 1.4,
    placements: [{ key: 'crux', x: 0.89, y: 0.21, size: 0.16, rotate: 8 }],
  },
  experiencia: {
    entrada: 1.3,
    placements: [{ key: 'ursaMajor', x: 0.14, y: 0.14, size: 0.32, rotate: -8 }],
  },
  /**
   * As três do lado pessoal.
   *
   * No modo pessoal a sequência é Sobre (inferior direito), Música, Jogos,
   * Filmes e Contato (inferior esquerdo): cinco seções com céu para quatro
   * cantos. Filmes fica na **direita a dois terços**, que não é canto e é o que
   * mantém todas as trocas consecutivas atravessando a tela — o par mais próximo
   * seria Filmes e Contato, e assim eles ficam em lados opostos.
   */
  musica: {
    entrada: 1.35,
    placements: [{ key: 'cygnus', x: 0.83, y: 0.24, size: 0.24, rotate: -6 }],
  },
  jogos: {
    entrada: 1.5,
    placements: [{ key: 'orion', x: 0.15, y: 0.23, size: 0.3, rotate: 7 }],
  },
  filmes: {
    entrada: 1.25,
    placements: [{ key: 'cassiopeia', x: 0.86, y: 0.66, size: 0.2, rotate: -11 }],
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
  /**
   * Intro: a câmera parte de dentro do horizonte e recua.
   *
   * Os anéis do HUD começam enquanto ela termina (`--abertura-aneis`, em
   * `reset.css`): com a curva de saída forte da câmera, aos 60% do trajeto ela já
   * andou mais de 97% do caminho, e esperar o último pedaço era tempo parado.
   */
  cameraZoom: 1.2,
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
 * **O último é o colapso.** A estrela cresce dos 7s aos 10s e ali se comprime num núcleo crítico,
 * que fica tremendo até o gesto acabar; soltar é o que a faz estourar. Não há buraco negro no fim
 * (ver `cena.md`).
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
