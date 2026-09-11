import { useRef } from 'react';
import { useDecipher } from '~/hooks/useDecipher';
import { useEscalaQueCabe } from '~/hooks/useEscalaQueCabe';
import { useT } from '~/i18n/useLanguage';
import comum from '../section.module.css';
import type { SectionProps } from '../types';
import styles from './AboutSection.module.css';
import { PortraitCard } from './PortraitCard';

/**
 * Sobre: retrato, biografia e dois fatos.
 *
 * A seção rola sozinha quando o conteúdo não cabe, e continua centrada quando
 * cabe — a centragem vem de margens automáticas (`comum.rolavel`), não de
 * `justify-content`, que cortaria o topo do conteúdo alto.
 *
 * A biografia tem rolagem **própria** (`.texto`), com `overscroll-behavior:
 * contain`: chegar ao fim do texto não encadeia a rolagem para a seção e não
 * dispara uma troca acidental de seção.
 *
 * **A bio muda de lado.** O texto é o mesmo elemento nos dois modos, com um
 * conteúdo por modo no dicionário: quem chega pelo lado pessoal não deve ler um
 * parágrafo sobre práticas de Engenharia de Software, e quem chega pelo
 * profissional não deve ler sobre o que eu ando jogando. O título fica, porque
 * é o mesmo assunto.
 *
 * **A formação saiu daqui e virou seção**, no lado profissional
 * (`sections/education/`). No lugar dela ficaram os dois fatos que o retrato não
 * diz, nascimento e residência, que custam uma linha em vez do bloco mais denso
 * da página.
 *
 * A entrada da seção é a **decriptografia** da bio: o texto chega cifrado e se
 * resolve da esquerda para a direita, um parágrafo depois do outro
 * (`useDecipher`). O hook escreve direto no DOM, então trocar de idioma ou
 * rolar não paga render nenhum por isso.
 */
export function AboutSection({ ativo, indice, modo }: SectionProps) {
  const t = useT();
  const secaoRef = useRef<HTMLElement>(null);
  // o conteúdo encolhe até caber na altura que a tela tem
  useEscalaQueCabe(secaoRef);
  const paragrafos = t.sobre.paragrafos[modo];
  const bio = useDecipher(ativo, paragrafos);

  return (
    <section
      ref={secaoRef}
      className={`${comum.secao} ${comum.rolavel} ${styles.secao}`}
      aria-label={t.nav.sobre}
    >
      <div className={`${comum.bloco} ${styles.bloco}`} data-ativo={ativo || undefined}>
        <p className={comum.indice}>
          <span>{indice}</span>
          <span className={comum.indiceRisco} aria-hidden="true" />
        </p>

        <div className={styles.corpo}>
          {/* no mobile a foto flutua à esquerda e o texto a contorna */}
          <PortraitCard className={styles.retrato} />

          <div className={styles.coluna}>
            <h2 className={comum.titulo}>{t.sobre.titulo}</h2>
            <div ref={bio} className={styles.texto}>
              {/**
               * A chave é o próprio texto, não a posição.
               *
               * Com o índice, trocar de idioma reaproveitava os mesmos `<p>` e só
               * reescrevia o conteúdo — e é dentro desses nós que `useDecipher`
               * escreve caractere a caractere. Com o texto como chave o React os
               * recria, e o efeito (que tem `textos` nas dependências) recomeça
               * sobre nós limpos, sem herdar a cifra do idioma anterior.
               */}
              {paragrafos.map((par) => (
                <p key={par} className={styles.paragrafo}>
                  {par}
                </p>
              ))}
            </div>
          </div>
        </div>

        {/**
         * Os dois fatos que o retrato não diz.
         *
         * Ficam **dentro do bloco**, ao contrário do carrossel de formação que
         * ocupava este lugar: são duas linhas curtas, e um irmão do bloco só
         * faria sentido para algo que precisasse da largura inteira da tela.
         */}
        <ul className={styles.fatos}>
          {t.sobre.dados.map((dado, i) => (
            <li key={dado.key} className={styles.fato} style={{ '--ordem': i } as React.CSSProperties}>
              <span className={styles.fatoRotulo}>{dado.rotulo}</span>
              <span className={styles.fatoValor}>{dado.valor}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
