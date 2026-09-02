import type { ConstellationKey } from '../catalog/constellations';
import { CONSTELLATIONS } from '../catalog/constellations';
import { fastSin, TAU } from '../math';
import type { FadableLayer, StageEnv } from '../types';

/** Onde uma figura do catálogo aparece na tela. */
export interface Placement {
  key: ConstellationKey;
  /** centro em fração da largura/altura */
  x: number;
  y: number;
  /** tamanho da maior dimensão, em fração de min(W,H) */
  size?: number;
  /** graus, no sentido horário */
  rotate?: number;
  flip?: boolean;
}

interface ConstellationsOptions {
  name?: string;
  z?: number;
  placements?: readonly Placement[];
  lineAlpha?: number;
  opacity?: number;
  repel?: number;
  twinkleAmount?: number;
  buckets?: number;
  /** segundos para a figura se desenhar por inteiro; 0 = já nasce pronta */
  drawTime?: number;
}

export interface ConstellationsLayer extends FadableLayer {
  /** 0..1 — multiplica linhas e estrelas; em 0 a camada custa zero */
  opacity: number;
  /** opacidade base das linhas, antes de `opacity` e do fade da câmera */
  lineAlpha: number;
  /** segundos da formação das arestas; 0 desliga e a figura aparece inteira */
  drawTime: number;
}

/**
 * Expoente do ritmo da formação. Abaixo de 1 a figura começa devagar e acelera;
 * em 1 o espaçamento é uniforme. Ver o cálculo de `edgeT0` no `resize`.
 */
const RITMO = 0.62;

/**
 * Ordem em que as arestas se desenham: do **miolo** da figura para as pontas.
 *
 * A figura se abre a partir do próprio centro, e cada linha cresce do lado de
 * dentro para o de fora — o desenho expande em vez de convergir.
 *
 * Achar o miolo é um problema de grafo, não de geometria: uma primeira busca em
 * largura a partir de **todas as pontas** (vértices de grau 1) dá, para cada
 * vértice, a distância até a ponta mais próxima; o mais central é o que ficou
 * mais longe de todas elas. Uma segunda busca, agora a partir dele, dá a
 * distância ao centro — e é ela que ordena as arestas e as orienta.
 *
 * Duas buscas em vez de uma porque o centro precisa ser encontrado antes de
 * poder ser usado como semente. Ambas rodam no `resize`, nunca por quadro.
 *
 * A figura fechada — um ciclo, sem nenhum grau 1 — não tem ponta nem miolo: ali
 * qualquer vértice serve de começo, e o desenho se abre pelos dois lados do anel.
 */
function ordenarDoMiolo(eds: number[], n: number): Int32Array {
  const m = eds.length / 2;
  if (!m) return new Int32Array(0);

  const grau = new Int32Array(n);
  for (const v of eds) grau[v]++;

  // adjacência em arrays planos: um `number[][]` alocaria n listas à toa
  const inicio = new Int32Array(n + 1);
  for (let v = 0; v < n; v++) inicio[v + 1] = inicio[v] + grau[v];
  const cursor = inicio.slice(0, n);
  const vizinho = new Int32Array(m * 2);
  for (let e = 0; e < m; e++) {
    const a = eds[e * 2];
    const b = eds[e * 2 + 1];
    vizinho[cursor[a]++] = b;
    vizinho[cursor[b]++] = a;
  }

  const dist = new Int32Array(n);
  const fila = new Int32Array(n);

  /** Busca em largura a partir das sementes já enfileiradas. */
  const largura = (fim: number) => {
    for (let i = 0; i < fim; i++) {
      const v = fila[i];
      for (let k = inicio[v]; k < inicio[v + 1]; k++) {
        const w = vizinho[k];
        if (dist[w] !== -1) continue;
        dist[w] = dist[v] + 1;
        fila[fim++] = w;
      }
    }
    for (let v = 0; v < n; v++) if (dist[v] === -1) dist[v] = 0;
  };

  // 1ª busca: distância de cada vértice até a ponta mais próxima
  dist.fill(-1);
  let fim = 0;
  for (let v = 0; v < n; v++) {
    if (grau[v] === 1) {
      dist[v] = 0;
      fila[fim++] = v;
    }
  }
  const semPontas = fim === 0;
  if (semPontas) {
    // ciclo puro: não há grau 1, então qualquer vértice serve de miolo
    dist[0] = 0;
    fila[fim++] = 0;
  }
  largura(fim);

  // o miolo é o vértice que ficou mais longe de todas as pontas
  let miolo = 0;
  if (!semPontas) {
    for (let v = 1; v < n; v++) if (dist[v] > dist[miolo]) miolo = v;
  }

  // 2ª busca, a partir do miolo: é esta distância que ordena e orienta
  dist.fill(-1);
  dist[miolo] = 0;
  fila[0] = miolo;
  largura(1);

  const chave = new Int32Array(m);
  for (let e = 0; e < m; e++) chave[e] = Math.min(dist[eds[e * 2]], dist[eds[e * 2 + 1]]);
  // ordenação estável: empate mantém a ordem do catálogo, que é a do traçado
  const lista = Array.from({ length: m }, (_, e) => e).sort((a, b) => chave[a] - chave[b]);

  const saida = new Int32Array(m * 2);
  for (let k = 0; k < m; k++) {
    const e = lista[k];
    const a = eds[e * 2];
    const b = eds[e * 2 + 1];
    // o mais perto do miolo vai primeiro: a linha cresce de dentro para fora
    const doMiolo = dist[a] <= dist[b];
    saida[k * 2] = doMiolo ? a : b;
    saida[k * 2 + 1] = doMiolo ? b : a;
  }
  return saida;
}

