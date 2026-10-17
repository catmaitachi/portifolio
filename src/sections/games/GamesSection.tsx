import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { format, PERFIS } from '~/content';
import type { Jogo, Jogos, Minecraft, PerfilSteam } from '~/data/types';
import { useArrowKeys } from '~/hooks/useArrowKeys';
import { useReducedMotion } from '~/hooks/useReducedMotion';
import { useRemoto } from '~/hooks/useRemoto';
import { useLanguage, useT } from '~/i18n/useLanguage';
import { EstadoRemoto, type SemDado, Traco } from '../EstadoRemoto';
import { haQuanto } from '../haQuanto';
import { PerfilExterno } from '../PerfilExterno';
import comum from '../section.module.css';
import type { SectionProps } from '../types';
import { Boneco, PedestalVazio } from './Boneco';
import styles from './GamesSection.module.css';
import { Liga } from './Liga';

/** O "jogando agora" muda em minutos, não em segundos. */
const REPETIR = 60_000;

/** Minutos viram horas inteiras: 40min de um jogo não é informação, 12h é. */
const horas = (minutos: number) => Math.round(minutos / 60);

/**
 * A geometria do deque. A capa da frente está em `d = 0`; as de trás ficam à
 * direita e as que já passaram, à esquerda, e as duas filas são **pilhas**: cada
 * capa a mais é uma borda a mais, e a espessura da fila é a quantidade de jogos.
 *
 * O primeiro passo é largo (a vizinha mostra metade da cara) e os seguintes são
 * estreitos, só o bastante para cada capa aparecer como uma borda (`passo`,
 * medido pelo deque a partir da largura que ele tem). Elas também recuam no eixo
 * z, e o ponto de fuga fica na linha do chão: encolhem para o chão, e a
 * silhueta da fila vira uma escada que desce, como as barras de um gráfico.
 */
const PROFUNDIDADE = 150;
/** O que cada capa depois da primeira recua a mais: pouco, para a escada não despencar. */
const RECUO = 26;
/** A perspectiva do `.deque` (CSS), que a conta de largura precisa conhecer. */
const PERSPECTIVA = 1300;
/** Quanto a primeira vizinha se afasta, em frações da largura da capa. */
const ABRE = 0.5;
const GIRA = 14;
/** Quantos px de arraste andam uma capa. */
const ARRASTE_POR_CAPA = 90;
/** A mola que leva a posição até o alvo, por quadro: sem passar do ponto. */
const MOLA = 0.14;
/** O passo da pilha antes de o deque se medir, e o do molde de espera. */
const PASSO_PADRAO = 18;

const limitar = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/** Quantas capas o deque leva: o mesmo teto das listas que `api/steam` devolve. */
const TETO = 25;

/** O quanto uma capa a `a` posições da frente recua no eixo z. */
const recuo = (a: number) => Math.min(a, 1) * PROFUNDIDADE + Math.max(0, a - 1) * RECUO;

/**
 * O passo da pilha, em px já projetados, para que a última capa de `n` ainda caiba
 * em `larg`: a meia largura menos o primeiro passo e o meio corpo da última, que
 * a perspectiva encolheu. Nunca passa de um sexto da capa, que é o respiro de uma
 * pilha curta, e nunca fica abaixo de 2px, onde a borda deixaria de se ver.
 */
function passoDaPilha(larg: number, capa: number, n: number) {
  if (n <= 2) return PASSO_PADRAO;
  const ultima = PERSPECTIVA / (PERSPECTIVA + recuo(n - 1));
  const sobra = larg / 2 - 4 - capa * ABRE - (capa * ultima) / 2;
  return limitar(sobra / (n - 2), 2, capa / 6);
}

/**
 * Onde fica a capa que está `d` posições atrás da da frente (negativo: já
 * passou). A mola do deque e o molde de espera desenham pela mesma conta.
 */
