import { useT } from '~/i18n/useLanguage';
import comum from '../section.module.css';
import styles from './AboutSection.module.css';
import { EducationCarousel } from './EducationCarousel';
import { PortraitCard } from './PortraitCard';

/**
 * Sobre: retrato, biografia e formações.
 *
 * A seção rola sozinha quando o conteúdo não cabe, e continua centrada quando
 * cabe — a centragem vem de margens automáticas (`comum.rolavel`), não de
 * `justify-content`, que cortaria o topo do conteúdo alto.
 *
 * A biografia tem rolagem **própria** (`.texto`), com `overscroll-behavior:
 * contain`: chegar ao fim do texto não encadeia a rolagem para a seção e não
 * dispara uma troca acidental de seção.
 */
export function AboutSection({ ativo }: { ativo: boolean }) {
  const t = useT();

  return (
    <section
      className={`${comum.secao} ${comum.rolavel} ${styles.secao}`}
      aria-label={t.nav.sobre}
      data-secao-ativa={ativo || undefined}
    >
      <div className={`${comum.bloco} ${styles.bloco}`} data-ativo={ativo || undefined}>
        <p className={comum.indice}>
          <span>{t.sobre.indice}</span>
          <span className={comum.indiceRisco} aria-hidden="true" />
        </p>

        <div className={styles.corpo}>
          <PortraitCard />

          <div className={styles.coluna}>
            <h2 className={comum.titulo}>{t.sobre.titulo}</h2>
            <div className={styles.texto}>
              {t.sobre.paragrafos.map((par, i) => (
                <p key={i} className={styles.paragrafo}>
                  {par}
                </p>
              ))}
            </div>
          </div>
        </div>
      </div>

      <EducationCarousel />
    </section>
  );
}
