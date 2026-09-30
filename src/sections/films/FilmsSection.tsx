import { useEffect, useMemo, useRef, useState } from 'react';
import { format } from '~/content';
import type { Filme, Filmes } from '~/data/types';
import { useReducedMotion } from '~/hooks/useReducedMotion';
import { useRemoto } from '~/hooks/useRemoto';
import { useLanguage, useT } from '~/i18n/useLanguage';
import { EstadoRemoto, type SemDado, Traco } from '../EstadoRemoto';
import { PerfilExterno } from '../PerfilExterno';
import comum from '../section.module.css';
import type { SectionProps } from '../types';
import styles from './FilmsSection.module.css';

const MARCAS = 5;

/** A película anda sozinha para a esquerda, em px/s, e volta a essa velocidade depois de um empurrão. */
const VELOCIDADE = 28;
/** Quanto do empurrão (roda, arraste) fica a cada segundo: a velocidade volta à base aos poucos. */
const RETORNO = 3.2;
/** A inclinação máxima dos quadros, em graus, e quantos px/s viram um grau. */
const INCLINA_MAX = 8;
const PX_POR_GRAU = 90;
/** A roda do mouse sobre a película vira velocidade; a página continua rolando. */
const RODA = 0.9;
/** O passo dos furos da película, em px (o desenho deles está no CSS). */
const FURO = 22;
/** Quanto tempo a legenda leva para se decifrar, em ms. */
const DECIFRA_MS = 420;
/** Só ASCII técnico: a fonte da página não tem outros glifos (ver `entradas.md`). */
const SINAIS = '01<>/_#*+=:';

const limitar = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

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
 * O título na legenda, decifrado da esquerda para a direita como a bio.
 *
 * A `key` de quem o usa é o filme: cada troca monta um nó novo, e o efeito
 * escreve direto no `textContent` dele sem disputar o texto com o React. O último
 * quadro escreve o título exato, que é o mesmo que o React pôs ali.
 */
function TituloDecifrado({ texto }: { texto: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduzido = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (reduzido || !el) return;
    const inicio = performance.now();
    let quadro = 0;
    const passo = (agora: number) => {
      const k = (agora - inicio) / DECIFRA_MS;
      el.textContent = [...texto]
        .map((c, i) => (c === ' ' || k * texto.length > i ? c : SINAIS[(Math.random() * SINAIS.length) | 0]))
        .join('');
      if (k < 1) quadro = requestAnimationFrame(passo);
    };
    quadro = requestAnimationFrame(passo);
    return () => {
      cancelAnimationFrame(quadro);
      el.textContent = texto;
    };
  }, [texto, reduzido]);

  return (
    <span ref={ref} className={styles.legendaTitulo}>
      {texto}
    </span>
  );
}

/**
 * A película: os pôsteres numa tira de filme que corre devagar para a esquerda.
 *
 * - **A velocidade é o gesto.** A roda do mouse sobre a tira e o arraste entram
 *   como velocidade, que volta à base aos poucos, e a velocidade inclina os
 *   quadros (o ScrollVelocity da React Bits, sem a mola do motion). A roda **não**
 *   é engolida: a página continua rolando, e a tira só sente o empurrão.
 * - **Apontar um quadro para a tira**, e a legenda passa a ser dele. Sem ninguém
 *   apontando, a legenda é do quadro no centro, e troca quando ele passa.
 * - **A lista vem duas vezes**, para a tira dar a volta sem emenda; a segunda
 *   cópia é desenho (`aria-hidden`, fora da tabulação).
 * - O rAF escreve direto no `style` (`transform` e `--furos`), e só roda com a
 *   seção em cena. Sem movimento, nada anda: a tira vira uma faixa que rola de
 *   lado, e a legenda segue o ponteiro e o foco.
 */
