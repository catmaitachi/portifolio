import { useCallback, useEffect, useRef } from 'react';
import styles from './Faiscas.module.css';

/**
 * Quantos riscos saem de cada estalo.
 *
 * O estalo é **discreto de propósito**, e ficou menor quando passou a repetir em
 * laço: o que se vê uma vez precisa ser grande para ser visto, e o que volta a
 * cada dois segundos precisa ser pequeno para não cansar.
 *
 * Eles se espalham num **meio leque para baixo**, e não em volta do ponto: o
 * estalo nasce na borda de baixo do nome, então metade dos riscos passaria por
 * cima do texto, que é justamente o que se quer que seja lido. Para baixo há o
 * respiro entre o cabeçalho e o conteúdo, e o gesto ainda aponta para o lugar
 * certo, porque sai de dentro dele.
 */
const QUANTAS = 9;

/** Comprimento inicial de cada risco, em px. Ele encurta enquanto se afasta. */
const TAMANHO = 12;

/** Até onde os riscos viajam a partir do centro do estalo, em px. */
const RAIO = 24;

/** Quanto dura um estalo, em ms. */
const DURACAO = 620;

/**
 * O quanto o canvas passa de cada borda do elemento que o hospeda, em px.
 *
 * Sem essa folga os riscos seriam cortados na caixa do cabeçalho, que tem a
 * altura de uma linha de texto: o estalo nasce no meio dela e viaja para fora.
 * O canvas não recebe ponteiro, então esticá-lo não cobre nada.
 *
 * O número acompanha `RAIO + TAMANHO`, com sobra: é até ali que a ponta mais
 * distante de um risco chega.
 */
const FOLGA = 52;

interface Faisca {
  x: number;
  y: number;
  angulo: number;
  nascida: number;
}

interface FaiscasProps {
  /**
   * Um contador: cada valor novo acende um estalo sob o elemento, sem clique
   * nenhum. É por aqui que o convite chama a atenção para o cabeçalho.
   */
  disparo?: number;
}

/**
 * Estalos de luz sobre o elemento que hospeda este canvas.
 *
 * Adaptado do `ClickSpark` do React Bits, e o nome do original já não descreve o
 * que ele faz aqui: **o clique não acende nada**. O estalo é um convite, e
 * repeti-lo em cada clique o transformaria em retorno de gesto — um efeito que
 * acompanha o dedo do visitante o tempo todo, no canto onde o olho cai primeiro,
 * e que não estaria dizendo mais nada depois da primeira vez.
 *
 * Ele desenha riscos de 1px saindo de um ponto e encurtando enquanto se afastam,
 * o que cabe na régua da página sem trazer forma nova nenhuma: é a mesma
 * gramática de linha fina do HUD e do medidor.
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
 *   uma linha e o estalo nasce no meio dela;
 * - **o risco fica aceso quase até o fim.** No original a opacidade cai junto
 *   com a curva de saída, que sobe rápido no começo, então o estalo nasce a meio
 *   brilho justamente quando o risco é maior. Aqui ele vive em branco cheio e só
 *   se apaga no último terço.
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

  /**
   * Acende um estalo na borda de baixo do elemento, espalhado para baixo.
   *
   * O ponto não é o centro do canvas: o canvas é maior que o hospedeiro nos
   * quatro lados, e o que interessa é a linha onde o texto termina.
   */
  const acender = useCallback(() => {
    const canvas = canvasRef.current;
    const hospedeiro = canvas?.parentElement;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !hospedeiro || !ctx) return;

    const x = canvas.clientWidth / 2;
    const y = FOLGA + hospedeiro.clientHeight;
    const agora = performance.now();
    for (let i = 0; i < QUANTAS; i++) {
      // meio leque, de uma ponta à outra da horizontal, passando pelo que desce
      const angulo = (Math.PI * (i + 0.5)) / QUANTAS;
      vivasRef.current.push({ x, y, angulo, nascida: agora });
    }
    if (lacoRef.current) return;

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
        const comprimento = TAMANHO * (1 - e * 0.72);
        const cos = Math.cos(f.angulo);
        const sen = Math.sin(f.angulo);

        /**
         * O risco fica **aceso quase até o fim** e apaga no último terço.
         *
         * Com a opacidade caindo junto com a curva de saída, o estalo já nascia
         * a meio brilho: `e` sobe rápido no começo, que é justamente quando o
         * risco é maior e deveria ser mais visível. Aqui ele vive em branco
         * cheio e só se apaga quando já está longe e curto.
         */
        ctx.globalAlpha = Math.min(1, 3 * (1 - p));
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

  /** O convite: um estalo sob o nome, sem ninguém ter clicado. */
  useEffect(() => {
    if (!disparo) return;
    acender();
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
