import { useEffect } from 'react';
import { useArrowKeys } from '~/hooks/useArrowKeys';
import { useT } from '~/i18n/useLanguage';
import comum from '../section.module.css';
import { ProjectCard } from './ProjectCard';
import styles from './ProjectsSection.module.css';
import { useOrbit } from './useOrbit';

/**
 * Projetos: carrossel em órbita 3D.
 *
 * Girar: clique num cartão lateral, ←/→ (sem precisar de foco, enquanto a seção
 * está ativa), arraste horizontal ou os traços-índice abaixo. Clique no cartão
 * da frente abre a descrição sobre ele — exceto numa vaga, que gira mas não abre.
 */
export function ProjectsSection({ ativo, indice }: { ativo: boolean; indice: string }) {
  const t = useT();
  const lista = t.projetos.lista;
  const orbita = useOrbit(lista.length);
  const { fechar } = orbita;

  useArrowKeys(ativo, orbita.girar);

  // sair da seção fecha o painel aberto: voltar depois e encontrar um cartão
  // já aberto seria um estado que o visitante não pediu
  useEffect(() => {
    if (!ativo) fechar();
  }, [ativo, fechar]);

  /**
   * Esc fecha o painel.
   *
   * O painel cobre o cartão inteiro e é a única coisa focável ali dentro; sem
   * uma saída explícita, quem navega por teclado teria de voltar até o cartão e
   * apertar Enter de novo para sair do que abriu.
   */
  useEffect(() => {
    if (!ativo || orbita.aberto === null) return;
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      fechar();
    };
    window.addEventListener('keydown', aoTeclar);
    return () => window.removeEventListener('keydown', aoTeclar);
  }, [ativo, orbita.aberto, fechar]);

  return (
    <section
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
                aberto={orbita.aberto === i}
                focavel={orbita.aberto === null || orbita.aberto === i}
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
