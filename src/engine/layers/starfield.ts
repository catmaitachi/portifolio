import { fastSin, TAU } from '../math';
import { campoVazio, capturado, capturar, prepararCampo, puxar } from '../gravity';
import {
  alongamentoDe,
  dentroDoAlcance,
  derivaEmX,
  derivaEmY,
  desenharEstrela,
  extensaoDe,
  flareDe,
  GLOW_ALPHA,
  temAlongamento,
} from '../star';
import type { Layer, StageEnv } from '../types';

interface StarfieldOptions {
  name?: string;
  z?: number;
  /** px² por estrela — a contagem acompanha a área da tela */
  density?: number;
  max?: number;
  /** níveis de opacidade: quantiza o cintilar em degraus que o canvas agrupa */
  buckets?: number;
  /** raio de repulsão do ponteiro, em px */
  repel?: number;
  twinkleAmount?: number;
}

/**
 * Campo de estrelas.
 *
 * Todas as posições vivem em TypedArrays criados no `resize` — nada é alocado
 * por quadro. O desenho de cada estrela vem de `engine/star.ts`, o mesmo que
 * a supernova e as figuras usam, e os `buckets` quantizam o cintilar em oito
 * degraus de opacidade — o que o canvas agrupa é uma sequência de estrelas com o
 * mesmo estado de pintura.
 *
 * **A densidade acompanha o brilho.** Um ponto de 1px pedia volume para o céu ler
 * como céu; um brilho de 14 a 34px tem presença, e amontoá-los transforma estrelas
 * em névoa — com 614 delas o céu virou uma parede de bolhas com 4,7% de
 * luminância média. Com `density` em 2600 são 354 num 1280×720, e a média cai para
 * 0,47%: pontos nítidos sobre preto, que é o que a página quer.
 *
 * Lê `env.bus.gravity` (buraco negro), `env.bus.well` (a carga da supernova) e
 * `env.bus.shock` (a explosão dela) sem saber quem os publicou. Os três entram
 * como deslocamento, nunca como posição: a mola de volta ao repouso é a mesma
 * para todos e devolve o céu ao lugar sozinha.
 */
