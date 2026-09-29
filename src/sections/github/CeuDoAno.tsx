import { useLayoutEffect, useMemo, useRef } from 'react';
import { format } from '~/content';
import { useLanguage } from '~/i18n/useLanguage';
import styles from './GithubSection.module.css';

/** o passo da grade, em unidades do `viewBox`: um dia por célula */
const P = 16;
/** a faixa de cima, onde moram os meses */
const TOPO = 18;

/**
 * O último ano como um céu: 53 semanas por 7 dias, e cada dia é uma estrela cujo
 * tamanho e brilho dizem quanto se contribuiu nele. Os dias vazios ficam como
 * pontos quase apagados, e são a maior parte: o ano é feito de rajadas.
 *
 * **A entrada é uma varredura de luz**: um feixe atravessa as semanas e o céu
 * acende atrás dele (`data-aceso`), no compasso da câmera da página. Escolhido na
 * rodada do /inspiration de 29/09/2026 (a direção Céu).
 *
 * Apontar um dia mostra a data e o número, com um risco até a estrela, e acende
 * a coluna da semana. A escrita vai direto nos nós, como na inclinação do
 * retrato: o ponteiro anda a cada quadro, e isso não é estado do React.
 */
export function CeuDoAno({ dias, ativo, total, diasAtivos }: { dias: [string, number][]; ativo: boolean; total: number; diasAtivos: number }) {
  const { t, lang } = useLanguage();
  const rotulo = useRef<HTMLDivElement>(null);
  const quadro = useRef<HTMLDivElement>(null);

  // quando o céu rola de lado (celular), ele abre no fim: os meses mais recentes
  useLayoutEffect(() => {
    const el = quadro.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [dias.length]);
  const coluna = useRef<SVGRectElement>(null);

  const semanas = Math.ceil(dias.length / 7);
  const W = semanas * P;
  const H = 7 * P + TOPO;

  const { estrelas, meses } = useMemo(() => {
    const max = Math.max(1, ...dias.map((d) => d[1]));
    const nomeMes = new Intl.DateTimeFormat(lang, { month: 'short', timeZone: 'UTC' });
    const meses: { x: number; nome: string }[] = [];
    let mesAntes = -1;
    let semanaDoRotulo = -9;
    const estrelas = dias.map(([data, n], i) => {
      const w = Math.floor(i / 7);
      const d = i % 7;
      const mes = Number(data.slice(5, 7));
      if (d === 0 && mes !== mesAntes) {
        // um rótulo por mês, e nunca dois encostados: o primeiro mês pode ter só uma semana
        if (w - semanaDoRotulo >= 3) {
          meses.push({ x: w * P + 2, nome: nomeMes.format(new Date(`${data}T12:00Z`)).replace('.', '') });
          semanaDoRotulo = w;
        }
        mesAntes = mes;
      }
      const f = n ? Math.sqrt(n / max) : 0;
      return { w, d, r: n ? 1.4 + f * 4.2 : 0.9, a: n ? 0.35 + f * 0.65 : 0.12 };
    });
    return { estrelas, meses };
  }, [dias, lang]);

  const dataCurta = useMemo(() => new Intl.DateTimeFormat(lang, { day: 'numeric', month: 'short', timeZone: 'UTC' }), [lang]);

  const apontar = (e: React.PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const esc = r.width / W;
    const w = Math.floor((e.clientX - r.left) / esc / P);
    const d = Math.floor(((e.clientY - r.top) / esc - TOPO) / P);
    const dia = d >= 0 && d < 7 ? dias[w * 7 + d] : undefined;
    const el = rotulo.current;
    const col = coluna.current;
    if (!el || !col) return;
    if (!dia) {
      el.removeAttribute('data-visivel');
      col.removeAttribute('data-visivel');
      return;
    }
    col.setAttribute('x', String(w * P));
    col.setAttribute('data-visivel', '');
    el.textContent = format(t.github.dia, { data: dataCurta.format(new Date(`${dia[0]}T12:00Z`)), n: String(dia[1]) });
    el.style.left = `${(w * P + P / 2) * esc}px`;
    el.style.top = `${(d * P + P / 2 + TOPO) * esc}px`;
    el.setAttribute('data-visivel', '');
  };

  const sair = () => {
    rotulo.current?.removeAttribute('data-visivel');
    coluna.current?.removeAttribute('data-visivel');
  };

  return (
    <figure className={styles.ceu} data-aceso={ativo || undefined}>
      <div className={styles.ceuQuadro} ref={quadro}>
        <svg
          viewBox={`0 ${-TOPO} ${W} ${H}`}
          className={styles.ceuSvg}
          role="img"
          aria-label={format(t.github.ceuA11y, { n: String(total), dias: String(diasAtivos) })}
          onPointerMove={apontar}
          onPointerLeave={sair}
        >
          <defs>
            <linearGradient id="github-feixe">
              <stop offset="0" stopColor="#fff" stopOpacity="0" />
              <stop offset="0.85" stopColor="#fff" stopOpacity="0.16" />
              <stop offset="1" stopColor="#fff" stopOpacity="0" />
            </linearGradient>
          </defs>
          <rect ref={coluna} className={styles.ceuColuna} y={-4} width={P} height={7 * P + 4} />
          {meses.map((m) => (
            <text key={m.x} className={styles.ceuMes} x={m.x} y={-8}>
              {m.nome}
            </text>
          ))}
          {estrelas.map((s, i) => (
            <circle
              key={i}
              className={styles.ceuDia}
              cx={s.w * P + P / 2}
              cy={s.d * P + P / 2}
              r={s.r}
              style={{ '--a': s.a, '--s': s.w } as React.CSSProperties}
            />
          ))}
          <rect className={styles.ceuFeixe} x={0} y={-TOPO} width={60} height={H} fill="url(#github-feixe)" />
        </svg>
        <div ref={rotulo} className={styles.ceuRotulo} aria-hidden="true" />
      </div>
      <figcaption className={styles.ceuLegenda}>
        <span>{t.github.ano}</span>
        <span className={styles.ceuEscala} aria-hidden="true">
          {t.github.menos}
          <i style={{ opacity: 0.15 }} />
          <i style={{ opacity: 0.4 }} />
          <i style={{ opacity: 0.7 }} />
          <i />
          {t.github.mais}
        </span>
      </figcaption>
    </figure>
  );
}
