import { useRef } from 'react';
import type { Filmes } from '~/data/types';
import { useEscalaQueCabe } from '~/hooks/useEscalaQueCabe';
import { useRemoto } from '~/hooks/useRemoto';
import { useT } from '~/i18n/useLanguage';
import { EstadoRemoto } from '../EstadoRemoto';
import comum from '../section.module.css';
import type { SectionProps } from '../types';
import styles from './FilmsSection.module.css';

/** Quantas marcas a nota tem. O Letterboxd vai de 0 a 5, com meias. */
const MARCAS = 5;

/**
 * Filmes: os últimos assistidos, com a nota que eu dei.
 *
 * O dado vem de `api/letterboxd`, e **não se repete**: um feed de filmes vistos
 * não muda enquanto alguém olha para ele, e repetir a busca gastaria requisição
 * para redesenhar o mesmo.
 *
 * **A nota é desenhada, não escrita.** Cinco marcas de 1px preenchidas pela
 * fração cabem na régua da página melhor que um glifo de estrela, que traria uma
 * forma que não existe em nenhum outro lugar aqui; e a meia estrela do
 * Letterboxd fica exata, em vez de arredondada para o glifo mais próximo. Quem
 * usa leitor de tela recebe o número, no `aria-label` — a marca é desenho.
 *
 * **Sem nota é diferente de nota zero.** Quem marcou como visto e não avaliou
 * recebe o rótulo, e não cinco marcas vazias, que afirmariam um julgamento que
 * ninguém fez.
 */
export function FilmsSection({ ativo, indice }: SectionProps) {
  const t = useT();
  const secaoRef = useRef<HTMLElement>(null);
  useEscalaQueCabe(secaoRef);
  const filmes = useRemoto<Filmes>('api/letterboxd', ativo);

  const lista = filmes.dados?.recentes ?? [];

  return (
    <section
      ref={secaoRef}
      className={`${comum.secao} ${comum.rolavel} ${styles.secao}`}
      aria-label={t.nav.filmes}
    >
      <div className={`${comum.bloco} ${styles.bloco}`} data-ativo={ativo || undefined}>
        <p className={comum.indice}>
          <span>{indice}</span>
          <span className={comum.indiceRisco} aria-hidden="true" />
        </p>

        <div className={comum.cabecalho}>
          <h2 className={comum.titulo}>{t.filmes.titulo}</h2>
          <p className={comum.intro}>{t.filmes.intro}</p>
        </div>

        {filmes.estado !== 'pronto' ? (
          <EstadoRemoto estado={filmes.estado} />
        ) : lista.length === 0 ? (
          <EstadoRemoto estado="vazio" />
        ) : (
          <ul className={styles.grade}>
            {lista.map((f, i) => (
              <li key={f.id} style={{ '--ordem': i } as React.CSSProperties}>
                <a className={styles.cartao} href={f.url} target="_blank" rel="noreferrer">
                  <span className={styles.poster}>
                    {f.poster ? (
                      <img
                        src={f.poster}
                        alt=""
                        loading="lazy"
                        onError={(e) => {
                          e.currentTarget.hidden = true;
                        }}
                      />
                    ) : null}
                    {f.revisita && (
                      <span className={styles.revisita} title={t.filmes.revisita}>
                        {t.filmes.revisita}
                      </span>
                    )}
                  </span>

                  <span className={styles.nome}>{f.titulo}</span>
                  <span className={styles.rodape}>
                    <span className={styles.ano}>{f.ano}</span>
                    {f.nota === null ? (
                      <span className={styles.semNota}>{t.filmes.semNota}</span>
                    ) : (
                      <span className={styles.nota} aria-label={`${f.nota}/${MARCAS}`}>
                        {Array.from({ length: MARCAS }, (_, m) => (
                          <span
                            key={m}
                            className={styles.marca}
                            aria-hidden="true"
                            style={
                              {
                                // a fração desta marca: cheia, vazia, ou metade
                                '--cheio': `${Math.min(1, Math.max(0, (f.nota ?? 0) - m)) * 100}%`,
                              } as React.CSSProperties
                            }
                          />
                        ))}
                      </span>
                    )}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
