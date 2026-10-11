import { type RefObject, useEffect, useRef } from 'react';
import { useReducedMotion } from '~/hooks/useReducedMotion';
import type { Nos } from './modelo';

/*
 * As regras do jogo. O Minecraft anda em ticks de 50ms, e a física do empurrão,
 * a queda da morte e o balanço dos membros são contas por tick: aqui também.
 */
const TICK = 50;
/** 20 de vida, dez corações. */
export const VIDA = 20;
/** Um coração por golpe (o soco do jogo tira meio: vinte cliques seria demais). */
const DANO = 2;
/** Depois de um golpe o jogador fica 10 ticks sem levar outro. */
const INVULNERAVEL = 10 * TICK;
/**
 * A força do empurrão. O soco do jogo é 0,4; aqui é metade, para o empurrão
 * caber no palco. É o botão de calibrar: a conta em volta é a do jogo.
 */
const FORCA = 0.2;
const GRAVIDADE = 0.08;
const ARRASTO_AR = 0.98;
/** O atrito do movimento de lado: no ar, e no chão (o 0,6 do bloco vezes 0,91). */
const ATRITO_AR = 0.91;
const ATRITO_CHAO = 0.546;
/** A aceleração do andar, que no teto dá os 4,317 m/s de quem anda no jogo. */
const ANDAR = 0.18;
/** Um bloco tem 16 texels. */
const BLOCO = 16;
/** A morte leva 20 ticks do golpe ao sumiço. */
const MORTE = 20;
const RENASCE = 1500;
/** Quanto o corpo vira por tick quando volta a encarar quem bateu. */
const VIRA = 18;

/**
 * O repertório de gestos. Cada nome é um valor de `data-gesto`, e a animação
 * dele mora no CSS. Os da chegada são sorteados quando ele aparece; os ociosos,
 * de tempos em tempos, com ele parado. `pular` é o único que não é CSS: é um
 * pulo de verdade, pela física do empurrão.
 */
const CHEGADA = ['acenar'] as const;
const OCIOSOS = ['espreguicar', 'pular'] as const;
/** De quanto em quanto tempo ele faz um gesto ocioso, e dá uma olhada em volta. */
const OCIO: Faixa = [9000, 18000];
const OLHAR: Faixa = [2500, 6000];
/** Com o ponteiro parado há este tempo, ele para de segui-lo e olha por conta própria. */
const PONTEIRO_PARADO = 4000;
/** O pulo ocioso tem a força do empurrão (o do jogo é 0,42, e passaria da placa do nome). */
const PULINHO = 0.2;
/** Quanto ele agacha antes de pular (`agacha`, no CSS). */
const AGACHA = 150;

/*
 * O que o Actions & Stuff põe por cima do andar do jogo: o corpo inclina para
 * onde vai, quica a cada passo, e os braços abrem no ar.
 */
/** Graus de inclinação por bloco/tick: uns 6° andando, e outros tantos para trás no empurrão. */
const INCLINA = 30;
/** A altura do quique do passo, em texels. */
const QUIQUE = 0.8;
/** Graus que cada braço abre por texel de altura. */
const ABRE = 4;

/*
 * A maçã dourada. Machucado e deixado em paz, ele come uma, e a vida volta aos
 * poucos, como a Regeneração do jogo. Os números são calibrados para a cena: no
 * jogo a maçã devolve 4 de vida em 5s, e aqui um golpe tira 2.
 */
/** Quanto tempo sem apanhar até ele comer. */
const ESPERA_COMER = 3500;
/** A duração de comer (`--comer`, no CSS). */
const COMER = 2400;
/** Quanto uma maçã devolve: quatro corações. */
const MACA = 8;
/** Ticks por meio coração devolvido. */
const REGENERA = 6;
/** O intervalo até a próxima maçã, se uma não bastou. */
const OUTRA_MACA = 1200;

/** Para onde o corpo olha sem ninguém apontando: um pouco de lado, para o 3D aparecer. */
const REPOUSO = 18;
/** Quanto do giro da cabeça o tronco acompanha. */
const TRONCO = 0.25;
/** A distância do olho à tela, em px: quanto maior, menos a cabeça vira. */
const ALCANCE = 420;
const MOLA = 0.14;
/** A mola do olhar solto: ele olha em volta mais devagar do que segue o ponteiro. */
const MOLA_SOLTA = 0.05;
/** Graus de giro por px de arraste. */
const GIRO_POR_PX = 0.8;
/** O gesto espera a chegada do fundo assentar (`chega`, em `Boneco.module.css`). */
const ESPERA_GESTO = 700;
/** Quanto tempo a vida fica à vista depois do último golpe. */
const VIDA_A_VISTA = 3000;

