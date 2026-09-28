import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { Experiencia } from '~/content';
import { useReducedMotion } from '~/hooks/useReducedMotion';
import { useT } from '~/i18n/useLanguage';
import styles from './Orbita.module.css';
import {
  angulo,
  arcos,
  faseParaFrente,
  H,
  PERIODO,
  ponto,
  profundidade,
  RX,
  RX_FORA,
  RY,
  RY_FORA,
  W,
} from './orbitaGeometria';

/** Quanto leva trazer um corpo escolhido para a frente, em ms. */
const TRAZER = 1200;

/** Do lento ao parado, sem passar do ponto: é a curva de `--ease-saida`, em conta. */
const suave = (t: number) => 1 - (1 - t) ** 3;

const ANEL = arcos(RX, RY);
/** Põe cada corpo no seu ponto da linha, na fase dada. */
function pintar(corpos: (HTMLButtonElement | null)[], fase: number, n: number) {
  corpos.forEach((el, i) => {
    if (!el) return;
    const a = angulo(fase, i, n);
    const { x, y } = ponto(a);
    const z = profundidade(a);
    el.style.left = `${x * 100}%`;
    el.style.top = `${y * 100}%`;
    el.style.zIndex = String(Math.round(z * 100));
    el.style.setProperty('--z', z.toFixed(3));
  });
}

const ANEL_FORA = arcos(RX_FORA, RY_FORA);

interface OrbitaProps {
  lista: Experiencia[];
  ativa: number;
  escolher: (i: number) => void;
  /** a seção está em cena: fora dela a órbita não gira, e nenhum quadro roda */
  ativo: boolean;
}

/**
 * A órbita da Carreira: cada experiência é um corpo num anel visto de lado.
 *
 * **A órbita gira de verdade**, devagar, uma volta por minuto, e os corpos andam
 * sobre a linha: a posição de cada um sai de `ponto()`, que é a mesma elipse
 * que o SVG desenha (ver `orbitaGeometria.ts`). Os de trás são menores e mais
 * apagados, e passam por trás dos da frente.
 *
 * Escolher um corpo (clique, setas ou os passos) o traz para a frente pelo
 * caminho da órbita, sempre no sentido em que ela gira, e daí ele segue girando.
 * O ponteiro sobre a órbita, ou o foco num corpo, a segura: um alvo que anda
 * embaixo do cursor é um alvo difícil de acertar.
 *
 * O rAF escreve **direto no `style`** de cada corpo, como a inclinação do
 * retrato: um `setState` por quadro re-renderizaria a seção inteira para mover
 * três pontos.
 */
export function Orbita({ lista, ativa, escolher, ativo }: OrbitaProps) {
  const t = useT();
  const reduzido = useReducedMotion();
  const corpos = useRef<(HTMLButtonElement | null)[]>([]);
  const n = lista.length;

  // a fase começa com a escolhida na frente; calculada uma vez, e não a cada render
  const [faseInicial] = useState(() => faseParaFrente(0, ativa, Math.max(1, n)));
  const fase = useRef(faseInicial);
  const trazer = useRef<{ de: number; para: number; inicio: number } | null>(null);
  // o ponteiro ou o foco segura a órbita; um ref, porque só o rAF o lê
  const segura = useRef(false);

  // escolher traz o corpo para a frente, andando para diante na órbita
  const anterior = useRef(ativa);
  useEffect(() => {
    if (anterior.current === ativa) return;
    anterior.current = ativa;
    const de = fase.current;
    const para = faseParaFrente(de, ativa, n);
    // sem laço rodando (sem movimento, ou fora de cena), o corpo chega direto
    if (reduzido || !ativo) {
      fase.current = para;
      pintar(corpos.current, para, n);
      return;
    }
    trazer.current = { de, para, inicio: performance.now() };
  }, [ativa, n, reduzido, ativo]);

  // antes da primeira pintura, cada corpo já está no seu lugar na linha
  useLayoutEffect(() => {
    pintar(corpos.current, fase.current, n);
  }, [n]);

  useEffect(() => {
    // sem movimento, ou fora de cena: a escolhida na frente, e nada roda
    if (reduzido || !ativo) {
      if (trazer.current) fase.current = trazer.current.para;
      trazer.current = null;
      pintar(corpos.current, fase.current, n);
      return;
    }

    let quadro = 0;
    let antes = performance.now();
    let pintada = 0;
    const passo = (agora: number) => {
      const dt = Math.min(64, agora - antes);
      antes = agora;
      const tr = trazer.current;
      if (tr) {
        const p = Math.min(1, (agora - tr.inicio) / TRAZER);
        fase.current = tr.de + (tr.para - tr.de) * suave(p);
        if (p === 1) trazer.current = null;
      } else if (!segura.current) {
        fase.current += (dt / PERIODO) * Math.PI * 2;
      }
      // girando sozinha ela anda um décimo de grau por quadro: 30 pinturas por
      // segundo bastam, e só o deslize de escolher pede todos os quadros
      if (tr || agora - pintada >= 1000 / 30) {
        pintada = agora;
        pintar(corpos.current, fase.current, n);
      }
      quadro = requestAnimationFrame(passo);
    };
    quadro = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(quadro);
  }, [ativo, reduzido, n]);

  return (
    <div
      className={styles.orbita}
      role="group"
      aria-label={t.a11y.experiencia}
      style={{ aspectRatio: `${W} / ${H}` }}
      onPointerEnter={() => {
        segura.current = true;
      }}
      onPointerLeave={() => {
        segura.current = false;
      }}
      onFocus={() => {
        segura.current = true;
      }}
      onBlur={() => {
        segura.current = false;
      }}
    >
      {/* o mesmo `viewBox` e a mesma proporção da caixa: um ponto do SVG é um ponto da caixa */}
      <svg
        className={styles.aneis}
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path className={styles.fora} d={ANEL_FORA.tras} />
        <path className={styles.fora} d={ANEL_FORA.frente} />
        <path className={styles.tras} d={ANEL.tras} />
        <path className={styles.frente} d={ANEL.frente} />
      </svg>

      <div className={styles.centro} aria-hidden="true">
        <b>{String(ativa + 1).padStart(2, '0')}</b>
        <span>/ {String(n).padStart(2, '0')}</span>
      </div>

      {lista.map((e, i) => (
        <button
          key={e.key}
          ref={(el) => {
            corpos.current[i] = el;
          }}
          type="button"
          className={styles.corpo}
          aria-current={i === ativa || undefined}
          aria-label={`${e.cargo}, ${e.org}, ${e.periodo}`}
          onClick={() => escolher(i)}
          style={{ '--ordem': i } as React.CSSProperties}
        >
          <i className={styles.ponto} />
          <span className={styles.rotulo}>
            {e.periodo}
            <span className={styles.tipo}>{t.experiencia.tipos[e.tipo]}</span>
          </span>
        </button>
      ))}

    </div>
  );
}
