import { useMemo, useRef } from 'react';
import { useArrowKeys } from '~/hooks/useArrowKeys';
import { useEscalaQueCabe } from '~/hooks/useEscalaQueCabe';
import { useT } from '~/i18n/useLanguage';
import comum from '../section.module.css';
import type { SectionProps } from '../types';
import { DiplomaCard } from './DiplomaCard';
import styles from './EducationSection.module.css';
import { useDeck, VISIVEIS_ATRAS } from './useDeck';

/**
 * Formação: os diplomas numa pilha vertical.
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
 * Navegar: clique num diploma de baixo, arraste sobre o da frente, ←/→ enquanto
 * a seção está ativa, ou os traços ao lado. Por que o arraste vale nos dois
 * eixos, e por que a pilha não é circular, está em `useDeck`.
 *
 * **Ela abre no que está em curso**, não no primeiro da lista. A lista está em
 * ordem cronológica, e abrir nela é abrir no que já terminou há mais tempo; o
 * que responde "onde ele está academicamente hoje" é o de agora. Sem nenhum
 * `cursando`, o primeiro serve.
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
  const pilha = useDeck(lista.length, emCurso);

  useArrowKeys(ativo, pilha.andar);

  return (
    <section
      ref={secaoRef}
      className={`${comum.secao} ${comum.rolavel} ${styles.secao}`}
      // quantos podem espiar por baixo do da frente: é disso que sai a altura do palco
      style={{ '--atras': Math.min(VISIVEIS_ATRAS, lista.length - 1) } as React.CSSProperties}
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
            ref={pilha.palcoRef}
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
                geo={pilha.geometria(i)}
                ativo={ativo}
                onFocar={() => pilha.focar(i)}
              />
            ))}
          </div>

          {/**
           * Os traços ficam **em pé**, ao lado da pilha.
           *
           * Em Projetos eles são uma linha embaixo do palco porque a órbita anda
           * de lado; aqui a pilha anda para cima e para baixo, e um índice
           * horizontal apontaria para um eixo que não é o do movimento. Eles
           * também são o único jeito de pular direto para um diploma que já
           * saiu da pilha, já que voltar por cima é passo a passo.
           */}
          <div className={styles.tracos}>
            {lista.map((f, i) => (
              <button
                key={f.slot}
                type="button"
                className={styles.traco}
                data-ativo={pilha.ativo === i || undefined}
                aria-label={f.instituicao}
                aria-current={pilha.ativo === i ? 'true' : undefined}
                onClick={() => pilha.focar(i)}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
