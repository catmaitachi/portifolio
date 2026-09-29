import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { format, LINGUAGENS } from '~/content';
import { useReducedMotion } from '~/hooks/useReducedMotion';
import { useT } from '~/i18n/useLanguage';
import styles from './GithubSection.module.css';

type Linguagem = { nome: string; fracao: number };
interface Ponto {
  x: number;
  y: number;
  z: number;
  /** o índice da linguagem que mora neste ponto, ou `-1` para uma estrela */
  lang: number;
}

/** quantos pontos a esfera tem: as linguagens e, entre elas, estrelas */
const PONTOS = 90;
/** quanto do caminho até o alvo a esfera gira por segundo ao trazer uma linguagem */
const TRAZ = 6;
/** o giro sozinho, em radianos por segundo, quando nada está escolhido */
const GIRO = 0.2;
/** o quanto um pixel de arraste gira a esfera */
const ARRASTO = 0.008;

/**
 * Esfera de Fibonacci: pontos espalhados por igual, e as linguagens em posições
 * espaçadas entre eles. É a conta do Icon Cloud do Magic UI.
 */
function esfera(n: number, linguagens: number): Ponto[] {
  const inc = Math.PI * (3 - Math.sqrt(5));
  const pts: Ponto[] = Array.from({ length: n }, (_, i) => {
    const y = 1 - (i / (n - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    return { x: Math.cos(i * inc) * r, y, z: Math.sin(i * inc) * r, lang: -1 };
  });
  for (let k = 0; k < linguagens; k++) pts[Math.round(((k + 0.5) / linguagens) * (n - 1))].lang = k;
  return pts;
}

/** o menor giro até um ângulo, a partir de onde a esfera está (ela acumula voltas) */
const perto = (atual: number, alvo: number) => atual + (((alvo - atual + Math.PI) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;

/** um ícone do Simple Icons, preto, pintado de branco num canvas próprio */
function carregarBranco(src: string): Promise<HTMLCanvasElement | null> {
  return new Promise((ok) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = c.height = 96;
      const x = c.getContext('2d');
      if (!x) return ok(null);
      x.drawImage(img, 8, 8, 80, 80);
      x.globalCompositeOperation = 'source-in';
      x.fillStyle = '#fff';
      x.fillRect(0, 0, 96, 96);
      ok(c);
    };
    img.onerror = () => ok(null);
    img.src = src;
  });
}

/**
 * As linguagens como uma nuvem de ícones: a esfera do Icon Cloud do Magic UI
 * (sugestão do Lucas na rodada do /inspiration de 29/09/2026), adaptada ao céu
 * do site. Entre as linguagens há estrelas, e cada ícone tem o tamanho do quanto
 * a linguagem pesa nos repositórios.
 *
 * Três ajustes que saíram da vitrine, e valem como regra:
 *
 * - **arrastar gira na direção da mão**: a face da frente acompanha o ponteiro.
 *   Na primeira versão ela ia ao contrário;
 * - **a escolhida se destaca na própria nuvem**: vem para a frente pelo menor
 *   giro, cresce, ganha um anel, e as outras recuam; a nuvem para de girar
 *   enquanto há uma escolhida;
 * - **a legenda ao lado tem medida fixa**: um cabeçalho de altura fixa diz a
 *   linguagem em foco (nome, posição, peso e um risco do tamanho do peso) e uma
 *   grade de chips iguais lista todas, com a escolhida acesa. Escolhida numa
 *   segunda vitrine (a Legenda compacta), contra uma régua de peso e um anel de
 *   rótulos. Os chips são também o caminho do teclado e do leitor de tela; o
 *   canvas é desenho.
 *
 * O laço só roda com a seção ativa, na tela e com a aba visível.
 */
export function NuvemDeLinguagens({ linguagens, ativo }: { linguagens: Linguagem[]; ativo: boolean }) {
  const t = useT();
  const reduzido = useReducedMotion();
  const [escolhida, setEscolhida] = useState<number | null>(null);
  const [apontada, setApontada] = useState<number | null>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const pontos = useMemo(() => esfera(PONTOS, linguagens.length), [linguagens.length]);

  /** o estado do laço: muda a cada quadro e não é do React */
  const giro = useRef({ rx: -0.3, ry: 0, alvo: null as { rx: number; ry: number } | null });
  /** o arraste em curso: gira a esfera e, sem mover, vira clique */
  const arrasto = useRef<{ x: number; y: number; moveu: boolean } | null>(null);
  const destaque = useRef<number | null>(null);
  const escolhidaRef = useRef<number | null>(null);
  /** onde cada ícone caiu no último quadro, em px de CSS, para o ponteiro achar */
  const naTela = useRef<({ x: number; y: number; s: number } | null)[]>([]);

  useLayoutEffect(() => {
    destaque.current = apontada ?? escolhida;
    escolhidaRef.current = escolhida;
  });

  const trazer = (i: number) => {
    const p = pontos.find((q) => q.lang === i);
    if (!p) return;
    const g = giro.current;
    const ry = perto(g.ry, Math.atan2(p.x, p.z));
    const rx = Math.atan2(p.y, Math.hypot(p.x, p.z));
    if (reduzido) {
      g.ry = ry;
      g.rx = rx;
      g.alvo = null;
    } else {
      g.alvo = { rx, ry };
    }
  };

  const escolher = (i: number | null) => {
    setEscolhida(i);
    if (i !== null) trazer(i);
  };

  useEffect(() => {
    const cv = canvas.current;
    const ctx = cv?.getContext('2d');
    if (!cv || !ctx || !ativo) return;

    let icones: (HTMLCanvasElement | null)[] = [];
    let vivo = true;
    void Promise.all(linguagens.map((l) => (LINGUAGENS[l.nome] ? carregarBranco(LINGUAGENS[l.nome]) : Promise.resolve(null)))).then(
      (r) => {
        if (vivo) icones = r;
      },
    );

    let naVista = true;
    let raf = 0;
    let antes = 0;
    const g = giro.current;

    const pintar = (agora: number) => {
      raf = requestAnimationFrame(pintar);
      const dt = antes ? Math.min(0.05, (agora - antes) / 1000) : 0;
      antes = agora;
      if (!naVista || document.hidden) return;

      if (g.alvo) {
        const k = Math.min(1, dt * TRAZ);
        g.ry += (g.alvo.ry - g.ry) * k;
        g.rx += (g.alvo.rx - g.rx) * k;
        if (Math.abs(g.alvo.ry - g.ry) < 0.001 && Math.abs(g.alvo.rx - g.rx) < 0.001) g.alvo = null;
      } else if (escolhidaRef.current === null && !arrasto.current && !reduzido) {
        g.ry += dt * GIRO;
      }

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const lado = cv.clientWidth;
      // as duas medidas: o canvas nasce 300×150, e na largura de 300 a de cima passaria
      const px = Math.round(lado * dpr);
      if (cv.width !== px || cv.height !== px) {
        cv.width = px;
        cv.height = px;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, lado, lado);
      const c = lado / 2;
      const R = lado * 0.37;
      // os ícones e as estrelas crescem com a nuvem: as medidas foram tiradas numa de 300px
      const escala = lado / 300;
      const cy = Math.cos(g.ry);
      const sy = Math.sin(g.ry);
      const cx = Math.cos(g.rx);
      const sx = Math.sin(g.rx);
      const foco = destaque.current;

      const vistos = pontos
        .map((p) => {
          const x1 = p.x * cy - p.z * sy;
          const z1 = p.x * sy + p.z * cy;
          const y1 = p.y * cx - z1 * sx;
          const z2 = p.y * sx + z1 * cx;
          const e = (z2 + 2.2) / 3.2;
          return { p, X: c + x1 * R * e, Y: c + y1 * R * e, z: z2, e };
        })
        .sort((a, b) => a.z - b.z);

      for (const v of vistos) {
        const prof = (v.z + 1) / 2;
        if (v.p.lang < 0) {
          ctx.globalAlpha = (0.08 + prof * 0.4) * (foco === null ? 1 : 0.6);
          ctx.fillStyle = '#fff';
          ctx.beginPath();
          ctx.arc(v.X, v.Y, (0.6 + prof * 0.8) * v.e * escala, 0, Math.PI * 2);
          ctx.fill();
          continue;
        }
        const i = v.p.lang;
        const eleito = foco === i;
        const s = (13 + Math.sqrt(linguagens[i].fracao) * 36) * escala * v.e * (eleito ? 1.35 : 1);
        ctx.globalAlpha = eleito ? 1 : (0.15 + prof * 0.85) * (foco === null ? 1 : 0.3);
        const icone = icones[i];
        if (icone) {
          ctx.drawImage(icone, v.X - s / 2, v.Y - s / 2, s, s);
        } else {
          // sem ícone, a sigla
          ctx.fillStyle = '#fff';
          ctx.font = `300 ${Math.round(s * 0.42)}px 'IBM Plex Mono', monospace`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(linguagens[i].nome.slice(0, 2).toUpperCase(), v.X, v.Y);
        }
        if (eleito) {
          ctx.globalAlpha = 0.45;
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(v.X, v.Y, s * 0.78, 0, Math.PI * 2);
          ctx.stroke();
        }
        naTela.current[i] = { x: v.X, y: v.Y, s };
      }
      ctx.globalAlpha = 1;
    };
    raf = requestAnimationFrame(pintar);

    const io = new IntersectionObserver(([e]) => {
      naVista = e.isIntersecting;
    });
    io.observe(cv);
    return () => {
      vivo = false;
      cancelAnimationFrame(raf);
      io.disconnect();
    };
  }, [ativo, linguagens, pontos, reduzido]);

  const aqui = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    let melhor: number | null = null;
    let maior = 0;
    naTela.current.forEach((p, i) => {
      if (p && Math.hypot(p.x - x, p.y - y) < p.s / 2 && p.s > maior) {
        melhor = i;
        maior = p.s;
      }
    });
    return melhor;
  };

  const maxFracao = linguagens[0]?.fracao ?? 1;
  const foco = apontada ?? escolhida;

  return (
    <div className={styles.linguagens}>
      <canvas
        ref={canvas}
        className={styles.nuvem}
        aria-hidden="true"
        onPointerDown={(e) => {
          arrasto.current = { x: e.clientX, y: e.clientY, moveu: false };
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          const a = arrasto.current;
          if (a) {
            const dx = e.clientX - a.x;
            const dy = e.clientY - a.y;
            if (Math.abs(dx) + Math.abs(dy) > 3) a.moveu = true;
            if (!a.moveu) return;
            // a face da frente acompanha a mão
            const g = giro.current;
            g.alvo = null;
            g.ry -= dx * ARRASTO;
            g.rx = Math.max(-1.2, Math.min(1.2, g.rx - dy * ARRASTO));
            a.x = e.clientX;
            a.y = e.clientY;
            return;
          }
          const i = aqui(e);
          if (i !== apontada) setApontada(i);
        }}
        onPointerUp={(e) => {
          const a = arrasto.current;
          arrasto.current = null;
          if (a && !a.moveu) {
            const i = aqui(e);
            escolher(i === escolhida ? null : i);
          }
        }}
        onPointerLeave={() => setApontada(null)}
      />
      <div className={styles.legenda}>
        <h3 className={styles.linguagensTitulo}>{t.github.linguagens}</h3>
        {/* o cabeçalho tem medida fixa: trocar de linguagem troca o texto, e nada em volta se mexe */}
        <div className={styles.foco} aria-live="polite">
          <span className={styles.focoLinha}>
            {foco === null
              ? t.github.aponte
              : `${String(foco + 1).padStart(2, '0')} · ${format(t.github.doCodigo, { n: String(Math.round(linguagens[foco].fracao * 100)) })}`}
          </span>
          <b className={styles.focoNome}>
            {foco === null ? format(t.github.quantas, { n: String(linguagens.length) }) : linguagens[foco].nome}
          </b>
          <i className={styles.focoBarra} style={{ '--f': foco === null ? 0 : linguagens[foco].fracao / maxFracao } as React.CSSProperties} />
        </div>
        <ol className={styles.chips}>
          {linguagens.map((l, i) => (
            <li key={l.nome} style={{ '--ordem': i } as React.CSSProperties}>
              <button
                type="button"
                className={styles.chip}
                aria-pressed={escolhida === i}
                data-destaque={foco === i || undefined}
                onClick={() => escolher(escolhida === i ? null : i)}
                onPointerEnter={() => setApontada(i)}
                onPointerLeave={() => setApontada(null)}
                onFocus={() => setApontada(i)}
                onBlur={() => setApontada(null)}
              >
                <span className={styles.chipNome}>{l.nome}</span>
                <span className={styles.chipPct}>{Math.round(l.fracao * 100)}%</span>
              </button>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
