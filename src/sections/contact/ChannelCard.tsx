import { type Canal, ICONES } from '~/content';
import { useT } from '~/i18n/useLanguage';
import styles from './ChannelCard.module.css';

/**
 * Cartão de canal de contato.
 *
 * Canal sem `url` é um espaço reservado: tracejado, apagado e **fora da
 * navegação** (`pointer-events: none` + `tabIndex -1` + `aria-disabled`). Um
 * link que não leva a lugar nenhum é pior do que a ausência dele.
 *
 * Os ícones são glifos brancos locais, nunca CDN — um ícone que não carrega
 * deixa o cartão visualmente vazio, e o visitante não descobre qual rede é.
 */
export function ChannelCard({ canal }: { canal: Canal }) {
  const t = useT();
  const ativo = Boolean(canal.url);
  const icone = ICONES[canal.icone];

  return (
    <a
      className={styles.canal}
      href={canal.url || undefined}
      target="_blank"
      rel="noopener noreferrer"
      data-inativo={!ativo || undefined}
      aria-disabled={!ativo || undefined}
      tabIndex={ativo ? 0 : -1}
    >
      {icone ? (
        <img className={styles.icone} src={icone} alt="" width={26} height={26} loading="lazy" />
      ) : null}

      <span className={styles.corpo}>
        <span className={styles.linhaTopo}>
          <span className={styles.rotulo}>{canal.rotulo}</span>
          {ativo ? (
            <span className={styles.seta} aria-hidden="true">
              &#8599;
            </span>
          ) : null}
        </span>
        <span className={styles.identificador}>{canal.identificador || t.contato.emBreve}</span>
      </span>
    </a>
  );
}