function pose(d: number, passo = PASSO_PADRAO) {
  const a = Math.abs(d);
  const lado = Math.sign(d);
  const z = -recuo(a);
  // o lado é escrito em px **projetados**, e o navegador projeta por cima: divide-se pela escala
  const escala = PERSPECTIVA / (PERSPECTIVA - z);
  const x = `(var(--capa-w) * ${ABRE * Math.min(a, 1)} + ${Math.max(0, a - 1) * passo}px)`;
  return {
    transform: `translate(-50%, 0) translateX(calc(${lado} * ${x} / ${escala})) translateZ(${z}px) rotateY(${-lado * Math.min(a, 1) * GIRA}deg)`,
    opacity: String(Math.max(0.4, 1 - Math.max(0, a - 1) * 0.05)),
    filter: `brightness(${Math.max(0.42, 1 - a * 0.18)}) blur(${Math.min(1.5, a * 0.4)}px) grayscale(${Math.min(1, a * 0.5)})`,
    // pela distância, para os dois lados: com `d` cru, a que já passou ficava por cima da da frente
    zIndex: String(100 - Math.round(a * 5)),
  };
}

/** A seção sem o dado: a linha de cima, três capas vazias no deque e o texto por chegar. */
function Molde({ estado }: { estado: SemDado }) {
  return (
    <EstadoRemoto estado={estado}>
      <div className={styles.cena}>
        <div className={styles.topo}>
          <span className={styles.contaVazia}>
            <Traco w="120px" />
          </span>
          <div className={styles.abas}>
            <Traco w="180px" />
          </div>
        </div>
        <div className={styles.deque}>
          {[0, 1, 2].map((i) => (
            <span key={i} className={styles.capa} style={pose(i)}>
              <span className={styles.arte} />
            </span>
          ))}
          <span className={styles.chao} />
        </div>
        <div className={styles.detalhe}>
          <div className={styles.texto}>
            <span className={styles.rotulo}>
              <Traco w="36%" />
            </span>
            <span className={styles.nome}>
              <Traco w="70%" />
            </span>
            <span className={styles.tempos}>
              <Traco w="50%" />
            </span>
          </div>
        </div>
      </div>
    </EstadoRemoto>
  );
}

/**
 * O deque: os banners, em pilha dos dois lados da escolhida.
 *
 * A da frente é a escolhida, em cor e em foco; as de trás e as que já passaram
 * recuam, escurecem, perdem a cor e desfocam um pouco pela distância. A posição
 * anda por uma mola num rAF que escreve **direto no `style`** de cada capa, como a
 * inclinação do retrato: um `setState` por quadro re-renderizaria a seção
 * inteira para mudar cinco números. O React só sabe do alvo (`atual`), que muda no
 * fim de um arraste, num clique ou numa seta.
 *
 * As capas são desenho (`aria-hidden`): quem usa leitor de tela navega pelo
 * painel de baixo, que diz o nome, as horas e leva à página do jogo.
 */
