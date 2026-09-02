import { useDecipher } from '~/hooks/useDecipher';
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
 *
 * A entrada da seção é a **decriptografia** da bio: o texto chega cifrado e se
 * resolve da esquerda para a direita, um parágrafo depois do outro
 * (`useDecipher`). O hook escreve direto no DOM, então trocar de idioma ou
 * rolar não paga render nenhum por isso.
 */
export function AboutSection({ ativo, indice }: { ativo: boolean; indice: string }) {
  const t = useT();
  const bio = useDecipher(ativo, t.sobre.paragrafos);

  return (
    <section
      className={`${comum.secao} ${comum.rolavel} ${styles.secao}`}
      aria-label={t.nav.sobre}
      data-secao-ativa={ativo || undefined}
    >
      <div className={`${comum.bloco} ${styles.bloco}`} data-ativo={ativo || undefined}>
        <p className={comum.indice}>
          <span>{indice}</span>
          <span className={comum.indiceRisco} aria-hidden="true" />
        </p>

        <div className={styles.corpo}>
          <PortraitCard />

          <div className={styles.coluna}>
            <h2 className={comum.titulo}>{t.sobre.titulo}</h2>
            <div ref={bio} className={styles.texto}>
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
