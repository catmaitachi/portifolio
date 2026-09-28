import { useState } from 'react';
import { TELAS, type SectionKey, type TelaKey } from '~/content';
import { useT } from '~/i18n/useLanguage';
import styles from './SectionNav.module.css';

interface SectionNavProps {
  tela: TelaKey;
  /** a seção que ocupa a tela em vigor: é ela que a lista marca */
  parte: SectionKey;
  irPara: (tela: TelaKey) => void;
  /** uma subseção: a tela e a seção dentro dela */
  irParaParte: (tela: TelaKey, parte: SectionKey) => void;
}

/**
 * O cabeçalho: as três telas, e as subseções de cada uma numa lista que abre
 * embaixo do nome.
 *
 * **Sem moldura e sem fundo.** Os nomes em versalete com respiro, e o risco de
 * 1px sob a tela em vigor, que cresce em `scaleX`. O estado é cor.
 *
 * **As subseções só existem na lista.** Cada tela é uma página corrida, e a
 * lista rola até a subseção escolhida; fora do hover não há nada embaixo do
 * cabeçalho. O Início não entra na lista do Dossiê: ele é o próprio Dossiê, o
 * topo da página.
 *
 * A lista abre ao apontar o nome, e com o foco do teclado. Todas ficam montadas,
 * e a que entra desliza de lado pela diferença de índice em `TELAS` (`--lado`):
 * passar o cursor de Hobbies para Trajetória desliza a lista para a esquerda.
 * **No toque não há hover**, e ali tocar no nome da tela em que se está abre e
 * fecha a lista; tocar em outra tela vai até ela.
 */
export function SectionNav({ tela, parte: atual, irPara, irParaParte }: SectionNavProps) {
  const t = useT();
  const [aberta, setAberta] = useState<TelaKey | null>(null);
  const iAberta = aberta ? TELAS.findIndex((x) => x.key === aberta) : -1;

  return (
    <nav
      className={styles.nav}
      aria-label={t.a11y.secoes}
      onMouseLeave={() => setAberta(null)}
      // o blur do React borbulha: só fecha quando o foco sai do cabeçalho inteiro
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setAberta(null);
      }}
    >
      <ul className={styles.lista}>
        {TELAS.map((item, i) => {
          const ativa = item.key === tela;
          const subsecoes = item.partes.filter((p) => p !== 'inicio');
          const temLista = subsecoes.length > 0;
          const visivel = aberta === item.key;
          // fechado, todas ficam em zero: a lista só se apaga, sem escolher lado
          const lado = iAberta < 0 ? 0 : i - iAberta;
          return (
            <li
              key={item.key}
              className={styles.tela}
              onMouseEnter={() => setAberta(temLista ? item.key : null)}
            >
              <button
                type="button"
                className={styles.item}
                aria-current={ativa ? 'page' : undefined}
                aria-controls={temLista ? `subsecoes-${item.key}` : undefined}
                aria-expanded={temLista ? visivel : undefined}
                onFocus={() => setAberta(temLista ? item.key : null)}
                onClick={() => {
                  // no toque, a tela em que se está abre e fecha a própria lista
                  if (ativa && temLista) setAberta((a) => (a === item.key ? null : item.key));
                  else irPara(item.key);
                }}
              >
                {t.telas[item.key]}
              </button>

              {temLista ? (
                <ul
                  id={`subsecoes-${item.key}`}
                  className={styles.subsecoes}
                  data-visivel={visivel || undefined}
                  style={{ '--lado': lado } as React.CSSProperties}
                >
                  {subsecoes.map((parte) => (
                    <li key={parte}>
                      <button
                        type="button"
                        className={styles.subsecao}
                        aria-current={ativa && atual === parte ? 'true' : undefined}
                        tabIndex={visivel ? 0 : -1}
                        onClick={() => {
                          irParaParte(item.key, parte);
                          setAberta(null);
                        }}
                      >
                        {t.nav[parte]}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
