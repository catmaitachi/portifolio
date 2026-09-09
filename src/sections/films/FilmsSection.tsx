import { useRef } from 'react';
import { format } from '~/content';
import type { Filme, Filmes } from '~/data/types';
import { useEscalaQueCabe } from '~/hooks/useEscalaQueCabe';
import { useInclinacao } from '~/hooks/useInclinacao';
import { useRemoto } from '~/hooks/useRemoto';
import { useT } from '~/i18n/useLanguage';
import { EstadoRemoto } from '../EstadoRemoto';
import { PerfilExterno } from '../PerfilExterno';
import comum from '../section.module.css';
import type { SectionProps } from '../types';
import styles from './FilmsSection.module.css';

/** Quantas marcas a nota tem. O Letterboxd vai de 0 a 5, com meias. */
const MARCAS = 5;

/**
 * A nota, desenhada.
 *
 * Cinco marcas de 1px preenchidas pela fração cabem na régua da página melhor
 * que um glifo de estrela, que traria uma forma que não existe em nenhum outro
 * lugar aqui; e a meia estrela do Letterboxd fica exata, em vez de arredondada
 * para o glifo mais próximo. Quem usa leitor de tela recebe o número no
 * `aria-label` — a marca é desenho.
 */
function Nota({ nota }: { nota: number }) {
  return (
    <span className={styles.nota} aria-label={`${nota}/${MARCAS}`}>
      {Array.from({ length: MARCAS }, (_, m) => (
        <span
          key={m}
          className={styles.marca}
          aria-hidden="true"
          style={
            {
              // a fração desta marca: cheia, vazia, ou metade
              '--cheio': `${Math.min(1, Math.max(0, nota - m)) * 100}%`,
            } as React.CSSProperties
          }
        />
      ))}
    </span>
  );
}

/**
 * Um filme: pôster, nome, ano e, no pé, a nota ou o lugar na lista.
 *
 * É o mesmo cartão nos dois carrosséis, e a única diferença é essa última peça.
 * Nos **favoritos** a nota não diz nada: uma lista de favoritos é feita de
 * cincos, e cinco marcas cheias em todos os cartões seriam a mesma informação
 * repetida doze vezes. O que distingue um favorito do outro ali é a **posição**,
 * que é a única coisa que a lista afirma, então é ela que aparece.
 *
 * Nos **vistos por último** é o contrário: a ordem é cronológica e não é
 * julgamento nenhum, e o que distingue um do outro é a nota.
 */
function Cartao({ filme, posicao }: { filme: Filme; posicao?: number }) {
  const t = useT();
  /**
   * Quem inclina é o **pôster**, não o cartão inteiro: o nome e o rodapé ficam
   * onde estão, legíveis, e a moldura da imagem já é o `position: relative` com
   * `overflow: hidden` que o brilho pede. Os graus são discretos porque um
   * pôster de 104px inclinado como um retrato de 270 vira um losango.
   */
  const { alvoRef, brilhoRef } = useInclinacao<HTMLSpanElement>({
    grauX: 10,
    grauY: 12,
    escala: 1.05,
    perspectiva: 600,
  });

  return (
    <a className={styles.cartao} href={filme.url} target="_blank" rel="noreferrer">
      <span ref={alvoRef} className={styles.poster}>
        {filme.poster ? (
          <img
            src={filme.poster}
            alt=""
            loading="lazy"
            onError={(e) => {
              e.currentTarget.hidden = true;
            }}
          />
        ) : null}
        {filme.revisita && (
          <span className={styles.revisita} title={t.filmes.revisita}>
            {t.filmes.revisita}
          </span>
        )}
        <span ref={brilhoRef} className={comum.brilho} aria-hidden="true" />
      </span>

      <span className={styles.nome}>{filme.titulo}</span>
      <span className={styles.rodape}>
        <span className={styles.ano}>{filme.ano}</span>
        {posicao !== undefined ? (
          <span
            className={styles.posto}
            aria-label={format(t.filmes.posicao, { n: String(posicao) })}
          >
            {String(posicao).padStart(2, '0')}
          </span>
        ) : filme.nota === null ? (
          /* sem nota é diferente de nota zero: cinco marcas vazias afirmariam um
             julgamento que ninguém fez */
          <span className={styles.semNota}>{t.filmes.semNota}</span>
        ) : (
          <Nota nota={filme.nota} />
        )}
      </span>
    </a>
  );
}