function Deque({
  jogos,
  atual,
  ir,
}: {
  jogos: Jogo[];
  atual: number;
  ir: (i: number) => void;
}) {
  const capas = useRef<(HTMLSpanElement | null)[]>([]);
  const pos = useRef(atual);
  const alvo = useRef(atual);
  const quadro = useRef(0);
  const raiz = useRef<HTMLDivElement>(null);
  const passo = useRef(PASSO_PADRAO);
  const arraste = useRef<{ x: number; de: number; andou: boolean; capa: number | null } | null>(
    null,
  );
  const reduzido = useReducedMotion();

  const pintar = useCallback(() => {
    capas.current.forEach((el, i) => {
      if (el) Object.assign(el.style, pose(i - pos.current, passo.current));
    });
  }, []);

  /**
   * O passo da pilha depende da largura que o deque tem, e ele muda com a janela:
   * mede-se antes da pintura e a cada redimensionamento, e repinta pela mesma
   * conta da mola.
   */
  const total = jogos.length;
  useLayoutEffect(() => {
    const el = raiz.current;
    if (!el) return;
    const medir = () => {
      passo.current = passoDaPilha(el.clientWidth, capas.current[0]?.offsetWidth ?? 0, total);
      pintar();
    };
    medir();
    const obs = new ResizeObserver(medir);
    obs.observe(el);
    return () => obs.disconnect();
  }, [pintar, total]);

  const animar = useCallback(() => {
    cancelAnimationFrame(quadro.current);
    const andar = () => {
      pos.current += (alvo.current - pos.current) * (reduzido ? 1 : MOLA);
      if (Math.abs(alvo.current - pos.current) < 0.001) pos.current = alvo.current;
      pintar();
      if (pos.current !== alvo.current) quadro.current = requestAnimationFrame(andar);
    };
    andar();
  }, [pintar, reduzido]);

  useEffect(() => {
    alvo.current = atual;
    animar();
  }, [atual, animar, jogos.length]);

  useEffect(() => () => cancelAnimationFrame(quadro.current), []);

  const ultimo = jogos.length - 1;

  return (
    <div
      ref={raiz}
      className={styles.deque}
      aria-hidden="true"
      onPointerDown={(e) => {
        // a capa apontada se guarda agora: com o ponteiro capturado, o alvo do `pointerup` é o deque
        const capa = (e.target as HTMLElement).closest<HTMLElement>('[data-i]');
        arraste.current = {
          x: e.clientX,
          de: alvo.current,
          andou: false,
          capa: capa ? Number(capa.dataset.i) : null,
        };
        e.currentTarget.setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        const a = arraste.current;
        if (!a) return;
        const dx = e.clientX - a.x;
        if (Math.abs(dx) > 4) a.andou = true;
        if (!a.andou) return;
        // durante o arraste a posição segue o dedo, sem mola: é ele quem manda
        alvo.current = limitar(a.de - dx / ARRASTE_POR_CAPA, 0, ultimo);
        pos.current = alvo.current;
        pintar();
      }}
      onPointerUp={() => {
        const a = arraste.current;
        arraste.current = null;
        if (!a) return;
        if (a.andou) {
          ir(Math.round(alvo.current));
          return;
        }
        // sem arraste é um clique: a capa apontada vem para a frente
        if (a.capa !== null) ir(a.capa);
      }}
      onPointerCancel={() => {
        arraste.current = null;
        ir(Math.round(alvo.current));
      }}
    >
      {jogos.map((j, i) => {
        return (
          <span
            key={j.id}
            ref={(el) => {
              capas.current[i] = el;
            }}
            className={styles.capa}
            data-i={i}
            style={{ '--ordem': i } as React.CSSProperties}
          >
            {/* a entrada anima o miolo: o `transform` da capa é da mola */}
            <span className={styles.arte}>
              {j.capa ? (
                <img
                  src={j.capa}
                  alt=""
                  draggable={false}
                  loading="lazy"
                  onError={(e) => {
                    e.currentTarget.hidden = true;
                  }}
                />
              ) : null}
            </span>
          </span>
        );
      })}
      <span className={styles.chao} />
    </div>
  );
}

/**
 * Um arco do anel de XP, de `de` a `ate` (frações da volta), num círculo de
 * raio 18 com o começo no topo. A folga entre os arcos é o que faz a dezena se
 * ler como dez degraus, e não como um traço só.
 */
function arco(de: number, ate: number) {
  const ponto = (f: number) => {
    const a = f * 2 * Math.PI - Math.PI / 2;
    return `${(18 * Math.cos(a)).toFixed(2)} ${(18 * Math.sin(a)).toFixed(2)}`;
  };
  return `M${ponto(de)} A18 18 0 0 1 ${ponto(ate)}`;
}

/** A folga entre dois arcos, em fração da volta. */
const FOLGA = 0.012;

/**
 * A conta da Steam, na linha de cima, antes das abas: o avatar com o anel de XP e o nível.
 *
 * O anel são dez arcos, um por nível da dezena em que a conta está (é de dez em
 * dez que a Steam muda o desenho do nível): os já passados acesos, e o do nível
 * atual aceso até onde o XP chegou. Fica pequena: o assunto da seção é o jogo, e não a conta.
 *
 * É desenho com nome acessível (`role="img"`): o nível e o XP que falta vão no
 * rótulo, e o nick e o nível ficam escritos ao lado. O link para o perfil já é o
 * ícone da Steam na linha do título.
 */
