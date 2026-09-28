import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { format } from '~/content';
import type { Filme, Filmes } from '~/data/types';
import { useReducedMotion } from '~/hooks/useReducedMotion';
import { useRemoto } from '~/hooks/useRemoto';
import { useLanguage, useT } from '~/i18n/useLanguage';
import { EstadoRemoto } from '../EstadoRemoto';
import { PerfilExterno } from '../PerfilExterno';
import comum from '../section.module.css';
import type { SectionProps } from '../types';
import styles from './FilmsSection.module.css';

const MARCAS = 5;

/** Quanto o pôster se afasta do ponteiro, em px: ao lado dele, e não embaixo. */
const AO_LADO = { x: 110, y: -60 };
/** O giro máximo, em graus, e quanto da velocidade do ponteiro vira giro. */
const GIRO_MAX = 14;
const GIRO_POR_PX = 0.6;

type Aba = 'favoritos' | 'recentes';

/**
 * A nota do Letterboxd, desenhada: cinco marcas de 1px preenchidas pela fração.
 *
 * A meia estrela sai exata em vez de arredondada, e quem usa leitor de tela
 * recebe o número no `aria-label`: a marca é desenho.
 */
function Nota({ nota }: { nota: number }) {
  return (
    <span className={styles.nota} role="img" aria-label={`${nota}/${MARCAS}`}>
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
 * O pôster que acompanha o ponteiro pela lista, inclinado pela velocidade dele.
 *
 * A posição é escrita **direto no `style`** num rAF, como a inclinação do
 * retrato: um `setState` por `pointermove` re-renderizaria a lista inteira. O
 * laço só existe enquanto há um pôster à vista; sem ele, nenhum quadro roda.
 * Sem hover (toque) ele não aparece, e cada linha mostra o pôster pequeno.
 */
function PosterFlutuante({
  poster,
  ponteiro,
}: {
  poster: string | null;
  ponteiro: React.RefObject<{ x: number; y: number }>;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduzido = useReducedMotion();
  const visivel = Boolean(poster);

  useEffect(() => {
    const el = ref.current;
    if (!visivel || !el) return;
    let antes = ponteiro.current.x;
    let giro = 0;
    let quadro = 0;
    const passo = () => {
      const { x, y } = ponteiro.current;
      // o giro segue a velocidade do ponteiro e volta a zero quando ele para
      const vx = x - antes;
      antes = x;
      giro += (Math.max(-GIRO_MAX, Math.min(GIRO_MAX, vx * GIRO_POR_PX)) - giro) * 0.12;
      const r = reduzido ? 0 : giro;
      el.style.transform = `translate(${x + AO_LADO.x}px, ${y + AO_LADO.y}px) translate(-50%, -50%) rotate(${r}deg)`;
      quadro = requestAnimationFrame(passo);
    };
    passo();
    return () => cancelAnimationFrame(quadro);
  }, [visivel, reduzido, ponteiro]);

  // no `body`: as telas se movem por `transform`, e um `position: fixed` dentro
  // delas passaria a medir a tela, e não a janela
  return createPortal(
    <span ref={ref} className={styles.flutuante} data-visivel={visivel || undefined} aria-hidden="true">
      {poster ? <img src={poster} alt="" /> : null}
    </span>,
    document.body,
  );
}

/**
 * Uma lista de filmes, como créditos: o título em contorno gigante, que se enche
 * ao ser apontado.
 *
 * À esquerda fica o que distingue um filme do outro **naquela lista**: nos
 * favoritos a posição, que é a única coisa que a lista afirma (a nota ali é
 * sempre cinco); nos recentes, o dia em que foi visto. À direita, o ano e, nos
 * recentes, a nota. **Sem nota é diferente de nota zero**: quem marcou como
 * visto sem avaliar recebe o rótulo, e não cinco marcas vazias.
 */
function Creditos({
  filmes,
  aba,
  apontar,
  ponteiro,
}: {
  filmes: Filme[];
  aba: Aba;
  apontar: (poster: string | null) => void;
  ponteiro: React.RefObject<{ x: number; y: number }>;
}) {
  const { t, lang } = useLanguage();
  // um formatador por idioma, e não um por render
  const dia = useMemo(
    () => new Intl.DateTimeFormat(lang, { day: '2-digit', month: '2-digit', timeZone: 'UTC' }),
    [lang],
  );
  const ranqueada = aba === 'favoritos';

  return (
    <ol className={styles.lista} onPointerLeave={() => apontar(null)}>
      {filmes.map((f, i) => (
        <li key={f.id} style={{ '--ordem': Math.min(i, 12) } as React.CSSProperties}>
          <a
            className={styles.linha}
            href={f.url}
            target="_blank"
            rel="noreferrer"
            onPointerEnter={(e) => {
              if (e.pointerType !== 'mouse') return;
              // o pôster nasce onde o ponteiro entrou, e não onde o último saiu
              ponteiro.current = { x: e.clientX, y: e.clientY };
              apontar(f.poster);
            }}
          >
            {ranqueada ? (
              <span className={styles.marcador} aria-label={format(t.filmes.posicao, { n: String(i + 1) })}>
                {String(i + 1).padStart(2, '0')}
              </span>
            ) : (
              <span className={styles.marcador}>
                {f.assistidoEm ? dia.format(new Date(f.assistidoEm)) : null}
              </span>
            )}

            {/* sem hover, o pôster mora na linha; com hover, ele segue o ponteiro */}
            {f.poster ? <img className={styles.miniatura} src={f.poster} alt="" loading="lazy" /> : null}

            <span className={styles.titulo}>{f.titulo}</span>

            <span className={styles.lado}>
              <span className={styles.ano}>{f.ano}</span>
              {f.revisita && <span className={styles.revisita}>{t.filmes.revisita}</span>}
              {ranqueada ? null : f.nota === null ? (
                <span className={styles.semNota}>{t.filmes.semNota}</span>
              ) : (
                <Nota nota={f.nota} />
              )}
            </span>
          </a>
        </li>
      ))}
    </ol>
  );
}

/**
 * Filmes: uma lista escolhida a dedo, e os últimos assistidos.
 *
 * O dado vem de `api/letterboxd`, e **não se repete**: um feed de filmes vistos
 * não muda enquanto alguém olha para ele.
 *
 * **Os favoritos vêm antes, e podem não vir.** Eles são uma escolha, e os
 * recentes são um registro: a escolha diz mais sobre quem escreveu a página, e
 * por isso abre a seção. Eles saem do HTML de uma lista do Letterboxd, que não
 * tem RSS, então a função os devolve vazios sem chamar isso de falha (ver
 * `dados.md`): sem lista, as abas somem e a seção é só a dos recentes.
 */
export function FilmsSection({ ativo, indice }: SectionProps) {
  const t = useT();
  const filmes = useRemoto<Filmes>('api/letterboxd', ativo);
  const [escolhida, setEscolhida] = useState<Aba>('favoritos');
  const [poster, setPoster] = useState<string | null>(null);

  const favoritos = filmes.dados?.favoritos ?? [];
  const recentes = filmes.dados?.recentes ?? [];
  const abas = (['favoritos', 'recentes'] as const).filter((a) =>
    a === 'favoritos' ? favoritos.length > 0 : recentes.length > 0,
  );
  const aba = abas.includes(escolhida) ? escolhida : abas[0];

  const apontar = useCallback((p: string | null) => setPoster(p), []);
  // onde o ponteiro está, para o pôster; um ref, e não estado: muda a cada quadro
  const ponteiro = useRef({ x: 0, y: 0 });

  return (
    <section
      className={`${comum.secao} ${comum.rolavel} ${styles.secao}`}
      aria-label={t.nav.filmes}
      onPointerMove={(e) => {
        ponteiro.current = { x: e.clientX, y: e.clientY };
      }}
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
        ) : !aba ? (
          <EstadoRemoto estado="vazio" />
        ) : (
          <div className={styles.creditos}>
            {/* com uma lista só não há o que escolher: o nome dela vira o rótulo */}
            <div className={styles.abas} role={abas.length > 1 ? 'group' : undefined}>
              {abas.map((a) =>
                abas.length > 1 ? (
                  <button
                    key={a}
                    type="button"
                    className={styles.aba}
                    aria-pressed={a === aba}
                    onClick={() => setEscolhida(a)}
                  >
                    {t.filmes[a]}
                  </button>
                ) : (
                  <span key={a} className={styles.aba} aria-current="true">
                    {t.filmes[a]}
                  </span>
                ),
              )}
            </div>

            {/* a `key` refaz a lista ao trocar de aba, e a cascata de entrada corre de novo */}
            <Creditos
              key={aba}
              filmes={aba === 'favoritos' ? favoritos : recentes}
              aba={aba}
              apontar={apontar}
              ponteiro={ponteiro}
            />
          </div>
        )}
      </div>

      <PosterFlutuante poster={ativo ? poster : null} ponteiro={ponteiro} />
    </section>
  );
}
