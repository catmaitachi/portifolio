import { useCallback, useEffect, useRef } from 'react';
import styles from './Faiscas.module.css';

/** Quantos riscos saem de cada estalo, igualmente espaçados em volta do ponto. */
const QUANTAS = 8;

/** Comprimento inicial de cada risco, em px. Ele encurta enquanto se afasta. */
const TAMANHO = 9;

/** Até onde os riscos viajam a partir do centro do estalo, em px. */
const RAIO = 17;

/** Quanto dura um estalo, em ms. */
const DURACAO = 480;

/**
 * O quanto o canvas passa de cada borda do elemento que o hospeda, em px.
 *
 * Sem essa folga os riscos seriam cortados na caixa do cabeçalho, que tem a
 * altura de uma linha de texto: o estalo nasce no meio dela e viaja para fora.
 * O canvas não recebe ponteiro, então esticá-lo não cobre nada.
 */
const FOLGA = 44;

interface Faisca {
  x: number;
  y: number;
  angulo: number;
  nascida: number;
}

interface FaiscasProps {
  /**
   * Um contador: cada valor novo acende um estalo no **centro** do elemento,
   * sem clique nenhum. É por aqui que o convite chama a atenção para o cabeçalho.
   */
  disparo?: number;
}

/**
 * Estalos de luz sobre o elemento que hospeda este canvas.
 *
 * Adaptado do `ClickSpark` do React Bits. Ele desenha alguns riscos de 1px
 * saindo do ponto clicado e encurtando enquanto se afastam, o que cabe na régua
 * da página sem trazer forma nova nenhuma: é a mesma gramática de linha fina do
 * HUD e do medidor.
 *
 * Ele existe por causa de um problema real: **o nome do modo no topo não parece
 * clicável**. É texto, sem moldura e sem ícone, e quem não passa o ponteiro por
 * cima dele não descobre que ali se troca o lado do site. O estalo automático
 * aponta para o lugar sem escrever nada e sem cobrir nada, o que é o oposto do
 * aviso que a página tinha e perdeu de propósito.
 *
 * **Não é o componente original.** Três coisas mudaram, e nenhuma é estética:
 *
 * - **o laço só corre enquanto há faísca viva.** O original mantém um `rAF`
 *   eterno limpando um canvas vazio, e o contrato de desempenho do projeto é que
 *   o que está desligado custe zero (ver `motor.md`). Aqui o laço começa no
 *   primeiro estalo e para sozinho quando o último apaga;
 * - **o canvas respeita o DPR**, com teto 2, como o palco da cena. Sem isso um
 *   risco de 1px vira um borrão de meio pixel em tela retina, que é o oposto do
 *   que a página faz com todas as outras linhas;
 * - **ele transborda o elemento** (`FOLGA`), porque o cabeçalho tem a altura de
 *   uma linha e o estalo nasce no meio dela.
 *
 * O canvas é irmão do conteúdo, e não um embrulho em volta dele: um `<div>` a
 * mais mudaria a caixa do `<nav>` que o hospeda, e é essa caixa que o HUD
 * posiciona. Ele se mede sozinho, então quem o usa só precisa ser um contexto
 * de posicionamento.
 */
export function Faiscas({ disparo = 0 }: FaiscasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const vivasRef = useRef<Faisca[]>([]);
  const lacoRef = useRef(0);

  /** Acende um estalo em coordenadas do canvas. */
  const acender = useCallback((x: number, y: number) => {
    const agora = performance.now();
    for (let i = 0; i < QUANTAS; i++) {
      vivasRef.current.push({ x, y, angulo: (2 * Math.PI * i) / QUANTAS, nascida: agora });
    }
    if (lacoRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const quadro = (agora: number) => {
      // em pixels de CSS, que é o sistema em que a matriz do DPR deixou o laço
      ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);

      vivasRef.current = vivasRef.current.filter((f) => {
        const passado = agora - f.nascida;
        if (passado >= DURACAO) return false;

        const p = passado / DURACAO;
        // `ease-out`: o risco salta e desacelera, que é como uma faísca apaga
        const e = p * (2 - p);
        const distancia = e * RAIO;
        const comprimento = TAMANHO * (1 - e);
        const cos = Math.cos(f.angulo);
        const sen = Math.sin(f.angulo);

        ctx.globalAlpha = 1 - e;
        ctx.beginPath();
        ctx.moveTo(f.x + distancia * cos, f.y + distancia * sen);
        ctx.lineTo(f.x + (distancia + comprimento) * cos, f.y + (distancia + comprimento) * sen);
        ctx.stroke();
        return true;
      });

      // sem faísca viva o laço para, e o canvas fica limpo até o próximo estalo
      lacoRef.current = vivasRef.current.length ? requestAnimationFrame(quadro) : 0;
    };

    lacoRef.current = requestAnimationFrame(quadro);
  }, []);

  /**
   * O tamanho do canvas acompanha o elemento que o hospeda, mais a folga.
   *
   * A matriz é montada aqui, uma vez por redimensionamento, e o laço de desenho
   * trabalha em pixels de CSS — é o arranjo do palco da cena, pela mesma razão:
   * o `scale` do DPR não pode entrar na conta de cada quadro.
   */
  useEffect(() => {
    const canvas = canvasRef.current;
    const hospedeiro = canvas?.parentElement;
    if (!canvas || !hospedeiro) return;

    const medir = () => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const l = hospedeiro.clientWidth + FOLGA * 2;
      const a = hospedeiro.clientHeight + FOLGA * 2;
      canvas.width = Math.round(l * dpr);
      canvas.height = Math.round(a * dpr);
      canvas.style.width = `${l}px`;
      canvas.style.height = `${a}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1;
    };

    medir();
    const observador = new ResizeObserver(medir);
    observador.observe(hospedeiro);
    return () => observador.disconnect();
  }, []);

  /** Clique no elemento hospedeiro: o estalo nasce onde o ponteiro estava. */
  useEffect(() => {
    const canvas = canvasRef.current;
    const hospedeiro = canvas?.parentElement;
    if (!canvas || !hospedeiro) return;

    const aoClicar = (e: MouseEvent) => {
      const r = canvas.getBoundingClientRect();
      acender(e.clientX - r.left, e.clientY - r.top);
    };

    hospedeiro.addEventListener('click', aoClicar);
    return () => hospedeiro.removeEventListener('click', aoClicar);
  }, [acender]);

  /** O convite: um estalo no centro, sem ninguém ter clicado. */
  useEffect(() => {
    if (!disparo) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    acender(canvas.clientWidth / 2, canvas.clientHeight / 2);
  }, [disparo, acender]);

  // o laço vive fora do React: sem esta limpeza ele sobreviveria à desmontagem
  useEffect(
    () => () => {
      if (lacoRef.current) cancelAnimationFrame(lacoRef.current);
    },
    [],
  );

  return <canvas ref={canvasRef} className={styles.faiscas} aria-hidden="true" />;
}
