import { useRef } from 'react';
import { useArrowKeys } from '~/hooks/useArrowKeys';
import { useEscalaQueCabe } from '~/hooks/useEscalaQueCabe';
import { useT } from '~/i18n/useLanguage';
import comum from '../section.module.css';
import type { SectionProps } from '../types';
import { DiplomaCard } from './DiplomaCard';
import styles from './EducationSection.module.css';
import { useDeck } from './useDeck';

/**
 * Formação: os diplomas numa pilha vertical.
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
 * Navegar: clique num diploma de trás, ←/→ enquanto a seção está ativa, ou os
 * traços ao lado. Não há arraste, e o motivo está em `useDeck`.
 */
export function EducationSection({ ativo, indice }: SectionProps) {
  const t = useT();
  const secaoRef = useRef<HTMLElement>(null);
  // o conteúdo encolhe até caber na altura que a tela tem
  useEscalaQueCabe(secaoRef);
  const lista = t.formacoes.lista;
  const pilha = useDeck(lista.length);

  useArrowKeys(ativo, pilha.andar);

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

        <div className={styles.arena}>
          <div className={styles.palco} role="group" aria-label={t.formacoes.titulo} tabIndex={0}>
            {lista.map((f, i) => (
              <DiplomaCard
                key={f.slot}
                formacao={f}
                geo={pilha.geometria(i)}
                ativo={ativo}
                onFocar={() => pilha.focar(i)}
              />
            ))}
          </div>

          {/**
           * Os traços ficam **em pé**, ao lado da pilha.
           *
           * Em Projetos eles são uma linha embaixo do palco porque a órbita anda
           * de lado; aqui a pilha anda para cima e para baixo, e um índice
           * horizontal apontaria para um eixo que não é o do movimento.
           */}
          <div className={styles.tracos}>
            {lista.map((f, i) => (
              <button
                key={f.slot}
                type="button"
                className={styles.traco}
                data-ativo={pilha.ativo === i || undefined}
                aria-label={f.instituicao}
                aria-current={pilha.ativo === i ? 'true' : undefined}
                onClick={() => pilha.focar(i)}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