function Pelicula({ filmes, aba, ativo }: { filmes: Filme[]; aba: Aba; ativo: boolean }) {
  const { t, lang } = useLanguage();
  const reduzido = useReducedMotion();
  const faixa = useRef<HTMLDivElement>(null);
  const trilho = useRef<HTMLOListElement>(null);
  const [foco, setFoco] = useState(0);
  const mov = useRef({ x: 0, v: 0, parado: false, foco: 0, passo: 1, arraste: null as { x: number; andou: boolean } | null });

  // um formatador por idioma, e não um por render
  const dia = useMemo(
    () => new Intl.DateTimeFormat(lang, { day: '2-digit', month: '2-digit', timeZone: 'UTC' }),
    [lang],
  );
  const ranqueada = aba === 'favoritos';
  const copias = reduzido ? [0] : [0, 1];

  const focar = (i: number) => {
    mov.current.foco = i;
    setFoco(i);
  };

  // a largura de um quadro mais o vão: medida quando muda, e não a cada quadro
  useEffect(() => {
    const tri = trilho.current;
    if (!tri) return;
    const medir = () => {
      const q = tri.firstElementChild as HTMLElement | null;
      if (q) mov.current.passo = q.offsetWidth + parseFloat(getComputedStyle(tri).columnGap || '0');
    };
    medir();
    const obs = new ResizeObserver(medir);
    obs.observe(tri);
    return () => obs.disconnect();
  }, [filmes.length]);

  useEffect(() => {
    const tri = trilho.current;
    const fx = faixa.current;
    if (!ativo || reduzido || !tri || !fx) return;
    const m = mov.current;
    let antes = performance.now();
    let quadro = 0;
    const passo = (agora: number) => {
      const dt = Math.min(0.05, (agora - antes) / 1000);
      antes = agora;
      if (!m.arraste) {
        m.v += ((m.parado ? 0 : -VELOCIDADE) - m.v) * Math.min(1, dt * RETORNO);
        m.x += m.v * dt;
      }
      // a volta tem o comprimento de uma cópia: passando dela, a outra está no mesmo lugar
      const volta = m.passo * filmes.length;
      m.x = (((m.x % volta) + volta) % volta) - volta;
      const inclina = limitar(m.v / PX_POR_GRAU, -INCLINA_MAX, INCLINA_MAX);
      tri.style.transform = `translate3d(${m.x.toFixed(1)}px, 0, 0) skewX(${inclina.toFixed(2)}deg)`;
      fx.style.setProperty('--furos', `${(m.x % FURO).toFixed(1)}px`);
      if (!m.parado) {
        const i = Math.floor((fx.clientWidth / 2 - m.x) / m.passo) % filmes.length;
        if (i !== m.foco) {
          m.foco = i;
          setFoco(i);
        }
      }
      quadro = requestAnimationFrame(passo);
    };
    quadro = requestAnimationFrame(passo);

    const roda = (e: WheelEvent) => {
      m.v -= (e.deltaY + e.deltaX) * RODA;
    };
    fx.addEventListener('wheel', roda, { passive: true });
    return () => {
      cancelAnimationFrame(quadro);
      fx.removeEventListener('wheel', roda);
    };
  }, [ativo, reduzido, filmes.length]);

  const filme = filmes[foco] ?? filmes[0];

  return (
    <div className={styles.pelicula}>
      <div
        ref={faixa}
        className={styles.faixa}
        onPointerDown={(e) => {
          if (reduzido) return;
          mov.current.arraste = { x: e.clientX, andou: false };
        }}
        onPointerMove={(e) => {
          const a = mov.current.arraste;
          if (!a) return;
          const dx = e.clientX - a.x;
          if (!a.andou && Math.abs(dx) < 4) return;
          if (!a.andou) e.currentTarget.setPointerCapture(e.pointerId);
          a.andou = true;
          a.x = e.clientX;
          mov.current.x += dx;
          mov.current.v = dx * 60;
        }}
        onPointerUp={() => {
          // o clique que fecha um arraste não abre o filme
          const a = mov.current.arraste;
          setTimeout(() => {
            if (mov.current.arraste === a) mov.current.arraste = null;
          });
        }}
        onPointerCancel={() => {
          // o toque virou rolagem da página: o arraste acaba aqui
          mov.current.arraste = null;
        }}
        onPointerLeave={() => {
          mov.current.parado = false;
        }}
      >
        <ol ref={trilho} className={styles.trilho}>
          {copias.flatMap((c) =>
            filmes.map((f, i) => (
              <li key={`${c}-${f.id}`} data-foco={i === foco || undefined} aria-hidden={c ? true : undefined}>
                <a
                  className={styles.quadro}
                  href={f.url}
                  target="_blank"
                  rel="noreferrer"
                  tabIndex={c ? -1 : undefined}
                  draggable={false}
                  aria-label={
                    ranqueada
                      ? `${format(t.filmes.posicao, { n: String(i + 1) })}: ${f.titulo} (${f.ano})`
                      : `${f.titulo} (${f.ano})`
                  }
                  onPointerEnter={(e) => {
                    if (e.pointerType !== 'mouse') return;
                    mov.current.parado = true;
                    focar(i);
                  }}
                  onFocus={() => {
                    // o foco do teclado traz o quadro para o meio, para ele não passar fora de vista
                    const m = mov.current;
                    m.parado = true;
                    if (!reduzido && faixa.current) {
                      faixa.current.scrollLeft = 0;
                      m.x = faixa.current.clientWidth / 2 - (i + 0.5) * m.passo;
                    }
                    focar(i);
                  }}
                  onBlur={() => {
                    mov.current.parado = false;
                  }}
                  onClick={(e) => {
                    if (mov.current.arraste?.andou) e.preventDefault();
                  }}
                >
                  {f.poster ? (
                    <img
                      src={f.poster}
                      alt=""
                      loading="lazy"
                      draggable={false}
                      onError={(e) => {
                        e.currentTarget.hidden = true;
                      }}
                    />
                  ) : (
                    <span className={styles.semPoster}>{f.titulo}</span>
                  )}
                </a>
              </li>
            )),
          )}
        </ol>
      </div>

      {/* a legenda do quadro em foco; não é `aria-live`: ela troca sozinha a cada poucos segundos */}
      <p className={styles.legenda}>
        <span className={styles.legendaMeta}>
          <span>
            {ranqueada
              ? `${String(foco + 1).padStart(2, '0')}º`
              : filme.assistidoEm
                ? dia.format(new Date(filme.assistidoEm))
                : null}
          </span>
          <span>{filme.ano}</span>
          {filme.revisita && <span>{t.filmes.revisita}</span>}
          {ranqueada ? null : filme.nota === null ? <span>{t.filmes.semNota}</span> : <Nota nota={filme.nota} />}
        </span>
        <TituloDecifrado key={filme.id} texto={filme.titulo} />
      </p>
    </div>
  );
}

