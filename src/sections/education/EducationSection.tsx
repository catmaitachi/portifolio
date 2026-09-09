import { useRef } from 'react';
import { useEscalaQueCabe } from '~/hooks/useEscalaQueCabe';
import { useT } from '~/i18n/useLanguage';
import comum from '../section.module.css';
import type { SectionProps } from '../types';
import { EducationCarousel } from './EducationCarousel';
import styles from './EducationSection.module.css';

/**
 * Formação: os badges que antes ficavam no pé do Sobre.
 *
 * Eles saíram de lá por duas razões que se somam. A primeira é de conteúdo: o
 * Sobre é a única seção que empilha três coisas, e o badge é a peça mais densa
 * da página (ver `responsivo.md`), e era ele que obrigava a seção inteira a
 * encolher para caber numa tela de celular. A segunda é de leitura: formação é
 * um assunto do lado profissional, com estado, data e progresso, e no rodapé de
 * uma biografia ela lia como legenda do retrato.
 *
 * A seção **só existe no modo profissional** (`shared.json → modos`), e por isso
 * não precisa saber em qual lado está: quem decide é a lista do modo.
 *
 * O carrossel é filho **da seção**, não do bloco, como era no Sobre: a entrada
 * dele pende de `data-secao-ativa` no ancestral, e `useEscalaQueCabe` mede a
 * seção inteira justamente para alcançar irmãos do bloco.
 */
export function EducationSection({ ativo, indice }: SectionProps) {
  const t = useT();
  const secaoRef = useRef<HTMLElement>(null);
  useEscalaQueCabe(secaoRef);

  return (
    <section
      ref={secaoRef}
      className={`${comum.secao} ${comum.rolavel}`}
      aria-label={t.nav.formacao}
      data-secao-ativa={ativo || undefined}
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
      </div>

      <EducationCarousel />
    </section>
  );
}
