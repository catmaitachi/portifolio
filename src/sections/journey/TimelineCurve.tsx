import { useId, useState } from 'react';
import type { Experiencia } from '~/content';
import { useT } from '~/i18n/useLanguage';
import styles from './TimelineCurve.module.css';
import {
  CAMINHO,
  corteAte,
  cxA,
  cyA,
  dentroDaJanela,
  PASSO,
  VIEW_H,
  VIEW_W,
} from './timelineGeometry';
import type { Timeline } from './useTimeline';

/** Defasagem dos pulsos que viajam pela curva, em segundos. */
const PULSOS = ['-0.5s', '0s', '-13s', '-26s'] as const;
const DURACAO_PULSO = '39s';

interface TimelineCurveProps {
  lista: Experiencia[];
  linha: Timeline;
  /** seção ativa: dispara a entrada — a onda corre e os nós acendem atrás dela */
  ativo: boolean;
}

/**
 * Curva do tempo: a onda, o preenchimento até o evento ativo e os nós.
 *
 * Os nós são **botões HTML por cima do SVG**, não `<circle>`: precisam de área de
 * toque de 38px, foco de teclado e um rótulo de texto que não estica junto com o
 * `preserveAspectRatio="none"`. Ficam posicionados em `left/top` como % do mesmo
 * viewBox, então acompanham a curva em qualquer largura.
 *
 * As setas ←/→ **não** são tratadas aqui: quem escuta é a seção, na janela
 * (`useArrowKeys`), para que funcionem com ou sem foco na curva. Um segundo
 * handler local só criaria a chance de um passo duplo.
 *
 * São **duas** ondas: a principal e a mesma curva espelhada no eixo, bem mais
 * apagada. Elas se movem sempre em sentidos opostos — na entrada da seção, em
 * que giram e freiam, e na navegação, em que a janela desloca uma para cada
 * lado. Os nós acendem atrás delas, um a um; o `--i` de cada nó é a posição dele
 * **na janela**, não o índice na lista, porque contar os que estão fora deixaria
 * buracos no ritmo.
 */