type Faixa = [number, number];
const entre = ([a, b]: Faixa) => a + Math.random() * (b - a);
const limitar = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const graus = (rad: number) => (rad * 180) / Math.PI;
/** Um ângulo qualquer, trazido para entre -180 e 180. */
const meiaVolta = (a: number) => ((((a + 180) % 360) + 360) % 360) - 180;
const px = (n: number) => `calc(var(--px) * ${n.toFixed(3)})`;

/**
 * Reinicia uma animação de CSS ligada por atributo: tirar e pôr de volta no
 * mesmo quadro não a reinicia, o reflow no meio sim.
 */
function religar(el: HTMLElement, atributo: string, valor = '') {
  el.removeAttribute(atributo);
  void el.offsetWidth;
  el.setAttribute(atributo, valor);
}

/**
 * O comportamento do boneco: o olhar, o arraste, os gestos, o golpe, a vida, a
 * maçã e a morte. É um hook à parte porque é quase todo o boneco, e o componente fica
 * com o desenho.
 *
 * Os atributos que ele escreve no palco são o contrato com o CSS
 * (`Boneco.module.css`): `data-visto` (chegou), `data-gesto` (qual gesto),
 * `data-acao` (o que ele faz com a mão: hoje, `comer`), `data-agacha` e
 * `data-pouso` (antes e depois do pulo), `data-ferido` (o vermelho),
 * `data-morto` (a fumaça); nos corações,
 * `data-mostra`, `data-pisca` e `data-v` em cada um.
 */
