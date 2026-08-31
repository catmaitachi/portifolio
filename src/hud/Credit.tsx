import { useT } from '~/i18n/useLanguage';
import styles from './Credit.module.css';

/** Crédito no rodapé: dois riscos que crescem e o texto entre eles. */
export function Credit() {
  const t = useT();

  return (
    <a className={styles.credito} href="https://claude.ai" target="_blank" rel="noreferrer">
      <span className={styles.risco} aria-hidden="true" />
      <span>{t.credito}</span>
      <span className={styles.risco} aria-hidden="true" />
    </a>
  );
}
