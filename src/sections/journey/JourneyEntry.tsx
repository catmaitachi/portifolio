import { urlExterna, type Experiencia } from '~/content';
import { useT } from '~/i18n/useLanguage';
import styles from './JourneyEntry.module.css';

/** Chips exibidos por ficha: mais que isso vira uma segunda linha de chips. */
const MAX_STACK = 5;

interface JourneyEntryProps {
  entrada: Experiencia;
  indice: number;
  ativa: boolean;
}

/**
 * Ficha de um evento da trajetória.
 *
 * O cargo, a empresa ou o projeto, um texto corrido e a stack. **O texto é um
 * parágrafo, contado como a bio**, e não uma lista de atividades: três frases
 * numeradas liam como relatório, e o que a ficha precisa passar é o que aquele
 * trabalho foi, dito por quem o fez. O nome da empresa já está no subtítulo, e
 * o texto não o repete.
 *
 * **O subtítulo vira link** quando a experiência tem endereço, marcado só pelo
 * sublinhado. É o lugar natural para ele: o nome é a pergunta que o link
 * responde.
 *
 * **A marca da empresa não mora aqui.** Ela ficou um tempo no canto de cima à
 * direita, e foi para o centro da órbita (`Orbita`): as duas juntas repetiam o
 * mesmo logo lado a lado.
 *
 * Todas as fichas ficam sobrepostas na mesma célula do palco e só a
 * ativa aparece — trocar de evento é uma transição de opacidade, sem rAF e sem
 * o palco mudando de altura a cada navegação.
 *
 * A ficha inativa sai da navegação por `pointer-events` e `inert`: um leitor de
 * tela não deve encontrar quatro empregos empilhados no mesmo lugar, e o link de
 * uma ficha escondida não entra na tabulação.
 */
export function JourneyEntry({ entrada, indice, ativa }: JourneyEntryProps) {
  const t = useT();
  const stack = entrada.stack.slice(0, MAX_STACK);
  const endereco = urlExterna(entrada.url);

  return (
    <article className={styles.ficha} data-ativa={ativa || undefined} inert={!ativa}>
      <div className={styles.trilho}>
        <span className={styles.indice}>{String(indice + 1).padStart(2, '0')}</span>
        <span className={styles.risco} aria-hidden="true" />
        <span className={styles.tipo}>{t.experiencia.tipos[entrada.tipo]}</span>
      </div>

      <div className={styles.conteudo}>
        <div className={styles.cabecalho}>
          <h3 className={styles.cargo}>{entrada.cargo}</h3>
          <span className={styles.org}>
            <span className={styles.ponto} aria-hidden="true" />
            {endereco ? (
              <a className={styles.orgLink} href={endereco} target="_blank" rel="noreferrer">
                {entrada.org}
              </a>
            ) : (
              <span>{entrada.org}</span>
            )}
          </span>
        </div>

        <p className={styles.texto}>{entrada.texto}</p>

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
