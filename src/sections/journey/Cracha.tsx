import { useCallback, useEffect, useRef } from 'react';
import { LOGOS, type Experiencia } from '~/content';
import { useReducedMotion } from '~/hooks/useReducedMotion';
import { useT } from '~/i18n/useLanguage';
import styles from './Cracha.module.css';

/** quantos crachás de trás aparecem no maço; o resto fica escondido atrás deles */
const VISIVEIS = 5;
/** o pêndulo: a gravidade puxa para o meio, o atrito segura, e o giro tem teto */
const FIRMEZA = 38;
const ATRITO = 2.4;
const GIRO_MAX = 30;
/** quanto um pixel de arraste empurra o pêndulo */
const EMPURRAO = 0.06;

const limitar = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
const sigla = (org: string) =>
  org
    .split(/\s+/)
    .map((p) => p[0])
    .join('')
    .slice(0, 3)
    .toUpperCase();

/**
 * O pêndulo do cordão: um chute soma velocidade, e o rAF só existe enquanto ele
 * balança. Escreve direto no `style` (`rotate` e `--torce`), como a órbita que
 * existiu aqui: um `setState` por quadro re-renderizaria a seção inteira.
 */
function usePendulo(ref: React.RefObject<HTMLElement | null>) {
  const reduzido = useReducedMotion();
  const estado = useRef({ a: 0, v: 0, quadro: 0 });

  useEffect(() => () => cancelAnimationFrame(estado.current.quadro), []);

  return useCallback(
    (forca: number) => {
      const el = ref.current;
      if (reduzido || !el) return;
      const s = estado.current;
      s.v += forca;
      if (s.quadro) return;
      let antes = performance.now();
      const passo = (agora: number) => {
        const dt = Math.min(0.033, (agora - antes) / 1000);
        antes = agora;
        s.v += (-s.a * FIRMEZA - s.v * ATRITO) * dt;
        s.a = limitar(s.a + s.v * dt * 10, -GIRO_MAX, GIRO_MAX);
        const parou = Math.abs(s.a) < 0.02 && Math.abs(s.v) < 0.02;
        if (parou) s.a = s.v = 0;
        el.style.rotate = `${s.a.toFixed(2)}deg`;
        // a velocidade também torce o cartão no próprio eixo, como um crachá de verdade
        el.style.setProperty('--torce', `${limitar(s.v * 2, -25, 25).toFixed(1)}deg`);
        s.quadro = parou ? 0 : requestAnimationFrame(passo);
      };
      s.quadro = requestAnimationFrame(passo);
    },
    [ref, reduzido],
  );
}

/** a stack vira código de barras: cada tecnologia, um trecho de seis barras pela conta do nome */
function Barras({ stack }: { stack: string[] }) {
  return (
    <span className={styles.barras}>
      {stack.map((s) => {
        const h = hash(s);
        return (
          <span key={s} className={styles.trecho}>
            {[0, 1, 2, 3, 4, 5].map((k) => (
              <i key={k} style={{ width: 1 + ((h >> (k * 3)) & 3) }} />
            ))}
          </span>
        );
      })}
    </span>
  );
}

function Cartao({ e }: { e: Experiencia }) {
  const t = useT();
  const marca = e.logo ? LOGOS[e.logo] : undefined;
  return (
    <span className={styles.cartao}>
      <span className={styles.furo} />
      <span className={styles.acesso}>
        <span>{t.experiencia.cracha.acesso}</span>
        <b>{t.experiencia.tipos[e.tipo]}</b>
      </span>
      <span className={styles.foto}>
        {marca ? (
          <i className={styles.marca} style={{ '--logo': `url(${marca})` } as React.CSSProperties} />
        ) : (
          <span className={styles.sigla}>{sigla(e.org)}</span>
        )}
      </span>
      <span className={styles.quem}>
        <strong>{e.cargo}</strong>
        <small>
          {e.org} · {e.periodo}
        </small>
      </span>
      <Barras stack={e.stack} />
      <span className={styles.legenda}>
        {e.stack.map((s) => (
          <span key={s}>{s}</span>
        ))}
      </span>
    </span>
  );
}

interface MacoProps {
  lista: Experiencia[];
  ativa: number;
  escolher: (i: number) => void;
  ativo: boolean;
}

/**
 * Todos os crachás no mesmo cordão, um atrás do outro: o da frente é a
 * experiência escolhida, e os de trás recuam e mostram o período numa orelha
 * embaixo. Clicar numa orelha traz aquele à frente; arrastar de lado balança o
 * maço.
 *
 * **É desenho** (`aria-hidden`), como as capas do deque de Jogos: quem usa leitor
 * de tela navega pela ficha ao lado, que diz tudo o que o crachá diz.
 */
export function Maco({ lista, ativa, escolher, ativo }: MacoProps) {
  const t = useT();
  const pendulo = useRef<HTMLDivElement>(null);
  const chutar = usePendulo(pendulo);
  const arraste = useRef<number | null>(null);

  // chega balançando quando a seção entra, e balança de novo a cada troca; fora de cena, nada roda
  useEffect(() => {
    if (ativo) chutar(2);
  }, [ativo, ativa, chutar]);

  const n = lista.length;
  const fita = `${t.hero.nome} · `.repeat(8);

  return (
    <div
      className={styles.palco}
      style={{ '--orelhas': Math.min(n - 1, VISIVEIS - 1) } as React.CSSProperties}
      aria-hidden="true"
      onPointerDown={(e) => {
        arraste.current = e.clientX;
      }}
      onPointerMove={(e) => {
        const antes = arraste.current;
        if (antes === null) return;
        arraste.current = e.clientX;
        chutar((e.clientX - antes) * EMPURRAO);
      }}
      onPointerUp={() => {
        arraste.current = null;
      }}
      onPointerLeave={() => {
        arraste.current = null;
      }}
    >
      <div ref={pendulo} className={styles.pendulo}>
        <span className={styles.fita} data-texto={fita} />
        <span className={styles.presilha} />
        <div className={styles.maco}>
          {lista.map((e, i) => {
            // quantos atrás da escolhida: a ordem dá a volta, e a frente é sempre a escolhida
            const k = (i - ativa + n) % n;
            return (
              <button
                key={e.key}
                type="button"
                tabIndex={-1}
                className={styles.carta}
                data-frente={k === 0 || undefined}
                data-longe={k >= VISIVEIS || undefined}
                style={{ '--k': k } as React.CSSProperties}
                onClick={() => (k === 0 ? chutar(1.4) : escolher(i))}
                onPointerMove={(ev) => {
                  if (k) return;
                  const r = ev.currentTarget.getBoundingClientRect();
                  ev.currentTarget.style.setProperty('--bx', `${ev.clientX - r.left}px`);
                  ev.currentTarget.style.setProperty('--by', `${ev.clientY - r.top}px`);
                }}
              >
                <Cartao e={e} />
                {k ? <span className={styles.orelha}>{e.periodo}</span> : null}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
