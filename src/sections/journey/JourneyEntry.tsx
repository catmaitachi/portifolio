import type { Experiencia } from '~/content';
import { useT } from '~/i18n/useLanguage';
import styles from './JourneyEntry.module.css';

/** Bullets e chips exibidos por ficha. Além disso a ficha estoura a altura fixa do palco. */
const MAX_BULLETS = 3;
const MAX_STACK = 4;

interface JourneyEntryProps {
  entrada: Experiencia;
  indice: number;
  ativa: boolean;
}

/**
 * Ficha de um evento da trajetória.
 *
 * Todas as fichas ficam sobrepostas (`inset: 0`) num palco de altura fixa e só a
 * ativa aparece — trocar de evento é uma transição de opacidade, sem rAF e sem
 * o palco mudando de altura a cada navegação.
 *
 * A ficha inativa sai da navegação por `pointer-events` e `inert`: um leitor de
 * tela não deve encontrar quatro empregos empilhados no mesmo lugar.
 */
export function JourneyEntry({ entrada, indice, ativa }: JourneyEntryProps) {
  const t = useT();
  const bullets = entrada.bullets.slice(0, MAX_BULLETS);
  const stack = entrada.stack.slice(0, MAX_STACK);

  return (
    <article className={styles.ficha} data-ativa={ativa || undefined} inert={!ativa}>
      <div className={styles.trilho}>
        <span className={styles.indice}>{String(indice + 1).padStart(2, '0')}</span>
        <span className={styles.risco} aria-hidden="true" />
        <span className={styles.tipo}>{t.experiencia.tipos[entrada.tipo] ?? ''}</span>
      </div>

      <div className={styles.conteudo}>
        {/* o período como número fantasma atrás do cargo, sem competir com ele */}
        <span className={styles.fantasma} aria-hidden="true">
          {entrada.periodo}
        </span>

        <div className={styles.cabecalho}>
          <h3 className={styles.cargo}>{entrada.cargo}</h3>
          <span className={styles.org}>
            <span className={styles.ponto} aria-hidden="true" />
            <span>{entrada.org}</span>
          </span>
        </div>

        <ol className={styles.atividades}>
          {bullets.map((b, i) => (
            // a chave é o texto da atividade; o índice segue sendo o número que
            // aparece na ficha, mas identidade e numeração são coisas diferentes
            <li key={b} className={styles.atividade}>
              <span className={styles.numero} aria-hidden="true">
                {String(i + 1).padStart(2, '0')}
              </span>
              <span>{b}</span>
            </li>
          ))}
        </ol>

        <div className={styles.chips}>
          {stack.map((s) => (
            <span key={s} className={styles.chip}>
              {s}
            </span>
          ))}
        </div>
      </div>
    </article>
  );
}
