import { useT } from '~/i18n/useLanguage';
import styles from './HeroSection.module.css';

/**
 * Início: etiqueta, nome e legenda, em cascata.
 *
 * A entrada é escalonada por `animation-delay` e continua depois do zoom da
 * câmera (1.5s): etiqueta 3.5s → nome 3.75s → legenda 4.5s. O nome usa
 * `tituloIn`, em que o `letter-spacing` fecha enquanto o borrão sai — a palavra
 * se materializa em vez de simplesmente aparecer.
 */
export function HeroSection() {
  const t = useT();

  return (
    <section className={styles.secao} aria-label={t.nav.inicio}>
      <p className={styles.etiqueta}>
        <span className={styles.regua} aria-hidden="true" />
        <span>{t.hero.etiqueta}</span>
        <span className={styles.regua} aria-hidden="true" />
      </p>

      <h1 className={styles.nome}>{t.hero.nome}</h1>

      <p className={styles.legenda}>{t.hero.legenda}</p>
    </section>
  );
}
