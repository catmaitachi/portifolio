import { LOGOS, urlExterna, type Experiencia } from '~/content';
import { useT } from '~/i18n/useLanguage';
import styles from './JourneyEntry.module.css';

/** Chips exibidos por ficha. Além disso a ficha estoura a altura fixa do palco. */
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
 * **No canto de cima à direita fica a marca da empresa ou do projeto**, bem
 * apagada e com a altura do cargo e do subtítulo, no lugar do período que ficava
 * na ficha como número fantasma. A data continua na curva, que é onde ela
 * organiza alguma coisa; na ficha ela só repetia o rótulo do nó, e a marca diz
 * de quem era o trabalho.
 *
 * Todas as fichas ficam sobrepostas (`inset: 0`) num palco de altura fixa e só a
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
  const marca = entrada.logo ? LOGOS[entrada.logo] : undefined;
  const endereco = urlExterna(entrada.url);

  return (
    <article className={styles.ficha} data-ativa={ativa || undefined} inert={!ativa}>
      <div className={styles.trilho}>
        <span className={styles.indice}>{String(indice + 1).padStart(2, '0')}</span>
        <span className={styles.risco} aria-hidden="true" />
        <span className={styles.tipo}>{t.experiencia.tipos[entrada.tipo]}</span>
      </div>

      <div className={styles.conteudo}>
        {/* a marca é desenho: o nome dela já está escrito logo abaixo do cargo */}
        {marca ? (
          <span
            className={styles.marca}
            style={{ '--marca': `url("${marca}")` } as React.CSSProperties}
            aria-hidden="true"
          />
        ) : null}

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
