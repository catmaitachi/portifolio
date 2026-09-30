import { urlExterna, type Experiencia } from '~/content';
import { useT } from '~/i18n/useLanguage';
import comum from '../section.module.css';
import styles from './JourneyEntry.module.css';

/** Chips exibidos por ficha: mais que isso vira uma segunda linha de chips. */
const MAX_STACK = 5;

interface JourneyEntryProps {
  entrada: Experiencia;
  ativa: boolean;
}

/**
 * Ficha de um evento da trajetória: o contexto e o relato.
 *
 * **O crachá é do portador, e a ficha é do trabalho.** O crachá ao lado diz
 * quem (o nome e o cargo, sob a marca de quem o emitiu); a ficha diz o tipo,
 * desde quando, a empresa, o que foi feito e a stack nomeada. Antes os dois
 * repetiam quase tudo. O maço é `aria-hidden`, então o cargo continua aqui,
 * escondido da vista, para o leitor de tela.
 *
 * **O texto é um parágrafo, contado como a bio**, e não uma lista de
 * atividades: três frases numeradas liam como relatório.
 *
 * **O título é a empresa, e vira link** quando a experiência tem endereço,
 * marcado só pelo sublinhado.
 *
 * Todas as fichas ficam sobrepostas na mesma célula do palco e só a
 * ativa aparece — trocar de evento é uma transição de opacidade, sem rAF e sem
 * o palco mudando de altura a cada navegação.
 *
 * A ficha inativa sai da navegação por `pointer-events` e `inert`: um leitor de
 * tela não deve encontrar quatro empregos empilhados no mesmo lugar, e o link de
 * uma ficha escondida não entra na tabulação.
 */
export function JourneyEntry({ entrada, ativa }: JourneyEntryProps) {
  const t = useT();
  const stack = entrada.stack.slice(0, MAX_STACK);
  const endereco = urlExterna(entrada.url);

  return (
    <article className={styles.ficha} data-ativa={ativa || undefined} inert={!ativa}>
      <p className={styles.linha}>
        <b>{t.experiencia.tipos[entrada.tipo]}</b>
        <span>·</span>
        {t.experiencia.cracha.desde} {entrada.periodo}
      </p>

      <div className={styles.conteudo}>
        <h3 className={styles.org}>
          <span className={comum.oculto}>{entrada.cargo}, </span>
          {endereco ? (
            <a className={styles.orgLink} href={endereco} target="_blank" rel="noreferrer">
              {entrada.org}
            </a>
          ) : (
            entrada.org
          )}
        </h3>

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
