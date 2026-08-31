import { useMemo } from 'react';
import { LOGO_ESCALAS, LOGOS, type Formacao } from '~/content';
import { useT } from '~/i18n/useLanguage';
import comum from '../section.module.css';
import styles from './EducationCarousel.module.css';
import { useAutoCarousel } from './useAutoCarousel';

/** Preenchimento da barra por estado da formação. */
const PROGRESSO: Record<Formacao['estado'], string> = {
  concluido: '100%',
  cursando: '50%',
  pretensao: '0%',
};

/**
 * Badges de formação — grade quando cabem, carrossel quando não cabem.
 *
 * No modo carrossel o trilho carrega **duas cópias** da lista: é o que permite o
 * laço sem emenda visível (ver `useAutoCarousel`). As chaves da segunda cópia
 * levam um sufixo, senão o React veria chaves repetidas.
 *
 * Os logos usam `<img>` de tamanho fixo com `object-fit: contain` e uma escala
 * óptica por marca (`shared.json → logos`), porque marcas com proporções muito
 * diferentes não pesam igual na mesma caixa.
 */
export function EducationCarousel() {
  const t = useT();
  const lista = t.formacoes.lista;
  const { ref, ativo, andar } = useAutoCarousel(lista.length);

  const visiveis = useMemo(
    () =>
      ativo
        ? [
            ...lista.map((f, i) => ({ f, chave: `${f.slot}-${i}` })),
            ...lista.map((f, i) => ({ f, chave: `${f.slot}-${i}-copia` })),
          ]
        : lista.map((f, i) => ({ f, chave: `${f.slot}-${i}` })),
    [ativo, lista],
  );

  return (
    <div
      ref={ref}
      className={styles.janela}
      data-carrossel={ativo || undefined}
      role="group"
      aria-label={t.formacoes.titulo}
      tabIndex={0}
      onKeyDown={(e) => {
        if (!ativo) return;
        const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
        if (!d) return;
        // impede que a seta chegue ao contêiner de rolagem e mude de seção
        e.preventDefault();
        e.stopPropagation();
        andar(d * 120);
      }}
    >
      <div className={styles.trilho}>
        {visiveis.map(({ f, chave }, i) => (
          <div key={chave} className={styles.badge} data-estado={f.estado}>
            <span
              className={styles.logo}
              role="img"
              aria-label={f.instituicao}
              style={{
                backgroundImage: LOGOS[f.slot] ? `url("${LOGOS[f.slot]}")` : undefined,
                transform: `scale(${LOGO_ESCALAS[f.slot]?.escala ?? 1})`,
              }}
            />
            <div className={styles.corpo}>
              <div className={styles.linhaTopo}>
                <span className={styles.instituicao}>{f.instituicao}</span>
                <span className={styles.nivel}>{f.nivel}</span>
              </div>
              <span className={styles.curso}>{f.curso}</span>
              <div className={comum.medidor}>
                <span className={comum.trilha}>
                  <span
                    className={comum.preenchimento}
                    style={{
                      width: PROGRESSO[f.estado],
                      // a segunda cópia não reanima a barra
                      transitionDelay: i < lista.length ? undefined : '0s',
                    }}
                  />
                </span>
                <span className={comum.estado}>{t.formacoes.estados[f.estado]}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
