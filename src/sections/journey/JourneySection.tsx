import { useCallback, useState } from 'react';
import { useArrowKeys } from '~/hooks/useArrowKeys';
import { useT } from '~/i18n/useLanguage';
import comum from '../section.module.css';
import type { SectionProps } from '../types';
import { JourneyEntry } from './JourneyEntry';
import styles from './JourneySection.module.css';
import { Orbita } from './Orbita';

/**
 * Carreira: cada experiência é um corpo numa órbita, e a ficha do escolhido ao
 * lado.
 *
 * A lista está em ordem cronológica (a mais antiga primeiro) e a escolhida
 * inicial é a mais recente. A navegação **não é circular**, mesmo com a órbita
 * dando voltas: as pontas da lista são pontas, e uma carreira que passa do
 * último emprego para o primeiro mente sobre a cronologia.
 *
 * As setas ←/→ funcionam **sem foco nenhum** enquanto a seção estiver ativa:
 * pedir um clique antes de navegar é atrito numa seção que só tem uma coisa a
 * navegar.
 */
export function JourneySection({ ativo, indice }: SectionProps) {
  const t = useT();
  const lista = t.experiencia.lista;
  const ultimo = Math.max(0, lista.length - 1);
  // `null` é "a mais recente", e continua certo quando uma experiência nova entra no conteúdo
  const [escolhida, setEscolhida] = useState<number | null>(null);
  const ativa = Math.min(escolhida ?? ultimo, ultimo);

  const mudar = useCallback(
    (d: number) => setEscolhida((e) => Math.min(ultimo, Math.max(0, (e ?? ultimo) + d))),
    [ultimo],
  );
  useArrowKeys(ativo && lista.length > 1, mudar);

  return (
    <section
      className={`${comum.secao} ${comum.rolavel} ${styles.secao}`}
      aria-label={t.nav.experiencia}
    >
      <div className={`${comum.bloco} ${styles.bloco}`} data-ativo={ativo || undefined}>
        <p className={comum.indice}>
          <span>{indice}</span>
          <span className={comum.indiceRisco} aria-hidden="true" />
        </p>

        <div className={comum.cabecalho}>
          <h2 className={comum.titulo}>{t.experiencia.titulo}</h2>
          <p className={comum.intro}>{t.experiencia.intro}</p>
        </div>

        <div className={styles.cena}>
          <div className={styles.lado}>
            <Orbita lista={lista} ativa={ativa} escolher={setEscolhida} ativo={ativo} />

            {/* com um evento só não há para onde andar, e as duas setas ficariam
                apagadas para sempre: é a regra da faixa que coube inteira */}
            {lista.length > 1 ? (
              <div className={styles.controles}>
                <button
                  type="button"
                  className={comum.passo}
                  aria-label={t.experiencia.janela.anterior}
                  disabled={ativa === 0}
                  onClick={() => mudar(-1)}
                >
                  <span className={comum.ponta} data-lado="antes" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className={comum.passo}
                  aria-label={t.experiencia.janela.posterior}
                  disabled={ativa === ultimo}
                  onClick={() => mudar(1)}
                >
                  <span className={comum.ponta} data-lado="depois" aria-hidden="true" />
                </button>
              </div>
            ) : null}
          </div>

          {/* as fichas se empilham na mesma célula: o palco tem a altura da maior, e
              trocar de experiência não o faz pular */}
          <div className={styles.palco}>
            {lista.map((e, i) => (
              <JourneyEntry key={e.key} entrada={e} indice={i} ativa={i === ativa} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
