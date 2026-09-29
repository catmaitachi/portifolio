import { fastCos, fastSin, TAU } from '../math';
import { criarPlasma } from '../plasma';
import type { FadableLayer, StageEnv } from '../types';

interface BlackHoleOptions {
  name?: string;
  z?: number;
  /** raio do horizonte, em fração de min(W,H) */
  radius?: number;
  strength?: number;
  plasma?: { size: number; alpha: number; fps: number; speed: number };
  halo?: { inner: number; outer: number; reach: number };
  dust?: { count: number; speed: number };
}

export interface BlackHoleLayer extends FadableLayer {
  /** presença 0..1: encolhe o raio, apaga o desenho e corta a gravidade */
  strength: number;
  /**
   * Um alvo para `strength`, seguido a cada quadro com inércia curta; `null`
   * desliga. É o caminho da rolagem: ela muda o valor dezenas de vezes por
   * segundo, e um `tween` novo a cada evento recomeçava a curva do zero, saindo
   * devagar, e o buraco negro só assentava quando a rolagem parava.
   */
  alvo: number | null;
  /** raio atual em px, já com força e câmera aplicadas */
  radiusPx(env: StageEnv): number;
}

/**
 * O quanto do caminho até o `alvo` o raio anda por segundo: **a mesma inércia da
 * câmera** (`SEGUE`, em `stage.ts`). Era 12, quatro vezes mais seco que as
 * estrelas: com a roda do mouse, que rola em degraus, o buraco negro saltava de
 * tamanho a cada degrau enquanto o céu em volta deslizava, e isso lia como
 * travamento. Com a mesma curva, os dois andam como uma câmera só.
 */
const SEGUE = 3.2;

/**
 * Buraco negro: plasma, poeira em órbita, halo e horizonte.
 *
 * `strength` é a única alavanca de presença — em 0 a camada inteira é pulada e
 * `env.bus.gravity` deixa de ser publicada, o que devolve as estrelas ao repouso
 * pela mola do próprio Starfield. É assim que ele "se afasta" ao sair do Início.
 *
 * O horizonte tem borda **preta** suavizando para fora (`bordaG`), nunca uma
 * borda brilhante: o brilho vem do halo por baixo, não de um contorno.
 */
export function BlackHole({
  name = 'blackhole',
  z = 20,
  radius = 0.14,
  strength = 1,
  plasma = { size: 96, alpha: 0.22, fps: 20, speed: 1.6 },
  halo = { inner: 0.18, outer: 0.06, reach: 3.4 },
  dust = { count: 260, speed: 0.6 },
}: BlackHoleOptions = {}): BlackHoleLayer {
  /* plasma: o campo de senos vem de `engine/plasma`, compartilhado com a carga da supernova */
  const campo = criarPlasma(plasma.size);

  /* poeira orbitando o horizonte: órbita kepleriana (mais perto = mais rápido) */
  const NO = dust.count;
  const oa = new Float32Array(NO);
  const orb = new Float32Array(NO);
  const osz = new Float32Array(NO);
  for (let i = 0; i < NO; i++) {
    oa[i] = Math.random() * TAU;
    // expoente 1.6 concentra a poeira perto do horizonte
    orb[i] = 1.05 + Math.pow(Math.random(), 1.6) * 1.1;
    osz[i] = 0.3 + Math.random() * 0.7;
  }

  let R0 = 0;
  let acc = 1 / plasma.fps;
  /**
   * Os degradês são criados **uma vez**, num espaço em que o raio vale 1 e o
   * centro é a origem, com a intensidade cheia. O desenho os leva ao tamanho por
   * `scale` e à força por `globalAlpha`, como a carga da supernova.
   *
   * Antes a chave do cache era (centro, raio, força), e na rolagem o raio muda em
   * todo quadro: eram dois `createRadialGradient` e seis strings de cor por quadro
   * justamente enquanto o buraco negro encolhia.
   */
  let haloG: CanvasGradient | null = null;
  let bordaG: CanvasGradient | null = null;

  return {
    name,
    z,
    strength,
    alvo: null,
    radiusPx(env) {
      return R0 * this.strength * env.camera.k;
    },
    resize(env) {
      R0 = Math.min(env.W, env.H) * radius;
    },
    update(env) {
      if (this.alvo !== null) {
        const falta = this.alvo - this.strength;
        this.strength = Math.abs(falta) < 0.0005 ? this.alvo : this.strength + falta * Math.min(1, env.dt * SEGUE);
      }
      if (this.strength <= 0.001) {
        env.bus.gravity = null;
        return;
      }
      env.bus.gravity = {
        x: env.cx,
        y: env.cy,
        radius: R0,
        reach: R0 * 6.2,
        k: this.strength,
      };
      acc += env.dt;
      if (acc >= 1 / plasma.fps) {
        acc = 0;
        campo.pintar(env.t * plasma.speed);
      }
      const step = env.dt * dust.speed * 0.35;
      for (let i = 0; i < NO; i++) oa[i] += step * Math.pow(1 / orb[i], 1.5);
    },
    draw(ctx, env) {
      const k = this.strength;
      if (k <= 0.001) return;
      const { cx, cy } = env;
      const R = this.radiusPx(env);

      ctx.globalCompositeOperation = 'lighter';

      const ps = R * 9;
      ctx.globalAlpha = plasma.alpha * k;
      ctx.drawImage(campo.canvas, cx - ps / 2, cy - ps / 2, ps, ps);

      // dois grupos de poeira = dois fills, cada um com sua opacidade
      for (let g = 0; g < 2; g++) {
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        for (let i = g; i < NO; i += 2) {
          const rr = orb[i] * R;
          // LUT: 260 poeiras × 2 chamadas por quadro. O erro de ~0.1° dá menos
          // de 0.2px no raio da órbita — abaixo do pixel que se desenha
          const px = cx + fastCos(oa[i]) * rr;
          const py = cy + fastSin(oa[i]) * rr;
          const sz = osz[i];
          ctx.moveTo(px + sz, py);
          ctx.arc(px, py, sz, 0, TAU);
        }
        ctx.globalAlpha = (g ? 0.5 : 0.22) * k;
        ctx.fill();
      }

      if (!haloG || !bordaG) {
        haloG = ctx.createRadialGradient(0, 0, 0.9, 0, 0, halo.reach);
        haloG.addColorStop(0, `rgba(255,255,255,${halo.inner})`);
        haloG.addColorStop(0.28, `rgba(255,255,255,${halo.outer})`);
        haloG.addColorStop(1, 'rgba(255,255,255,0)');
        bordaG = ctx.createRadialGradient(0, 0, 0.96, 0, 0, 1.25);
        bordaG.addColorStop(0, 'rgba(0,0,0,1)');
        bordaG.addColorStop(1, 'rgba(0,0,0,0)');
      }
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(R, R);
      // a força apagava as paradas do halo; agora apaga o desenho inteiro, que é a mesma conta
      ctx.globalAlpha = k;
      ctx.fillStyle = haloG;
      ctx.beginPath();
      ctx.arc(0, 0, halo.reach, 0, TAU);
      ctx.fill();

      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.arc(0, 0, 1, 0, TAU);
      ctx.fill();
      ctx.fillStyle = bordaG;
      ctx.beginPath();
      ctx.arc(0, 0, 1.25, 0, TAU);
      ctx.fill();
      ctx.restore();
    },
  };
}
