import { campoVazio, prepararCampo, puxar } from '../gravity';
import { fastCos, fastSin, TAU } from '../math';
import { criarPlasma, type Plasma } from '../plasma';
import type { Layer, StageEnv } from '../types';

/**
 * Um nível de carga da supernova.
 *
 * A tabela inteira vem de fora porque a `recarga` é o mesmo número que o HUD
 * desenha no medidor: o motor a cobra e o React a mostra, e as duas pontas não
 * podem discordar. O resto do nível (a onda, o poço, o brilho) viaja junto para
 * que exista **uma** linha por nível, e não uma tabela aqui e outra lá.
 */
export interface NivelNova {
  /** carga acumulada, em segundos, a partir da qual este nível vale */
  segurar: number;
  /** recarga cobrada por um disparo deste nível */
  recarga: number;
  /** duração da onda de choque */
  onda: number;
  /** alcance da onda, em fração de `max(W, H)` */
  alcance: number;
  /** impulso máximo na crista, em px/s */
  forca: number;
  /** o poço que a carga abre: alcance em px e intensidade */
  poco: { reach: number; k: number };
  /** tamanho e brilho da estrela que fica, como fator sobre o nível 1 */
  brilho: number;
}

interface SupernovaOptions {
  name?: string;
  z?: number;
  /**
   * Os níveis, em ordem crescente de `segurar`. O primeiro é o toque curto e
   * precisa ter `segurar: 0`.
   */
  niveis?: readonly NivelNova[];
  /** quantas estrelas novas o céu guarda antes de reciclar a mais antiga */
  pool?: number;
  /**
   * Segundos até a estrela acesa passar a responder ao **ponteiro**.
   *
   * Ela nasce presa a ele: enquanto o clarão acontece, o cursor está exatamente
   * em cima dela, e uma estrela que fugisse do dedo que a acendeu pareceria um
   * erro. O que precisa ser coberto é a onda — passado isso o gesto já terminou e
   * não há mais o que proteger. A rampa de `SOLTA` empurra a força total para
   * ~2,9s, o que dá margem de sobra.
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

  /** lado do buffer de plasma da carga, em px */
  plasma?: number;
}

export interface SupernovaLayer extends Layer {
  /**
   * Abre a carga em (x, y), em px de layout. Devolve `false` se ainda estiver
   * recarregando — a recarga mora aqui, no relógio do motor, e não no React: um
   * cronômetro em `setTimeout` andaria mesmo com a aba escondida, e a cena não
   * anda. Pelo mesmo motivo a **carga** também corre no relógio do motor: um
   * nível que subisse com a aba em segundo plano mentiria sobre o que se vê.
   */
  carregar(x: number, y: number): boolean;
  /** Fecha a carga e explode. Devolve o nível atingido (1..n), ou 0 se não havia carga. */
  soltar(): number;
  /** Desiste da carga sem explodir e sem consumir recarga. */
  abortar(): void;
  /** true quando uma carga seria aceita agora */
  pronta(): boolean;
}

/**
 * Um disco de luz num buffer, pintado **uma vez**.
 *
 * A estrela cresce por três segundos e o colapso a encolhe a zero em menos de
 * meio, então o raio muda em todo quadro. Um degradê em coordenadas absolutas
 * teria de ser recriado junto (a chave do cache é o raio), e é exatamente o que o
 * contrato de desempenho manda evitar: efeito de pixel vai num buffer pequeno e
 * ampliado pela GPU no `drawImage`. Assim o raio pode ser contínuo e fracionário
 * sem custar nada, e o **mesmo** buffer desenhado maior e mais apagado é o halo,
 * o que dispensa um segundo degradê.
 */
function criarDisco(size = 128): HTMLCanvasElement {
  const cv = document.createElement('canvas');
  cv.width = size;
  cv.height = size;
  const ctx = cv.getContext('2d')!;
  const r = size / 2;
  const g = ctx.createRadialGradient(r, r, 0, r, r, r);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.42, 'rgba(255,255,255,0.72)');
  g.addColorStop(0.72, 'rgba(255,255,255,0.22)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return cv;
}

/** Fallback: um nível só, que é a supernova de toque simples. */
const NIVEL_UNICO: readonly NivelNova[] = [
  {
    segurar: 0,
    recarga: 3,
    onda: 1.35,
    alcance: 0.55,
    forca: 620,
    poco: { reach: 150, k: 1 },
    brilho: 1,
  },
];

