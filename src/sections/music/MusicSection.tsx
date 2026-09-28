import { useEffect, useRef } from 'react';
import type { Musica } from '~/data/types';
import { useInclinacao } from '~/hooks/useInclinacao';
import { useRemoto } from '~/hooks/useRemoto';
import { useLanguage, useT } from '~/i18n/useLanguage';
import { EstadoRemoto } from '../EstadoRemoto';
import { PerfilExterno } from '../PerfilExterno';
import comum from '../section.module.css';
import type { SectionProps } from '../types';
import styles from './MusicSection.module.css';

/** De quanto em quanto tempo o "tocando agora" é conferido, com a seção na tela. */
const REPETIR = 20_000;

/** `m:ss`, que é como a duração de uma faixa se escreve em qualquer lugar. */
function relogio(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

/**
 * O tempo decorrido, andando de segundo em segundo.
 *
 * O que chega do Spotify é um instantâneo, e a busca só se repete a cada 20s:
 * escrito uma vez, o número ficaria vinte segundos parado ao lado de uma barra
 * que anda, o que é pior do que não ter número nenhum. O relógio local parte do
 * progresso que veio e conta a partir dali; a resposta seguinte o recoloca no
 * lugar, então a deriva nunca passa de uma repetição.
 *
 * **A escrita vai direto em `textContent`**, como na decifragem da bio: um
 * `setState` por segundo re-renderizaria a seção inteira para trocar quatro
 * caracteres. E é `setInterval` de 1s, não um `rAF`: o que muda é um segundo,
 * não um quadro.
 */
function Tempo({ inicioMs, duracaoMs }: { inicioMs: number; duracaoMs: number }) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const partida = performance.now();
    const escrever = () => {
      const agora = Math.min(duracaoMs, inicioMs + (performance.now() - partida));
      if (ref.current) ref.current.textContent = relogio(agora);
    };
    escrever();
    const id = window.setInterval(escrever, 1000);
    return () => window.clearInterval(id);
  }, [inicioMs, duracaoMs]);

  return <span ref={ref} className={styles.tempo} />;
}

/**
 * "há 9 horas", no idioma da página. O `Intl` escreve a frase inteira, então não
 * há texto de dicionário para ela: a ordem das palavras é do idioma.
 */
function haQuanto(iso: string, lang: string): string {
  const horas = (Date.now() - new Date(iso).getTime()) / 36e5;
  const rtf = new Intl.RelativeTimeFormat(lang, { numeric: 'auto' });
  if (horas < 1) return rtf.format(-Math.max(1, Math.round(horas * 60)), 'minute');
  if (horas < 24) return rtf.format(-Math.round(horas), 'hour');
  return rtf.format(-Math.round(horas / 24), 'day');
}

/**
 * O conteúdo, quando ele existe.
 *
 * Fica separado do casco da seção porque os três estados de uma busca remota já
 * são um ramo, e desenhar o terceiro por dentro dele deixava a função com mais
 * caminhos do que se lê de uma vez.
 */
