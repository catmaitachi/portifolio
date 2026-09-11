import { useState } from 'react';
import { useT } from '~/i18n/useLanguage';
import type { SectionProps } from '../types';
import styles from './HeroSection.module.css';

/**
 * Início: etiqueta, nome e legenda, em cascata.
 *
 * É a única seção comum aos dois lados do site, e a etiqueta e a legenda vêm do
 * modo (`modos.<key>` no dicionário): "Portfólio / Desenvolvedor de Software" de
 * um lado, "Pessoal / Música, jogos e filmes" do outro. **O nome não muda**, e
 * por isso continua em `hero`: ele é a mesma pessoa dos dois lados.
 *
 * A entrada é escalonada por `animation-delay`. Na abertura ela começa enquanto
 * os anéis do HUD ainda se formam, nos instantes `--abertura-*` do `reset.css`.
 * O nome usa `tituloIn`, em que o `letter-spacing` fecha enquanto o borrão sai,
 * e a palavra se materializa em vez de simplesmente aparecer.
 *
 * **A cascata se refaz a cada volta ao Início**, pendurada em `data-ativo` como
 * as entradas das outras seções, e numa volta ela corre sem a espera do HUD
 * (ver o módulo).
 *
 * Formado o nome, uma faixa clara passa por ele de tempos em tempos
 * (`brilhoNome` no módulo), em laço enquanto a seção está ativa. É CSS puro, sem
 * componente e sem dependência: o efeito é um degradê recortado no texto, e
 * mover o `background-position` é trabalho do compositor.
 */
export function HeroSection({ ativo, modo }: SectionProps) {
  const t = useT();
  const texto = t.modos[modo];

  /**
   * Abertura ou volta?
   *
   * O que separa as duas é a seção já ter saído de cena uma vez. É estado
   * derivado durante o render, o padrão da Trajetória (ver `react.md`): o React
   * refaz o render na hora, sem pintar o quadro intermediário e sem um efeito a
   * mais. Quem chega por um endereço de outra seção começa como volta, porque a
   * abertura já terá passado quando ele rolar até aqui.
   */
  const [saiu, setSaiu] = useState(!ativo);
  if (!ativo && !saiu) setSaiu(true);

  return (
    <section
      className={styles.secao}
      aria-label={t.nav.inicio}
      data-ativo={ativo || undefined}
      data-volta={saiu || undefined}
    >
      <p className={styles.etiqueta}>
        <span className={styles.regua} aria-hidden="true" />
        <span>{texto.etiqueta}</span>
        <span className={styles.regua} aria-hidden="true" />
      </p>

      <h1 className={styles.nome}>{t.hero.nome}</h1>

      <p className={styles.legenda}>{texto.legenda}</p>
    </section>
  );
}
