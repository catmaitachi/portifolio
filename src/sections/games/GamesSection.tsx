import { useCallback, useEffect, useRef, useState } from 'react';
import type { Jogo, Jogos } from '~/data/types';
import { useArrowKeys } from '~/hooks/useArrowKeys';
import { useReducedMotion } from '~/hooks/useReducedMotion';
import { useRemoto } from '~/hooks/useRemoto';
import { useT } from '~/i18n/useLanguage';
import { EstadoRemoto, type SemDado, Traco } from '../EstadoRemoto';
import { PerfilExterno } from '../PerfilExterno';
import comum from '../section.module.css';
import type { SectionProps } from '../types';
import styles from './GamesSection.module.css';

/** O "jogando agora" muda em minutos, não em segundos. */
const REPETIR = 60_000;

/** Minutos viram horas inteiras: 40min de um jogo não é informação, 12h é. */
const horas = (minutos: number) => Math.round(minutos / 60);

/**
 * A geometria do deque, em px e graus: quanto cada capa de trás recua no eixo
 * z, quanto anda para o lado, quanto gira, e quanto perde de brilho e de foco
 * por posição. Os números saem do `DepthCarousel` do React Bits, reduzidos.
 */
const PROFUNDIDADE = 150;
const AFASTA = 100;
const GIRA = 14;
const APAGA = 0.26;
const DESFOCA = 1.1;
/** Quantos px de arraste andam uma capa. */
const ARRASTE_POR_CAPA = 90;
/** A mola que leva a posição até o alvo, por quadro: sem passar do ponto. */
const MOLA = 0.14;

const limitar = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/**
 * O deque: as capas em pé, uma atrás da outra num trilho que recua.
 *
 * A da frente é a escolhida, em cor e em foco; as de trás afastam, apagam, perdem
 * a cor e desfocam pela distância. A posição anda por uma mola num rAF que
 * escreve **direto no `style`** de cada capa, como a inclinação do retrato: um
 * `setState` por quadro re-renderizaria a seção inteira para mudar cinco números.
 * O React só sabe do alvo (`atual`), que muda no fim de um arraste, num clique ou
 * numa seta.
 *
 * As capas são desenho (`aria-hidden`): quem usa leitor de tela navega pelo
 * painel ao lado, que diz o nome, as horas e leva à página do jogo.
 */
/**
 * Onde fica a capa que está `d` posições atrás da da frente (negativo: já
 * passou). A mola do deque e o molde de espera desenham pela mesma conta.
 */
function pose(d: number) {
  const tras = Math.max(0, d);
  // a que já passou sai para o lado e some; as de trás só apagam depois da quarta
  const opacidade = d < 0 ? Math.max(0, 1 + d * 1.4) : Math.max(0, 1 - Math.max(0, d - 3.2));
  return {
    transform: `translate(-50%, -50%) translateX(${d * AFASTA + Math.min(d, 0) * 40}px) translateZ(${-d * PROFUNDIDADE}px) rotateY(${limitar(d, 0, 1) * -GIRA}deg)`,
    opacity: String(opacidade),
    filter: `brightness(${Math.max(0.2, 1 - tras * APAGA)}) blur(${Math.min(4, tras * DESFOCA)}px) grayscale(${Math.min(1, tras * 0.6)})`,
    zIndex: String(100 - Math.round(d * 10)),
  };
}

