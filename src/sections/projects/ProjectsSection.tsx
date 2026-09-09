import { useRef } from 'react';
import { useArrowKeys } from '~/hooks/useArrowKeys';
import { useEscalaQueCabe } from '~/hooks/useEscalaQueCabe';
import { useT } from '~/i18n/useLanguage';
import comum from '../section.module.css';
import type { SectionProps } from '../types';
import { ProjectCard } from './ProjectCard';
import styles from './ProjectsSection.module.css';
import { useOrbit } from './useOrbit';

/**
 * Projetos: carrossel em órbita 3D.
 *
 * Girar: clique num cartão lateral, ←/→ (sem precisar de foco, enquanto a seção
 * está ativa), arraste horizontal ou os traços-índice abaixo.
 *
 * **Não há mais painel de descrição.** O cartão mostra tudo o que tem, e o link
 * para o projeto fica na frente dele (ver `ProjectCard`). Com isso saíram daqui
 * o fechamento ao deixar a seção e a tecla Esc: não existe mais estado aberto
 * para desfazer.
 */
export function ProjectsSection({ ativo, indice }: SectionProps) {
  const t = useT();
  const secaoRef = useRef<HTMLElement>(null);
  // o conteúdo encolhe até caber na altura que a tela tem
  useEscalaQueCabe(secaoRef);
  const lista = t.projetos.lista;
  const orbita = useOrbit(lista.length);

  useArrowKeys(ativo, orbita.girar);

  return (
    <section
      ref={secaoRef}
      className={`${comum.secao} ${comum.rolavel} ${styles.secao}`}
      aria-label={t.nav.projetos}
    >
      <div className={`${comum.bloco} ${styles.bloco}`} data-ativo={ativo || undefined}>
        <p className={comum.indice}>
          <span>{indice}</span>
          <span className={comum.indiceRisco} aria-hidden="true" />
        </p>

        <div className={comum.cabecalho}>
          <h2 className={comum.titulo}>{t.projetos.titulo}</h2>
          <p className={comum.intro}>{t.projetos.intro}</p>
        </div>

        <div
          ref={orbita.palcoRef}
          className={styles.palco}
          role="group"
          aria-label={t.a11y.projetos}
          tabIndex={0}
        >
          <div className={styles.anel}>
            {lista.map((p, i) => (
              <ProjectCard
                key={p.key}
                projeto={p}
                indice={i}
                geo={orbita.geometria(i, p.estado === 'definir')}
                ativo={ativo}
                onFocar={() => orbita.focar(i)}
              />
            ))}
          </div>
        </div>

        <div className={styles.tracos}>
          {lista.map((p, i) => (
            <button
              key={p.key}
              type="button"
              className={styles.traco}
              data-ativo={orbita.ativo === i || undefined}
              aria-label={p.nome}
              aria-current={orbita.ativo === i ? 'true' : undefined}
              onClick={() => orbita.focar(i)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
