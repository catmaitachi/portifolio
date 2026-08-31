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

  const resize = () => {
    env.dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    env.W = canvas.clientWidth;
    env.H = canvas.clientHeight;
    canvas.width = Math.round(env.W * env.dpr);
    canvas.height = Math.round(env.H * env.dpr);
    ctx.setTransform(env.dpr, 0, 0, env.dpr, 0, 0);
    env.cx = env.W / 2;
    env.cy = env.H / 2;
    for (const l of layers) l.resize?.(env);
  };

  let raf: number | null = null;
  let last = performance.now();

  const frame = (now: number) => {
    env.dt = Math.min(MAX_DT, (now - last) / 1000);
    last = now;
    env.t += env.dt;
    stepCamera(env.dt);

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
