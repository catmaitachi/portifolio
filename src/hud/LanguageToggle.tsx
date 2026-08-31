import { useLanguage } from '~/i18n/useLanguage';
import styles from './LanguageToggle.module.css';

/**
 * Seletor PT | EN.
 *
 * Um **único botão**: o clique alterna os dois idiomas. Dois botões separados
 * dariam ao visitante a chance de "selecionar" o idioma já ativo, e o alvo de
 * toque de cada metade ficaria pequeno demais no mobile.
 */
export function LanguageToggle() {
  const { lang, t, alternar } = useLanguage();

  return (
    <button type="button" className={styles.botao} onClick={alternar} aria-label={t.a11y.idioma}>
      <span className={styles.opcao} data-ativo={lang === 'pt' || undefined}>
        PT
      </span>
      <span className={styles.separador} aria-hidden="true">
        |
      </span>
      <span className={styles.opcao} data-ativo={lang === 'en' || undefined}>
        EN
      </span>
    </button>
  );
}
