import { useId, useMemo } from 'react';
import { LOGO_ESCALAS, LOGOS, type EstadoFormacao, type SecaoDossie } from '~/content';
import { useDecipher } from '~/hooks/useDecipher';
import { useT } from '~/i18n/useLanguage';
import comum from '../section.module.css';
import type { SectionProps } from '../types';
import styles from './AboutSection.module.css';
import { PortraitCard } from './PortraitCard';

/**
 * A ordem das formações: o que está em curso primeiro, porque responde "onde ele
 * está hoje"; depois o que foi concluído; e a pretensão por último, que ainda não
 * é nem uma coisa nem outra. Dentro do mesmo estado vale a ordem do dicionário,
 * de graça, porque `sort` é estável.
 */
const ORDEM_ESTADO: Record<EstadoFormacao, number> = { cursando: 0, concluido: 1, pretensao: 2 };

/**
 * A onda do trilho, em unidades do `viewBox`: cada formação ocupa `PASSO` de
 * altura, e a onda cruza o eixo (x = `EIXO`) no meio de cada uma, que é onde fica
 * o nó. Entre dois nós ela se abre `AMPLITUDE` para um lado, alternando.
 */
const PASSO = 100;
const EIXO = 20;
const AMPLITUDE = 13;

/** O caminho da onda para `n` formações; a curva é função de y, amostrada. */
function ondaVertical(n: number): string {
  const pontos: string[] = [];
  for (let y = 0; y <= n * PASSO; y += 4) {
    const x = EIXO + AMPLITUDE * Math.sin(Math.PI * (y / PASSO - 0.5));
    pontos.push(`${x.toFixed(2)},${y}`);
  }
  return `M${pontos.join('L')}`;
}

/**
 * Quantos segmentos tem o medidor de uma formação sem contagem de períodos: o
 * concluído que não guarda `progresso` sai com a barra inteira acesa, e o número
 * só decide a textura dela, igual à das que têm contagem.
 */
const SEGMENTOS = 8;

/**
 * O dossiê, em duas colunas: a folha de rosto grampeada ao lado do relatório.
 *
 * **À esquerda, presa enquanto o resto rola**, a ficha: o retrato com cantos de
 * mira e, embaixo dele, os campos, rótulo em versalete sobre o valor. Os campos
 * saem de onde o dado já mora (o nome e a ocupação do `hero`, os fatos de
 * `sobre.dados`), e o que ainda não existe aparece como reservado: é um campo que
 * ninguém preencheu, e não pode ser inventado.
 *
 * **À direita, o relatório**: o nome em título e as seções numeradas, com o
 * número grande e apagado. Os textos (Perfil, Trabalho, Valores e missão) e a
 * formação, em lista, com o trilho ao lado desenhado como a curva da
 * Trajetória, só que em pé (ver `Onda`). Cada seção de texto decifra os próprios parágrafos quando o dossiê
 * entra, que aqui lê como o arquivo sendo aberto.
 */
