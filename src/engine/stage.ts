import { easeOutQuart } from './easing';
import type { Layer, StageEnv } from './types';

/**
 * Palco: dono do canvas, do DPR, do ponteiro, do relógio e do rAF.
 *
 * É a única peça que fala com o navegador. As camadas recebem tudo pronto no
 * `env` e nunca registram listeners por conta própria — por isso `destroy()`
 * basta para desmontar a cena inteira.
 */
export interface Stage {
  readonly env: StageEnv;
  readonly camera: { zoomOut(from?: number, dur?: number): void };
  /** busca uma camada pelo nome; `undefined` se ela não estiver montada */
  layer<T extends Layer = Layer>(name: string): T | undefined;
  setEnabled(name: string, on: boolean): void;
  destroy(): void;
}

/** DPR acima de 2 quadruplica os pixels sem ganho perceptível — daí o teto. */
const MAX_DPR = 2;
/** delta máximo por quadro: uma aba retomada não pode dar um salto na cena */
const MAX_DT = 0.05;

/**
 * O corte de qualidade, para a máquina que não dá conta.
 *
 * O palco mede a duração dos quadros numa média móvel e, se ela passa do limite
 * por tempo bastante, corta trabalho em dois degraus. Nunca volta atrás: voltar
 * faria a cena oscilar entre os dois estados, e a medida seguinte já sairia sobre
 * uma cena mais leve.
 *
 * 1. **O HiDPI sai.** Com DPR 2 o canvas tem quatro vezes os pixels de DPR 1, e o
 *    céu é feito de brilhos borrados, que perdem pouco com isso. Só as dimensões
 *    do canvas mudam: as camadas trabalham em px de layout e não passam por
 *    `resize`, então nenhuma estrela muda de lugar.
 * 2. **O modo leve**, só se nem assim: `env.leve` pede às camadas caras que
 *    desenhem menos, e o campo de estrelas passa a desenhar metade delas.
 *
 * Os limites são diferentes de propósito. O primeiro (40fps) pega também o
 * navegador em economia de bateria, que prende o quadro em 30fps, e ali cortar
 * pixels é o que o próprio usuário pediu; o segundo (28fps) fica abaixo disso,
 * para o céu só ficar mais ralo onde a máquina realmente não aguenta.
 *
 * O julgamento espera `CARENCIA` segundos no começo e depois de cada corte: a
 * abertura, a assadura dos sprites e o `import()` do motor pesam de propósito, e
 * a medida precisa ser do regime da cena, não da largada.
 */
const LENTO_DPR = 1 / 40;
const LENTO_LEVE = 1 / 28;
/** peso de cada quadro na média: perto de um segundo de memória a 30fps */
const PESO = 0.03;
const CARENCIA = 4;