/** A seção sem o dado: o painel com o texto por chegar e três capas vazias no deque. */
function Molde({ estado }: { estado: SemDado }) {
  return (
    <EstadoRemoto estado={estado}>
      <div className={styles.cena}>
        <div className={styles.painel}>
          <span className={styles.rotulo}>
            <Traco w="36%" />
          </span>
          <span className={styles.nome}>
            <Traco w="70%" />
            <Traco w="45%" />
          </span>
          <span className={styles.tempos}>
            <Traco w="50%" />
          </span>
        </div>
        <div className={styles.deque}>
          {[0, 1, 2].map((i) => (
            <span key={i} className={styles.capa} style={pose(i)}>
              <span className={styles.arte} />
            </span>
          ))}
          <span className={styles.chao} />
        </div>
      </div>
    </EstadoRemoto>
  );
}

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
  const arraste = useRef<{ x: number; de: number; andou: boolean } | null>(null);
  const reduzido = useReducedMotion();

  const pintar = useCallback(() => {
    capas.current.forEach((el, i) => {
      if (el) Object.assign(el.style, pose(i - pos.current));
    });
  }, []);

  const animar = useCallback(() => {
    cancelAnimationFrame(quadro.current);
    const passo = () => {
      pos.current += (alvo.current - pos.current) * (reduzido ? 1 : MOLA);
      if (Math.abs(alvo.current - pos.current) < 0.001) pos.current = alvo.current;
      pintar();
      if (pos.current !== alvo.current) quadro.current = requestAnimationFrame(passo);
    };
    passo();
  }, [pintar, reduzido]);

  useEffect(() => {
    alvo.current = atual;
    animar();
  }, [atual, animar, jogos.length]);

  useEffect(() => () => cancelAnimationFrame(quadro.current), []);

  const ultimo = jogos.length - 1;

  return (
    <div
      className={styles.deque}
      aria-hidden="true"
      onPointerDown={(e) => {
        arraste.current = { x: e.clientX, de: alvo.current, andou: false };
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
      onPointerUp={(e) => {
        const a = arraste.current;
        arraste.current = null;
        if (!a) return;
        if (a.andou) {
          ir(Math.round(alvo.current));
          return;
        }
        // sem arraste é um clique: a capa apontada vem para a frente
        const capa = (e.target as HTMLElement).closest<HTMLElement>('[data-i]');
        if (capa) ir(Number(capa.dataset.i));
      }}
      onPointerCancel={() => {
        arraste.current = null;
        ir(Math.round(alvo.current));
      }}
    >
      {jogos.map((j, i) => {
        const arte = j.capaAlta ?? j.capa;
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
              {arte ? (
                <img
                  src={arte}
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
 * O conteúdo, quando ele existe: o painel do jogo escolhido e o deque.
 *
 * Separado do casco pela mesma razão de Música: os três estados da busca já são
 * um ramo, e o terceiro tem ramos próprios.
 */
function Conteudo({ dados, ativo }: { dados: Jogos; ativo: boolean }) {
  const t = useT();
  const [atual, setAtual] = useState(0);

  const destaque = dados.jogando ?? dados.recentes[0] ?? null;
  const aoVivo = Boolean(dados.jogando);
  // o destaque abre o deque, e os recentes vêm atrás dele sem repeti-lo
  const jogos = destaque
    ? [destaque, ...dados.recentes.filter((g: Jogo) => g.id !== destaque.id)]
    : [];
  const ultimo = jogos.length - 1;
  const i = limitar(atual, 0, Math.max(0, ultimo));

  const andar = useCallback(
    (d: number) => setAtual((a) => limitar(a + d, 0, Math.max(0, ultimo))),
    [ultimo],
  );
  useArrowKeys(ativo && jogos.length > 1, andar);

  if (!destaque) return <Molde estado="vazio" />;

  const jogo = jogos[i];
  const rotulo = i > 0 ? t.jogos.recentes : aoVivo ? t.jogos.jogando : t.jogos.ultimo;

  return (
    <div className={styles.cena}>
      <div className={styles.painel} aria-live="polite">
        <span className={styles.rotulo}>
          {i === 0 && aoVivo && <span className={styles.pulso} aria-hidden="true" />}
          {rotulo}
        </span>
        <a className={styles.nome} href={jogo.url} target="_blank" rel="noreferrer">
          {jogo.nome}
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
        </span>

        {/* com um jogo só não há para onde andar: a regra da faixa que coube inteira */}
        {jogos.length > 1 && (
          <div className={styles.controles}>
            <button
              type="button"
              className={comum.passo}
              aria-label={t.jogos.anterior}
              disabled={i === 0}
              onClick={() => andar(-1)}
            >
              <span className={comum.ponta} data-lado="antes" aria-hidden="true" />
            </button>
            <button
              type="button"
              className={comum.passo}
              aria-label={t.jogos.proximo}
              disabled={i === ultimo}
              onClick={() => andar(1)}
            >
              <span className={comum.ponta} data-lado="depois" aria-hidden="true" />
            </button>
            <span className={styles.posicao}>
              {String(i + 1).padStart(2, '0')} / {String(jogos.length).padStart(2, '0')}
            </span>
          </div>
        )}
      </div>

      <Deque jogos={jogos} atual={i} ir={setAtual} />
    </div>
  );
}

/**
 * Jogos: o que está aberto agora, e o que rodou nas últimas duas semanas.
 *
 * O dado vem de `api/steam`. Como em Música, o destaque tem dois estados e o
 * segundo é o comum: **ninguém está jogando na maior parte do dia**, e aí o lugar
 * passa a ser o último jogo, com o rótulo dizendo que é passado.
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
          <div className={comum.linhaTitulo}>
            <h2 className={comum.titulo}>{t.jogos.titulo}</h2>
            <PerfilExterno secao="jogos" />
          </div>
          <p className={comum.intro}>{t.jogos.intro}</p>
        </div>

        {jogos.estado === 'pronto' ? (
          <Conteudo dados={jogos.dados} ativo={ativo} />
        ) : (
          <Molde estado={jogos.estado} />
        )}
      </div>
    </section>
  );
}