/**
 * Supernova: a estrela que o visitante acende, e o quanto ele a carrega.
 *
 * **Pressionar o vazio abre um poço** que puxa as estrelas vizinhas e aperta
 * enquanto o gesto dura; **soltar** libera a explosão. Quanto mais tempo, maior o
 * nível: o poço cresce, ganha plasma e depois um horizonte de eventos, e a
 * explosão, o clarão e a estrela que fica escalam junto. A recarga também, porque
 * um nível que não custa nada não é uma escolha.
 *
 * A física atravessa o `bus` nos dois sentidos do gesto: a carga publica
 * `env.bus.well` e a explosão publica `env.bus.shock`. O campo de estrelas lê os
 * dois sem saber quem os publicou, exatamente como já faz com a gravidade do
 * buraco negro. Puxar e empurrar é tudo o que eles fazem: a mola que já existe no
 * `Starfield` traz cada estrela de volta sozinha, então nada aqui precisa lembrar
 * de desfazer nada.
 *
 * **Custo quando ociosa: zero.** Sem carga, sem onda e sem estrela acesa, `update`
 * e `draw` saem em três comparações. Os degradês do poço e do horizonte ficam em
 * cache com os stops fixos e a intensidade em `globalAlpha`, então a carga inteira
 * não recria um gradiente por quadro; o plasma segue o padrão da cena, buffer
 * pequeno repintado a 20fps e ampliado pela GPU, e ele só é **criado** na primeira
 * vez que uma carga chega ao nível 2 — quem nunca segura não paga o `ImageData`.
 *
 * As estrelas novas ficam guardadas em **fração da tela**, não em px: o céu que o
 * visitante montou sobrevive a um resize ou a uma rotação sem escorregar. O
 * deslocamento é somado por cima, em px, exatamente como no campo de estrelas.
 *
 * **A estrela acesa cai para o horizonte como qualquer outra**, e sente o poço da
 * carga seguinte pela mesma conta. O puxão vem de `engine/gravity`, o mesmo módulo
 * que o campo de estrelas usa: elas ficam lado a lado no mesmo céu, e uma estrela
 * parada enquanto as vizinhas giram lê como defeito. Só a repulsão do ponteiro
 * continua com os números duplicados aqui.
 */
