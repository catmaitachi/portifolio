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
 * A entrada é escalonada por `animation-delay` e continua depois do zoom da
 * câmera (1.5s): etiqueta 3.5s → nome 3.75s → legenda 4.5s. O nome usa
 * `tituloIn`, em que o `letter-spacing` fecha enquanto o borrão sai — a palavra
 * se materializa em vez de simplesmente aparecer.
 *
 * Terminada a abertura do HUD, aos 6,2s, uma faixa clara passa pelo nome de tempos
 * em tempos (`brilhoNome` no módulo). É CSS puro, sem componente e sem dependência:
 * o efeito é um degradê recortado no texto, e mover o `background-position` é
 * trabalho do compositor.
 */
export function HeroSection({ modo }: SectionProps) {
  const t = useT();
  const texto = t.modos[modo];

  return (
    <section className={styles.secao} aria-label={t.nav.inicio}>
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