/**
 * Uma faixa de filmes que rola de lado.
 *
 * **Carrossel, e não grade**, porque agora são duas listas numa seção de uma
 * tela de altura: empilhadas em grade elas passariam do rodapé, e reduzir o
 * pôster até caber deixaria os dois blocos ilegíveis. Deitada, cada lista custa
 * uma linha, e o que não cabe na largura continua alcançável.
 *
 * A rolagem é **nativa** — arrasto, roda e inércia vêm de graça, como no
 * carrossel de formações. A faixa entra na tabulação (`tabIndex`) porque uma
 * região rolável que não recebe foco é inalcançável por teclado, e o rótulo é o
 * mesmo título que está escrito ao lado dela.
 *
 * `--base` é o atraso de onde a entrada desta faixa começa: as duas listas
 * chegam uma depois da outra, e não ao mesmo tempo.
 */
function Carrossel({
  titulo,
  filmes,
  base,
  ranqueada,
}: {
  titulo: string;
  filmes: Filme[];
  base: number;
  /** a ordem da lista **é** o ranking, e cada cartão mostra o próprio lugar */
  ranqueada?: boolean;
}) {
  return (
    <div className={styles.grupo}>
      <p className={styles.tituloLista}>{titulo}</p>
      <ul
        className={styles.carrossel}
        style={{ '--base': `${base}ms` } as React.CSSProperties}
        tabIndex={0}
        aria-label={titulo}
      >
        {filmes.map((f, i) => (
          <li key={f.id} style={{ '--ordem': i } as React.CSSProperties}>
            <Cartao filme={f} posicao={ranqueada ? i + 1 : undefined} />
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Filmes: uma lista escolhida a dedo, e os últimos assistidos.
 *
 * O dado vem de `api/letterboxd`, e **não se repete**: um feed de filmes vistos
 * não muda enquanto alguém olha para ele, e repetir a busca gastaria requisição
 * para redesenhar o mesmo.
 *
 * **Os favoritos vêm antes, e podem não vir.** Eles são uma escolha, e os
 * recentes são um registro — a escolha diz mais sobre quem escreveu a página, e
 * por isso abre a seção. Mas eles saem do HTML de uma lista do Letterboxd, que
 * não tem RSS, então a função os devolve vazios sem chamar isso de falha (ver
 * `dados.md`): sem lista, a seção é só o segundo bloco, e continua inteira.
 */
export function FilmsSection({ ativo, indice }: SectionProps) {
  const t = useT();
  const secaoRef = useRef<HTMLElement>(null);
  useEscalaQueCabe(secaoRef);
  const filmes = useRemoto<Filmes>('api/letterboxd', ativo);

  const favoritos = filmes.dados?.favoritos ?? [];
  const recentes = filmes.dados?.recentes ?? [];

  return (
    <section
      ref={secaoRef}
      className={`${comum.secao} ${comum.rolavel} ${styles.secao}`}
      aria-label={t.nav.filmes}
    >
      <div className={`${comum.bloco} ${styles.bloco}`} data-ativo={ativo || undefined}>
        <p className={comum.indice}>
          <span>{indice}</span>
          <span className={comum.indiceRisco} aria-hidden="true" />
        </p>

        <div className={comum.cabecalho}>
          <div className={comum.linhaTitulo}>
            <h2 className={comum.titulo}>{t.filmes.titulo}</h2>
            <PerfilExterno secao="filmes" />
          </div>
          <p className={comum.intro}>{t.filmes.intro}</p>
        </div>

        {filmes.estado !== 'pronto' ? (
          <EstadoRemoto estado={filmes.estado} />
        ) : recentes.length === 0 && favoritos.length === 0 ? (
          <EstadoRemoto estado="vazio" />
        ) : (
          <>
            {favoritos.length > 0 && (
              <Carrossel titulo={t.filmes.favoritos} filmes={favoritos} base={0} ranqueada />
            )}
            {recentes.length > 0 && (
              <Carrossel
                titulo={t.filmes.recentes}
                filmes={recentes}
                base={favoritos.length > 0 ? 220 : 0}
              />
            )}
          </>
        )}
      </div>
    </section>
  );
}
