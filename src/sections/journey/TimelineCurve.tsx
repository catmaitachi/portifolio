import { useId } from 'react';
import type { Experiencia } from '~/content';
import { useT } from '~/i18n/useLanguage';
import styles from './TimelineCurve.module.css';
import {
  CAMINHO,
  corteAte,
  cxA,
  cyA,
  dentroDaJanela,
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
 */
export function TimelineCurve({ lista, linha }: TimelineCurveProps) {
  const t = useT();
  const { janela, ativa, arrastando } = linha;
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
      data-arrastavel={janela.maxDesl > 0 || undefined}
      data-arrastando={arrastando || undefined}
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

        <g style={{ transform: `translateX(${janela.shiftX.toFixed(1)}px)`, transition: transicaoGrupo }}>
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

          {/* um anel maior à frente dos pontos, para o pulso ter volume */}
          <circle r="7" fill="none" stroke="rgba(255,255,255,.16)" strokeWidth="1" vectorEffect="non-scaling-stroke">
            <animateMotion dur={DURACAO_PULSO} begin={PULSOS[0]} repeatCount="indefinite" path={CAMINHO} />
          </circle>
          {PULSOS.slice(1).map((begin) => (
            <circle key={begin} r="2.6" fill="#fff" opacity=".8">
              <animateMotion dur={DURACAO_PULSO} begin={begin} repeatCount="indefinite" path={CAMINHO} />
            </circle>
          ))}
        </g>
      </svg>

      {lista.map((e, i) => {
        const u = janela.uDe(i);
        const uTela = janela.uNaTela(i);
        const y = cyA(u);
        const dentro = dentroDaJanela(uTela);
        const naFrente = i === ativa;
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
            onClick={() => linha.focar(i)}
            style={{
              left: `${((cxA(uTela) / VIEW_W) * 100).toFixed(3)}%`,
              top: `${((y / VIEW_H) * 100).toFixed(3)}%`,
              opacity: dentro ? 1 : 0,
              pointerEvents: dentro ? 'auto' : 'none',
              transition: arrastando
                ? 'opacity .4s ease'
                : 'left .85s cubic-bezier(.22,.86,.2,1),top .85s cubic-bezier(.22,.86,.2,1),opacity .5s ease',
            }}
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
