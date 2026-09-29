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
  readonly camera: {
    zoomOut(from?: number, dur?: number): void;
    /** leva a câmera até esta profundidade, com inércia (a rolagem da tela) */
    avancar(alvo: number): void;
    /** o salto entre telas: riscos, campo de visão abrindo e um clarão curto */
    saltar(): void;
    /** liga ou desliga a deriva lenta para dentro do céu */
    derivar(ligada: boolean): void;
  };
  readonly qualidade: {
    /** o nível em vigor e o que a medição sabe desta máquina (ver o topo do arquivo) */
    ler(): MedidaQualidade;
    /** fixa o nível que quem visita escolheu; `null` devolve a decisão à cena */
    fixar(v: number | null): void;
    /** troca os pisos e força a taxa de 30, para calibrar (o painel de `?pisos`) */
    calibrar(c: { densidade?: number; escala?: number; trinta?: boolean }): void;
  };
  /** busca uma camada pelo nome; `undefined` se ela não estiver montada */
  layer<T extends Layer = Layer>(name: string): T | undefined;
  setEnabled(name: string, on: boolean): void;
  destroy(): void;
}

export interface MedidaQualidade {
  /** o nível em vigor, de 0 a 1 */
  q: number;
  /**
   * O nível em que o consumo chegaria a `LIMITE`, e o `ideal`, onde ele fica na
   * meta. `null` até a primeira janela medida.
   */
  limite: number | null;
  ideal: number | null;
  /** o nível foi escolhido por quem visita, e a cena não o mexe */
  manual: boolean;
  /** o que o nível virou: quanto da metade opcional do céu está acesa, px de canvas por px, e a taxa */
  densidade: number;
  escala: number;
  fps: number;
  /** o consumo da última janela, em fração de um núcleo; `null` antes da primeira */
  consumo: number | null;
}

/** DPR acima de 2 quadruplica os pixels sem ganho perceptível — daí o teto. */
const MAX_DPR = 2;
/** delta máximo por quadro: uma aba retomada não pode dar um salto na cena */
const MAX_DT = 0.05;

/**
 * A câmera que anda para dentro do céu.
 *
 * `SEGUE` é quanto do caminho até o alvo ela anda por segundo: a rolagem chega
 * em degraus (roda do mouse, dedo), e seguir cada degrau na hora faria as
 * estrelas pularem junto. `DERIVA` é a viagem lenta de quando nada acontece, que
 * é o que faz o céu parecer um lugar e não um papel de parede. O salto dura
 * `SALTO` segundos e empurra a câmera `SALTO_VOO` unidades para a frente.
 */
const SEGUE = 3.2;
const DERIVA = 0.0035;
const SALTO = 1;
const SALTO_VOO = 0.9;

/**
 * A qualidade é **contínua**, de 0 a 1, e decide o que pesa na cena **na ordem em
 * que quem olha menos sente**: primeiro a densidade do céu, depois a resolução,
 * e a taxa de quadros só por último.
 *
 * - de `Q_RES` a 1, só a densidade anda: `env.densidade` vai do `pisoDensidade`
 *   até 1 (a metade ímpar das estrelas acende uma a uma), com a resolução cheia;
 * - de 0 a `Q_RES`, a densidade fica no piso e a resolução anda, do
 *   `pisoEscala` ao DPR do aparelho (teto 2);
 * - abaixo de 0 não há mais o que tirar, e a taxa cai de 60 para 30 (`economia`).
 *
 * O halo da supernova sai abaixo de `Q_LEVE` (`env.leve`). Os dois pisos são
 * calibráveis ao vivo (`qualidade.calibrar`, o painel de `?pisos`).
 *
 * Ela começa baixa e sobe devagar, **sem nunca procurar o limite da máquina**.
 * A cada janela o palco mede quanto de CPU a cena gasta (o trabalho de cada
 * quadro desenhado vezes os quadros por segundo, em fração de um núcleo), e
 * **a meta é `MARGEM` do limite**: a cena para 15% abaixo do consumo que a
 * máquina aguentaria. Cada passo para cima vai só até onde a proporção prevê que
 * a meta ainda cabe; se mesmo assim passar (um degrau de resolução é um salto de
 * pixels), a cena volta ao nível de antes e para ali. Sem passo recente, um
 * consumo acima da meta (a supernova carregada) desce na proporção do excesso.
 *
 * Quadro atrasado (o intervalo passou do alvo, porque a GPU ou o navegador não
 * acompanham) conta como o limite alcançado ali mesmo.
 *
 * **Descer fixa o teto**: quem desceu não volta a subir na mesma visita, e a
 * cena não oscila. Subir é um passo pequeno por janela, para a troca não se ver.
 *
 * **Quem visita pode escolher o nível** (`qualidade.fixar`, a régua do menu de
 * opções), e aí a cena para de decidir: continua medindo, mas não sobe nem
 * desce. A medição vira duas marcas na régua: o `limite`, onde o consumo chegaria
 * a `LIMITE` pela mesma proporção que guia os passos, e o `ideal`, `MARGEM` dele.
 */