/**
 * Constelações.
 *
 * As estrelas herdam as propriedades do `Starfield` (tamanho por magnitude,
 * cintilar, repulsão do ponteiro) e as linhas saem num único `stroke()` para a
 * camada inteira.
 *
 * `opacity` é a alavanca de presença: em 0 a camada sai do `update` **e** do
 * `draw`. É o que permite manter quatro céus montados ao mesmo tempo — só o da
 * seção ativa custa alguma coisa.
 */
export function Constellations({
  name = 'constellations',
  z = 12,
  placements = [],
  lineAlpha = 0.16,
  opacity = 1,
  repel = 110,
  twinkleAmount = 0.22,
  buckets = 6,
  drawTime = 1.5,
}: ConstellationsOptions = {}): ConstellationsLayer {
  const R2 = repel * repel;
  let N = 0;
  let px_!: Float32Array;
  let py_!: Float32Array;
  let vx_!: Float32Array; // posições do quadro, reaproveitadas
  let vy_!: Float32Array;
  let sz!: Float32Array;
  let base!: Float32Array;
  let ph!: Float32Array;
  let spd!: Float32Array;
  let dx_!: Float32Array;
  let dy_!: Float32Array;
  let edges: Int32Array = new Int32Array(0);
  let bucket!: Int32Array;
  const count = new Int32Array(buckets);

  /** início de cada aresta, em fração de `drawTime` — preenchido no `resize` */
  let edgeT0: Float32Array = new Float32Array(0);
  /** recíproco da duração de cada aresta: uma divisão no `resize` em vez de
   *  uma por aresta por quadro enquanto a figura se forma */
  let edgeDurInv = 1;
  /** relógio da formação, em segundos do motor; -1 = ainda não começou */
  let formT0 = -1;
  let visivel = false;

  return {
    name,
    z,
    lineAlpha,
    opacity,
    drawTime,
    resize(env: StageEnv) {
      const { W, H } = env;
      const pts: [number, number, number][] = [];
      const eds: number[] = [];

      for (const p of placements) {
        const spec = CONSTELLATIONS[p.key];
        if (!spec) continue;
        const off = pts.length;

        // Projeção equirretangular: a RA cresce para leste (esquerda no céu) e
        // encolhe por cos(dec) na latitude média da figura — sem isso uma
        // constelação polar sairia esticada na horizontal.
        const decs = spec.stars.map((s) => s[1]);
        const decMid = (Math.min(...decs) + Math.max(...decs)) / 2;
        const kx = 15 * Math.cos((decMid * Math.PI) / 180);
        const proj = spec.stars.map(([ra, dec]) => [-ra * kx, -dec] as const);

        const xs = proj.map((q) => q[0]);
        const ys = proj.map((q) => q[1]);
        const x0 = Math.min(...xs);
        const x1 = Math.max(...xs);
        const y0 = Math.min(...ys);
        const y1 = Math.max(...ys);
        // normaliza pela maior dimensão: `size` vale para a figura toda
        const unit = (Math.min(W, H) * (p.size ?? 0.22)) / Math.max(x1 - x0, y1 - y0);
        const mx = (x0 + x1) / 2;
        const my = (y0 + y1) / 2;

        const rot = ((p.rotate ?? 0) * Math.PI) / 180;
        const cos = Math.cos(rot);
        const sin = Math.sin(rot);
        const fx = p.flip ? -1 : 1;

        // magnitude aparente → brilho relativo 0..1 dentro da própria figura
        const mags = spec.stars.map((s) => s[2]);
        const mLo = Math.min(...mags);
        const mHi = Math.max(...mags);
        const span = Math.max(0.001, mHi - mLo);

        proj.forEach(([qx, qy], i) => {
          const ax = (qx - mx) * unit * fx;
          const ay = (qy - my) * unit;
          pts.push([
            W * p.x + (ax * cos - ay * sin),
            H * p.y + (ax * sin + ay * cos),
            1 - (spec.stars[i][2] - mLo) / span,
          ]);
        });
        for (const [a, b] of spec.links) eds.push(off + a, off + b);
      }

      N = pts.length;
      edges = ordenarDoMiolo(eds, pts.length);

      /**
       * Ritmo da formação: uma aresta por slot, com sobreposição.
       *
       * Sem sobreposição a figura fica com cara de metrônomo; com sobreposição
       * demais vira um fade coletivo e some o "linha a linha". O piso de 0.14
       * segura o caso de figuras com muitas arestas, onde a fração ficaria curta
       * demais para o olho pegar cada traço.
       *
       * **O ritmo acelera.** Os inícios não são igualmente espaçados: eles saem
       * de `k^EXPO`, e com expoente menor que 1 a curva sobe rápido no começo,
       * o que deixa os primeiros intervalos longos e os últimos curtos. A figura
       * hesita nas primeiras linhas e se fecha em rajada — que é como um traçado
       * ganha corpo, e o contrário de um metrônomo. A conta é no `resize`.
       */
      const nArestas = edges.length / 2;
      const edgeDur = nArestas > 1 ? Math.max(0.14, 2.2 / nArestas) : 1;
      edgeDurInv = 1 / edgeDur;
      edgeT0 = new Float32Array(nArestas);
      const curso = 1 - edgeDur;
      for (let e = 0; e < nArestas; e++) {
        edgeT0[e] = nArestas > 1 ? Math.pow(e / (nArestas - 1), RITMO) * curso : 0;
      }

      bucket = new Int32Array(Math.max(1, N) * buckets);
      px_ = new Float32Array(N);
      py_ = new Float32Array(N);
      vx_ = new Float32Array(N);
      vy_ = new Float32Array(N);
      sz = new Float32Array(N);
      base = new Float32Array(N);
      ph = new Float32Array(N);
      spd = new Float32Array(N);
      dx_ = new Float32Array(N);
      dy_ = new Float32Array(N);
      for (let i = 0; i < N; i++) {
        px_[i] = pts[i][0];
        py_[i] = pts[i][1];
        const mag = pts[i][2];
        // mesma faixa do Starfield, enviesada pelo brilho catalogado
        sz[i] = 0.55 + mag * 0.95;
        base[i] = 0.32 + mag * 0.62;
        ph[i] = Math.random() * TAU;
        spd[i] = 0.3 + Math.random() * 0.75;
      }
    },
    update(env) {
      /**
       * A formação recomeça toda vez que a camada volta a aparecer, e é a
       * própria camada que percebe isso — o plano de cena só mexe em `opacity`,
       * e não precisa saber que existe uma animação de traçado aqui dentro.
       */
      const aparecendo = this.opacity > 0.002;
      if (aparecendo && !visivel) formT0 = env.t;
      visivel = aparecendo;

      if (!N || !aparecendo) return; // camada invisível custa zero
      const { dt, t, mouse } = env;
      const useMouse = mouse.active && !env.camera.moving;
      for (let b = 0; b < buckets; b++) count[b] = 0;

      for (let i = 0; i < N; i++) {
        let ox = dx_[i];
        let oy = dy_[i];
        if (useMouse) {
          const ddx = px_[i] + ox - mouse.x;
          const ddy = py_[i] + oy - mouse.y;
          const d2 = ddx * ddx + ddy * ddy;
          if (d2 < R2 && d2 > 0.01) {
            const d = Math.sqrt(d2);
            const f = (1 - d / repel) * 26;
            ox += (ddx / d) * f * dt * 6;
            oy += (ddy / d) * f * dt * 6;
          }
        }
        ox -= ox * dt * 2.6;
        oy -= oy * dt * 2.6;
        dx_[i] = ox;
        dy_[i] = oy;

        // LUT pelo mesmo motivo do `Starfield`: uma chamada por estrela por quadro
        const a = base[i] * (1 - twinkleAmount + twinkleAmount * fastSin(t * spd[i] + ph[i]));
        let b = (a * buckets) | 0;
        if (b >= buckets) b = buckets - 1;
        else if (b < 0) b = 0;
        bucket[b * N + count[b]++] = i;
      }
    },
    draw(ctx, env) {
      if (!N || this.opacity <= 0.002) return;
      const zk = env.camera.k;
      const zooming = env.camera.moving;
      const { cx, cy } = env;

      /**
       * Posições do quadro em buffers pré-alocados: nada de `[x, y]` por estrela.
       *
       * Dois laços em vez de um `if` por estrela: `zooming` só é verdadeiro
       * durante 1,5s da abertura, e é constante dentro do quadro — não tem por
       * que ser testado uma vez por vértice.
       */
      if (zooming) {
        for (let i = 0; i < N; i++) {
          vx_[i] = cx + (px_[i] + dx_[i] - cx) * zk;
          vy_[i] = cy + (py_[i] + dy_[i] - cy) * zk;
        }
      } else {
        for (let i = 0; i < N; i++) {
          vx_[i] = px_[i] + dx_[i];
          vy_[i] = py_[i] + dy_[i];
        }
      }

      /**
       * Progresso da formação. Passado o traçado — que é o estado na esmagadora
       * maioria dos quadros — o laço volta a ser o de antes: uma comparação a
       * mais e nenhuma conta por aresta.
       */
      const p =
        this.drawTime > 0 && formT0 >= 0 ? (env.t - formT0) / this.drawTime : 1;
      const formando = p < 1;

      // linhas: um único stroke para toda a camada
      ctx.globalAlpha = this.lineAlpha * env.camera.fade * this.opacity;
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let e = 0; e < edges.length; e += 2) {
        const a = edges[e];
        const b = edges[e + 1];
        if (!formando) {
          ctx.moveTo(vx_[a], vy_[a]);
          ctx.lineTo(vx_[b], vy_[b]);
          continue;
        }
        // `a` é o vértice do lado do miolo: a linha cresce dele para fora
        let q = (p - edgeT0[e >> 1]) * edgeDurInv;
        if (q <= 0) continue;
        if (q > 1) q = 1;
        else q = 1 - (1 - q) * (1 - q); // sai rápido e encosta devagar
        ctx.moveTo(vx_[a], vy_[a]);
        ctx.lineTo(vx_[a] + (vx_[b] - vx_[a]) * q, vy_[a] + (vy_[b] - vy_[a]) * q);
      }
      ctx.stroke();

      ctx.fillStyle = '#fff';
      for (let b = 0; b < buckets; b++) {
        const n = count[b];
        if (!n) continue;
        ctx.globalAlpha = ((b + 0.5) / buckets) * this.opacity;
        ctx.beginPath();
        const off = b * N;
        for (let k = 0; k < n; k++) {
          const i = bucket[off + k];
          const r = sz[i];
          ctx.moveTo(vx_[i] + r, vy_[i]);
          ctx.arc(vx_[i], vy_[i], r, 0, TAU);
        }
        ctx.fill();
      }
    },
  };
}