export function createStage(canvas: HTMLCanvasElement, layers: Layer[]): Stage {
  // `alpha: false` deixa o compositor pular a mesclagem com o fundo da página.
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) throw new Error('canvas 2d indisponível');

  const env: StageEnv = {
    W: 0,
    H: 0,
    dpr: 1,
    cx: 0,
    cy: 0,
    t: 0,
    dt: 0,
    mouse: { x: -1e5, y: -1e5, active: false },
    camera: { k: 1, moving: false, progress: 1, fade: 1 },
    bus: {},
    leve: false,
  };

  // ordem do array = ordem de update; `z` = ordem de desenho
  const drawList = layers.slice().sort((a, b) => a.z - b.z);
  const live = (l: Layer) => l.enabled !== false;

  /* câmera: a intro parte de dentro do horizonte e recua */
  let camFrom = 1;
  let camDur = 0;
  let camElapsed = 0;

  const stepCamera = (dt: number) => {
    const c = env.camera;
    if (camDur <= 0 || camElapsed >= camDur) {
      c.k = 1;
      c.moving = false;
      c.progress = 1;
      c.fade = 1;
      return;
    }
    camElapsed = Math.min(camDur, camElapsed + dt);
    const p = camElapsed / camDur;
    c.progress = p;
    c.k = camFrom + (1 - camFrom) * easeOutQuart(p);
    c.moving = c.k > 1.004;
    c.fade = Math.min(1, Math.max(0, (p - 0.35) / 0.5));
  };

  /* o corte de qualidade (ver o topo do arquivo) */
  let dprTeto = MAX_DPR;
  let media = 1 / 60;
  let julgarApos = CARENCIA;

  /** Os pixels do canvas: o que o DPR decide, e nada mais. */
  const dimensionar = () => {
    env.dpr = Math.min(window.devicePixelRatio || 1, dprTeto);
    canvas.width = Math.round(env.W * env.dpr);
    canvas.height = Math.round(env.H * env.dpr);
    ctx.setTransform(env.dpr, 0, 0, env.dpr, 0, 0);
  };

  const resize = () => {
    env.W = canvas.clientWidth;
    env.H = canvas.clientHeight;
    dimensionar();
    env.cx = env.W / 2;
    env.cy = env.H / 2;
    for (const l of layers) l.resize?.(env);
  };

  /**
   * Mede o quadro e, se a máquina não está dando conta, corta um degrau.
   *
   * Roda **antes** do desenho: mudar as dimensões do canvas o apaga, e depois do
   * desenho isso daria um quadro preto.
   */
  const julgar = (bruto: number) => {
    if (env.leve || env.camera.moving || env.t < julgarApos) return;
    // um quadro isolado muito longo (coleta de lixo, um reflow grande) não é regime
    media += (Math.min(bruto, 0.1) - media) * PESO;
    if (env.dpr > 1 && media > LENTO_DPR) {
      dprTeto = 1;
      dimensionar();
      canvas.dataset.corte = 'dpr';
    } else if (media > LENTO_LEVE) {
      env.leve = true;
      canvas.dataset.corte = 'leve';
    } else {
      return;
    }
    media = 1 / 60;
    julgarApos = env.t + CARENCIA;
  };

  let raf: number | null = null;
  let last = performance.now();

  const frame = (now: number) => {
    const bruto = (now - last) / 1000;
    env.dt = Math.min(MAX_DT, bruto);
    last = now;
    env.t += env.dt;
    stepCamera(env.dt);
    julgar(bruto);

    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, env.W, env.H);

    for (const l of layers) if (live(l)) l.update?.(env);
    for (const l of drawList) {
      if (!live(l) || !l.draw) continue;
      l.draw(ctx, env);
      // uma camada nunca herda o estado da anterior
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }

    raf = requestAnimationFrame(frame);
  };

  const onMove = (e: PointerEvent) => {
    env.mouse.x = e.clientX;
    env.mouse.y = e.clientY;
    env.mouse.active = true;
  };
  const onLeave = () => {
    env.mouse.x = -1e5;
    env.mouse.y = -1e5;
    env.mouse.active = false;
  };
  // aba oculta não desenha: o rAF do navegador já congela, mas soltá-lo evita
  // o salto de tempo ao voltar e zera o custo em segundo plano.
  const onVis = () => {
    if (document.hidden) {
      if (raf !== null) cancelAnimationFrame(raf);
      raf = null;
    } else if (raf === null) {
      last = performance.now();
      raf = requestAnimationFrame(frame);
    }
  };

  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  window.addEventListener('pointermove', onMove, { passive: true });
  window.addEventListener('pointerleave', onLeave, { passive: true });
  document.addEventListener('visibilitychange', onVis);

  resize();
  raf = requestAnimationFrame(frame);

  return {
    env,
    camera: {
      zoomOut(from = 26, dur = 1.5) {
        camFrom = from;
        camDur = dur;
        camElapsed = 0;
        env.camera.k = from;
        env.camera.progress = 0;
      },
    },
    layer<T extends Layer = Layer>(name: string) {
      return layers.find((l) => l.name === name) as T | undefined;
    },
    setEnabled(name, on) {
      const l = layers.find((x) => x.name === name);
      if (l) l.enabled = on;
    },
    destroy() {
      if (raf !== null) cancelAnimationFrame(raf);
      raf = null;
      ro.disconnect();
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerleave', onLeave);
      document.removeEventListener('visibilitychange', onVis);
    },
  };
}