export function Supernova({
  name = 'nova',
  z = 14,
  niveis = NIVEL_UNICO,
  pool = 12,
  settle = 2,
  repel = 110,
  repelForce = 26,
  spring = 2.6,
  plasma: plasmaSize = 64,
}: SupernovaOptions = {}): SupernovaLayer {
  const R2 = repel * repel;
  /** segundos que a estrela leva para ganhar a física do ponteiro por inteiro */
  const SOLTA = 0.9;
  /** rampa de abertura do poço: pressionar não pode dar um soco no céu */
  const ABRE = 0.3;
  /** desvanecer do desenho da carga depois que o gesto acaba */
  const SAIDA = 0.24;
  /** duração do estalo que marca a subida de nível */
  const ESTALO = 0.45;
  /** depois do último nível, os segundos em que a carga assume o pulso de "cheia" */
  const SATURA = 0.9;
  /** raio de referência do poço: é ele que escala a força em `puxar` */
  const RAIO_POCO = 26;
  /** flash do nascimento: forte e curto, some antes de a onda chegar longe */
  const FLASH = 0.42;

  const PLASMA_FPS = 20;
  const PLASMA_VEL = 1.6;
  const PLASMA_ALPHA = 0.3;
  const PLASMA_ENTRA = 0.4;
  /**
   * A estrela massiva do penúltimo nível.
   *
   * Ela cresce ao longo do nível inteiro, do mesmo `fase01` que move o plasma, e
   * é o corpo que o colapso vai matar. O plasma continua desenhado por baixo e
   * vira a coroa dela: a máscara do buffer já é um anel com o miolo vazio, então
   * o disco aparece exatamente pelo buraco que o plasma deixa.
   */
  const ESTRELA_MIN = 12;
  const ESTRELA_MAX = 46;
  const ESTRELA_ENTRA = 0.45;

  /**
   * O colapso.
   *
   * Um buraco negro não aparece do nada: ele é o que sobra quando a estrela
   * implode. Por isso a promoção ao último nível **não tem estalo** — o anel do
   * estalo se expande, e um anel se expandindo no mesmo instante em que outro
   * implode não lê como nada.
   */
  const COLAPSO = 0.45;
  /** fração do colapso a partir da qual o horizonte começa a nascer */
  const COLAPSO_HORIZ = 0.28;
  /**
   * Multiplicador do puxão no auge da implosão.
   *
   * Calibrado contra o que se vê: as estrelas perto do centro já estão saturadas
   * e mal se mexem, então quem mostra o colapso é a **borda** do campo. A 200px
   * do centro, 3.2 leva o deslocamento de 42px para 92px, e é esse anel externo
   * saltando para dentro que lê como sucção. Em 4 a mesma estrela atravessa o
   * centro e sai do outro lado, o que lê como salto, não como gravidade.
   */
  const PICO_GRAV = 3.2;

  /**
   * O horizonte do último nível.
   *
   * Ele é o prêmio de uma carga longa, então não pode ser um ponto: chega maior
   * que o resto do desenho, leva 0,7s para se formar (o plasma que ele substitui
   * levou quatro segundos crescendo) e traz poeira suficiente para o disco ler
   * como disco.
   */
  const HORIZ_R = 22;
  const HORIZ_CRESCE = 0.7;
  const POEIRA = 34;

  const ultimo = niveis[niveis.length - 1];

  /* estrelas acesas: fração da tela + idade desde o nascimento */
  const fx = new Float32Array(pool);
  const fy = new Float32Array(pool);
  const idade = new Float32Array(pool);
  const viva = new Uint8Array(pool);
  const fase = new Float32Array(pool);
  /** fator de tamanho e brilho, vindo do nível com que a estrela nasceu */
  const brilho = new Float32Array(pool);
  /* deslocamento em px sobre a posição de repouso, como no campo de estrelas */
  const dx = new Float32Array(pool);
  const dy = new Float32Array(pool);

  /* o mesmo puxão que o campo de estrelas sente, do mesmo módulo */
  const campo = campoVazio();
  const campoPoco = campoVazio();
  const puxao = { x: 0, y: 0 };
  let proxima = 0;
  let acesas = 0;

  /* onda: uma só, porque a recarga é sempre maior que a duração dela */
  let ondaX = 0;
  let ondaY = 0;
  let ondaT = -1;
  let restante = 0;
  /* a explosão em curso, copiada do nível no instante em que o gesto soltou */
  let ondaDur = ultimo.onda;
  let ondaForca = ultimo.forca;
  let ondaAlcance = ultimo.alcance;
  let ondaNivel = 1;

  const shock = { x: 0, y: 0, radius: 0, width: 0, force: 0, inner2: 0, outer2: 0 };

  /* carga: o gesto que está sendo segurado agora */
  let cfx = 0;
  let cfy = 0;
  let cargaT = -1;
  let cargaN = -1;
  /** 1 enquanto a carga vive, decaindo em `SAIDA` depois que ela acaba */
  let saida = 0;
  let pocoReach = 0;
  let pocoK = 0;
  let carga01 = 0;
  /** 0..1 dentro do nível corrente: é ele que faz o plasma crescer até o horizonte */
  let fase01 = 0;
  let abertura = 0;
  let satura = 0;
  let promocao = -1;
  const well = { x: 0, y: 0, radius: RAIO_POCO, reach: 0, k: 0 };

  /* plasma: criado na primeira vez que uma carga chega ao nível 2 */
  let plasma: Plasma | null = null;
  let plasmaAcc = 0;
  let plasmaFade = 0;

  /* a estrela massiva, e o colapso que a transforma no horizonte */
  let disco: HTMLCanvasElement | null = null;
  let estrelaFade = 0;
  let estrelaR = 0;
  let colapso = -1;

  /* horizonte de eventos do último nível, com poeira em órbita kepleriana */
  let horiz = 0;
  const oa = new Float32Array(POEIRA);
  const orb = new Float32Array(POEIRA);
  const osz = new Float32Array(POEIRA);
  const ovel = new Float32Array(POEIRA);
  for (let i = 0; i < POEIRA; i++) {
    oa[i] = Math.random() * TAU;
    orb[i] = 1.15 + Math.pow(Math.random(), 1.6) * 1.2;
    osz[i] = 0.35 + Math.random() * 0.65;
    // a velocidade orbital é constante por partícula: tabelá-la aqui tira uma
    // potência por partícula por quadro do laço
    ovel[i] = Math.pow(1 / orb[i], 1.5);
  }

  /* degradês em cache: stops fixos, intensidade por `globalAlpha`. É o que evita
     recriá-los por quadro enquanto o poço escurece e o horizonte cresce */
  let gpx = -1;
  let gpy = -1;
  let gpr = -1;
  let gPoco: CanvasGradient | null = null;
  let ghx = -1;
  let ghy = -1;
  let ghr = -1;
  let gHalo: CanvasGradient | null = null;
  let gBorda: CanvasGradient | null = null;

  /** dimensões do último `resize`: é contra elas que o gesto vira fração */
  let larg = 1;
  let alt = 1;

  /** índice do nível de uma carga de `s` segundos */
  const nivelDe = (s: number): number => {
    let n = 0;
    while (n + 1 < niveis.length && s >= niveis[n + 1].segurar) n++;
    return n;
  };

  return {
    name,
    z,

    pronta() {
      return restante <= 0;
    },

    carregar(x, y) {
      if (restante > 0 || cargaT >= 0) return false;
      cfx = x / larg;
      cfy = y / alt;
      cargaT = 0;
      cargaN = -1;
      promocao = -1;
      plasmaFade = 0;
      estrelaFade = 0;
      estrelaR = 0;
      colapso = -1;
      horiz = 0;
      pocoReach = niveis[0].poco.reach;
      pocoK = 0;
      carga01 = 0;
      fase01 = 0;
      abertura = 0;
      satura = 0;
      saida = 1;
      return true;
    },

    abortar() {
      // sem explosão e sem recarga: o gesto virou arraste, e arraste é da página
      cargaT = -1;
    },

    soltar() {
      if (cargaT < 0) return 0;
      const n = nivelDe(cargaT);
      const nivel = niveis[n];
      cargaT = -1;

      restante = nivel.recarga;
      ondaDur = nivel.onda;
      ondaForca = nivel.forca;
      ondaAlcance = nivel.alcance;
      ondaNivel = n + 1;
      ondaX = cfx * larg;
      ondaY = cfy * alt;
      ondaT = 0;

      const i = proxima;
      proxima = (proxima + 1) % pool;
      if (!viva[i]) acesas++;
      viva[i] = 1;
      idade[i] = 0;
      fase[i] = Math.random() * TAU;
      brilho[i] = nivel.brilho;
      fx[i] = cfx;
      fy[i] = cfy;
      // o slot pode estar sendo reciclado: a estrela nova nasce no repouso
      dx[i] = 0;
      dy[i] = 0;
      return ondaNivel;
    },

    resize(env: StageEnv) {
      // as posições já vivem em fração; o resize só anota a régua do momento
      larg = env.W || 1;
      alt = env.H || 1;
    },

    update(env: StageEnv) {
      const { dt } = env;
      if (restante > 0) restante = Math.max(0, restante - dt);

      /**
       * A carga.
       *
       * O poço interpola **continuamente** entre o nível atual e o seguinte, então
       * o aperto é gradual e não há degrau na física ao promover. O degrau fica
       * por conta do que aparece na tela (o estalo, o plasma, o horizonte), que é
       * onde ele informa em vez de sacudir.
       */
      if (cargaT >= 0) {
        cargaT += dt;
        const n = nivelDe(cargaT);
        if (n !== cargaN) {
          // a primeira "promoção" não é promoção: é o gesto começando
          if (cargaN >= 0) {
            // e a última não é promoção nenhuma: é a estrela morrendo
            if (n === niveis.length - 1) colapso = 0;
            else promocao = 0;
          }
          cargaN = n;
          if (n >= 1 && !plasma) plasma = criarPlasma(plasmaSize);
          if (n >= 2 && !disco) disco = criarDisco();
        }
        const atual = niveis[n];
        const prox = niveis[n + 1];
        const p = prox ? Math.min(1, (cargaT - atual.segurar) / (prox.segurar - atual.segurar)) : 1;
        const alvo = prox ?? atual;

        abertura = Math.min(1, cargaT / ABRE);
        fase01 = p;
        pocoReach = atual.poco.reach + (alvo.poco.reach - atual.poco.reach) * p;
        pocoK = (atual.poco.k + (alvo.poco.k - atual.poco.k) * p) * abertura;
        /**
         * O pico do colapso sai do `k` que já é publicado, não de um segundo
         * campo no barramento: o campo de estrelas e as estrelas acesas são
         * sugadas sem uma linha nova em nenhum dos dois, e a mola de sempre as
         * devolve depois. A curva sobe e volta dentro do próprio colapso, então
         * não sobra nada para desfazer.
         */
        if (colapso >= 0) {
          const c = colapso / COLAPSO;
          pocoK *= 1 + (PICO_GRAV - 1) * fastSin(c * (TAU / 2));
        }
        carga01 = ultimo.segurar > 0 ? Math.min(1, cargaT / ultimo.segurar) : 1;
        satura = Math.min(1, Math.max(0, (cargaT - ultimo.segurar) / SATURA));

        well.x = cfx * env.W;
        well.y = cfy * env.H;
        well.reach = pocoReach;
        well.k = pocoK;
        env.bus.well = well;
        saida = 1;

        if (n >= 1) plasmaFade = Math.min(1, plasmaFade + dt / PLASMA_ENTRA);
        if (n >= 2) {
          estrelaFade = Math.min(1, estrelaFade + dt / ESTRELA_ENTRA);
          // no último nível a estrela já morreu: o raio fica no que ela tinha, e
          // é o colapso que o leva a zero
          if (n === 2) estrelaR = ESTRELA_MIN + (ESTRELA_MAX - ESTRELA_MIN) * p;
        }
        // o horizonte só nasce depois de a implosão ter passado do meio
        if (colapso >= COLAPSO * COLAPSO_HORIZ) {
          horiz = Math.min(1, horiz + dt / HORIZ_CRESCE);
        }
      } else {
        if (env.bus.well) env.bus.well = null;
        if (saida > 0) saida = Math.max(0, saida - dt / SAIDA);
      }

      if (promocao >= 0) {
        promocao += dt;
        if (promocao > ESTALO) promocao = -1;
      }
      if (colapso >= 0) {
        colapso += dt;
        if (colapso > COLAPSO) colapso = COLAPSO;
      }

      // o buffer só é repintado enquanto alguém o vê, e abaixo de 60fps
      if (plasma && plasmaFade > 0 && saida > 0) {
        plasmaAcc += dt;
        if (plasmaAcc >= 1 / PLASMA_FPS) {
          plasmaAcc = 0;
          plasma.pintar(env.t * PLASMA_VEL);
        }
      }
      if (horiz > 0 && saida > 0) {
        const passo = dt * 0.21;
        for (let i = 0; i < POEIRA; i++) oa[i] += passo * ovel[i];
      }

      /* a explosão */
      if (ondaT >= 0) {
        ondaT += dt;
        const p = ondaT / ondaDur;
        if (p >= 1) {
          ondaT = -1;
          env.bus.shock = null;
        } else {
          const raio = Math.max(env.W, env.H) * ondaAlcance * (1 - (1 - p) * (1 - p) * (1 - p));
          const largura = (34 + 52 * p) * (1 + 0.3 * (ondaNivel - 1));
          shock.x = ondaX;
          shock.y = ondaY;
          shock.radius = raio;
          shock.width = largura;
          shock.force = ondaForca * (1 - p) * (1 - p);
          const dentro = Math.max(0, raio - largura);
          shock.inner2 = dentro * dentro;
          shock.outer2 = (raio + largura) * (raio + largura);
          env.bus.shock = shock;
        }
      }

      if (!acesas) return;

      /**
       * A estrela acesa ganha a repulsão do ponteiro depois de `settle` segundos,
       * o suficiente para a onda passar.
       *
       * O ganho entra por uma rampa de `SOLTA` segundos, não por um interruptor:
       * um ponto parado que de repente salta para longe do cursor lê como falha,
       * não como física. Enquanto o ganho é zero, o custo é uma comparação.
       */
      const { mouse } = env;
      const usaMouse = mouse.active && !env.camera.moving;
      // durante o zoom da intro a gravidade fica desligada, como no campo de estrelas
      const temGrav = prepararCampo(env.camera.moving ? null : env.bus.gravity, campo);
      // e a estrela já acesa sente o poço da carga seguinte, como qualquer outra
      const temPoco = prepararCampo(cargaT >= 0 && !env.camera.moving ? well : null, campoPoco);

      for (let i = 0; i < pool; i++) {
        if (!viva[i]) continue;
        idade[i] += dt;
        const ganho = Math.min(1, Math.max(0, (idade[i] - settle) / SOLTA));
        // sem gravidade, sem poço e sem ponteiro, uma estrela em repouso não custa nada
        if (!ganho && !temGrav && !temPoco && !dx[i] && !dy[i]) continue;
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
         * A ordem importa: a mola puxa de volta para o repouso, e o puxão é somado
         * por cima do que sobrou. Invertida, a mola comeria o puxão do mesmo quadro
         * e a estrela nunca sairia do lugar.
         *
         * **Sem atraso e sem rampa**, ao contrário do ponteiro. O `settle` existe
         * porque o cursor está em cima da estrela no instante do clarão; o buraco
         * negro está no centro da tela e nunca esteve sob o dedo, então não há de
         * que proteger a estrela. E o puxão é aceleração somada quadro a quadro,
         * não um salto de posição: entrar com força total desde o nascimento não
         * produz degrau nenhum.
         */
        if (temGrav) {
          puxao.x = 0;
          puxao.y = 0;
          puxar(campo, px + ox, py + oy, dt, puxao);
          ox += puxao.x;
          oy += puxao.y;
        }
        if (temPoco) {
          puxao.x = 0;
          puxao.y = 0;
          puxar(campoPoco, px + ox, py + oy, dt, puxao);
          ox += puxao.x;
          oy += puxao.y;
        }

        dx[i] = ox;
        dy[i] = oy;
      }
    },

    draw(ctx, env) {
      if (!acesas && ondaT < 0 && saida <= 0 && promocao < 0) return;
      const { W, H, t } = env;

      /* estrelas acesas: um ponto branco que nasce grande e assenta */
      if (acesas) {
        ctx.fillStyle = '#fff';
        for (let i = 0; i < pool; i++) {
          if (!viva[i]) continue;
          const a = idade[i];
          const b = brilho[i] || 1;
          // nasce com 3.4px e assenta em 1.15px ao longo de ~1.2s, vezes o nível
          const cresc = a < 1.2 ? 1 - a / 1.2 : 0;
          const r = (1.15 + cresc * cresc * 2.25) * b;
          const cintila = 0.82 + 0.18 * fastSin(t * 0.9 + fase[i]);
          const nascendo = Math.min(1, a / 0.12);
          const cx = fx[i] * W + dx[i];
          const cy = fy[i] * H + dy[i];

          /**
           * A auréola do que nasceu forte: a luz que fica é a marca do nível.
           *
           * Ela é **muito** discreta de propósito. O que diferencia a estrela de
           * carga cheia já é o próprio ponto, que é maior e cintila mais forte; a
           * auréola só confirma. Numa página que é preto e linhas de 1px, um
           * halo que se lê à primeira vista vira a coisa mais brilhante da tela e
           * puxa o olho para um canto qualquer do céu.
           */
          if (b > 1.1) {
            ctx.globalAlpha = nascendo * cintila * 0.035 * b;
            ctx.beginPath();
            ctx.moveTo(cx + r * 2.8, cy);
            ctx.arc(cx, cy, r * 2.8, 0, TAU);
            ctx.fill();
          }

          ctx.globalAlpha = nascendo * cintila;
          ctx.beginPath();
          ctx.moveTo(cx + r, cy);
          ctx.arc(cx, cy, r, 0, TAU);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }

      const cx = cfx * W;
      const cy = cfy * H;

      /**
       * A carga.
       *
       * O poço é um escurecimento radial: sobre um céu preto, o que ele faz é
       * apagar as estrelas que estão ali dentro, e é essa a leitura, o que foi
       * puxado está sendo engolido. Dois anéis contam o resto: o de fora mostra o
       * alcance e cresce, o de dentro mostra a compressão e encolhe.
       */
      if (saida > 0) {
        const pulso = 1 + 0.05 * satura * fastSin(t * 7);
        const forca = abertura * saida;

        const rq = Math.round(pocoReach / 4) * 4 || 4;
        if (rq !== gpr || cx !== gpx || cy !== gpy) {
          gpr = rq;
          gpx = cx;
          gpy = cy;
          gPoco = ctx.createRadialGradient(cx, cy, 0, cx, cy, rq);
          gPoco.addColorStop(0, 'rgba(0,0,0,1)');
          gPoco.addColorStop(0.45, 'rgba(0,0,0,0.62)');
          gPoco.addColorStop(1, 'rgba(0,0,0,0)');
        }
        ctx.globalAlpha = (0.12 + 0.46 * carga01) * forca;
        ctx.fillStyle = gPoco!;
        ctx.beginPath();
        ctx.arc(cx, cy, gpr, 0, TAU);
        ctx.fill();
        ctx.globalAlpha = 1;

        // o anel de alcance é o mais discreto do conjunto: ele só marca onde a
        // física acaba, e quem tem de puxar o olho é o miolo da carga
        ctx.lineWidth = 1;
        ctx.strokeStyle = `rgba(255,255,255,${(0.032 * forca).toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(cx, cy, pocoReach, 0, TAU);
        ctx.stroke();

        const rc = (94 - 54 * carga01) * pulso;
        ctx.strokeStyle = `rgba(255,255,255,${((0.13 + 0.2 * carga01) * forca).toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(cx, cy, rc, 0, TAU);
        ctx.stroke();

        /**
         * Nível 2: o plasma, o mesmo campo de senos do buraco negro.
         *
         * Ele **cresce ao longo do nível inteiro**, e não com a carga total: o
         * progresso é o de dentro do nível corrente, então o plasma nasce pequeno
         * quando acende e chega ao tamanho cheio exatamente quando o horizonte
         * está prestes a se formar. Passado esse ponto ele fica no máximo e vira
         * o disco do que nasceu ali.
         */
        const eColapso = colapso >= 0 ? colapso / COLAPSO : 0;
        if (plasma && plasmaFade > 0) {
          const cresc = cargaN >= 2 ? 1 : fase01;
          ctx.globalCompositeOperation = 'lighter';
          // no colapso a coroa é sugada junto com a estrela, e volta depois: a
          // sucção é o momento, não o estado. Parada no valor encolhido, ela
          // deixaria o horizonte com um disco menor do que o da própria estrela
          const ps = (96 + 130 * cresc) * (1 - 0.45 * fastSin(eColapso * (TAU / 2)));
          ctx.globalAlpha = PLASMA_ALPHA * (0.55 + 0.45 * cresc) * plasmaFade * saida;
          ctx.drawImage(plasma.canvas, cx - ps / 2, cy - ps / 2, ps, ps);
          ctx.globalAlpha = 1;
          ctx.globalCompositeOperation = 'source-over';
        }

        /**
         * Nível 3: a estrela massiva, e a morte dela.
         *
         * **A implosão acelera**: o raio cai por uma curva quadrática, porque um
         * colapso gravitacional não é um encolhimento uniforme. E o brilho **sobe**
         * enquanto ele acontece, que é a mesma luz espremida em cada vez menos
         * área. A queima entra na opacidade, nunca no raio, pela razão de sempre.
         */
        const implode = eColapso > 0 ? Math.max(0, 1 - eColapso * eColapso) : 1;
        const Re = estrelaR * implode * saida;
        if (disco && estrelaFade > 0 && Re > 0.5) {
          const aperto = 1 + 1.6 * (1 - implode);
          const queima = 1 + 0.08 * fastSin(t * 3.1);
          ctx.globalCompositeOperation = 'lighter';

          const halo = Re * 2.6;
          ctx.globalAlpha = Math.min(1, 0.28 * estrelaFade * saida * aperto);
          ctx.drawImage(disco, cx - halo, cy - halo, halo * 2, halo * 2);

          ctx.globalAlpha = Math.min(1, 0.6 * estrelaFade * saida * queima * aperto);
          ctx.drawImage(disco, cx - Re, cy - Re, Re * 2, Re * 2);

          ctx.globalCompositeOperation = 'source-over';
          // o limbo: é ele que dá borda de disco ao que senão seria só um borrão
          ctx.globalAlpha = 1;
          ctx.lineWidth = 1;
          ctx.strokeStyle = `rgba(255,255,255,${(0.28 * estrelaFade * saida).toFixed(3)})`;
          ctx.beginPath();
          ctx.arc(cx, cy, Re, 0, TAU);
          ctx.stroke();
        }

        /* o clarão do colapso, no mesmo buffer da estrela: zero alocação */
        if (disco && colapso > COLAPSO * 0.45 && colapso < COLAPSO) {
          const f = Math.sin(((eColapso - 0.45) / 0.55) * (Math.PI / 1));
          const rf = 40 + 190 * (1 - f);
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = Math.min(1, 0.85 * f * saida);
          ctx.drawImage(disco, cx - rf, cy - rf, rf * 2, rf * 2);
          ctx.globalAlpha = 1;
          ctx.globalCompositeOperation = 'source-over';
        }

        /**
         * Nível 3: um horizonte de eventos, com o vocabulário do grande.
         *
         * O pulso de "carregado ao máximo" entra no **disco** e na opacidade do
         * halo, nunca no raio que serve de chave para os degradês: um raio que
         * oscila cinco por cento a cada quadro invalida o cache o tempo todo, e
         * `createRadialGradient` por quadro é alocação pura. O raio base só muda
         * enquanto o horizonte se forma, que são 0,7s.
         */
        const Rbase = HORIZ_R * horiz * saida;
        const R = Rbase * pulso;
        if (Rbase > 0.5) {
          ctx.globalCompositeOperation = 'lighter';
          for (let g = 0; g < 2; g++) {
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            for (let i = g; i < POEIRA; i += 2) {
              const rr = orb[i] * R * 1.35;
              const px = cx + fastCos(oa[i]) * rr;
              const py = cy + fastSin(oa[i]) * rr;
              const sz = osz[i];
              ctx.moveTo(px + sz, py);
              ctx.arc(px, py, sz, 0, TAU);
            }
            ctx.globalAlpha = (g ? 0.5 : 0.22) * saida;
            ctx.fill();
          }

          const hq = Math.round(Rbase * 2) / 2;
          if (hq !== ghr || cx !== ghx || cy !== ghy) {
            ghr = hq;
            ghx = cx;
            ghy = cy;
            gHalo = ctx.createRadialGradient(cx, cy, hq * 0.9, cx, cy, hq * 3.4);
            gHalo.addColorStop(0, 'rgba(255,255,255,0.26)');
            gHalo.addColorStop(0.28, 'rgba(255,255,255,0.09)');
            gHalo.addColorStop(1, 'rgba(255,255,255,0)');
            // borda **preta** suavizando para fora: o brilho vem do halo por
            // baixo, nunca de um contorno
            gBorda = ctx.createRadialGradient(cx, cy, hq * 0.96, cx, cy, hq * 1.25);
            gBorda.addColorStop(0, 'rgba(0,0,0,1)');
            gBorda.addColorStop(1, 'rgba(0,0,0,0)');
          }
          ctx.globalAlpha = saida * pulso;
          ctx.fillStyle = gHalo!;
          ctx.beginPath();
          ctx.arc(cx, cy, ghr * 3.4, 0, TAU);
          ctx.fill();

          ctx.globalCompositeOperation = 'source-over';
          ctx.fillStyle = '#000';
          ctx.beginPath();
          ctx.arc(cx, cy, R, 0, TAU);
          ctx.fill();
          ctx.fillStyle = gBorda!;
          ctx.beginPath();
          ctx.arc(cx, cy, ghr * 1.25, 0, TAU);
          ctx.fill();
          ctx.globalAlpha = 1;
        }

        /**
         * O anel de implosão: o estalo ao contrário.
         *
         * Ele vem do alcance do poço para o centro e **ganha** opacidade no caminho,
         * enquanto o estalo das outras promoções sai do centro e se apaga. É o que
         * diz, sem texto nenhum, que o que está acontecendo aqui é o oposto de
         * tudo o que aconteceu antes.
         */
        if (colapso >= 0 && colapso < COLAPSO) {
          const enc = Math.max(0, 1 - eColapso * 1.3);
          const raio = pocoReach * enc * enc;
          if (raio > 1) {
            ctx.lineWidth = 1;
            ctx.strokeStyle = `rgba(255,255,255,${((0.12 + 0.46 * eColapso) * saida).toFixed(3)})`;
            ctx.beginPath();
            ctx.arc(cx, cy, raio, 0, TAU);
            ctx.stroke();
          }
        }
      }

      /**
       * O estalo da promoção.
       *
       * É o sinal de que o nível subiu, e ele acontece sob o dedo: um anel que sai
       * do centro e um clarão curtíssimo atrás dele. O que aparece depois (plasma,
       * horizonte) explica **o que** mudou; o estalo diz **quando**.
       */
      if (promocao >= 0) {
        const e = promocao / ESTALO;
        const q = 1 - e;
        // o estalo cresce com o nível que anuncia: o último é o que forma o
        // horizonte, e chegar a ele merece mais que chegar ao anterior
        const peso = 1 + 0.45 * (cargaN - 1);
        const raio = 16 + (pocoReach + 30) * (1 - q * q * q);
        ctx.lineWidth = 1;
        ctx.strokeStyle = `rgba(255,255,255,${(0.45 * peso * q * q).toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(cx, cy, raio, 0, TAU);
        ctx.stroke();

        if (promocao < 0.18) {
          const f = 1 - promocao / 0.18;
          const rf = (20 + 60 * (1 - f)) * peso;
          const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rf);
          g.addColorStop(0, `rgba(255,255,255,${Math.min(0.7, 0.38 * peso * f * f).toFixed(3)})`);
          g.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(cx, cy, rf, 0, TAU);
          ctx.fill();
        }
      }

      if (ondaT < 0) return;
      const p = ondaT / ondaDur;
      const escala = 1 + 0.55 * (ondaNivel - 1);

      /* clarão do nascimento: degradê de vida curta, como o rastro do meteoro */
      const flash = FLASH * (1 + 0.25 * (ondaNivel - 1));
      if (ondaT < flash) {
        const f = 1 - ondaT / flash;
        const raio = (26 + 84 * (1 - f)) * escala;
        const nucleo = Math.min(0.85, 0.55 + 0.12 * (ondaNivel - 1)) * f * f;
        const g = ctx.createRadialGradient(ondaX, ondaY, 0, ondaX, ondaY, raio);
        g.addColorStop(0, `rgba(255,255,255,${nucleo.toFixed(3)})`);
        g.addColorStop(0.45, `rgba(255,255,255,${(0.12 * f * f).toFixed(3)})`);
        g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(ondaX, ondaY, raio, 0, TAU);
        ctx.fill();
      }

      /* a frente de onda: traços de 1px, os de dentro só para dar volume */
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

      // a partir do nível 2 a explosão ganha uma segunda crista, e ela é só
      // desenho: a física continua sendo uma onda só, que é o que o campo de
      // estrelas espera encontrar no barramento
      if (ondaNivel > 1) {
        const meio = shock.radius - shock.width * 1.6;
        if (meio > 2) {
          ctx.strokeStyle = `rgba(255,255,255,${(0.2 * q * q * (ondaNivel - 1)).toFixed(3)})`;
          ctx.beginPath();
          ctx.arc(ondaX, ondaY, meio, 0, TAU);
          ctx.stroke();
        }
      }
    },
  };
}
