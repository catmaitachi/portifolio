import { useMemo } from 'react';
import { LOGO_ESCALAS, LOGOS, type Formacao } from '~/content';
import { useT } from '~/i18n/useLanguage';
import comum from '../section.module.css';
import styles from './EducationCarousel.module.css';
import { useAutoCarousel } from './useAutoCarousel';

/**
 * Preenchimento da barra, em porcentagem.
 *
 * `cursando` é a **fração real** (`feito/total`) e não um meio-termo decorativo:
 * a barra passa a dizer alguma coisa, e diz o tempo todo — não só no hover. Sem
 * `progresso` no conteúdo ela cai nos 50% de antes, que é o "em algum ponto do
 * caminho" que a barra significava até agora.
 */
function preenchimento(f: Formacao): string {
  if (f.estado === 'concluido') return '100%';
  if (f.estado === 'pretensao') return '0%';
  const p = f.progresso;
  if (!p || p.total <= 0) return '50%';
  return `${Math.round(Math.min(1, Math.max(0, p.feito / p.total)) * 100)}%`;
}

/**
 * O detalhe que a barra esconde: a data de conclusão ou a fração do curso.
 *
 * Fica **fora do i18n** pelo mesmo motivo da versão no rodapé: "2022.12" e "4/8"
 * são dados, idênticos nos dois idiomas — uma chave por idioma só criaria dois
 * lugares para errar. Sem dado no conteúdo, o badge simplesmente não tem
 * detalhe e a barra ocupa a linha inteira, como antes.
 */
function detalhe(f: Formacao): string | null {
  if (f.estado === 'concluido') return f.conclusao ?? null;
  if (f.estado === 'cursando' && f.progresso) return `${f.progresso.feito}/${f.progresso.total}`;
  return null;
}

/**
 * Badges de formação — grade quando cabem, carrossel quando não cabem.
 *
 * No modo carrossel o trilho carrega **duas cópias** da lista: é o que permite o
 * laço sem emenda visível (ver `useAutoCarousel`). As chaves da segunda cópia
 * levam um sufixo, senão o React veria chaves repetidas; e a cópia inteira sai
 * da árvore de acessibilidade (`aria-hidden`), porque um leitor de tela não
 * deve encontrar a mesma formação duas vezes.
 *
 * Os logos usam `<img>` de tamanho fixo com `object-fit: contain` e uma escala
 * óptica por marca (`shared.json → logos`), porque marcas com proporções muito
 * diferentes não pesam igual na mesma caixa.
 *
 * **Hover:** o badge acende e a barra encolhe para a esquerda, abrindo espaço
 * para o detalhe (data ou fração). O texto está sempre no DOM — só a largura
 * anima —, então quem usa leitor de tela o encontra sem depender do ponteiro, e
 * em tela de toque (`hover: none`) ele já nasce aberto.
 */
export function EducationCarousel() {
  const t = useT();
  const lista = t.formacoes.lista;
  const { ref, ativo, andar } = useAutoCarousel(lista.length);

  const visiveis = useMemo(
    () =>
      ativo
        ? [
            ...lista.map((f, i) => ({ f, chave: `${f.slot}-${i}`, copia: false })),
            ...lista.map((f, i) => ({ f, chave: `${f.slot}-${i}-copia`, copia: true })),
          ]
        : lista.map((f, i) => ({ f, chave: `${f.slot}-${i}`, copia: false })),
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
        {visiveis.map(({ f, chave, copia }) => {
          const extra = detalhe(f);
          return (
            <div
              key={chave}
              className={styles.badge}
              data-estado={f.estado}
              data-detalhe={extra ? '' : undefined}
              aria-hidden={copia || undefined}
            >
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
                        width: preenchimento(f),
                        // a segunda cópia não reanima a barra
                        transitionDelay: copia ? '0s' : undefined,
                      }}
                    />
                  </span>
                  {extra && <span className={styles.detalhe}>{extra}</span>}
                  <span className={comum.estado}>{t.formacoes.estados[f.estado]}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