export function AboutSection({ ativo, indice }: SectionProps) {
  const t = useT();
  const { sobre, formacoes, hero } = t;

  const formacoesOrdenadas = useMemo(
    () => [...formacoes.lista].sort((a, b) => ORDEM_ESTADO[a.estado] - ORDEM_ESTADO[b.estado]),
    [formacoes.lista],
  );

  const campos: { key: string; rotulo: string; valor: string | null }[] = [
    { key: 'nome', rotulo: sobre.rotulos.nome, valor: sobre.nomeCompleto },
    { key: 'ocupacao', rotulo: sobre.rotulos.ocupacao, valor: hero.legenda },
    ...sobre.dados.map((d) => ({ key: d.key, rotulo: d.rotulo, valor: d.valor })),
  ];

  const numero = (i: number) => String(i + 1).padStart(2, '0');

  return (
    <section className={`${comum.secao} ${comum.rolavel} ${styles.secao}`} aria-label={t.nav.sobre}>
      <div className={`${comum.bloco} ${styles.bloco}`} data-ativo={ativo || undefined}>
        <aside className={styles.lado}>
          <PortraitCard className={styles.retrato} />
          <dl className={styles.campos}>
            {campos.map((c) => (
              <div key={c.key} className={styles.campo} data-reservado={c.valor ? undefined : true}>
                <dt>{c.rotulo}</dt>
                <dd>{c.valor ?? sobre.reservado}</dd>
              </div>
            ))}
          </dl>
        </aside>

        <div className={styles.relatorio}>
          <header className={styles.cabecalho}>
            <p className={styles.arquivo}>
              {indice} · {sobre.titulo}
            </p>
            <h2 className={styles.nome}>{hero.nome}</h2>
          </header>

          {sobre.secoes.map((s, i) => (
            <SecaoTexto key={s.key} secao={s} numero={numero(i)} ativo={ativo} reservado={sobre.reservado} />
          ))}

          <div className={styles.parte}>
            <h3 className={styles.parteTitulo}>
              <span>{numero(sobre.secoes.length)}</span>
              {formacoes.titulo}
            </h3>
            <div className={styles.formacao}>
              <Onda estados={formacoesOrdenadas.map((f) => f.estado)} ativo={ativo} />
              <ol className={styles.lista}>
                {formacoesOrdenadas.map((f, i) => {
                  const logo = LOGOS[f.slot];
                  return (
                    <li key={f.slot} className={styles.passo} data-estado={f.estado}>
                      <span className={styles.no} style={{ '--i': i } as React.CSSProperties} aria-hidden="true">
                        <span className={styles.pulso} />
                        <span className={styles.ponto} />
                      </span>
                      {logo ? (
                        <span
                          className={styles.logo}
                          role="img"
                          aria-label={f.instituicao}
                          style={
                            {
                              '--logo': `url("${logo}")`,
                              '--logo-escala': LOGO_ESCALAS[f.slot]?.escala ?? 1,
                            } as React.CSSProperties
                          }
                        />
                      ) : (
                        <span className={styles.logo} aria-hidden="true" />
                      )}
                      <span className={styles.passoTexto}>
                        <span className={styles.estado}>{formacoes.estados[f.estado]}</span>
                        <span className={styles.curso}>{f.curso ? `${f.nivel} · ${f.curso}` : f.nivel}</span>
                        <Medidor
                          total={f.progresso?.total ?? SEGMENTOS}
                          feito={f.progresso?.feito ?? (f.estado === 'concluido' ? SEGMENTOS : 0)}
                        />
                        {f.instituicao || f.progresso || f.conclusao ? (
                          <span className={styles.detalhe}>
                            {[
                              f.instituicao,
                              f.progresso
                                ? `${f.progresso.feito}/${f.progresso.total} ${formacoes.rotulos.periodos}`
                                : f.conclusao
                                  ? `${formacoes.rotulos.conclusao} ${f.conclusao}`
                                  : null,
                            ]
                              .filter(Boolean)
                              .join(' · ')}
                          </span>
                        ) : null}
                      </span>
                    </li>
                  );
                })}
              </ol>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * O trilho da formação: a onda da Trajetória, em pé.
 *
 * Adaptada, e não copiada: as mesmas peças (a onda principal apagada, a mesma
 * onda espelhada no eixo e mais apagada ainda, o trecho aceso e os pulsos que
 * correm por ela), numa linha vertical ao lado da lista. A onda cruza o eixo no
 * meio de cada formação, e é ali que o nó fica, então os nós continuam em coluna
 * e a lista continua sendo lista: não há janela nem navegação.
 *
 * O trecho aceso vai do nó do que está em curso ao do último concluído, que é o
 * caminho já andado; a pretensão fica no apagado, porque ainda não aconteceu.
 */
function Onda({ estados, ativo }: { estados: EstadoFormacao[]; ativo: boolean }) {
  const corteId = `${useId()}-corte`;
  const n = estados.length;
  const caminho = useMemo(() => ondaVertical(n), [n]);
  const andados = estados.flatMap((e, i) => (e === 'pretensao' ? [] : [i]));
  const de = ((andados[0] ?? 0) + 0.5) * PASSO;
  const ate = ((andados.at(-1) ?? 0) + 0.5) * PASSO;

  return (
    <svg
      className={styles.onda}
      viewBox={`0 0 ${EIXO * 2} ${n * PASSO}`}
      preserveAspectRatio="none"
      data-entrada={ativo || undefined}
      aria-hidden="true"
    >
      <defs>
        <clipPath id={corteId} clipPathUnits="userSpaceOnUse">
          <rect x="0" y={de} width={EIXO * 2} height={ate - de} />
        </clipPath>
      </defs>
      <g className={styles.giro} data-lado="inverso">
        <path className={styles.inversa} d={caminho} fill="none" stroke="rgba(255,255,255,.05)" vectorEffect="non-scaling-stroke" />
      </g>
      <g className={styles.giro}>
        <path d={caminho} fill="none" stroke="rgba(255,255,255,.12)" vectorEffect="non-scaling-stroke" />
        <path d={caminho} clipPath={`url(#${corteId})`} fill="none" stroke="rgba(255,255,255,.5)" vectorEffect="non-scaling-stroke" />
        {/* SMIL não pausa fora de vista: os pulsos só existem com a seção ativa */}
        {ativo ? (
          <circle r="1.6" fill="#fff" opacity=".7">
            <animateMotion dur={`${n * 5}s`} repeatCount="indefinite" path={caminho} />
          </circle>
        ) : null}
      </g>
    </svg>
  );
}

/**
 * O medidor de uma formação: uma linha por período, preenchida até onde foi
 * feito, em sequência (`--k`).
 * É desenho, e o número que ele mostra está escrito ao lado (`detalhe`), então
 * fica fora da árvore de acessibilidade.
 */
function Medidor({ total, feito }: { total: number; feito: number }) {
  return (
    <span className={styles.medidor} style={{ '--segmentos': total } as React.CSSProperties} aria-hidden="true">
      {Array.from({ length: total }, (_, k) => (
        // o segmento é a posição dele na barra: não há identidade além dela
        <i key={k} data-aceso={k < feito || undefined} style={{ '--k': k } as React.CSSProperties} />
      ))}
    </span>
  );
}

interface SecaoTextoProps {
  secao: SecaoDossie;
  numero: string;
  ativo: boolean;
  reservado: string;
}

/**
 * Uma seção de texto do dossiê. Cada uma decifra os próprios parágrafos: o
 * `useDecipher` trabalha nos `<p>` filhos diretos de um contêiner, e com os
 * títulos no meio eles não podem dividir um só.
 */
function SecaoTexto({ secao, numero, ativo, reservado }: SecaoTextoProps) {
  const texto = useDecipher(ativo, secao.paragrafos);
  return (
    <div className={styles.parte}>
      <h3 className={styles.parteTitulo}>
        <span>{numero}</span>
        {secao.titulo}
      </h3>
      {secao.paragrafos.length ? (
        <div ref={texto} className={styles.texto}>
          {/* a chave é o texto: trocar de idioma recria o nó, e a decifragem começa limpa */}
          {secao.paragrafos.map((par) => (
            <p key={par}>{par}</p>
          ))}
        </div>
      ) : (
        <p className={styles.reservado}>{reservado}</p>
      )}
    </div>
  );
}
