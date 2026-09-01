import styles from './NovaGauge.module.css';

interface NovaGaugeProps {
  /** contador de supernovas acesas; muda a cada disparo e reinicia a animação */
  disparo: number;
  /** segundos de recarga — o mesmo número que o motor usa */
  segundos: number;
}

/** Circunferência do círculo de progresso (r = 11), em unidades do viewBox. */
const PERIMETRO = 2 * Math.PI * 11;

/**
 * Medidor de recarga da supernova, no canto inferior esquerdo.
 *
 * Aparece quando uma estrela é acesa, fecha o círculo enquanto a recarga corre e
 * some quando a funcionalidade volta a estar disponível — **um anel na tela
 * significa "espere"**, e a ausência dele significa "pode".
 *
 * A recarga inteira é uma animação de CSS de duração `--recarga`, não um
 * cronômetro em JavaScript: o React renderiza uma vez por disparo — no melhor
 * caso, uma vez por recarga — e o compositor cuida do resto. Um `setState` por
 * quadro para mover um traço custaria mais que a cena inteira.
 *
 * `key={disparo}` remonta o SVG a cada estrela: é o que reinicia a animação sem
 * truque de reflow.
 *
 * `aria-hidden` porque não há informação aqui: é o retorno visual de um gesto de
 * ponteiro, e quem não usa ponteiro não perde nada — nem o conteúdo, nem uma
 * ação que só exista por este caminho.
 */
export function NovaGauge({ disparo, segundos }: NovaGaugeProps) {
  // antes da primeira supernova não há nada a dizer
  if (!disparo) return null;

  return (
    <span
      key={disparo}
      className={styles.medidor}
      style={
        {
          '--recarga': `${segundos}s`,
          // o perímetro sai daqui para o CSS: o raio do círculo é conhecido
          // neste arquivo, e repeti-lo lá seria um número para sair de sincronia
          '--perimetro': PERIMETRO.toFixed(3),
        } as React.CSSProperties
      }
      aria-hidden="true"
    >
      <svg viewBox="0 0 26 26" className={styles.svg}>
        <circle cx="13" cy="13" r="11" className={styles.trilha} />
        <circle
          cx="13"
          cy="13"
          r="11"
          className={styles.arco}
          strokeDasharray={PERIMETRO.toFixed(3)}
        />
      </svg>
      <span className={styles.nucleo} />
    </span>
  );
}
