import { useRef } from 'react';
import type { Musica } from '~/data/types';
import { useEscalaQueCabe } from '~/hooks/useEscalaQueCabe';
import { useRemoto } from '~/hooks/useRemoto';
import { useT } from '~/i18n/useLanguage';
import { EstadoRemoto } from '../EstadoRemoto';
import comum from '../section.module.css';
import type { SectionProps } from '../types';
import styles from './MusicSection.module.css';

/** De quanto em quanto tempo o "tocando agora" é conferido, com a seção na tela. */
const REPETIR = 20_000;

interface Linha {
  id: string;
  nome: string;
  url: string;
  /** o artista da faixa; a lista de artistas não tem segunda coluna */
  secundario?: string;
}

/**
 * As duas listas são a mesma lista.
 *
 * Mais tocadas e mais ouvidos diferem só na segunda coluna, e escrever as duas
 * seria duplicar numeração, escalonamento de entrada e corte de texto para ganhar
 * um campo opcional.
 */
function Lista({ titulo, itens }: { titulo: string; itens: Linha[] }) {
  return (
    <div className={styles.coluna}>
      <p className={styles.tituloLista}>{titulo}</p>
      <ol className={styles.lista}>
        {itens.map((item, i) => (
          <li key={item.id} className={styles.item} style={{ '--ordem': i } as React.CSSProperties}>
            <span className={styles.numero} aria-hidden="true">
              {String(i + 1).padStart(2, '0')}
            </span>
            <a className={styles.link} href={item.url} target="_blank" rel="noreferrer">
              {item.nome}
            </a>
            {item.secundario && <span className={styles.secundario}>{item.secundario}</span>}
          </li>
        ))}
      </ol>
    </div>
  );
}

/**
 * O conteúdo, quando ele existe.
 *
 * Fica separado do casco da seção porque os três estados de uma busca remota já
 * são um ramo, e desenhar o terceiro por dentro dele deixava a função com mais
 * caminhos do que se lê de uma vez.
 */
function Conteudo({ dados }: { dados: Musica }) {
  const t = useT();
  // sem nada tocando, o destaque é a última que tocou
  const destaque = dados.tocando ?? dados.recentes[0] ?? null;
  const aoVivo = Boolean(dados.tocando);

  if (!destaque) return <EstadoRemoto estado="vazio" />;

  return (
    <>
      <div className={styles.colunas}>
        <Lista
          titulo={t.musica.faixas}
          itens={dados.faixas.map((f) => ({
            id: f.id,
            nome: f.titulo,
            url: f.url,
            secundario: f.artista,
          }))}
        />
        <Lista
          titulo={t.musica.artistas}
          itens={dados.artistas.map((a) => ({ id: a.id, nome: a.nome, url: a.url }))}
        />
      </div>

      <div className={styles.destaque} data-vivo={aoVivo || undefined}>
        {destaque.capa ? (
          <img className={styles.capa} src={destaque.capa} alt="" loading="lazy" />
        ) : (
          <span className={styles.capa} aria-hidden="true" />
        )}

        <div className={styles.corpo}>
          <p className={styles.rotulo}>
            {aoVivo && <span className={styles.pulso} aria-hidden="true" />}
            {aoVivo ? t.musica.tocando : t.musica.silencio}
          </p>
          <a className={styles.faixaNome} href={destaque.url} target="_blank" rel="noreferrer">
            {destaque.titulo}
          </a>
          <p className={styles.artista}>{destaque.artista}</p>

          {aoVivo && destaque.duracaoMs ? (
            <span className={`${comum.trilha} ${styles.trilha}`} aria-hidden="true">
              <span
                /* a `key` carrega o progresso: é assim que cada resposta reinicia a
                   animação, em vez de continuar a anterior de onde ela estava */
                key={`${destaque.id}-${destaque.progressoMs ?? 0}`}
                className={styles.progresso}
                style={
                  {
                    '--de': `${((destaque.progressoMs ?? 0) / destaque.duracaoMs) * 100}%`,
                    '--resta': `${destaque.duracaoMs - (destaque.progressoMs ?? 0)}ms`,
                  } as React.CSSProperties
                }
              />
            </span>
          ) : null}
        </div>
      </div>
    </>
  );
}

/**
 * Música: o que está tocando, e o que mais tocou no mês.
 *
 * O dado vem de `api/spotify`, e a seção nunca fala com o Spotify: ela lê a
 * forma declarada em `data/types.ts`. A busca só acontece com a seção ativa, e se
 * repete a cada 20s enquanto ela estiver na tela e a aba visível (ver
 * `useRemoto`).
 *
 * **O que está tocando fica no pé da seção**, depois das duas listas. Ele é o
 * único bloco que muda enquanto alguém está olhando, e no alto ele empurrava
 * para baixo o que a seção tem de conteúdo — as listas, que são o mês inteiro.
 * Embaixo, ele é o rodapé vivo de um bloco parado, e é para lá que o olho volta.
 *
 * **O silêncio é o estado normal, não uma falha.** Ninguém escuta música o dia
 * inteiro, e a seção precisa continuar fazendo sentido calada: sem nada tocando,
 * o lugar do destaque passa a ser a última faixa ouvida, com o rótulo dizendo que
 * ela é passado, o bloco apagado e a capa sem cor. Uma seção que só funciona
 * enquanto o dono está de fone é uma seção quebrada na maior parte do dia.
 *
 * **A barra de progresso anda sozinha, em CSS.** O que chega é um instantâneo, e
 * sem nada ela ficaria parada por vinte segundos e daria um salto. Uma animação
 * linear do ponto atual até o fim, durando o que falta da faixa, mostra o tempo
 * passando sem custar um quadro de JavaScript.
 */
export function MusicSection({ ativo, indice }: SectionProps) {
  const t = useT();
  const secaoRef = useRef<HTMLElement>(null);
  useEscalaQueCabe(secaoRef);
  const musica = useRemoto<Musica>('api/spotify', ativo, REPETIR);

  return (
    <section
      ref={secaoRef}
      className={`${comum.secao} ${comum.rolavel} ${styles.secao}`}
      aria-label={t.nav.musica}
    >
      <div className={`${comum.bloco} ${styles.bloco}`} data-ativo={ativo || undefined}>
        <p className={comum.indice}>
          <span>{indice}</span>
          <span className={comum.indiceRisco} aria-hidden="true" />
        </p>

        <div className={comum.cabecalho}>
          <h2 className={comum.titulo}>{t.musica.titulo}</h2>
          <p className={comum.intro}>{t.musica.intro}</p>
        </div>

        {musica.estado === 'pronto' ? (
          <Conteudo dados={musica.dados} />
        ) : (
          <EstadoRemoto estado={musica.estado} />
        )}
      </div>
    </section>
  );
}
