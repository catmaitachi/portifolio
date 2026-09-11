import { useRef } from 'react';
import { PROJETOS } from '~/content';
import type { Projetos } from '~/data/types';
import { useArrowKeys } from '~/hooks/useArrowKeys';
import { useEscalaQueCabe } from '~/hooks/useEscalaQueCabe';
import { useRemoto } from '~/hooks/useRemoto';
import { useT } from '~/i18n/useLanguage';
import { EstadoRemoto } from '../EstadoRemoto';
import { PerfilExterno } from '../PerfilExterno';
import comum from '../section.module.css';
import type { SectionProps } from '../types';
import { nomeLegivel } from './nome';
import { ProjectCard } from './ProjectCard';
import styles from './ProjectsSection.module.css';
import { useOrbit } from './useOrbit';

/** A escolha vai inteira no endereço, e é ele a chave do cache da borda. */
const CAMINHO = `api/github?repos=${encodeURIComponent(PROJETOS.join(','))}`;

/**
 * Projetos: os repositórios escolhidos a dedo, numa órbita 3D.
 *
 * Só projeto pessoal, e o dado de cada um vem do GitHub (`api/github`): a
 * escolha mora em `shared.json → projetos`, e nome, descrição, linguagens e
 * números são o que o repositório diz de si. **Sem escolha nenhuma não há o que
 * buscar**: a seção diz que nada foi selecionado ainda e não chama a função.
 *
 * Girar: clique num cartão lateral, ←/→ (sem precisar de foco, enquanto a seção
 * está ativa), arraste horizontal ou os traços-índice abaixo. Com um cartão só
 * não há o que girar, e os traços não aparecem, pela regra da faixa que coube
 * inteira.
 */
export function ProjectsSection({ ativo, indice }: SectionProps) {
  const t = useT();
  const secaoRef = useRef<HTMLElement>(null);
  // o conteúdo encolhe até caber na altura que a tela tem
  useEscalaQueCabe(secaoRef);
  const escolhidos = PROJETOS.length > 0;
  // repositório não muda enquanto alguém olha para ele: busca uma vez por entrada, sem repetir
  const remoto = useRemoto<Projetos>(CAMINHO, ativo && escolhidos);
  const lista = remoto.estado === 'pronto' ? remoto.dados.repositorios : [];
  const orbita = useOrbit(lista.length);

  useArrowKeys(ativo && lista.length > 1, orbita.girar);

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
          <div className={comum.linhaTitulo}>
            <h2 className={comum.titulo}>{t.projetos.titulo}</h2>
            <PerfilExterno secao="projetos" />
          </div>
          <p className={comum.intro}>{t.projetos.intro}</p>
        </div>

        {!escolhidos ? (
          <EstadoRemoto estado="vazio" texto={t.projetos.vazio} />
        ) : remoto.estado !== 'pronto' ? (
          <EstadoRemoto estado={remoto.estado} />
        ) : lista.length === 0 ? (
          // escolhidos, mas nenhum voltou: todos privados, renomeados ou apagados
          <EstadoRemoto estado="vazio" />
        ) : (
          <>
            <div
              ref={orbita.palcoRef}
              className={styles.palco}
              role="group"
              aria-label={t.a11y.projetos}
              tabIndex={0}
            >
              <div className={styles.anel}>
                {lista.map((r, i) => (
                  <ProjectCard
                    key={r.id}
                    repo={r}
                    janela={remoto.dados.janela}
                    indice={i}
                    geo={orbita.geometria(i)}
                    ativo={ativo}
                    onFocar={() => orbita.focar(i)}
                  />
                ))}
              </div>
            </div>

            {lista.length > 1 ? (
              <div className={styles.tracos}>
                {lista.map((r, i) => (
                  <button
                    key={r.id}
                    type="button"
                    className={styles.traco}
                    data-ativo={orbita.ativo === i || undefined}
                    aria-label={nomeLegivel(r.nome)}
                    aria-current={orbita.ativo === i ? 'true' : undefined}
                    onClick={() => orbita.focar(i)}
                  />
                ))}
              </div>
            ) : null}
          </>
        )}
      </div>
    </section>
  );
}