function Conta({ perfil }: { perfil: PerfilSteam }) {
  const { t, lang } = useLanguage();
  const naDezena = perfil.nivel % 10;
  const passo = 1 / 10;

  return (
    <div
      className={styles.conta}
      role="img"
      aria-label={format(t.jogos.conta.resumo, {
        nome: perfil.nome,
        n: String(perfil.nivel),
        xp: new Intl.NumberFormat(lang).format(perfil.xpFalta),
        prox: String(perfil.nivel + 1),
      })}
    >
      <span className={styles.avatar} aria-hidden="true">
        <svg viewBox="-20 -20 40 40">
          {Array.from({ length: 10 }, (_, i) => {
            const de = i * passo + FOLGA;
            const ate = (i + 1) * passo - FOLGA;
            const feito = i < naDezena ? 1 : i === naDezena ? perfil.progresso : 0;
            return (
              <g key={i}>
                <path d={arco(de, ate)} />
                {feito > 0 && <path d={arco(de, de + (ate - de) * feito)} data-feito="" />}
              </g>
            );
          })}
        </svg>
        {perfil.avatar ? (
          <img
            src={perfil.avatar}
            alt=""
            draggable={false}
            onError={(e) => {
              e.currentTarget.hidden = true;
            }}
          />
        ) : null}
      </span>
      <span className={styles.contaTexto} aria-hidden="true">
        <span>{perfil.nome}</span>
        <span>{format(t.jogos.conta.nivel, { n: String(perfil.nivel) })}</span>
      </span>
    </div>
  );
}

/** As duas ordens em que o deque mostra a biblioteca. */
type Aba = 'ultimo' | 'horas';

/**
 * O conteúdo, quando ele existe: a conta e as abas, o deque e o jogo escolhido.
 *
 * **O deque tem duas listas**, e a que abre é a de sempre com um degrau a mais:
 * o que está aberto agora, depois a quinzena, e depois a biblioteca pela última
 * sessão, sem repetir. É esse terceiro degrau que impede a seção de ficar vazia
 * para quem passou um mês sem jogar. A outra é a biblioteca pelas horas, e nela
 * o jogo aberto fica no lugar dele no ranking, com o rótulo dizendo que está
 * aberto: quem olha o ranking não é tirado dele.
 *
 * Sem a biblioteca (a Steam não a entregou), não há abas, e a seção é a de
 * antes dela. Separado do casco pela mesma razão de Música: os três estados da
 * busca já são um ramo, e o terceiro tem ramos próprios.
 */
