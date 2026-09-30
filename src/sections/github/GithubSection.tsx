import { useEffect, useRef } from 'react';
import { format } from '~/content';
import type { Atividade } from '~/data/types';
import { useReducedMotion } from '~/hooks/useReducedMotion';
import { useRemoto } from '~/hooks/useRemoto';
import { useLanguage, useT } from '~/i18n/useLanguage';
import { EstadoRemoto, type SemDado, Traco } from '../EstadoRemoto';
import { PerfilExterno } from '../PerfilExterno';
import comum from '../section.module.css';
import type { SectionProps } from '../types';
import { CeuDoAno } from './CeuDoAno';
import styles from './GithubSection.module.css';
import { NuvemDeLinguagens } from './NuvemDeLinguagens';

/** quanto o número grande leva para contar e se encher */
const CONTA_MS = 1600;

/**
 * O número grande: os commits do ano, em contorno, que se enchem de luz de baixo
 * para cima enquanto contam, com o corte seco do título do Contato. Um número
 * grande só na seção: as outras contas moram na ficha ao lado.
 *
 * Conta de novo a cada entrada, como o resto da seção chega da profundidade a
 * cada vez. A escrita é direta no nó, sem estado por quadro.
 */
function Cartaz({ dados, ativo }: { dados: Atividade; ativo: boolean }) {
  const { t, lang } = useLanguage();
  const reduzido = useReducedMotion();
  const numero = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = numero.current;
    if (!el) return;
    const alvo = dados.commits;
    const escrever = (p: number) => {
      el.textContent = String(Math.round(alvo * p));
      el.style.setProperty('--gh-cheio', `${p * 100}%`);
    };
    if (!ativo || reduzido) {
      escrever(ativo ? 1 : 0);
      return;
    }
    let raf = 0;
    const inicio = performance.now();
    const passo = (agora: number) => {
      const p = Math.min(1, (agora - inicio) / CONTA_MS);
      escrever(1 - Math.pow(1 - p, 3));
      if (p < 1) raf = requestAnimationFrame(passo);
    };
    raf = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(raf);
  }, [ativo, reduzido, dados.commits]);

  const r = t.github.rotulos;
  const dia = new Intl.DateTimeFormat(lang, { day: 'numeric', month: 'short', timeZone: 'UTC' });
  const ficha: [string, string][] = [
    [r.contribuicoes, String(dados.total)],
    [r.diasAtivos, String(dados.diasAtivos)],
    [r.maiorSequencia, format(t.github.dias, { n: String(dados.maiorSequencia) })],
    [r.pico, `${dados.pico.contribuicoes} · ${dia.format(new Date(`${dados.pico.data}T12:00Z`))}`],
    [r.repositorios, String(dados.repositorios)],
    [r.desde, dados.desde],
  ];

  return (
    <div className={styles.cartaz}>
      <p className={styles.grande}>
        <span className={styles.grandeNumero} ref={numero}>
          {dados.commits}
        </span>
        <span className={styles.grandeRotulo}>{t.github.commits}</span>
      </p>
      <dl className={styles.ficha}>
        {ficha.map(([rotulo, valor], i) => (
          <div key={rotulo} className={styles.fichaLinha} style={{ '--i': i } as React.CSSProperties}>
            <dt>{rotulo}</dt>
            <dd>{valor}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/**
 * A seção sem o dado: o cartaz com os rótulos da ficha e os valores por chegar,
 * o céu do ano só com a grade de dias, e a nuvem como um círculo vazio.
 */
function Molde({ estado }: { estado: SemDado }) {
  const t = useT();
  return (
    <EstadoRemoto estado={estado}>
      <div className={styles.conteudo}>
        <div className={styles.cartaz}>
          <p className={styles.grande}>
            <span className={styles.grandeNumero}>
              <Traco w="2.2em" />
            </span>
            <span className={styles.grandeRotulo}>{t.github.commits}</span>
          </p>
          <dl className={styles.ficha}>
            {Object.values(t.github.rotulos).map((rotulo) => (
              <div key={rotulo} className={styles.fichaLinha}>
                <dt>{rotulo}</dt>
                <dd>
                  <Traco w="4ch" />
                </dd>
              </div>
            ))}
          </dl>
        </div>
        <span className={styles.ceuMolde} />
        <div className={styles.linguagens}>
          <span className={styles.nuvemMolde} />
          <div className={styles.legenda}>
            <h3 className={styles.linguagensTitulo}>{t.github.linguagens}</h3>
            <ol className={styles.chips}>
              {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
                <li key={i}>
                  <span className={styles.chip}>
                    <Traco w="55%" />
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </EstadoRemoto>
  );
}

/**
 * GitHub: o que o GitHub registrou do último ano, na Trajetória, entre a Carreira
 * e os Projetos.
 *
 * Três peças, escolhidas na rodada do /inspiration de 29/09/2026 e harmonizadas
 * numa física só, **tudo se acende**: o número grande se enche de luz, o céu do
 * ano acende atrás de um feixe, e a linguagem escolhida acende na nuvem.
 *
 * O dado vem de `api/atividade`, uma vez por entrada, sem repetir: o calendário é
 * do dia.
 */
export function GithubSection({ ativo, indice }: SectionProps) {
  const t = useT();
  const remoto = useRemoto<Atividade>('api/atividade', ativo);

  return (
    <section className={`${comum.secao} ${comum.rolavel} ${styles.secao}`} aria-label={t.nav.github}>
      <div className={`${comum.bloco} ${styles.bloco}`} data-ativo={ativo || undefined}>
        <p className={comum.indice}>
          <span>{indice}</span>
          <span className={comum.indiceRisco} aria-hidden="true" />
        </p>

        <div className={comum.cabecalho}>
          <div className={comum.linhaTitulo}>
            <h2 className={comum.titulo}>{t.github.titulo}</h2>
            <PerfilExterno secao="github" />
          </div>
          <p className={comum.intro}>{t.github.intro}</p>
        </div>

        {remoto.estado !== 'pronto' ? (
          <Molde estado={remoto.estado} />
        ) : (
          <div className={styles.conteudo}>
            <Cartaz dados={remoto.dados} ativo={ativo} />
            <CeuDoAno dias={remoto.dados.dias} ativo={ativo} total={remoto.dados.total} diasAtivos={remoto.dados.diasAtivos} />
            {remoto.dados.linguagens.length > 0 && <NuvemDeLinguagens linguagens={remoto.dados.linguagens} ativo={ativo} />}
          </div>
        )}
      </div>
    </section>
  );
}
