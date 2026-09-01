import { useArrowKeys } from '~/hooks/useArrowKeys';
import { useT } from '~/i18n/useLanguage';
import comum from '../section.module.css';
import { JourneyEntry } from './JourneyEntry';
import styles from './JourneySection.module.css';
import { TimelineCurve } from './TimelineCurve';
import { useTimeline } from './useTimeline';

/**
 * Trajetória: ficha do evento ativo sobre uma linha do tempo em curva.
 *
 * A lista está em ordem cronológica (mais antiga à esquerda) e o evento ativo
 * inicial é o mais recente.
 *
 * As setas ←/→ funcionam com foco na curva **e também sem foco nenhum**,
 * enquanto a seção estiver ativa — pedir um clique antes de navegar é atrito
 * desnecessário numa seção que só tem uma coisa a navegar.
 */
export function JourneySection({ ativo }: { ativo: boolean }) {
  const t = useT();
  const lista = t.experiencia.lista;
  const linha = useTimeline(lista.length);

  useArrowKeys(ativo, linha.mudar);

  return (
    <section
      className={`${comum.secao} ${comum.rolavel} ${styles.secao}`}
      aria-label={t.nav.experiencia}
    >
      <div className={`${comum.bloco} ${styles.bloco}`} data-ativo={ativo || undefined}>
        <p className={comum.indice}>
          <span>{t.experiencia.indice}</span>
          <span className={comum.indiceRisco} aria-hidden="true" />
        </p>

        <div className={comum.cabecalho}>
          <h2 className={comum.titulo}>{t.experiencia.titulo}</h2>
          <p className={comum.intro}>{t.experiencia.intro}</p>
        </div>

        {/* altura fixa: as fichas ficam sobrepostas e o palco não pula ao trocar */}
        <div className={styles.palco}>
          {lista.map((e, i) => (
            <JourneyEntry key={e.key} entrada={e} indice={i} ativa={i === linha.ativa} />
          ))}
        </div>

        <TimelineCurve lista={lista} linha={linha} />

        <div className={styles.controles}>
          <button
            type="button"
            className={styles.seta}
            aria-label={t.experiencia.janela.anterior}
            disabled={linha.noInicio}
            onClick={() => linha.mudar(-1)}
          >
            &#8592;
          </button>
          <button
            type="button"
            className={styles.seta}
            aria-label={t.experiencia.janela.posterior}
            disabled={linha.noFim}
            onClick={() => linha.mudar(1)}
          >
            &#8594;
          </button>
        </div>
      </div>
    </section>
  );
}
