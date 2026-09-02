import { campoVazio, prepararCampo, puxar } from '../gravity';
import { fastSin, TAU } from '../math';
import type { Layer, StageEnv } from '../types';

interface SupernovaOptions {
  name?: string;
  z?: number;
  /** segundos de recarga entre um disparo e o próximo */
  cooldown?: number;
  /** duração da onda, em segundos */
  wave?: number;
  /** alcance da onda, em fração de `max(W, H)` */
  reach?: number;
  /**
   * Impulso máximo na crista, em px/s. Calibrado: 620 desloca uma estrela em
   * ~23px no pico — a mesma ordem de grandeza da repulsão do ponteiro, que é a
   * referência de "empurrão" que a cena já tinha.
   */
  force?: number;
  /** quantas estrelas novas o céu guarda antes de reciclar a mais antiga */
  pool?: number;
  /**
   * Segundos até a estrela acesa passar a responder ao **ponteiro**.
   *
   * Ela nasce presa a ele: enquanto o clarão acontece, o cursor está exatamente
   * em cima dela, e uma estrela que fugisse do dedo que a acendeu pareceria um
   * erro. O que precisa ser coberto é a onda, que dura `wave` (1,35s) — passado
   * isso o gesto já terminou e não há mais o que proteger. A rampa de `SOLTA`
   * empurra a força total para ~2,9s, o que dá margem de sobra.
   *
   * Só o ponteiro espera: a gravidade age desde o primeiro quadro.
   */
  settle?: number;

  /**
   * Repulsão do ponteiro — **espelha os valores do `Starfield`** (raio 110px,
   * impulso 26, mola 2.6), para que a estrela acesa se mova exatamente como as
   * vizinhas. Uma camada não importa a outra; se os números mudarem lá, mudam
   * aqui.
   */
  repel?: number;
  repelForce?: number;
  spring?: number;
}

export interface SupernovaLayer extends Layer {
  /**
   * Acende uma estrela em (x, y), em px de layout. Devolve `false` se ainda
   * estiver recarregando — a recarga mora aqui, no relógio do motor, e não no
   * React: um cronômetro em `setTimeout` andaria mesmo com a aba escondida, e a
   * cena não anda.
   */
  disparar(x: number, y: number): boolean;
  /** true quando um disparo seria aceito agora */
  pronta(): boolean;
}

/**
 * Supernova: a estrela que o visitante acende.
 *
 * Um toque no vazio nasce uma estrela nova e solta uma onda de choque que
 * empurra as estrelas vizinhas. A onda vai para `env.bus.shock` — o campo de
 * estrelas a lê sem saber quem a publicou, exatamente como já faz com a
 * gravidade do buraco negro. Empurrar é tudo o que a onda faz: a mola que já
 * existe no `Starfield` traz cada estrela de volta sozinha, então nada aqui
 * precisa lembrar de desfazer nada.
 *
 * **Custo quando ociosa: zero.** Sem onda viva e sem estrela acesa, `update` e
 * `draw` saem em duas comparações. Durante a onda — no máximo uma por vez,
 * porque a recarga é bem mais longa que ela — o desenho são dois `arc()` e um
 * degradê radial de vida curta, o mesmo padrão já aceito nos meteoros.
 *
 * As estrelas novas ficam guardadas em **fração da tela**, não em px: o céu que
 * o visitante montou sobrevive a um resize ou a uma rotação sem escorregar. O
 * deslocamento é somado por cima, em px, exatamente como no campo de estrelas —
 * e só depois de `settle` segundos de vida (ver a opção).
 *
 * **A estrela acesa cai para o horizonte como qualquer outra.** O puxão vem de
 * `engine/gravity`, o mesmo módulo que o campo de estrelas usa: elas ficam lado
 * a lado no mesmo céu, e uma estrela parada enquanto as vizinhas giram lê como
 * defeito. Só a repulsão do ponteiro continua com os números duplicados aqui.
 *
 * **Só o ponteiro espera.** O `settle` existe para a estrela não fugir do dedo
 * que a acendeu, e o buraco negro nunca esteve sob esse dedo: ele cai sobre ela
 * desde o primeiro quadro, como cai sobre qualquer estrela do campo.
 */
