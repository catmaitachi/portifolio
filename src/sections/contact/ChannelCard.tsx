import { type Canal, ICONES, urlExterna } from '~/content';
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
 *
 * Na entrada da seção os cartões chegam **das laterais**, o do meio primeiro —
 * mesma gramática da entrada dos cartões de projeto, que sobem. Ver `--dir` e
 * `--ordem` abaixo.
 */
interface ChannelCardProps {
  canal: Canal;
  /** seção ativa: dispara a entrada do cartão */
  entrando: boolean;
  indice: number;
  total: number;
}

export function ChannelCard({ canal, entrando, indice, total }: ChannelCardProps) {
  const t = useT();
  const destino = urlExterna(canal.url);
  const ativo = Boolean(destino);
  const icone = ICONES[canal.icone];

  /**
   * De que lado o cartão entra, e quando.
   *
   * Cada um vem da borda mais próxima: os da metade esquerda pela esquerda, os
   * da direita pela direita. Um cartão exatamente no centro (grade ímpar) não
   * tem lado — `--dir: 0` deixa só a subida comum, que é o que sobra para ele.
   *
   * A distância ao centro também é a ordem: o do meio primeiro, as pontas
   * depois, como na órbita de Projetos. Sai do índice, então acrescentar um
   * canal em `shared.json` não pede nada aqui nem no CSS.
   */
  const meio = (total - 1) / 2;
  const ordem = Math.abs(indice - meio);
  const direcao = indice < meio ? -1 : indice > meio ? 1 : 0;

  return (
    <a
      className={styles.canal}
      style={{ '--dir': direcao, '--ordem': ordem } as React.CSSProperties}
      data-entrada={entrando || undefined}
      href={destino}
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