function Conteudo({ dados, ativo }: { dados: Jogos; ativo: boolean }) {
  const { t, lang } = useLanguage();
  const [escolhida, setEscolhida] = useState<Aba>('ultimo');
  const [atual, setAtual] = useState(0);

  const aba: Aba = dados.maisJogados.length ? escolhida : 'ultimo';
  const aberto = dados.jogando;

  const jogos = useMemo(() => {
    if (aba === 'horas') return dados.maisJogados;
    // o aberto abre o deque; a quinzena e a biblioteca vêm atrás, cada jogo uma vez
    const vistos = new Set<string>();
    return [...(aberto ? [aberto] : []), ...dados.recentes, ...dados.porUltimo]
      .filter((j) => !vistos.has(j.id) && vistos.add(j.id))
      .slice(0, TETO);
  }, [aba, aberto, dados.maisJogados, dados.recentes, dados.porUltimo]);

  const ultimo = jogos.length - 1;
  const i = limitar(atual, 0, Math.max(0, ultimo));

  const andar = useCallback(
    (d: number) => setAtual((a) => limitar(a + d, 0, Math.max(0, ultimo))),
    [ultimo],
  );
  useArrowKeys(ativo && jogos.length > 1, andar);

  if (!jogos.length) return <Molde estado="vazio" />;

  const jogo = jogos[i];
  const aoVivo = aberto?.id === jogo.id;
  const dia = (iso: string) =>
    new Intl.DateTimeFormat(lang, { day: 'numeric', month: 'short' }).format(new Date(iso));
  const lugar = format(t.jogos.lugar, { n: String(i + 1), total: String(dados.totalJogos) });

  /**
   * O rótulo diz por que o jogo está ali. Na quinzena, é o de sempre; fora dela,
   * o da frente diz há quanto tempo foi e os de trás, o dia, porque "há 2 meses"
   * em quatro capas seguidas não distingue uma da outra.
   */
  const rotulo =
    aba === 'horas'
      ? aoVivo
        ? `${t.jogos.jogando} · ${lugar}`
        : lugar
      : aoVivo
        ? t.jogos.jogando
        : jogo.minutosRecentes > 0 || !jogo.jogadoEm
          ? i === 0
            ? t.jogos.ultimo
            : t.jogos.recentes
          : i === 0
            ? `${t.jogos.ultimo} · ${haQuanto(jogo.jogadoEm, lang)}`
            : format(t.jogos.jogadoEm, { dia: dia(jogo.jogadoEm) });

  // o peso do jogo na biblioteca, contra o mais jogado dela
  const maior = dados.maisJogados[0]?.minutosTotais ?? 0;

  /**
   * Três linhas (ajuste do Lucas, 14/10/2026, depois do "Afinado"): **a conta e as
   * abas** em sequência, **o deque** na largura toda, em pilha, e **o jogo**, com o
   * estado, o título e as horas no meio e as setas coladas nos lados, bem
   * sutis. A régua saiu: a pilha já diz quantos jogos são e onde o escolhido está.
   * No celular a ordem é a mesma, e o texto e as setas ficam juntos, logo abaixo
   * das capas, para ver o jogo e trocá-lo ao mesmo tempo.
   */
  return (
    <div className={styles.cena}>
      <div className={styles.topo}>
        {dados.perfil && <Conta perfil={dados.perfil} />}
        {dados.maisJogados.length > 0 && (
          <div className={styles.abas} role="group" aria-label={t.jogos.titulo}>
            {(['ultimo', 'horas'] as const).map((a) => (
              <button
                key={a}
                type="button"
                className={styles.aba}
                aria-pressed={a === aba}
                onClick={() => {
                  setEscolhida(a);
                  setAtual(0);
                }}
              >
                {t.jogos.abas[a]}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* a `key` refaz o deque ao trocar de aba: ele volta ao começo e chega de novo */}
      <Deque key={aba} jogos={jogos} atual={i} ir={setAtual} />

      <div className={styles.detalhe}>
        {/* nas pontas o passo apaga em vez de sumir; com um jogo só não há para onde andar */}
        {jogos.length > 1 && (
          <button
            type="button"
            className={`${styles.seta} ${styles.antes}`}
            aria-label={t.jogos.anterior}
            disabled={i === 0}
            onClick={() => andar(-1)}
          >
            <span className={comum.ponta} data-lado="antes" aria-hidden="true" />
          </button>
        )}

        <div className={styles.texto} aria-live="polite">
          <span className={styles.rotulo}>
            {aoVivo && <span className={styles.pulso} aria-hidden="true" />}
            {rotulo}
          </span>
          <a className={styles.nome} href={jogo.url} target="_blank" rel="noreferrer">
            <span>{jogo.nome}</span>
          </a>
          <span className={styles.tempos}>
            {jogo.minutosRecentes > 0 && (
              <span>
                <b>
                  {horas(jogo.minutosRecentes)}
                  {t.jogos.horas}
                </b>{' '}
                {t.jogos.duasSemanas}
              </span>
            )}
            <span>
              <b>
                {horas(jogo.minutosTotais)}
                {t.jogos.horas}
              </b>{' '}
              {t.jogos.total}
            </span>
            {aba === 'horas' && !aoVivo && jogo.jogadoEm && (
              <span>{format(t.jogos.ultimaVez, { quando: haQuanto(jogo.jogadoEm, lang) })}</span>
            )}
          </span>
          {maior > 0 && (
            <span
              className={styles.peso}
              style={{ '--peso': Math.min(1, jogo.minutosTotais / maior) } as React.CSSProperties}
              aria-hidden="true"
            />
          )}
        </div>

        {jogos.length > 1 && (
          <button
            type="button"
            className={`${styles.seta} ${styles.depois}`}
            aria-label={t.jogos.proximo}
            disabled={i === ultimo}
            onClick={() => andar(1)}
          >
            <span className={comum.ponta} data-lado="depois" aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * O canto do Minecraft: o boneco com a skin de verdade, no pedestal.
 *
 * O boneco é desenho, e o nome acessível vai aqui, num `role="img"`: a placa do
 * nome e os gestos não dizem nada a quem não os vê. Sem a skin (esperando, ou a
 * Mojang fora do ar) fica o pedestal vazio, no mesmo tamanho, para a seção não
 * pular quando ela chega.
 */
function CantoMinecraft({ ativo }: { ativo: boolean }) {
  const t = useT();
  const mc = useRemoto<Minecraft>('api/minecraft', ativo);

  if (mc.estado !== 'pronto') {
    return (
      <EstadoRemoto estado={mc.estado}>
        <PedestalVazio />
      </EstadoRemoto>
    );
  }

  const { nome, skin, slim, capa } = mc.dados;
  return (
    <div role="img" aria-label={format(t.jogos.minecraft.boneco, { nome })}>
      <Boneco nome={nome} skin={skin} slim={slim} capa={capa} ativo={ativo} />
    </div>
  );
}

/**
 * A linha do título do LoL. A Riot exige que o site diga que não é dela: a marca
 * curta fecha a linha e é um botão, e clicar abre o aviso legal inteiro logo
 * embaixo. O estado mora aqui para abrir o aviso não redesenhar a seção.
 */
function CabecaLol() {
  const t = useT();
  const [aberto, setAberto] = useState(false);

  return (
    <div className={styles.cabecaLol}>
      <h3 className={comum.tituloLista}>{t.jogos.lol.titulo}</h3>
      <button
        type="button"
        className={styles.semVinculo}
        aria-expanded={aberto}
        aria-controls="lol-aviso"
        onClick={() => setAberto((a) => !a)}
      >
        {t.jogos.lol.semVinculo}
        <span className={comum.ponta} aria-hidden="true" />
      </button>
      {/* fechado, o aviso tem altura zero e sai da árvore acessível */}
      <div id="lol-aviso" className={styles.avisoLegal} data-aberto={aberto || undefined} inert={!aberto}>
        <p>{t.jogos.lol.aviso}</p>
      </div>
    </div>
  );
}

/**
 * Jogos: o que está aberto agora, o que rodou nas últimas duas semanas e a
 * biblioteca, na Steam, com o avatar da conta na linha de cima; embaixo, o
 * League of Legends e o boneco do Minecraft.
 *
 * O dado vem de `api/steam`. Como em Música, o destaque tem dois estados e o
 * segundo é o comum: **ninguém está jogando na maior parte do dia**, e aí o lugar
 * passa a ser o último jogo, com o rótulo dizendo que é passado.
 *
 * **Os três jogos são um mosaico com um sistema só** (vitrine de 14/10/2026,
 * "Afinado"): cada um tem o seu título com risco, todo vão cai na escala de
 * `--e1` a `--e5`, e capas, pódio e boneco pisam numa linha de chão na mesma
 * altura (`--chao`). Antes a Steam não tinha título e grudava no cabeçalho da
 * seção, e cada jogo tinha os números da rodada em que foi desenhado.
 */
export function GamesSection({ ativo, indice }: SectionProps) {
  const t = useT();
  const jogos = useRemoto<Jogos>('api/steam', ativo, REPETIR);

  return (
    <section
      className={`${comum.secao} ${comum.rolavel} ${styles.secao}`}
      aria-label={t.nav.jogos}
    >
      <div className={`${comum.bloco} ${styles.bloco}`} data-ativo={ativo || undefined}>
        <p className={comum.indice}>
          <span>{indice}</span>
          <span className={comum.indiceRisco} aria-hidden="true" />
        </p>

        <div className={comum.cabecalho}>
          <h2 className={comum.titulo}>{t.jogos.titulo}</h2>
          <p className={comum.intro}>{t.jogos.intro}</p>
        </div>

        <div className={styles.jogos}>
          {/* a Steam: o perfil fecha a linha do título dela, e não mais a da
              seção, que fala de três jogos */}
          <div className={styles.steam}>
            <div className={styles.cabeca}>
              <h3 className={comum.tituloLista}>{PERFIS.jogos?.rotulo}</h3>
              <PerfilExterno secao="jogos" />
            </div>
            {jogos.estado === 'pronto' ? (
              <Conteudo dados={jogos.dados} ativo={ativo} />
            ) : (
              <Molde estado={jogos.estado} />
            )}
          </div>

          {/* o andar de baixo: o LoL, e o Minecraft por último e mais estreito */}
          <div className={styles.andar}>
            <div className={styles.parte}>
              <CabecaLol />
              <Liga ativo={ativo} />
            </div>
            <div className={styles.parte}>
              <h3 className={comum.tituloLista}>{t.jogos.minecraft.titulo}</h3>
              <div className={styles.canto}>
                <CantoMinecraft ativo={ativo} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