/**
 * A seção sem o dado: as abas, a película com os quadros vazios e os furos, e a
 * legenda por chegar, com as mesmas classes, então nada pula quando ela chega.
 */
function Molde({ estado }: { estado: SemDado }) {
  return (
    <EstadoRemoto estado={estado}>
      <div className={styles.conteudo}>
        <div className={styles.abas}>
          <span className={styles.aba}>
            <Traco w="9ch" />
          </span>
          <span className={styles.aba}>
            <Traco w="15ch" />
          </span>
        </div>
        <div className={styles.pelicula}>
          <div className={styles.faixa}>
            <ol className={styles.trilho}>
              {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                <li key={i}>
                  <span className={styles.quadro} />
                </li>
              ))}
            </ol>
          </div>
          <p className={styles.legenda}>
            <span className={styles.legendaMeta}>
              <Traco w="10ch" />
            </span>
            <span className={styles.legendaTitulo}>
              <Traco w="14ch" />
            </span>
          </p>
        </div>
      </div>
    </EstadoRemoto>
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

  const favoritos = filmes.dados?.favoritos ?? [];
  const recentes = filmes.dados?.recentes ?? [];
  const abas = (['favoritos', 'recentes'] as const).filter((a) =>
    a === 'favoritos' ? favoritos.length > 0 : recentes.length > 0,
  );
  const aba = abas.includes(escolhida) ? escolhida : abas[0];

  return (
    <section className={`${comum.secao} ${comum.rolavel} ${styles.secao}`} aria-label={t.nav.filmes}>
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
          <Molde estado={filmes.estado} />
        ) : !aba ? (
          <Molde estado="vazio" />
        ) : (
          <div className={styles.conteudo}>
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

            {/* a `key` refaz a película ao trocar de aba: ela volta ao começo e chega de novo */}
            <Pelicula
              key={aba}
              filmes={aba === 'favoritos' ? favoritos : recentes}
              aba={aba}
              ativo={ativo}
            />
          </div>
        )}
      </div>
    </section>
  );
}
