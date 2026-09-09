import { useMemo, useRef } from 'react';
import { useEscalaQueCabe } from '~/hooks/useEscalaQueCabe';
import { useReducedMotion } from '~/hooks/useReducedMotion';
import { useT } from '~/i18n/useLanguage';
import comum from '../section.module.css';
import type { SectionProps } from '../types';
import { DiplomaCard } from './DiplomaCard';
import styles from './EducationSection.module.css';
import { useCabeNaFaixa } from './useCabeNaFaixa';

/**
 * Formação: uma faixa de crachás, que anda quando não cabe parada.
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
 * **Ela só anda quando não cabe.** Numa tela larga os três crachás ficam parados
 * e centrados, à vista de uma vez, que é o melhor estado possível: nada se move,
 * nada passa, e tudo está lido. Andar ali seria movimento sem motivo. Onde a
 * largura não dá para os três, e não dá em celular nenhum sem encolher o texto
 * até o ilegível, a faixa desliza devagar e passa cada um pelo meio. Quem
 * responde é o `useCabeNaFaixa`, medindo o DOM.
 *
 * **O movimento é contínuo, e não tem passo.** A versão anterior parava em cada
 * formação por alguns segundos e saltava para a seguinte, e a espera era o pior
 * de dois mundos: comprida demais para quem já leu e curta demais para quem
 * estava lendo. Aqui não há parada, e o que muda é qual crachá está passando
 * pelo meio.
 *
 * **A lista aparece duas vezes enquanto a faixa anda**, e é isso que fecha o
 * laço: ela translada exatamente uma volta e volta ao começo, onde a cópia já
 * está no lugar da original. Sem a cópia haveria um salto visível a cada volta,
 * e nenhuma duração o esconderia. A segunda passada é `aria-hidden`, porque é a
 * mesma formação de novo, e some do DOM quando a faixa está parada, onde não
 * teria nenhuma função.
 *
 * **E há um terceiro estado, para quem pediu menos movimento.** Ali a faixa não
 * pode andar, mas o que não cabe também não pode ficar inalcançável: o palco
 * vira uma região que **rola de lado**, como as faixas de pôsteres de Filmes,
 * com foco de teclado e rótulo próprios. Sem isso, `prefers-reduced-motion` numa
 * tela estreita cortaria os últimos crachás fora da tela para sempre.
 *
 * Não há estado nenhum aqui além dessas duas perguntas: nem cartão ativo, nem
 * índice, nem relógio em JavaScript. O movimento é uma animação de CSS, o que o
 * põe no compositor da GPU.
 */
export function EducationSection({ ativo, indice }: SectionProps) {
  const t = useT();
  const secaoRef = useRef<HTMLElement>(null);
  // o conteúdo encolhe até caber na altura que a tela tem
  useEscalaQueCabe(secaoRef);
  const lista = t.formacoes.lista;
  const palcoRef = useRef<HTMLDivElement>(null);
  const cabe = useCabeNaFaixa(palcoRef, lista.length);
  const semMovimento = useReducedMotion();

  /**
   * O que a faixa é agora: uma fileira parada, um desfile, ou uma região que
   * rola. As duas perguntas são independentes, e é a combinação delas que
   * decide.
   */
  const modo = cabe ? 'parada' : semMovimento ? 'rolavel' : 'desfilando';

  /** A lista, e a cópia que fecha o laço, que só o desfile precisa. */
  const faixa = useMemo(
    () =>
      modo === 'desfilando'
        ? [...lista.map((f) => ({ f, copia: false })), ...lista.map((f) => ({ f, copia: true }))]
        : lista.map((f) => ({ f, copia: false })),
    [lista, modo],
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

        <div
          ref={palcoRef}
          className={styles.palco}
          data-modo={modo}
          /* uma região rolável que não recebe foco é inalcançável por teclado */
          tabIndex={modo === 'rolavel' ? 0 : undefined}
          aria-label={modo === 'rolavel' ? t.formacoes.titulo : undefined}
        >
          <div
            className={styles.faixa}
            // quantas formações a volta tem: é a distância que a faixa percorre
            style={{ '--n': String(lista.length) } as React.CSSProperties}
            data-modo={modo}
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
