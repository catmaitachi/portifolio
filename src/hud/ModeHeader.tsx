import { useState } from 'react';
import { MODOS, secoesDoModo, type ModoKey, type SectionKey } from '~/content';
import { useT } from '~/i18n/useLanguage';
import styles from './ModeHeader.module.css';

interface ModeHeaderProps {
  modo: ModoKey;
  trocar: (m: ModoKey) => void;
  irParaSecao: (m: ModoKey, s: SectionKey) => void;
}

/**
 * O cabeçalho: em que lado do site o visitante está.
 *
 * É o **segundo eixo** da navegação, e não substitui o primeiro: aqui se escolhe
 * o lado, e o menu de seções continua sendo as seções daquele lado. Por isso a
 * lista que aparece ao passar o ponteiro é uma **prévia**, não o controle — ela
 * responde "o que tem desse lado?" antes de o visitante gastar uma troca de modo
 * para descobrir.
 *
 * **As duas prévias ficam montadas, e é isso que permite a transição.** Trocar o
 * ponteiro de um modo para o outro anima uma lista saindo e a outra entrando, e
 * uma lista que só existisse enquanto o seu modo estivesse apontado não teria de
 * onde sair. Elas se empilham numa célula de grade só, então o painel tem a
 * largura da maior e nada salta quando a troca acontece.
 *
 * **O lado de onde cada uma entra sai da posição dela em `MODOS`**, por
 * `--lado`: a que está sendo mostrada fica em zero e as outras se deslocam pela
 * diferença de índice. Assim a lista da direita entra pela direita sem que
 * ninguém escreva "direita" em lugar nenhum, e acrescentar um terceiro modo não
 * pede conta nova.
 *
 * No toque não existe hover, e o painel simplesmente não aparece (`hover: none`
 * no módulo): tocar o nome do modo troca de modo, que é a ação inteira. A prévia
 * é conveniência de quem tem ponteiro, e o menu de seções continua alcançável dos
 * dois jeitos.
 */
export function ModeHeader({ modo, trocar, irParaSecao }: ModeHeaderProps) {
  const t = useT();
  /** qual prévia está aberta; `null` com o ponteiro e o foco fora do cabeçalho */
  const [mostrando, setMostrando] = useState<ModoKey | null>(null);
  const iMostrando = mostrando ? MODOS.findIndex((m) => m.key === mostrando) : -1;

  return (
    <nav
      className={styles.cabecalho}
      aria-label={t.a11y.modos}
      onMouseLeave={() => setMostrando(null)}
      /* o blur do React borbulha: só fecha quando o foco sai do cabeçalho inteiro */
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setMostrando(null);
      }}
    >
      <div className={styles.linha}>
        {MODOS.map((m, i) => (
          <span key={m.key} className={styles.celula}>
            {i > 0 && (
              <span className={styles.separador} aria-hidden="true">
                |
              </span>
            )}
            <button
              type="button"
              className={styles.modo}
              data-ativo={m.key === modo || undefined}
              aria-current={m.key === modo ? 'true' : undefined}
              onMouseEnter={() => setMostrando(m.key)}
              onFocus={() => setMostrando(m.key)}
              onClick={() => trocar(m.key)}
            >
              {t.modos[m.key].rotulo}
            </button>
          </span>
        ))}
      </div>

      <div className={styles.painel}>
        {MODOS.map((m, i) => {
          const visivel = m.key === mostrando;
          // fechado, todas ficam em zero: o painel só se apaga, sem escolher lado
          const lado = iMostrando < 0 ? 0 : i - iMostrando;
          return (
            <ul
              key={m.key}
              className={styles.previa}
              data-visivel={visivel || undefined}
              style={{ '--lado': lado } as React.CSSProperties}
              aria-hidden={visivel ? undefined : 'true'}
            >
              {secoesDoModo(m.key).map((key) => (
                <li key={key}>
                  <button
                    type="button"
                    className={styles.secao}
                    /* prévia fechada sai da tabulação: tabular para o que não se vê é
                       perder o foco no meio da tela */
                    tabIndex={visivel ? 0 : -1}
                    onClick={() => irParaSecao(m.key, key)}
                  >
                    {t.nav[key]}
                  </button>
                </li>
              ))}
            </ul>
          );
        })}
      </div>
    </nav>
  );
}
