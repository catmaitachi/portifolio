import { useState } from 'react';
import { useT } from '~/i18n/useLanguage';
import type { SectionProps } from '../types';
import styles from './HeroSection.module.css';

/**
 * Início: etiqueta, nome e legenda, em cascata.
 *
 * A entrada é escalonada por `animation-delay`. Na abertura ela começa enquanto
 * os anéis do HUD ainda se formam, nos instantes `--abertura-*` do `reset.css`.
 *
 * **As letras do nome chegam do fundo**, uma a uma, do desfoque ao foco, e a
 * ordem é a distância ao centro do nome (`--d`): o meio chega primeiro e as
 * pontas por último, como se a câmera que sai do buraco negro passasse por elas.
 * É a abertura da direção Travelling (ver `direcao-visual.md`). As letras são
 * `aria-hidden` e o `<h1>` leva o nome inteiro no rótulo: um leitor de tela não
 * pode soletrar o nome.
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
export function HeroSection({ ativo }: SectionProps) {
  const t = useT();
  const letras = [...t.hero.nome];
  const meio = (letras.length - 1) / 2;

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
        <span>{t.hero.etiqueta}</span>
        <span className={styles.regua} aria-hidden="true" />
      </p>

      <h1 className={styles.nome} aria-label={t.hero.nome}>
        <span aria-hidden="true">
          {letras.map((c, i) => (
            <span
              // a posição é a identidade da letra: o nome não se reordena
              key={i}
              className={styles.letra}
              style={{ '--d': Math.abs(i - meio).toFixed(1) } as React.CSSProperties}
            >
              {c}
            </span>
          ))}
        </span>
      </h1>

      <p className={styles.legenda}>{t.hero.legenda}</p>

    </section>
  );
}