export function TimelineCurve({ lista, linha, ativo }: TimelineCurveProps) {
  const t = useT();
  const { janela, ativa, arrastando } = linha;

  /**
   * Entrada da seção ou passo no tempo?
   *
   * Só isso: o cintilar do ponto é reiniciado pelo próprio CSS, quando o nó
   * ganha `data-frente` — uma animação que passa de `none` para um nome começa
   * do zero, sem `key`, sem remontagem e sem contador. O que o componente ainda
   * precisa decidir é **quando** ela deve rodar: na entrada os pontos esperam as
   * ondas passarem; num passo no tempo, a resposta é imediata.
   *
   * O estado é derivado durante o render (padrão do React para "mudou a prop,
   * ajusta o estado"): o React descarta a saída e re-renderiza na hora, sem
   * pintar o quadro intermediário e sem um efeito a mais.
   */
  const [fase, setFase] = useState({ entrando: true, ativo, ativa });
  if (fase.ativo !== ativo || fase.ativa !== ativa) {
    setFase({ entrando: ativo && !fase.ativo, ativo, ativa });
  }
  // id único: um `clipPath` com id fixo colidiria se a seção fosse montada duas vezes
  const corteId = `${useId()}-corte`;

  // durante o arraste as transições saem do caminho, senão a curva ficaria
  // sempre um passo atrás do dedo
  const transicaoGrupo = arrastando ? 'none' : 'transform .85s cubic-bezier(.22,.86,.2,1)';
  const transicaoCorte = arrastando ? 'none' : 'transform .95s cubic-bezier(.22,.86,.2,1)';

  return (
    <div
      ref={linha.curvaRef}
      className={styles.curva}
      style={
        {
          /* na entrada os pontos esperam as ondas e vêm em fila; num passo, não */
          '--pisca': fase.entrando ? '980ms' : '0ms',
          '--fila': fase.entrando ? '90ms' : '0ms',
        } as React.CSSProperties
      }
      data-arrastavel={janela.maxDesl > 0 || undefined}
      data-arrastando={arrastando || undefined}
      data-entrada={ativo || undefined}
      role="group"
      aria-label={t.a11y.experiencia}
      tabIndex={0}
    >
      <svg
        className={styles.svg}
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <defs>
          <clipPath id={corteId} clipPathUnits="userSpaceOnUse">
            {/* termina em x=1000; o translate leva a borda até o nó ativo */}
            <rect
              x="-4000"
              y="-400"
              width="5000"
              height="1000"
              style={{
                transform: `translateX(${corteAte(janela.uDe(ativa)).toFixed(1)}px)`,
                transition: transicaoCorte,
              }}
            />
          </clipPath>
        </defs>

        {/**
         * A onda inversa: a mesma curva espelhada no eixo, bem mais apagada.
         *
         * Não há caminho novo para isso — `scaleY(-1)` em torno de y=66 devolve
         * exatamente a onda oposta, e o `d` continua sendo o mesmo objeto que a
         * principal já usa.
         *
         * Ela anda **contra** a principal: a janela desloca uma para um lado e a
         * outra para o outro, então navegar no tempo abre e fecha as duas como
         * um fole. O sinal é o mesmo `janela.shiftX`, com o sinal trocado.
         */}
        <g className={styles.giro} data-lado="inverso">
          <g
            style={{
              transform: `translateX(${(-janela.shiftX).toFixed(1)}px)`,
              transition: transicaoGrupo,
            }}
          >
            <path
              className={styles.inversa}
              d={CAMINHO}
              fill="none"
              stroke="rgba(255,255,255,.05)"
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
            />
          </g>
        </g>

        {/* a onda principal — o grupo de fora é só da entrada, ver o CSS */}
        <g className={styles.giro}>
          <g
            style={{
              transform: `translateX(${janela.shiftX.toFixed(1)}px)`,
              transition: transicaoGrupo,
            }}
          >
            {/* a curva inteira, apagada */}
            <path
              d={CAMINHO}
              fill="none"
              stroke="rgba(255,255,255,.12)"
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
            />
            {/* a mesma curva em branco, cortada na data ativa */}
            <path
              d={CAMINHO}
              clipPath={`url(#${corteId})`}
              fill="none"
              stroke="rgba(255,255,255,.62)"
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
            />

            {/**
             * Os pulsos só existem com a seção ativa. `animateMotion` é SMIL:
             * não responde a `animation-play-state` e o navegador não o pausa
             * por estar fora de vista, então quatro animações de caminho
             * continuariam rodando enquanto o visitante lê outra seção.
             * Desmontá-los é o único jeito de pararem — e ao voltar reiniciam
             * junto com a entrada.
             */}
            {ativo ? (
              <>
                {/* um anel maior à frente dos pontos, para o pulso ter volume */}
                <circle r="7" fill="none" stroke="rgba(255,255,255,.16)" strokeWidth="1" vectorEffect="non-scaling-stroke">
                  <animateMotion dur={DURACAO_PULSO} begin={PULSOS[0]} repeatCount="indefinite" path={CAMINHO} />
                </circle>
                {PULSOS.slice(1).map((begin) => (
                  <circle key={begin} r="2.6" fill="#fff" opacity=".8">
                    <animateMotion dur={DURACAO_PULSO} begin={begin} repeatCount="indefinite" path={CAMINHO} />
                  </circle>
                ))}
              </>
            ) : null}
          </g>
        </g>
      </svg>

      {lista.map((e, i) => {
        const u = janela.uDe(i);
        const uTela = janela.uNaTela(i);
        const y = cyA(u);
        const dentro = dentroDaJanela(uTela);
        const naFrente = i === ativa;
        // posição dentro da janela (0..VAGAS-1): o passo é uniforme, então ela
        // sai de `uTela` sem contador nem lista auxiliar por render
        const vaga = Math.round(uTela / PASSO);
        // nó no alto da curva → rótulo embaixo, e vice-versa
        const noAlto = y < VIEW_H / 2;

        return (
          <button
            key={e.key}
            type="button"
            className={styles.no}
            data-frente={naFrente || undefined}
            aria-current={naFrente ? 'true' : undefined}
            aria-label={`${e.periodo} — ${e.cargo}`}
            tabIndex={dentro ? 0 : -1}
            data-dentro={dentro || undefined}
            onClick={() => linha.focar(i)}
            style={{
              '--i': vaga,
              left: `${((cxA(uTela) / VIEW_W) * 100).toFixed(3)}%`,
              top: `${((y / VIEW_H) * 100).toFixed(3)}%`,
              opacity: dentro ? 1 : 0,
              pointerEvents: dentro ? 'auto' : 'none',
              /**
               * A opacidade é **assimétrica**: entra em 0,14s e sai em 0,4s.
               *
               * Um nó que chega pela ponta da janela precisa estar lá quando o
               * olho procura por ele — é o passo em que o visitante está
               * esperando algo novo aparecer. Já o que sai pode se apagar com
               * calma, e uma saída rápida chamaria atenção para o lado errado.
               * O deslocamento segue nos 0,85s da curva nos dois casos.
               */
              transition: arrastando
                ? 'opacity .16s ease'
                : `left .85s cubic-bezier(.22,.86,.2,1),top .85s cubic-bezier(.22,.86,.2,1),opacity ${
                    dentro ? '.14s' : '.4s'
                  } ease`,
            } as React.CSSProperties}
          >
            <span className={styles.pulso} aria-hidden="true" />
            <span className={styles.ponto} aria-hidden="true" />
            <span
              className={styles.periodo}
              style={noAlto ? { top: '31px' } : { bottom: '31px' }}
            >
              {e.periodo}
            </span>
          </button>
        );
      })}
    </div>
  );
}