function Conteudo({ dados }: { dados: Musica }) {
  const { t, lang } = useLanguage();
  // a capa inclina seguindo o ponteiro, como o retrato do Sobre e as outras artes
  const { alvoRef: capaRef, brilhoRef } = useInclinacao<HTMLAnchorElement>({
    grauX: 10,
    grauY: 12,
    escala: 1.05,
    perspectiva: 600,
  });
  // sem nada tocando, o destaque é a última que tocou
  const destaque = dados.tocando ?? dados.recentes[0] ?? null;
  const aoVivo = Boolean(dados.tocando);

  if (!destaque) return <EstadoRemoto estado="vazio" />;

  return (
    <>
      <div className={styles.destaque} data-vivo={aoVivo || undefined}>
        {/**
         * A capa **leva à faixa**, e é o mesmo destino do nome ao lado. Ela é a
         * maior superfície do bloco e a primeira coisa que o olho encontra: era
         * a única parte do destaque que parecia clicável e não era.
         *
         * Sem capa ela continua existindo, como moldura vazia, porque o link não
         * depende da imagem ter chegado.
         */}
        <a
          ref={capaRef}
          className={styles.capa}
          href={destaque.url}
          target="_blank"
          rel="noreferrer"
          aria-label={destaque.titulo}
        >
          {destaque.capa ? (
            <img
              src={destaque.capa}
              alt=""
              loading="lazy"
              // como em Jogos e Filmes: sem a imagem, a moldura de 1px volta a aparecer
              onError={(e) => {
                e.currentTarget.hidden = true;
              }}
            />
          ) : null}
          <span ref={brilhoRef} className={comum.brilho} aria-hidden="true" />
        </a>

        <div className={styles.corpo}>
          <p className={styles.rotulo}>
            {aoVivo ? (
              <>
                <span className={styles.pulso} aria-hidden="true" />
                {t.musica.tocando}
                {/* quatro traços de 1px subindo e descendo: o som, na régua da página */}
                <span className={styles.equalizador} aria-hidden="true">
                  <i />
                  <i />
                  <i />
                  <i />
                </span>
              </>
            ) : (
              <>
                {t.musica.silencio}
                {destaque.tocadaEm ? ` · ${haQuanto(destaque.tocadaEm, lang)}` : null}
              </>
            )}
          </p>
          <a className={styles.faixaNome} href={destaque.url} target="_blank" rel="noreferrer">
            {destaque.titulo}
          </a>
          {/* um link por artista: numa faixa de dois, o nome inteiro apontando
              para o primeiro seria uma resposta errada disfarçada de link */}
          <p className={styles.artista}>
            {destaque.artistas.map((a, i) => (
              <span key={a.url}>
                {i > 0 ? ', ' : ''}
                <a className={styles.artistaLink} href={a.url} target="_blank" rel="noreferrer">
                  {a.nome}
                </a>
              </span>
            ))}
          </p>

          {aoVivo && destaque.duracaoMs ? (
            <span className={styles.medidor} aria-hidden="true">
              <Tempo inicioMs={destaque.progressoMs ?? 0} duracaoMs={destaque.duracaoMs} />
              <span className={`${comum.trilha} ${styles.trilha}`}>
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
              <span className={styles.tempo}>{relogio(destaque.duracaoMs)}</span>
            </span>
          ) : null}
        </div>
      </div>

      <div className={styles.grupo}>
        <h3 className={styles.tituloLista}>{t.musica.faixas}</h3>
        {/* a parede de capas: apontar uma a traz para o foco e apaga as outras */}
        <ol className={styles.capas}>
          {dados.faixas.map((f, i) => {
            const artistas = f.artistas.map((a) => a.nome).join(', ');
            return (
              <li key={f.id} className={styles.faixa} style={{ '--ordem': i } as React.CSSProperties}>
                <a
                  className={styles.faixaLink}
                  href={f.url}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`${f.titulo} — ${artistas}`}
                >
                  {f.capa ? <img src={f.capa} alt="" loading="lazy" /> : null}
                  <span className={styles.numero} aria-hidden="true">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className={styles.legenda} aria-hidden="true">
                    <span className={styles.legendaTitulo}>{f.titulo}</span>
                    <span className={styles.legendaArtista}>{artistas}</span>
                  </span>
                </a>
              </li>
            );
          })}
        </ol>
      </div>

      <div className={styles.grupo}>
        <h3 className={styles.tituloLista}>{t.musica.artistas}</h3>
        <ol className={styles.artistas}>
          {dados.artistas.map((a, i) => (
            <li key={a.id} style={{ '--ordem': i } as React.CSSProperties}>
              <a className={styles.artistaCartao} href={a.url} target="_blank" rel="noreferrer">
                <span className={styles.retrato}>{a.imagem ? <img src={a.imagem} alt="" loading="lazy" /> : null}</span>
                <span className={styles.artistaNome}>{a.nome}</span>
              </a>
            </li>
          ))}
        </ol>
      </div>
    </>
  );
}

/**
 * Música: o que está tocando, e o que mais tocou no mês, em vitrine.
 *
 * O dado vem de `api/spotify`, e a seção nunca fala com o Spotify: ela lê a
 * forma declarada em `data/types.ts`. A busca só acontece com a seção ativa, e se
 * repete a cada 20s enquanto ela estiver na tela e a aba visível (ver
 * `useRemoto`).
 *
 * **As capas são o conteúdo.** O que tocou abre a seção, as oito mais tocadas
 * são uma parede de capas (apontar uma a traz para o foco e apaga as outras) e
 * os oito mais ouvidos fecham numa fileira de retratos. Escolhida entre três
 * direções num preview (a Vitrine; as outras eram um índice tipográfico com a
 * capa sob o cursor e um visor fixo que trocava com a rolagem).
 *
 * **O silêncio é o estado normal, não uma falha.** Ninguém escuta música o dia
 * inteiro, e a seção precisa continuar fazendo sentido calada: sem nada tocando,
 * o destaque passa a ser a última faixa ouvida, com o rótulo dizendo há quanto
 * tempo, o bloco apagado e a capa sem cor.
 *
 * **A barra de progresso anda sozinha, em CSS.** O que chega é um instantâneo, e
 * sem nada ela ficaria parada por vinte segundos e daria um salto. Uma animação
 * linear do ponto atual até o fim, durando o que falta da faixa, mostra o tempo
 * passando sem custar um quadro de JavaScript. Só o relógio ao lado dela precisa
 * de JavaScript, e ele custa uma escrita de texto por segundo (ver `Tempo`).
 */
export function MusicSection({ ativo, indice }: SectionProps) {
  const t = useT();
  const musica = useRemoto<Musica>('api/spotify', ativo, REPETIR);

  return (
    <section
      className={`${comum.secao} ${comum.rolavel} ${styles.secao}`}
      aria-label={t.nav.musica}
    >
      <div className={`${comum.bloco} ${styles.bloco}`} data-ativo={ativo || undefined}>
        <p className={comum.indice}>
          <span>{indice}</span>
          <span className={comum.indiceRisco} aria-hidden="true" />
        </p>

        <div className={comum.cabecalho}>
          <div className={comum.linhaTitulo}>
            <h2 className={comum.titulo}>{t.musica.titulo}</h2>
            <PerfilExterno secao="musica" />
          </div>
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