const Q_INICIO = 0.1;
const Q_PASSO = 0.04;
/** onde a resolução chega ao máximo e a densidade começa a subir do piso */
const Q_RES = 0.5;
/** abaixo disto, `env.leve` */
const Q_LEVE = 0.35;
/** o piso da densidade: quanto da metade opcional do céu fica acesa no mínimo */
const PISO_DENSIDADE = 0.3;
/** o piso da resolução, em px de canvas por px de layout */
const PISO_ESCALA = 0.7;
/** o consumo aceitável da cena, em fração de um núcleo */
const LIMITE = 0.25;
/** o alvo fica em 85% da qualidade em que o consumo chegaria ao limite */
const MARGEM = 0.85;
/** um quadro que leva mais que isto do intervalo esperado está atrasado */
const ATRASO = 1.35;
/** a janela do julgamento, em segundos de relógio de parede */
const JANELA = 0.6;
/** depois de cada troca, o tempo que fica de fora: redimensionar o canvas custa um quadro */
const ASSENTA = 0.3;
/** quanto de cada janela nova entra na estimativa do limite, para as marcas não tremerem */
const SUAVE = 0.3;

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
    camera: { k: 1, moving: false, progress: 1, fade: 1, avanco: 0, rolagem: 0, salto: 0 },
    bus: {},
    leve: true,
    densidade: 0,
    calibrando: false,
  };

  // ordem do array = ordem de update; `z` = ordem de desenho
  const drawList = layers.slice().sort((a, b) => a.z - b.z);
  const live = (l: Layer) => l.enabled !== false;

  /* câmera: a intro parte de dentro do horizonte e recua */
  let camFrom = 1;
  let camDur = 0;
  let camElapsed = 0;

  let alvoAvanco = 0;
  let avancoSuave = 0;
  let voo = 0;
  let deriva = 0;
  let derivaLigada = false;
  let saltoT = -1;

  /** a câmera que anda no céu (ver `SEGUE`): alvo com inércia, deriva e saltos */
  const stepAvanco = (dt: number) => {
    const c = env.camera;
    avancoSuave += (alvoAvanco - avancoSuave) * Math.min(1, dt * SEGUE);
    if (Math.abs(alvoAvanco - avancoSuave) < 1e-5) avancoSuave = alvoAvanco;
    if (derivaLigada) deriva += dt * DERIVA;
    if (saltoT >= 0) {
      saltoT += dt;
      const p = Math.min(1, saltoT / SALTO);
      c.salto = Math.sin(p * Math.PI);
      voo += c.salto * dt * SALTO_VOO * (Math.PI / 2) / SALTO;
      if (p >= 1) {
        saltoT = -1;
        c.salto = 0;
      }
    }
    c.avanco = avancoSuave + deriva + voo;
    c.rolagem = avancoSuave;
  };

  const stepCamera = (dt: number) => {
    stepAvanco(dt);
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

  /* a qualidade (ver o topo do arquivo) */
  let q = Q_INICIO;
  let teto = 1;
  let desceu = false;
  /** o nível de antes do último passo para cima, enquanto ele ainda não foi julgado */
  let anterior: number | null = null;
  let trabalho = 0;
  let quadros = 0;
  let decorrido = 0;
  let parede = 0;
  let julgarApos = 0;
  /** o nível que quem visita escolheu, ou `null` */
  let manual: number | null = null;
  let limite: number | null = null;

  let pisoDensidade = PISO_DENSIDADE;
  let pisoEscala = PISO_ESCALA;
  const dprMax = () => Math.min(window.devicePixelRatio || 1, MAX_DPR);
  // em degraus de 1/8, para a resolução não trocar a cada passo pequeno de `q`
  const escalaDe = (v: number) => {
    const piso = Math.min(pisoEscala, dprMax());
    // no piso, o valor exato: é o que o painel de `?pisos` calibra, e o degrau o esconderia
    if (v <= 0) return piso;
    return Math.round((piso + (dprMax() - piso) * Math.min(1, v / Q_RES)) * 8) / 8;
  };
  const densidadeDe = (v: number) =>
    v <= Q_RES ? pisoDensidade : pisoDensidade + ((1 - pisoDensidade) * (v - Q_RES)) / (1 - Q_RES);
  /** o consumo da última janela medida, em fração de um núcleo */
  let consumoMedido: number | null = null;
  /**
   * 60fps sempre, e a intro com eles: o primeiro contato é o que mais sente. Só
   * uma máquina que passa da meta com resolução e densidade no piso cai para 30
   * (`economia`), e fica ali na visita. O painel de `?pisos` também a liga, para
   * ver como a cena fica a 30.
   */
  let economia = false;
  const intervaloAlvo = () => (economia ? 1 / 30 : 1 / 60);

  const dimensionar = () => {
    env.dpr = Math.min(dprMax(), escalaDe(q));
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

  const aplicar = (novo: number, forcar = false) => {
    const escalaAntes = escalaDe(q);
    q = Math.min(1, Math.max(0, novo));
    env.leve = q < Q_LEVE;
    env.densidade = densidadeDe(q);
    if (forcar || escalaDe(q) !== escalaAntes) dimensionar();
    canvas.dataset.qualidade = economia || q < Q_LEVE ? '0' : q < Q_RES ? '1' : '2';
    canvas.dataset.q = q.toFixed(2);
    julgarApos = parede + ASSENTA;
    trabalho = 0;
    quadros = 0;
    decorrido = 0;
  };

  /** `intervalo`: desde o último quadro desenhado; `custo`: o trabalho deste, ambos em segundos */
  const julgar = (intervalo: number, custo: number) => {
    // um engasgo isolado (coleta de lixo, aba que volta) não é regime
    if (env.camera.moving || parede < julgarApos || intervalo > 0.25) return;
    trabalho += Math.min(custo, 0.1);
    quadros++;
    decorrido += intervalo;
    if (decorrido < JANELA) return;
    const porQuadro = trabalho / quadros;
    const intervaloMedio = decorrido / quadros;
    trabalho = 0;
    quadros = 0;
    decorrido = 0;
    // fração de um núcleo: o trabalho de cada quadro vezes os quadros por segundo
    const consumo = porQuadro / Math.max(intervaloMedio, intervaloAlvo());
    consumoMedido = consumo;
    const atrasado = intervaloMedio > intervaloAlvo() * ATRASO;
    const meta = MARGEM * LIMITE;
    // ponytail: proporção pura (custo ∝ nível); perto de 0 o custo fixo da cena a deixa
    // conservadora, e o limite só fica fiel depois de a cena subir ou de alguém escolher
    const estimado = Math.min(1, atrasado ? q * MARGEM : (q * LIMITE) / Math.max(consumo, 1e-4));
    limite = limite === null ? estimado : limite + (estimado - limite) * SUAVE;
    if (manual !== null) return;
    if (atrasado || consumo > meta) {
      // o passo que acabou de subir passou da meta: volta a ele e para ali. Sem passo
      // recente, a cena ficou mais cara (a supernova): desce na proporção do excesso
      const proporcional = atrasado ? q * MARGEM : (q * meta) / consumo;
      // perto do piso a proporção só se aproxima de zero: arredonda e chega
      const volta = anterior !== null ? anterior : proporcional < 0.03 ? 0 : proporcional;
      // no piso não há mais o que tirar da cena: o último recurso é a taxa de quadros
      if (q === 0 && anterior === null) economia = true;
      teto = Math.min(teto, volta);
      desceu = true;
      anterior = null;
      aplicar(volta);
      return;
    }
    anterior = null;
    if (desceu || q >= teto) return;
    // o próximo passo, mas só até onde a proporção prevê que a meta ainda cabe
    const proximo = Math.min(teto, q + Q_PASSO, (q * meta) / Math.max(consumo, 1e-4));
    if (proximo > q + 0.01) {
      anterior = q;
      aplicar(proximo);
    }
  };

  let raf: number | null = null;
  let last = performance.now();

  let desenhado = performance.now();

  const frame = (now: number) => {
    raf = requestAnimationFrame(frame);
    parede += (now - last) / 1000;
    last = now;
    // abaixo de 60fps, pula os quadros de vsync que sobram (com folga para o relógio que oscila)
    const intervalo = (now - desenhado) / 1000;
    if (intervalo < intervaloAlvo() - 0.004) return;
    desenhado = now;
    env.dt = Math.min(MAX_DT, intervalo);
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

    /**
     * O clarão do salto: um véu branco que só existe no auge, fraco e curto.
     * Ao cubo e com teto de 5%, ele fica abaixo de 1,5% em quase todo o salto:
     * um clarão de tela cheia forte é risco para quem tem fotossensibilidade.
     */
    const s = env.camera.salto;
    if (s > 0.3) {
      ctx.fillStyle = `rgba(255,255,255,${(0.05 * s * s * s).toFixed(3)})`;
      ctx.fillRect(0, 0, env.W, env.H);
    }

    julgar(intervalo, (performance.now() - now) / 1000);
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
      desenhado = last;
      julgarApos = parede + ASSENTA;
      raf = requestAnimationFrame(frame);
    }
  };

  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  window.addEventListener('pointermove', onMove, { passive: true });
  window.addEventListener('pointerleave', onLeave, { passive: true });
  document.addEventListener('visibilitychange', onVis);

  aplicar(Q_INICIO);
  resize();
  raf = requestAnimationFrame(frame);

  return {
    env,
    camera: {
      avancar(alvo: number) {
        alvoAvanco = alvo;
      },
      saltar() {
        saltoT = 0;
      },
      derivar(ligada: boolean) {
        derivaLigada = ligada;
      },
      zoomOut(from = 26, dur = 1.5) {
        camFrom = from;
        camDur = dur;
        camElapsed = 0;
        env.camera.k = from;
        env.camera.progress = 0;
      },
    },
    qualidade: {
      ler: () => ({
        q,
        limite,
        ideal: limite === null ? null : limite * MARGEM,
        manual: manual !== null,
        densidade: env.densidade,
        escala: env.dpr,
        fps: economia ? 30 : 60,
        consumo: consumoMedido,
      }),
      calibrar(c) {
        env.calibrando = true;
        /**
         * Mexer num piso põe a cena nele, senão não se vê nada: numa máquina que
         * aguenta, o nível fica perto de 1, onde a densidade e a resolução estão
         * cheias e os pisos não valem. O da densidade vai a `Q_RES` (densidade no
         * piso, resolução cheia) e o da resolução a 0 (os dois no piso).
         */
        if (c.densidade !== undefined) {
          pisoDensidade = Math.min(1, Math.max(0, c.densidade));
          manual = Q_RES;
        }
        if (c.escala !== undefined) {
          pisoEscala = Math.min(MAX_DPR, Math.max(0.25, c.escala));
          manual = 0;
        }
        if (c.trinta !== undefined) economia = c.trinta;
        anterior = null;
        aplicar(manual ?? q, true);
      },
      fixar(v) {
        manual = v === null ? null : Math.min(1, Math.max(0, v));
        anterior = null;
        if (manual !== null) {
          // escolher é aceitar o custo: nem a taxa de quadros cai por conta própria
          economia = false;
          aplicar(manual);
          return;
        }
        // de volta à cena: ela recomeça a julgar do nível em que está, sem o teto de antes
        teto = 1;
        desceu = false;
        aplicar(q);
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
