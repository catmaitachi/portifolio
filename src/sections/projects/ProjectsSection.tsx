import { useEffect } from 'react';
import { useT } from '~/i18n/useLanguage';
import comum from '../section.module.css';
import { ProjectCard } from './ProjectCard';
import styles from './ProjectsSection.module.css';
import { useOrbit } from './useOrbit';

/**
 * Projetos: carrossel em órbita 3D.
 *
 * Girar: clique num cartão lateral, ←/→ com foco no palco, arraste horizontal
 * ou os traços-índice abaixo. Clique no cartão da frente abre a descrição sobre
 * ele — exceto numa vaga, que gira mas não abre.
 */
export function ProjectsSection({ ativo }: { ativo: boolean }) {
  const t = useT();
  const lista = t.projetos.lista;
  const orbita = useOrbit(lista.length);
  const { fechar } = orbita;

  // sair da seção fecha o painel aberto: voltar depois e encontrar um cartão
  // já aberto seria um estado que o visitante não pediu
  useEffect(() => {
    if (!ativo) fechar();
  }, [ativo, fechar]);

  return (
    <section
      className={`${comum.secao} ${comum.rolavel} ${styles.secao}`}
      aria-label={t.nav.projetos}
    >
      <div className={`${comum.bloco} ${styles.bloco}`} data-ativo={ativo || undefined}>
        <p className={comum.indice}>
          <span>{t.projetos.indice}</span>
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
          onKeyDown={(e) => {
            const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
            if (!d) return;
            e.preventDefault();
            e.stopPropagation();
            orbita.girar(d);
          }}
        >
          <div className={styles.anel}>
            {lista.map((p, i) => (
              <ProjectCard
                key={p.key}
                projeto={p}
                indice={i}
                geo={orbita.geometria(i, p.estado === 'definir')}
                aberto={orbita.aberto === i}
                onAlternar={() => orbita.alternar(i, p.estado !== 'definir')}
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
