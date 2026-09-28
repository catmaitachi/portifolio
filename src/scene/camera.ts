/**
 * O que a página pede à câmera do céu, sem passar pelo React.
 *
 * A rolagem de uma tela move a câmera a cada quadro, e levar isso por prop até o
 * `SpaceCanvas` renderizaria o `App` inteiro a cada quadro de rolagem. Este canal
 * é o atalho: a página escreve aqui, e o `SpaceCanvas`, que continua sendo a única
 * ponte com o motor, liga o motor a ele quando o motor fica pronto.
 *
 * O último pedido fica guardado: o motor entra por `import()` e chega depois da
 * primeira rolagem possível, e ao ligar ele recebe a profundidade em que a página
 * já está.
 */
export interface DestinoCamera {
  avancar(profundidade: number): void;
  saltar(): void;
  /** o quanto o buraco negro está presente, de 0 a 1 (ver `camera.buraco`) */
  buraco(presenca: number): void;
}

/**
 * Quanto a câmera anda, em profundidade, de uma ponta à outra de uma tela.
 *
 * Um pouco mais que meia volta do campo (que tem profundidade 1): a rolagem
 * inteira de uma tela leva metade das estrelas para trás da câmera, o que lê como
 * viagem, e não o céu inteiro, o que leria como um túnel.
 */
const PROFUNDIDADE = 0.6;

let destino: DestinoCamera | null = null;
let ultima = 0;
let presenca = 1;

export const camera = {
  /** a rolagem da tela ativa, de 0 (topo) a 1 (fim) */
  rolar(progresso: number): void {
    ultima = progresso * PROFUNDIDADE;
    destino?.avancar(ultima);
  },
  /** a troca de tela */
  saltar(): void {
    destino?.saltar();
  },
  /**
   * O buraco negro visto da câmera: 1 com o Início inteiro na tela, e encolhendo
   * enquanto a rolagem o leva embora, até 0. Ele não some numa seção, ele fica
   * para trás conforme a câmera anda. Fora da tela dele, 0.
   */
  buraco(v: number): void {
    presenca = v;
    destino?.buraco(v);
  },
};

/** Liga o motor ao canal; devolve quem o desliga. */
export function ligarCamera(d: DestinoCamera): () => void {
  destino = d;
  d.avancar(ultima);
  d.buraco(presenca);
  return () => {
    if (destino === d) destino = null;
  };
}
