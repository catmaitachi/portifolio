import styles from './Hud.module.css';

/**
 * HUD: quatro anéis concêntricos e a mira de quatro ticks cardinais.
 *
 * O diâmetro (82.35vmin) está calculado para que o **anel interno (inset 33%)
 * coincida com o horizonte do buraco negro** (28vmin) — os dois círculos são a
 * mesma circunferência, um em CSS e outro em canvas.
 *
 * Cronograma da abertura, contado a partir do carregamento:
 *   0–1.5s   zoom out da câmera (canvas)
 *   1.5–2.9s anéis se formam de baixo para cima, do interno ao externo,
 *            0.22s entre eles (`ringIn` com `clip-path`)
 *   2.9s     mira surge e passa a pulsar em cascata
 *
 * Tudo em `transform` e `clip-path`: o compositor da GPU resolve, a CPU não
 * participa de nenhum quadro.
 */
export function Hud({ ativo }: { ativo: boolean }) {
  return (
    <div className={styles.hud} data-ativo={ativo || undefined} aria-hidden="true">
      <div className={`${styles.anel} ${styles.anel1}`}>
        <div className={styles.giraCCW60}>
          <svg viewBox="0 0 100 100" className={styles.svg}>
            <circle cx="50" cy="50" r="49.5" fill="none" stroke="rgba(255,255,255,.1)" strokeWidth="0.5" />
            <circle
              cx="50"
              cy="50"
              r="49.5"
              fill="none"
              stroke="rgba(255,255,255,.5)"
              strokeWidth="0.5"
              pathLength={3}
              strokeDasharray="1 2"
            />
          </svg>
        </div>
      </div>

      <div className={`${styles.anel} ${styles.anel2}`}>
        <div className={styles.giraCW96}>
          <svg viewBox="0 0 100 100" className={styles.svg}>
            <circle
              cx="50"
              cy="50"
              r="49.5"
              fill="none"
              stroke="rgba(255,255,255,.45)"
              strokeWidth="0.5"
              strokeLinecap="round"
              pathLength={120}
              strokeDasharray="0.5 2.5"
            />
          </svg>
        </div>
      </div>

      <div className={`${styles.anel} ${styles.anel3}`}>
        <div className={styles.giraCCW150}>
          <svg viewBox="0 0 100 100" className={styles.svg}>
            <circle cx="50" cy="50" r="49.5" fill="none" stroke="rgba(255,255,255,.1)" strokeWidth="0.35" />
            <circle
              cx="50"
              cy="50"
              r="49.5"
              fill="none"
              stroke="rgba(255,255,255,.5)"
              strokeWidth="0.35"
              pathLength={3}
              strokeDasharray="1 2"
            />
          </svg>
        </div>
      </div>

      {/* o anel externo não gira: é a referência parada contra a qual os outros se movem */}
      <div className={`${styles.anel} ${styles.anelExterno}`} />

      <span className={`${styles.tick} ${styles.tickTopo}`} />
      <span className={`${styles.tick} ${styles.tickBase}`} />
      <span className={`${styles.tick} ${styles.tickEsq}`} />
      <span className={`${styles.tick} ${styles.tickDir}`} />
    </div>
  );
}
