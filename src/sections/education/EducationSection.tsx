import { useMemo, useRef } from 'react';
import { useArrowKeys } from '~/hooks/useArrowKeys';
import { useEscalaQueCabe } from '~/hooks/useEscalaQueCabe';
import { useT } from '~/i18n/useLanguage';
import comum from '../section.module.css';
import type { SectionProps } from '../types';
import { DiplomaCard } from './DiplomaCard';
import styles from './EducationSection.module.css';
import { AUTO_MS, useCarrossel } from './useCarrossel';

/**
 * Formação: os diplomas num carrossel horizontal que anda sozinho.
 *
 * A seção nasceu do pé do Sobre, e por duas razões que se somam. A primeira é de
 * tamanho: o badge de formação era a peça mais densa da página (ver
 * `responsivo.md`), e era ele que obrigava o Sobre inteiro a encolher para caber
 * num celular. A segunda é de leitura: formação tem estado, data e progresso, e
 * no rodapé de uma biografia isso lia como legenda do retrato.
 *
 * Ela **só existe no modo profissional** (`shared.json → modos`), e não precisa
 * saber disso: quem decide é a lista do modo.
 *
 * Navegar: esperar (o carrossel anda sozinho), clicar num diploma vizinho,
 * arrastar sobre o da frente, ←/→ enquanto a seção está ativa, ou os traços
 * abaixo do palco. Por que o anel é circular e quando o relógio para está em
 * `useCarrossel`.
 *
 * **Ela abre no que está em curso**, não no primeiro da lista: o que responde
 * "onde ele está academicamente hoje" é o de agora, não a pretensão que abre a
 * lista. Sem nenhum `cursando`, o primeiro serve.
 */
export function EducationSection({ ativo, indice }: SectionProps) {
  const t = useT();
  const secaoRef = useRef<HTMLElement>(null);
  // o conteúdo encolhe até caber na altura que a tela tem
  useEscalaQueCabe(secaoRef);
  const lista = t.formacoes.lista;
  const emCurso = useMemo(() => {
    const i = lista.findIndex((f) => f.estado === 'cursando');
    return i < 0 ? 0 : i;
  }, [lista]);
  const carrossel = useCarrossel(lista.length, emCurso, ativo);

  useArrowKeys(ativo, carrossel.andar);

  return (
    <section
      ref={secaoRef}
      className={`${comum.secao} ${comum.rolavel} ${styles.secao}`}
      aria-label={t.nav.formacao}
    >
      <div className={`${comum.bloco} ${styles.bloco}`} data-ativo={ativo || undefined}>
        <p className={comum.indice}>
          <span>{indice}</span>
          <span className={comum.indiceRisco} aria-hidden="true" />
        </p>

        <div className={comum.cabecalho}>
          <h2 className={comum.titulo}>{t.formacoes.titulo}</h2>
          <p className={comum.intro}>{t.formacoes.intro}</p>
        </div>

        <div className={styles.arena}>
          <div
            ref={carrossel.palcoRef}
            className={styles.palco}
            role="group"
            aria-label={t.formacoes.titulo}
            tabIndex={0}
          >
            {lista.map((f, i) => (
              <DiplomaCard
                key={f.slot}
                formacao={f}
                indice={i}
                total={lista.length}
                geo={carrossel.geometria(i)}
                ativo={ativo}
                onFocar={() => carrossel.focar(i)}
              />
            ))}
          </div>

          {/**
           * Os traços ficam **embaixo**, na horizontal, porque agora é esse o
           * eixo do movimento — em pé eles apontariam para um eixo que o
           * carrossel não tem.
           *
           * O ativo também é o relógio: um risco branco corre dentro dele pelo
           * tempo que falta até o próximo diploma. Ele existe porque o
           * automático precisa ser previsível — sem isso, a troca chega como um
           * salto no meio da leitura. O `data-pausado` congela o risco onde ele
           * estiver, que é o que o ponteiro em cima do palco faz com o relógio.
           */}
          <div
            className={styles.tracos}
            style={{ '--auto': `${AUTO_MS}ms` } as React.CSSProperties}
            data-pausado={carrossel.pausado || undefined}
          >
            {lista.map((f, i) => (
              <button
                key={f.slot}
                type="button"
                className={styles.traco}
                data-ativo={carrossel.ativo === i || undefined}
                aria-label={f.instituicao}
                aria-current={carrossel.ativo === i ? 'true' : undefined}
                onClick={() => carrossel.focar(i)}
              >
                <span className={styles.risco} aria-hidden="true" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
