import { useMemo, useRef } from 'react';
import { useEscalaQueCabe } from '~/hooks/useEscalaQueCabe';
import { useT } from '~/i18n/useLanguage';
import comum from '../section.module.css';
import type { SectionProps } from '../types';
import { DiplomaCard } from './DiplomaCard';
import styles from './EducationSection.module.css';

/**
 * Formação: uma faixa de crachás que não para de andar.
 *
 * A seção nasceu do pé do Sobre, e por duas razões que se somam. A primeira é de
 * tamanho: o badge de formação era a peça mais densa da página (ver
 * `responsivo.md`), e era ele que obrigava o Sobre inteiro a encolher para caber
 * num celular. A segunda é de leitura: formação tem estado, data e progresso, e
 * no rodapé de uma biografia isso lia como legenda do retrato.
 *
 * Ela **só existe no modo profissional** (`shared.json → modos`), e não precisa
 * saber disso: quem decide é a lista do modo.
 *
 * **O movimento é contínuo, e não tem passo.** A versão anterior parava em cada
 * formação por alguns segundos e saltava para a seguinte, e a espera era o pior
 * de dois mundos: comprida demais para quem já leu e curta demais para quem
 * estava lendo. Aqui a faixa anda devagar o tempo todo, todos os crachás estão
 * na tela ao mesmo tempo, e o que muda é qual deles está passando pelo meio.
 *
 * **A lista aparece duas vezes**, e é isso que fecha o laço: a faixa translada
 * exatamente uma volta da lista e volta ao começo, onde a cópia já está no lugar
 * da original. Sem a cópia haveria um salto visível a cada volta, e nenhuma
 * quantidade de duração o esconderia. A segunda passada é `aria-hidden`, porque
 * é a mesma formação de novo.
 *
 * Não há estado nenhum aqui: nem cartão ativo, nem índice, nem relógio em
 * JavaScript. A faixa é uma animação de CSS, o que a põe no compositor da GPU e
 * a deixa parar sozinha sob `prefers-reduced-motion`.
 */
export function EducationSection({ ativo, indice }: SectionProps) {
  const t = useT();
  const secaoRef = useRef<HTMLElement>(null);
  // o conteúdo encolhe até caber na altura que a tela tem
  useEscalaQueCabe(secaoRef);
  const lista = t.formacoes.lista;

  /** A lista, e a cópia que fecha o laço. */
  const faixa = useMemo(
    () => [...lista.map((f) => ({ f, copia: false })), ...lista.map((f) => ({ f, copia: true }))],
    [lista],
  );

  return (
    <section
      ref={secaoRef}
      className={`${comum.secao} ${comum.rolavel} ${styles.secao}`}
      aria-label={t.nav.formacao}
    >
      <div className={`${comum.bloco} ${styles.bloco}`} data-ativo={ativo || undefined}>
        <p className={comum.indice}>
          <span>{indice}</span>
          <span className={comum.indiceRisco} aria-hidden="true" />
        </p>

        <div className={comum.cabecalho}>
          <h2 className={comum.titulo}>{t.formacoes.titulo}</h2>
          <p className={comum.intro}>{t.formacoes.intro}</p>
        </div>

        <div className={styles.palco}>
          <div
            className={styles.faixa}
            // quantas formações a volta tem: é a distância que a faixa percorre
            style={{ '--n': String(lista.length) } as React.CSSProperties}
          >
            {faixa.map(({ f, copia }, i) => (
              <DiplomaCard
                key={`${f.slot}-${copia ? 'b' : 'a'}`}
                formacao={f}
                indice={i % lista.length}
                total={lista.length}
                // a entrada corre da esquerda para a direita, e para na primeira volta
                ordem={Math.min(i, lista.length)}
                ativo={ativo}
                copia={copia}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
