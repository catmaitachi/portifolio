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
  max = 2600,
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
  /** profundidade, entre `Z_PERTO` e `Z_LONGE` */
  let szz!: Float32Array;
  /** onde a projeção põe a estrela neste quadro, antes de mola, gravidade e onda */
  let bx!: Float32Array;
  let by!: Float32Array;
  /** quanto a estrela está maior que em repouso (1 = repouso) */
  let sesc!: Float32Array;
  /** 0..1: apaga nas duas pontas da profundidade, onde a estrela dá a volta */
  let sfad!: Float32Array;
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
  /**
   * Quanto da metade ímpar do céu está acesa, de 0 a 1, seguindo `env.densidade`.
   *
   * Ela anda devagar (`SOBE_DENS` por segundo), e as estrelas ímpares acendem
   * **uma a uma**, na ordem do índice, cada uma com o próprio fade (`FADE_DENS`
   * da fração): o céu vai ficando mais fundo sem que se veja um conjunto chegar.
   * As posições são sorteadas, então a ordem do índice é espalhada pela tela.
   */
  let dens = 0;
  const SOBE_DENS = 0.06;
  const DESCE_DENS = 0.4;
  const FADE_DENS = 0.12;

  /**
   * A profundidade, e a câmera que anda nela.
   *
   * As estrelas moram num **volume**, e não na tela: cada uma tem `x`, `y` em
   * px de mundo (`sx`, `sy`, contados a partir do centro) e um `z`, e a posição do
   * quadro é a projeção em perspectiva, `centro + mundo / zAtual`, com
   * `zAtual = z − env.camera.avanco`.
   *
   * **O volume é mais largo que a tela na mesma proporção do fundo** (`Z_LONGE`),
   * e é isso que mantém o céu uniforme durante a viagem. Cada fatia de
   * profundidade, projetada, cobre a tela inteira de ponta a ponta, então a soma
   * das fatias também cobre, com a mesma densidade em todo lugar. A primeira
   * versão sorteava a posição na tela e derivava o mundo dela: em repouso o céu
   * era o de antes, mas quem renascia no fundo caía perto do centro e as bordas
   * esvaziavam conforme a câmera andava.
   *
   * O preço é que só uma parte do volume está na tela a cada momento (`VISIVEL`,
   * a média de `(z / Z_LONGE)²` na faixa), então há mais estrelas no total para
   * a mesma densidade de antes na tela, e a que está fora pula a física e o
   * desenho, que é o que custa.
   *
   * Quem passa da câmera dá a volta e renasce no fundo. A volta é um `mod`, e não
   * um contador, para a conta ser **reversível**: rolar de volta ao topo devolve
   * cada estrela ao lugar exato de onde saiu. As duas pontas da faixa apagam a
   * estrela, senão a volta seria um pulo visível.
   */
  const Z_PERTO = 0.1;
  const Z_LONGE = Z_PERTO + 1;
  const VISIVEL = 0.37;
  /** a profundidade em que o brilho tem o tamanho de sempre; mais perto é maior */
  const Z_REF = 0.55;
  /** teto e piso do tamanho relativo de quem passa perto ou está no fundo */
  const ESC_MAX = 2.4;
  const ESC_MIN = 0.45;
  /** folga fora da tela antes de uma estrela deixar de contar: o halo entra antes do centro */
  const FORA = 70;

  return {
    name,
    z,
    resize(env: StageEnv) {
      N = Math.min(max, Math.round((env.W * env.H) / density / VISIVEL));
      bucket = new Int32Array(N * buckets);
      sx = new Float32Array(N);
      sy = new Float32Array(N);
      ssz = new Float32Array(N);
      sbase = new Float32Array(N);
      sph = new Float32Array(N);
      sspd = new Float32Array(N);
      sdx = new Float32Array(N);
      sdy = new Float32Array(N);
      szz = new Float32Array(N);
      bx = new Float32Array(N);
      by = new Float32Array(N);
      sesc = new Float32Array(N);
      sfad = new Float32Array(N);
      // o volume: cada fatia de profundidade cobre a tela inteira quando projetada
      const meiaL = (env.W / 2) * Z_LONGE * 1.04;
      const meiaA = (env.H / 2) * Z_LONGE * 1.04;
      for (let i = 0; i < N; i++) {
        szz[i] = Z_PERTO + Math.random();
        sx[i] = (Math.random() * 2 - 1) * meiaL;
        sy[i] = (Math.random() * 2 - 1) * meiaA;
        // 82% pequenas: um céu de pontos uniformes não lê como céu
        ssz[i] = Math.random() < 0.82 ? 0.55 + Math.random() * 0.5 : 1.1 + Math.random() * 0.9;
        sbase[i] = 0.3 + Math.random() * 0.7;
        sph[i] = Math.random() * TAU;
        sspd[i] = 0.3 + Math.random() * 0.75;
      }
    },
    update(env) {
      const { dt, t, mouse } = env;
      dens =
        env.densidade > dens
          ? Math.min(env.densidade, dens + dt * SOBE_DENS)
          : Math.max(env.densidade, dens - dt * DESCE_DENS);
      const moving = env.camera.moving;
      // durante o zoom da intro, repulsão e gravidade ficam desligadas
      const useMouse = mouse.active && !moving;
      temGrav = prepararCampo(moving ? null : env.bus.gravity, campo);
      temPoco = prepararCampo(moving ? null : env.bus.well, poco);
      // a onda também some durante o zoom da intro: empurrar um céu que ainda
      // está chegando não lê como onda, lê como tremor
      const onda = moving ? null : env.bus.shock;

      for (let b = 0; b < buckets; b++) count[b] = 0;

      const { cx, cy } = env;
      const avanco = env.camera.avanco;
      // no salto o campo de visão abre, e as estrelas fogem do centro
      const fov = 1 + env.camera.salto * 0.6;
      const { W, H } = env;

      for (let i = 0; i < N; i++) {
        /* a projeção (ver `Z_PERTO`) */
        let ze = (szz[i] - avanco - Z_PERTO) % 1;
        if (ze < 0) ze += 1;
        ze += Z_PERTO;
        const px0 = cx + (sx[i] / ze) * fov;
        const py0 = cy + (sy[i] / ze) * fov;
        bx[i] = px0;
        by[i] = py0;
        // fora da tela não há física para ver nem brilho para desenhar: só a mola
        // devolve o deslocamento que sobrou, e a estrela fica fora dos baldes
        if (px0 < -FORA || px0 > W + FORA || py0 < -FORA || py0 > H + FORA) {
          sdx[i] -= sdx[i] * dt * 2.6;
          sdy[i] -= sdy[i] * dt * 2.6;
          continue;
        }
        let e = Z_REF / ze;
        if (e > ESC_MAX) e = ESC_MAX;
        else if (e < ESC_MIN) e = ESC_MIN;
        sesc[i] = e;
        const entra = (ze - Z_PERTO) / 0.08;
        const sai = (Z_LONGE - ze) / 0.14;
        sfad[i] = entra < 1 ? (entra > 0 ? entra : 0) : sai < 1 ? (sai > 0 ? sai : 0) : 1;

        let ox = sdx[i];
        let oy = sdy[i];

        if (useMouse) {
          const dx = px0 + ox - mouse.x;
          const dy = py0 + oy - mouse.y;
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
          puxar(campo, px0 + ox, py0 + oy, dt, puxao);
          ox += puxao.x;
          oy += puxao.y;
        }
        if (temPoco) {
          puxao.x = 0;
          puxao.y = 0;
          puxar(poco, px0 + ox, py0 + oy, dt, puxao);
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
          capturar(poco, px0 + ox, py0 + oy, dt, puxao);
          ox += puxao.x;
          oy += puxao.y;
        }
        if (onda) {
          const wx = px0 + ox - onda.x;
          const wy = py0 + oy - onda.y;
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
      const salto = env.camera.salto;
      /**
       * A metade ímpar do céu acende pela densidade (ver `dens`).
       *
       * A metade é pela paridade do índice, e não da posição no balde: o balde de
       * uma estrela muda a cada quadro com o cintilar, e cortar por ele faria as
       * estrelas piscarem entre desenhadas e não. Uma estrela ímpar de ordem `r`
       * (0 a 1) está acesa em `(frente - r) / FADE_DENS`, e as que ainda não
       * chegaram nem são visitadas, que é o que a densidade baixa economiza.
       */
      const frente = dens * (1 + FADE_DENS);
      const ordemPor = 2 / Math.max(1, N);

      for (let b = 0; b < buckets; b++) {
        const n = count[b];
        if (!n) continue;
        const off = b * N;
        const alfa = ((b + 0.5) / buckets) * GLOW_ALPHA;

        for (let k = 0; k < n; k++) {
          const i = bucket[off + k];
          const impar = (i & 1) === 1;
          let acesa = 1;
          if (impar) {
            acesa = (frente - (i >> 1) * ordemPor) / FADE_DENS;
            if (acesa <= 0) continue;
            if (acesa > 1) acesa = 1;
          }
          if (sfad[i] === 0) continue;
          let px = bx[i] + sdx[i];
          let py = by[i] + sdy[i];
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

          // quem está mais perto da câmera é maior, mas não na mesma proporção do
          // avanço: o brilho é um halo, e crescer inteiro viraria uma mancha
          const ext = extensaoDe(ssz[i]) * Math.sqrt(sesc[i]);
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
              dentroDoAlcance(bx[i], by[i], campo, poco, temGrav, temPoco)
            ) {
              const mag = Math.sqrt(mag2);
              s = 1 + (alongamentoDe(mag) - 1) * (1 - preso);
              ux = dxi / mag;
              uy = dyi / mag;
            }
          }

          /**
           * O salto: a estrela vira um risco radial, apontando para longe do centro.
           *
           * É o mesmo esticamento da lente, com outra direção e outro tamanho, e
           * não um desenho novo: o risco continua sendo o brilho da estrela,
           * esticado, e herda dele a queda de alfa que impede o risco de acender.
           * Quem está mais perto estica mais, que é o que dá a velocidade. No
           * auge os riscos perdem até 40% do alfa: centenas deles cruzando a tela
           * ao mesmo tempo clareiam o céu inteiro, e isso é clarão também.
           */
          let apagar = 1;
          if (salto > 0.02) {
            const rx = px - cx;
            const ry = py - cy;
            const r = Math.sqrt(rx * rx + ry * ry) || 1;
            s = 1 + salto * 16 * sesc[i];
            ux = rx / r;
            uy = ry / r;
            apagar = 1 - salto * 0.4;
          }

          const a = alfa * acesa * sfad[i] * apagar;
          desenharEstrela(ctx, dpr, px, py, ext, a, flareDe(ssz[i], t, sph[i]), s, ux, uy);
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
