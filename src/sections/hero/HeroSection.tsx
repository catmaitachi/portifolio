import { useEffect, useState } from 'react';
import { useReducedMotion } from '~/hooks/useReducedMotion';
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
/**
 * O cargo, girando entre `hero.cargos`.
 *
 * Adaptação do RotatingText (reactbits, `flip`): cada letra tomba em X, em
 * cascata a partir da primeira. Tirou-se a mola e o corte seco do original, e
 * ficou a curva `--ease-saida`, o desfoque e um clarão que esfria, para ler como
 * painel e não como desenho animado.
 *
 * `n` é o contador de giros, e a palavra da vez é `n % cargos.length`. A chave é o
 * próprio `n`: a palavra que sai é a que era a atual, com a mesma chave, então o
 * React só troca a classe e a animação de saída parte de onde ela estava. Fora de
 * cena o contador volta a zero, e o primeiro cargo chega com a cascata do Início
 * (a legenda), sem animação de letra. Sem movimento reduzido o cargo não gira.
 */
function Cargos({ ativo }: { ativo: boolean }) {
  const { cargos } = useT().hero;
  const reduzido = useReducedMotion();
  const [n, setN] = useState(0);
  if (!ativo && n !== 0) setN(0);

  useEffect(() => {
    if (!ativo || reduzido) return;
    const id = setInterval(() => setN((v) => v + 1), 3800);
    return () => clearInterval(id);
  }, [ativo, reduzido]);

  const palavra = (k: number, classe: string) => (
    <span key={k} className={`${styles.cargo} ${classe}`} aria-hidden="true">
      {[...cargos[k % cargos.length]].map((c, i) => (
        // a posição é a identidade da letra: a palavra não se reordena
        <span key={i} className={styles.glifo} style={{ '--i': i } as React.CSSProperties}>
          {c}
        </span>
      ))}
    </span>
  );

  return (
    <span className={styles.cargos}>
      <span className={styles.oculto}>{cargos[n % cargos.length]}</span>
      {n > 0 && palavra(n - 1, styles.sai)}
      {palavra(n, n > 0 ? styles.entra : '')}
    </span>
  );
}

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

      <p className={styles.legenda}>
        <Cargos ativo={ativo} />
      </p>
    </section>
  );
}
