/**
 * Contrato do motor de cena.
 *
 * Uma camada não conhece as outras: tudo o que compartilham passa pelo `StageEnv`
 * — inclusive publicações pontuais, que vão no `bus`. Trocar, remover ou
 * reordenar uma camada nunca exige tocar nas demais.
 */

/** Estado que o buraco negro publica e o campo de estrelas consome. */
export interface Gravity {
  x: number;
  y: number;
  /** raio do horizonte, em px */
  radius: number;
  /** alcance da atração, em px — fora dele o cálculo é pulado */
  reach: number;
  /** intensidade 0..1 (acompanha o `strength` da camada) */
  k: number;
}

/** Barramento entre camadas. Cada publicação é opcional por definição. */
export interface StageBus {
  gravity?: Gravity | null;
}

/** Estado da câmera durante a introdução (zoom de dentro do horizonte para fora). */
export interface CameraState {
  /** fator de escala aplicado às posições (1 = repouso) */
  k: number;
  /** true enquanto o zoom acontece — camadas desligam efeitos caros */
  moving: boolean;
  /** 0..1 do trajeto */
  progress: number;
  /** 0..1, entra entre 35% e 85% do trajeto — controla a entrada da nebulosa */
  fade: number;
}

/** Tudo o que uma camada pode ler em `update`/`draw`/`resize`. */
export interface StageEnv {
  W: number;
  H: number;
  dpr: number;
  /** centro da cena, em px de layout */
  cx: number;
  cy: number;
  /** relógio acumulado, em segundos */
  t: number;
  /** delta do quadro, em segundos (limitado a 50ms) */
  dt: number;
  mouse: { x: number; y: number; active: boolean };
  camera: CameraState;
  bus: StageBus;
}

/**
 * Camada da cena.
 *
 * Contrato de desempenho — obrigatório para qualquer camada nova:
 * - zero alocação por quadro (TypedArrays criados no `resize`);
 * - trigonometria pesada em LUT (`fastSin`);
 * - efeitos de pixel em buffer pequeno + `drawImage` ampliado, abaixo de 60fps;
 * - desenho em lote (agrupar por opacidade, um `fill()` por grupo);
 * - camada desligada (`enabled: false`, `opacity: 0`, `strength: 0`) custa zero.
 */
export interface Layer {
  /** identidade estável — é por ela que `stage.layer(name)` acha a camada */
  readonly name: string;
  /** ordem de desenho (a ordem do array é a ordem de `update`) */
  readonly z: number;
  enabled?: boolean;
  resize?(env: StageEnv): void;
  update?(env: StageEnv): void;
  draw?(ctx: CanvasRenderingContext2D, env: StageEnv): void;
}

/** Camada com presença animável por `tween` (buraco negro, constelações). */
export interface FadableLayer extends Layer {
  opacity?: number;
  strength?: number;
}