export function Starfield({
  name = 'stars',
  z = 10,
  density = 2600,
  max = 900,
  buckets = 8,
  repel = 110,
  twinkleAmount = 0.22,
}: StarfieldOptions = {}): Layer {
  const R2 = repel * repel;
  let N = 0;
  let sx!: Float32Array;
  let sy!: Float32Array;
  let ssz!: Float32Array;
  let sbase!: Float32Array;
  let sph!: Float32Array;
  let sspd!: Float32Array;
  let sdx!: Float32Array;
  let sdy!: Float32Array;
  let bucket!: Int32Array;
  const count = new Int32Array(buckets);

  /**
   * O puxão vem de `engine/gravity`, não de uma tabela local.
   *
   * As estrelas que a supernova acende sentem a mesma gravidade, e elas ficam
   * lado a lado com estas no mesmo céu: se as contas divergirem, a diferença
   * salta aos olhos. O campo é preparado uma vez por quadro e reusado nas ~1120
   * estrelas.
   */
  const campo = campoVazio();
  /**
   * O segundo poço: a carga da supernova, enquanto o visitante segura o ponteiro.
   *
   * Ele é do mesmo tipo do primeiro e usa o mesmo `puxar`, então some do laço
   * sozinho quando o gesto termina. Sem carga o custo é a comparação de `temPoco`,
   * exatamente o que `temGrav` já custa fora do Início.
   */
  const poco = campoVazio();
  const puxao = { x: 0, y: 0 };
  /**
   * Os dois campos preparados sobrevivem ao `update` porque o `draw` também os
   * lê: é deles que sai o teste do streak. `update` roda sempre antes do `draw`
   * no mesmo quadro (ordem do array em `createStage`), então o que o desenho vê é
   * o campo deste quadro.
   */
  let temGrav = false;
  let temPoco = false;

  return {
    name,
    z,
    resize(env: StageEnv) {
      N = Math.min(max, Math.round((env.W * env.H) / density));
      bucket = new Int32Array(N * buckets);
      sx = new Float32Array(N);
      sy = new Float32Array(N);
      ssz = new Float32Array(N);
      sbase = new Float32Array(N);
      sph = new Float32Array(N);
      sspd = new Float32Array(N);
      sdx = new Float32Array(N);
      sdy = new Float32Array(N);
      for (let i = 0; i < N; i++) {
        sx[i] = Math.random() * env.W;
        sy[i] = Math.random() * env.H;
        // 82% pequenas: um céu de pontos uniformes não lê como céu
        ssz[i] = Math.random() < 0.82 ? 0.55 + Math.random() * 0.5 : 1.1 + Math.random() * 0.9;
        sbase[i] = 0.3 + Math.random() * 0.7;
        sph[i] = Math.random() * TAU;
        sspd[i] = 0.3 + Math.random() * 0.75;
      }
    },
    update(env) {
      const { dt, t, mouse } = env;
      const moving = env.camera.moving;
      // durante o zoom da intro, repulsão e gravidade ficam desligadas
      const useMouse = mouse.active && !moving;
      temGrav = prepararCampo(moving ? null : env.bus.gravity, campo);
      temPoco = prepararCampo(moving ? null : env.bus.well, poco);
      // a onda também some durante o zoom da intro: empurrar um céu que ainda
      // está chegando não lê como onda, lê como tremor
      const onda = moving ? null : env.bus.shock;

      for (let b = 0; b < buckets; b++) count[b] = 0;

      for (let i = 0; i < N; i++) {
        let ox = sdx[i];
        let oy = sdy[i];

        if (useMouse) {
          const dx = sx[i] + ox - mouse.x;
          const dy = sy[i] + oy - mouse.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < R2 && d2 > 0.01) {
            const d = Math.sqrt(d2);
            const f = (1 - d / repel) * 26;
            ox += (dx / d) * f * dt * 6;
            oy += (dy / d) * f * dt * 6;
          }
        }
        // mola de volta ao repouso: sem ela o deslocamento seria permanente
        ox -= ox * dt * 2.6;
        oy -= oy * dt * 2.6;

        if (temGrav) {
          puxao.x = 0;
          puxao.y = 0;
          puxar(campo, sx[i] + ox, sy[i] + oy, dt, puxao);
          ox += puxao.x;
          oy += puxao.y;
        }
        if (temPoco) {
          puxao.x = 0;
          puxao.y = 0;
          puxar(poco, sx[i] + ox, sy[i] + oy, dt, puxao);
          ox += puxao.x;
          oy += puxao.y;
          /**
           * O que caiu fundo demais para de orbitar.
           *
           * Vem **depois** do puxão e da mola de propósito: a captura é o último a
           * falar, e é isso que a deixa vencer o equilíbrio que produzia o anel
           * girando. Só o poço da supernova a chama — no buraco negro o giro é o
           * disco de acreção, que é o efeito que ele existe para ter.
           */
          puxao.x = 0;
          puxao.y = 0;
          capturar(poco, sx[i] + ox, sy[i] + oy, dt, puxao);
          ox += puxao.x;
          oy += puxao.y;
        }
        if (onda) {
          const wx = sx[i] + ox - onda.x;
          const wy = sy[i] + oy - onda.y;
          const w2 = wx * wx + wy * wy;
          // só o anel da frente de onda empurra; o miolo já foi varrido
          if (w2 < onda.outer2 && w2 > onda.inner2) {
            const wd = Math.sqrt(w2) || 1e-4;
            // crista no raio, zero nas duas bordas do anel
            const perfil = 1 - Math.abs(wd - onda.radius) / onda.width;
            if (perfil > 0) {
              const imp = onda.force * perfil * dt;
              ox += (wx / wd) * imp;
              oy += (wy / wd) * imp;
            }
          }
        }

        sdx[i] = ox;
        sdy[i] = oy;

        // LUT, não `Math.sin`: isto roda uma vez por estrela por quadro, e são
        // ~1120 delas — é o laço mais quente da cena inteira
        const a = sbase[i] * (1 - twinkleAmount + twinkleAmount * fastSin(t * sspd[i] + sph[i]));
        let b = (a * buckets) | 0;
        if (b >= buckets) b = buckets - 1;
        else if (b < 0) b = 0;
        bucket[b * N + count[b]++] = i;
      }
    },
    draw(ctx, env) {
      const { W, H, cx, cy, t, dpr } = env;
      const zk = env.camera.k;
      const zooming = env.camera.moving;
      /**
       * A deriva entra com a cena.
       *
       * Antes ela simplesmente não existia durante o zoom, o que a 0,9px não se
       * notava; a 8px seria um pulo no quadro em que a intro termina.
       * `camera.fade` já é a rampa 0→1 que fecha a 85% do trajeto.
       */
      const derivaK = zooming ? env.camera.fade : 1;
      const temLente = temGrav || temPoco;
      /**
       * Modo leve: metade do céu (ver o corte de qualidade em `stage.ts`).
       *
       * A metade é pela paridade do índice, e não da posição no balde: o balde de
       * uma estrela muda a cada quadro com o cintilar, e cortar por ele faria as
       * estrelas piscarem entre desenhadas e não. O índice é fixo, e as posições
       * são sorteadas, então a metade que fica continua espalhada pela tela.
       */
      const leve = env.leve;

      for (let b = 0; b < buckets; b++) {
        const n = count[b];
        if (!n) continue;
        const off = b * N;
        const alfa = ((b + 0.5) / buckets) * GLOW_ALPHA;

        for (let k = 0; k < n; k++) {
          const i = bucket[off + k];
          if (leve && (i & 1) === 1) continue;
          let px = sx[i] + sdx[i];
          let py = sy[i] + sdy[i];
          if (zooming) {
            px = cx + (px - cx) * zk;
            py = cy + (py - cy) * zk;
          }
          /**
           * O que está preso não respira nem borra.
           *
           * A estrela capturada tem o maior deslocamento do céu — ele é o vetor
           * inteiro até o centro — então sem esta consulta ela sairia esticada
           * num rastro longo e ainda tremendo. As duas coisas descrevem
           * movimento, e ela justamente parou.
           */
          const preso = temPoco ? capturado(poco, px, py) : 0;

          // depois da câmera, sempre: antes, o zoom multiplicaria a deriva por 26
          const dk = derivaK * (1 - preso);
          px += derivaEmX(t, sph[i]) * dk;
          py += derivaEmY(t, sph[i]) * dk;

          const ext = extensaoDe(ssz[i]);
          // a margem é a extensão do brilho: um halo de 54px entra em cena bem
          // antes do seu centro, e cortar pelo centro faria a estrela piscar
          const margem = ext;
          if (px < -margem || px > W + margem || py < -margem || py > H + margem) continue;

          /**
           * A lente: o brilho é esticado na direção do puxão.
           *
           * Grande **e** dentro de um poço de verdade. Só o tamanho não basta: a
           * repulsão do ponteiro empurra na mesma ordem de grandeza, e esticar
           * ali não é gravidade, é rastro de mouse.
           */
          let s = 1;
          let ux = 1;
          let uy = 0;
          if (temLente) {
            const dxi = sdx[i];
            const dyi = sdy[i];
            const mag2 = dxi * dxi + dyi * dyi;
            if (
              temAlongamento(mag2) &&
              dentroDoAlcance(sx[i], sy[i], campo, poco, temGrav, temPoco)
            ) {
              const mag = Math.sqrt(mag2);
              s = 1 + (alongamentoDe(mag) - 1) * (1 - preso);
              ux = dxi / mag;
              uy = dyi / mag;
            }
          }

          desenharEstrela(ctx, dpr, px, py, ext, alfa, flareDe(ssz[i], t, sph[i]), s, ux, uy);
        }
      }

      /**
       * A matriz volta ao que era, e isso não é higiene: o palco a monta uma vez
       * no `resize` e o laço só devolve `globalAlpha` e `globalCompositeOperation`
       * entre camadas. Sem esta linha, tudo que desenhar depois sai torto.
       */
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    },
  };
}