export function Supernova({
  name = 'nova',
  z = 14,
  cooldown = 3,
  wave = 1.35,
  reach = 0.55,
  force = 620,
  pool = 12,
  settle = 2,
  repel = 110,
  repelForce = 26,
  spring = 2.6,
}: SupernovaOptions = {}): SupernovaLayer {
  const R2 = repel * repel;
  /** segundos que a estrela leva para ganhar a física por inteiro */
  const SOLTA = 0.9;

  /* estrelas acesas: fração da tela + idade desde o nascimento */
  const fx = new Float32Array(pool);
  const fy = new Float32Array(pool);
  const idade = new Float32Array(pool);
  const viva = new Uint8Array(pool);
  const fase = new Float32Array(pool);
  /* deslocamento em px sobre a posição de repouso, como no campo de estrelas */
  const dx = new Float32Array(pool);
  const dy = new Float32Array(pool);

  /* o mesmo puxão que o campo de estrelas sente, do mesmo módulo */
  const campo = campoVazio();
  const puxao = { x: 0, y: 0 };
  let proxima = 0;
  let acesas = 0;

  /* onda: uma só, porque a recarga (3s) é bem maior que a duração (1.35s) */
  let ondaX = 0;
  let ondaY = 0;
  let ondaT = -1;
  let restante = 0;

  const shock = { x: 0, y: 0, radius: 0, width: 0, force: 0, inner2: 0, outer2: 0 };

  /** dimensões do último `resize`: é contra elas que o disparo vira fração */
  let larg = 1;
  let alt = 1;

  /** flash do nascimento: forte e curto, some antes de a onda chegar longe */
  const FLASH = 0.42;

  return {
    name,
    z,

    pronta() {
      return restante <= 0;
    },

    disparar(x, y) {
      if (restante > 0) return false;
      restante = cooldown;
      ondaX = x;
      ondaY = y;
      ondaT = 0;

      const i = proxima;
      proxima = (proxima + 1) % pool;
      if (!viva[i]) acesas++;
      viva[i] = 1;
      idade[i] = 0;
      fase[i] = Math.random() * TAU;
      fx[i] = x / larg;
      fy[i] = y / alt;
      // o slot pode estar sendo reciclado: a estrela nova nasce no repouso
      dx[i] = 0;
      dy[i] = 0;
      return true;
    },

    resize(env: StageEnv) {
      // as posições já vivem em fração; o resize só anota a régua do momento
      larg = env.W || 1;
      alt = env.H || 1;
    },

    update(env: StageEnv) {
      if (restante > 0) restante = Math.max(0, restante - env.dt);

      if (ondaT >= 0) {
        ondaT += env.dt;
        const p = ondaT / wave;
        if (p >= 1) {
          ondaT = -1;
          env.bus.shock = null;
        } else {
          const raio = Math.max(env.W, env.H) * reach * (1 - (1 - p) * (1 - p) * (1 - p));
          shock.x = ondaX;
          shock.y = ondaY;
          shock.radius = raio;
          shock.width = 34 + 52 * p;
          shock.force = force * (1 - p) * (1 - p);
          const dentro = Math.max(0, raio - shock.width);
          shock.inner2 = dentro * dentro;
          shock.outer2 = (raio + shock.width) * (raio + shock.width);
          env.bus.shock = shock;
        }
      }

      if (!acesas) return;

      /**
       * A estrela acesa ganha a repulsão do ponteiro depois de `settle`
       * segundos — o suficiente para a onda passar.
       *
       * O ganho entra por uma rampa de `SOLTA` segundos, não por um interruptor:
       * um ponto parado que de repente salta para longe do cursor lê como falha,
       * não como física. Enquanto o ganho é zero, o custo é uma comparação.
       */
      const { dt, mouse } = env;
      const usaMouse = mouse.active && !env.camera.moving;
      // durante o zoom da intro a gravidade fica desligada, como no campo de estrelas
      const temGrav = prepararCampo(env.camera.moving ? null : env.bus.gravity, campo);

      for (let i = 0; i < pool; i++) {
        if (!viva[i]) continue;
        idade[i] += dt;
        const ganho = Math.min(1, Math.max(0, (idade[i] - settle) / SOLTA));
        // sem gravidade e sem ponteiro, uma estrela em repouso não custa nada
        if (!ganho && !temGrav && !dx[i] && !dy[i]) continue;
        const px = fx[i] * env.W;
        const py = fy[i] * env.H;

        let ox = dx[i];
        let oy = dy[i];

        if (usaMouse && ganho) {
          const mx = px + ox - mouse.x;
          const my = py + oy - mouse.y;
          const d2 = mx * mx + my * my;
          if (d2 < R2 && d2 > 0.01) {
            const d = Math.sqrt(d2);
            const f = (1 - d / repel) * repelForce * ganho;
            ox += (mx / d) * f * dt * 6;
            oy += (my / d) * f * dt * 6;
          }
        }

        // a mesma mola do campo de estrelas: o deslocamento nunca é permanente
        ox -= ox * dt * spring;
        oy -= oy * dt * spring;

        /**
         * A gravidade entra **depois da mola**, como no campo de estrelas.
         *
         * A ordem importa: a mola puxa de volta para o repouso, e o puxão do
         * horizonte é somado por cima do que sobrou. Invertida, a mola comeria
         * o puxão do mesmo quadro e a estrela nunca sairia do lugar.
         *
         * **Sem atraso e sem rampa**, ao contrário do ponteiro. O `settle`
         * existe porque o cursor está em cima da estrela no instante do clarão;
         * o buraco negro está no centro da tela e nunca esteve sob o dedo, então
         * não há de que proteger a estrela. E o puxão é aceleração somada quadro
         * a quadro, não um salto de posição: entrar com força total desde o
         * nascimento não produz degrau nenhum.
         */
        if (temGrav) {
          puxao.x = 0;
          puxao.y = 0;
          puxar(campo, px + ox, py + oy, dt, puxao);
          ox += puxao.x;
          oy += puxao.y;
        }

        dx[i] = ox;
        dy[i] = oy;
      }
    },

    draw(ctx, env) {
      if (!acesas && ondaT < 0) return;
      const { W, H, t } = env;

      /* estrelas acesas: um ponto branco que nasce grande e assenta */
      if (acesas) {
        ctx.fillStyle = '#fff';
        for (let i = 0; i < pool; i++) {
          if (!viva[i]) continue;
          const a = idade[i];
          // nasce com 3.4px e assenta em 1.15px ao longo de ~1.2s
          const cresc = a < 1.2 ? 1 - a / 1.2 : 0;
          const r = 1.15 + cresc * cresc * 2.25;
          const cintila = 0.82 + 0.18 * fastSin(t * 0.9 + fase[i]);
          ctx.globalAlpha = Math.min(1, a / 0.12) * cintila;
          const cx = fx[i] * W + dx[i];
          const cy = fy[i] * H + dy[i];
          ctx.beginPath();
          ctx.moveTo(cx + r, cy);
          ctx.arc(cx, cy, r, 0, TAU);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }

      if (ondaT < 0) return;
      const p = ondaT / wave;

      /* clarão do nascimento: degradê de vida curta, como o rastro do meteoro */
      if (ondaT < FLASH) {
        const f = 1 - ondaT / FLASH;
        const raio = 26 + 84 * (1 - f);
        const g = ctx.createRadialGradient(ondaX, ondaY, 0, ondaX, ondaY, raio);
        g.addColorStop(0, `rgba(255,255,255,${(0.55 * f * f).toFixed(3)})`);
        g.addColorStop(0.45, `rgba(255,255,255,${(0.12 * f * f).toFixed(3)})`);
        g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(ondaX, ondaY, raio, 0, TAU);
        ctx.fill();
      }

      /* a frente de onda: dois traços de 1px, o de dentro só para dar volume */
      const q = 1 - p;
      ctx.lineWidth = 1;
      ctx.strokeStyle = `rgba(255,255,255,${(0.42 * q * q).toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(ondaX, ondaY, shock.radius, 0, TAU);
      ctx.stroke();

      const interno = shock.radius - 16 - 26 * p;
      if (interno > 2) {
        ctx.strokeStyle = `rgba(255,255,255,${(0.14 * q * q).toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(ondaX, ondaY, interno, 0, TAU);
        ctx.stroke();
      }
    },
  };
}