export function useComportamento(
  palco: RefObject<HTMLDivElement | null>,
  vida: RefObject<HTMLSpanElement | null>,
  nos: Nos,
  ativo: boolean,
) {
  /** o giro do arraste; sobrevive às voltas da seção */
  const orbita = useRef(0);
  const reduzido = useReducedMotion();

  useEffect(() => {
    const el = palco.current;
    const coracoes = vida.current;
    const { corpo, cabeca, bracoD, bracoE, pernaD, pernaE } = nos;
    if (!el || !coracoes || !corpo.current || !cabeca.current) return;

    // o olhar
    let yaw = REPOUSO;
    let pitch = 0;
    let alvoYaw = REPOUSO;
    let alvoPitch = 0;
    let mola = MOLA;
    let ultimoPonteiro = -Infinity;
    // o corpo virando de volta para quem bateu
    let virarPara: number | null = null;
    // a física, em blocos: `z` é a distância para trás, `y` a altura
    let z = 0;
    let y = 0;
    let vz = 0;
    let vy = 0;
    let fase: 'parado' | 'voando' | 'voltando' = 'parado';
    // o balanço dos membros (limbSwing e limbSwingAmount, no jogo)
    let balanco = 0;
    let amplitude = 0;
    // o tick anterior, para desenhar entre os dois
    let antes = { z, y, vz, balanco, amplitude };
    let pontos = VIDA;
    // a maçã: comendo, a cabeça volta para a frente (`frente`, de 0 a 1)
    let comendo = false;
    let frente = 0;
    let timerComer = 0;
    /** quanto de vida a maçã ainda devolve, e os ticks desde o último meio coração */
    let regen = 0;
    let contaRegen = 0;
    let ultimoGolpe = -Infinity;
    /** ticks desde a morte; -1 é vivo */
    let morte = -1;

    let quadro = 0;
    let acumulado = 0;
    let relogio = 0;
    let visivel = false;
    let arraste: { x: number; andou: boolean } | null = null;
    const timers = new Set<number>();
    const depois = (ms: number, f: () => void) => {
      const t = window.setTimeout(() => {
        timers.delete(t);
        f();
      }, ms);
      timers.add(t);
      return t;
    };
    let esconderVida = 0;

    const pintar = (fracao: number) => {
      const zi = antes.z + (z - antes.z) * fracao;
      const yi = antes.y + (y - antes.y) * fracao;
      const vzi = antes.vz + (vz - antes.vz) * fracao;
      // o andar do jogo (HumanoidModel): pernas a 1,4 da amplitude, braços a 1, em oposição
      const f = (antes.balanco + (balanco - antes.balanco) * fracao) * 0.6662;
      const a = antes.amplitude + (amplitude - antes.amplitude) * fracao;
      // cada passo levanta o corpo, e ele inclina para onde vai (na tela, não no corpo)
      const quique = Math.abs(Math.sin(f)) * a * QUIQUE;
      /**
       * De costas, a mira se espelha. `yaw` é o ângulo do ponteiro visto da
       * tela, e de frente a cabeça mira nele; de costas o ponteiro está atrás
       * dele, e mirar no ângulo da tela o prenderia no limite do pescoço. Aí a
       * cabeça vira para o lado da tela em que o ponteiro está (180° − yaw), e o
       * tronco acompanha para o mesmo lado.
       */
      const base = REPOUSO + orbita.current;
      const deCostas = Math.abs(meiaVolta(base)) > 90;
      const t = base + (deCostas ? -1 : 1) * (yaw - REPOUSO) * TRONCO;
      const mira = deCostas ? 180 - yaw : yaw;
      // a queda da morte é a do jogo: raiz do tempo, até 90° de lado
      const queda =
        morte < 0 ? 0 : Math.min(1, Math.sqrt(Math.max(0, ((morte + fracao - 1) / 20) * 1.6))) * 90;
      corpo.current!.style.transform = `rotateX(-10deg) translate3d(0, ${px(
        -yi * BLOCO - quique,
      )}, ${px(-zi * BLOCO)}) rotateX(${(vzi * INCLINA).toFixed(2)}deg) rotateY(${t.toFixed(
        2,
      )}deg) rotateZ(${queda.toFixed(2)}deg)`;
      // a cabeça mira no ângulo do mundo, mas não passa de 70° do corpo; comendo, olha para a maçã
      const solta = 1 - frente;
      const c = limitar(meiaVolta(mira - t), -70, 70) * solta;
      cabeca.current!.style.transform = `rotateY(${c.toFixed(2)}deg) rotateX(${(pitch * solta).toFixed(2)}deg)`;
      const rad = (v: number) => `rotateX(${graus(v).toFixed(2)}deg)`;
      // no ar os braços abrem, cada um para o seu lado
      const abre = (yi * BLOCO * ABRE).toFixed(2);
      if (pernaD.current) pernaD.current.style.transform = rad(Math.cos(f) * 1.4 * a);
      if (pernaE.current) pernaE.current.style.transform = rad(Math.cos(f + Math.PI) * 1.4 * a);
      if (bracoD.current) {
        bracoD.current.style.transform = `rotateZ(${abre}deg) ${rad(Math.cos(f + Math.PI) * a)}`;
      }
      if (bracoE.current) {
        bracoE.current.style.transform = `rotateZ(-${abre}deg) ${rad(Math.cos(f) * a)}`;
      }
    };

    const tick = () => {
      antes = { z, y, vz, balanco, amplitude };
      const z0 = z;
      if (fase === 'voando') {
        z += vz;
        y += vy;
        vy = (vy - GRAVIDADE) * ARRASTO_AR;
        if (y <= 0 && vy < 0) {
          // só assenta quem vinha do ar: escorregando no chão, a conta passa aqui a cada tick
          if (antes.y > 0 && !reduzido) religar(el, 'data-pouso');
          y = vy = 0;
        }
        vz *= y === 0 ? ATRITO_CHAO : ATRITO_AR;
        if (y === 0 && Math.abs(vz) < 0.003) {
          vz = 0;
          fase = 'voltando';
        }
      } else if (fase === 'voltando') {
        vz = (vz - ANDAR) * ATRITO_CHAO;
        z += vz;
        if (z <= 0) {
          z = vz = 0;
          fase = 'parado';
        }
      }
      // o jogo balança os membros pelo quanto o corpo andou no tick
      amplitude += (Math.min(1, Math.abs(z - z0) * 4) - amplitude) * 0.4;
      balanco += amplitude;
      if (virarPara !== null) {
        const d = virarPara - orbita.current;
        orbita.current += limitar(d, -VIRA, VIRA);
        if (Math.abs(d) <= VIRA) virarPara = null;
      }
      if (morte >= 0 && morte < MORTE) {
        morte += 1;
        if (morte === MORTE) sumir();
      }
      if (regen > 0 && ++contaRegen >= REGENERA) {
        contaRegen = 0;
        regen -= 1;
        pontos = Math.min(VIDA, pontos + 1);
        mostrarVida(false);
        if (pontos === VIDA) regen = 0;
        else if (regen === 0) agendarComer(OUTRA_MACA);
      }
    };

    const andando = () =>
      Math.abs(alvoYaw - yaw) + Math.abs(alvoPitch - pitch) > 0.05 ||
      fase !== 'parado' ||
      amplitude > 0.005 ||
      virarPara !== null ||
      regen > 0 ||
      Math.abs((comendo ? 1 : 0) - frente) > 0.01 ||
      (morte >= 0 && morte < MORTE);

    const passo = (agora: number) => {
      acumulado += Math.min(250, agora - (relogio || agora));
      relogio = agora;
      while (acumulado >= TICK) {
        tick();
        acumulado -= TICK;
      }
      yaw += (alvoYaw - yaw) * mola;
      pitch += (alvoPitch - pitch) * mola;
      frente += ((comendo ? 1 : 0) - frente) * 0.18;
      pintar(acumulado / TICK);
      if (andando()) quadro = requestAnimationFrame(passo);
      else {
        quadro = 0;
        relogio = 0;
      }
    };
    const acordar = () => {
      if (!quadro) quadro = requestAnimationFrame(passo);
    };

    const sortear = <T,>(lista: readonly T[]) => lista[Math.floor(Math.random() * lista.length)];
    const gesto = () => {
      if (reduzido || morte >= 0 || comendo) return;
      religar(el, 'data-gesto', sortear(CHEGADA));
    };

    /** De pé, à vista, e sem nada em curso: é quando ele faz as coisas por conta própria. */
    const livre = () =>
      visivel &&
      !arraste &&
      morte < 0 &&
      fase === 'parado' &&
      !comendo &&
      !el.hasAttribute('data-gesto') &&
      !el.hasAttribute('data-agacha');

    // sem ponteiro para seguir (parado, fora da página, ou no toque), ele olha em volta
    const olharSolto = () => {
      depois(entre(OLHAR), olharSolto);
      if (!livre() || performance.now() - ultimoPonteiro < PONTEIRO_PARADO) return;
      mola = MOLA_SOLTA;
      const volta = Math.random() < 0.35;
      alvoYaw = volta ? REPOUSO : REPOUSO + (Math.random() * 2 - 1) * 40;
      alvoPitch = volta ? 0 : (Math.random() * 2 - 1) * 12;
      acordar();
    };

    const pular = () => {
      religar(el, 'data-agacha');
      depois(AGACHA, () => {
        el.removeAttribute('data-agacha');
        if (morte >= 0 || fase !== 'parado') return;
        vy = PULINHO;
        fase = 'voando';
        acordar();
      });
    };

    const ocio = () => {
      depois(entre(OCIO), ocio);
      if (!livre() || regen > 0 || pontos < VIDA) return;
      const g = sortear(OCIOSOS);
      if (g === 'pular') pular();
      else religar(el, 'data-gesto', g);
    };

    // a maçã
    const agendarComer = (ms: number) => {
      clearTimeout(timerComer);
      timerComer = depois(ms, comer);
    };
    const comer = () => {
      if (morte >= 0 || pontos >= VIDA) return;
      // ocupado ou fora de vista, ele come depois
      if (!livre() || regen > 0) return agendarComer(800);
      const cura = () => {
        comendo = false;
        el.removeAttribute('data-acao');
        regen = MACA;
        contaRegen = 0;
        acordar();
      };
      // sem movimento não há mordidas: a vida só volta
      if (reduzido) return cura();
      comendo = true;
      religar(el, 'data-acao', 'comer');
      acordar();
      timerComer = depois(COMER, cura);
    };
    /** Um golpe no meio da mordida: a maçã se perde. */
    const largar = () => {
      clearTimeout(timerComer);
      comendo = false;
      el.removeAttribute('data-acao');
    };

    // a vida: dez corações, cada um cheio, meio ou vazio; no golpe eles piscam
    const mostrarVida = (pisca = true) => {
      Array.from(coracoes.children).forEach((c, i) => {
        const resto = pontos - i * 2;
        (c as HTMLElement).dataset.v = resto >= 2 ? 'cheio' : resto === 1 ? 'meio' : 'vazio';
      });
      coracoes.setAttribute('data-mostra', '');
      if (pisca && !reduzido) religar(coracoes, 'data-pisca');
      clearTimeout(esconderVida);
      esconderVida = depois(VIDA_A_VISTA, () => coracoes.removeAttribute('data-mostra'));
    };

    const sumir = () => {
      el.setAttribute('data-morto', '');
      coracoes.removeAttribute('data-mostra');
      depois(RENASCE, renascer);
    };

    const renascer = () => {
      pontos = VIDA;
      morte = -1;
      z = y = vz = vy = 0;
      fase = 'parado';
      antes = { z, y, vz, balanco, amplitude };
      el.removeAttribute('data-morto');
      el.removeAttribute('data-ferido');
      pintar(0);
      // renasce como chegou: do fundo, e com um gesto
      religar(el, 'data-visto');
      depois(ESPERA_GESTO, gesto);
    };

    const golpe = () => {
      const agora = performance.now();
      if (morte >= 0 || agora - ultimoGolpe < INVULNERAVEL) return;
      ultimoGolpe = agora;
      pontos = Math.max(0, pontos - DANO);
      mostrarVida();
      // o vermelho do dano dura o mesmo que a invulnerabilidade; morrendo, fica
      religar(el, 'data-ferido');
      if (pontos > 0) depois(INVULNERAVEL, () => el.removeAttribute('data-ferido'));
      // o gesto em curso para: quem apanha não termina de acenar, nem de comer
      el.removeAttribute('data-gesto');
      largar();
      if (pontos > 0) agendarComer(ESPERA_COMER);
      else regen = 0;
      // de costas, ele vira para quem bateu, pelo lado mais curto
      if (Math.abs(meiaVolta(orbita.current + REPOUSO)) > 90) {
        virarPara = orbita.current - meiaVolta(orbita.current);
      }
      if (pontos === 0) {
        morte = 0;
        if (reduzido) {
          morte = MORTE;
          sumir();
        }
      } else if (!reduzido) {
        // o empurrão do jogo: metade da velocidade que havia, mais a força
        vz = vz / 2 + FORCA;
        if (y === 0) vy = Math.min(0.4, vy / 2 + FORCA);
        fase = 'voando';
      }
      acordar();
    };

    const baixar = (e: PointerEvent) => {
      arraste = { x: e.clientX, andou: false };
      el.setPointerCapture(e.pointerId);
    };
    const arrastar = (e: PointerEvent) => {
      if (!arraste) return;
      const dx = e.clientX - arraste.x;
      if (!arraste.andou && Math.abs(dx) < 4) return;
      arraste.andou = true;
      arraste.x = e.clientX;
      virarPara = null;
      orbita.current += dx * GIRO_POR_PX;
      acordar();
    };
    const soltar = () => {
      // sem arraste, soltar é o fim de um clique: um golpe
      if (arraste && !arraste.andou) golpe();
      arraste = null;
    };
    const cancelar = () => {
      arraste = null;
    };

    const mover = (e: PointerEvent) => {
      if (!visivel || arraste || morte >= 0 || e.pointerType === 'touch') return;
      // o pivô da cabeça é o pescoço: um ponto, que o navegador já projeta na tela
      const r = cabeca.current!.getBoundingClientRect();
      mola = MOLA;
      ultimoPonteiro = performance.now();
      alvoYaw = limitar(graus(Math.atan2(e.clientX - r.left, ALCANCE)), -70, 70);
      alvoPitch = limitar(-graus(Math.atan2(e.clientY - r.top, ALCANCE)), -40, 40);
      acordar();
    };
    const sair = () => {
      ultimoPonteiro = -Infinity;
      alvoYaw = REPOUSO;
      alvoPitch = 0;
      acordar();
    };

    const olho = new IntersectionObserver(
      ([visto]) => {
        visivel = visto.isIntersecting;
        if (!visivel || el.hasAttribute('data-visto')) return;
        el.setAttribute('data-visto', '');
        depois(reduzido ? 0 : ESPERA_GESTO, gesto);
      },
      { threshold: 0.6 },
    );

    pintar(0);
    if (ativo) {
      olho.observe(el);
      el.addEventListener('pointerdown', baixar);
      el.addEventListener('pointermove', arrastar);
      el.addEventListener('pointerup', soltar);
      el.addEventListener('pointercancel', cancelar);
      if (!reduzido) {
        window.addEventListener('pointermove', mover, { passive: true });
        document.documentElement.addEventListener('pointerleave', sair);
        depois(entre(OLHAR), olharSolto);
        depois(entre(OCIO), ocio);
      }
    }

    return () => {
      olho.disconnect();
      el.removeEventListener('pointerdown', baixar);
      el.removeEventListener('pointermove', arrastar);
      el.removeEventListener('pointerup', soltar);
      el.removeEventListener('pointercancel', cancelar);
      window.removeEventListener('pointermove', mover);
      document.documentElement.removeEventListener('pointerleave', sair);
      timers.forEach(clearTimeout);
      cancelAnimationFrame(quadro);
      // fora de cena ele volta inteiro, e a próxima visita chega de novo
      for (const a of [
        'data-visto',
        'data-gesto',
        'data-acao',
        'data-agacha',
        'data-pouso',
        'data-ferido',
        'data-morto',
      ]) {
        el.removeAttribute(a);
      }
      coracoes.removeAttribute('data-mostra');
    };
  }, [ativo, reduzido, nos, palco, vida]);
}
