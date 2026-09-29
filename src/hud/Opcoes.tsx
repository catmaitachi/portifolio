import { useEffect, useId, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { format, LANGS } from '~/content';
import { useReducedMotion } from '~/hooks/useReducedMotion';
import { useLanguage } from '~/i18n/useLanguage';
import { qualidade, type MedidaQualidade } from '~/scene/qualidade';
import styles from './Opcoes.module.css';

/**
 * O menu do canto superior direito: idioma, qualidade da cena e versão.
 *
 * Tomou o lugar do seletor de idioma e da versão, que ficava no canto de baixo.
 * Escolhido numa rodada da skill `inspiration` (ver `hud.md`): o gatilho são três
 * traços da mira que viram um X, o painel é uma moldura chanfrada que se desenha
 * do canto de onde saiu, e as linhas chegam da profundidade como todo texto do site.
 *
 * Abre só pelo clique. Fecha pelo gatilho, pelo Esc ou por um toque fora, e
 * fechado fica `inert`: nem foco nem leitor de tela entram nele.
 */
export function Opcoes() {
  const { lang, t, definir } = useLanguage();
  const [aberto, setAberto] = useState(false);
  const raiz = useRef<HTMLDivElement>(null);
  const gatilho = useRef<HTMLButtonElement>(null);
  const id = useId();

  useEffect(() => {
    if (!aberto) return;
    const fora = (e: globalThis.PointerEvent) => {
      if (!raiz.current?.contains(e.target as Node)) setAberto(false);
    };
    const tecla = (e: globalThis.KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setAberto(false);
      gatilho.current?.focus();
    };
    window.addEventListener('pointerdown', fora);
    window.addEventListener('keydown', tecla);
    return () => {
      window.removeEventListener('pointerdown', fora);
      window.removeEventListener('keydown', tecla);
    };
  }, [aberto]);

  /* as setas escolhem o idioma aqui dentro, e não navegam a seção de trás (`useArrowKeys`) */
  const aoTeclarIdioma = (e: KeyboardEvent) => {
    const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    e.stopPropagation();
    const proximo = LANGS[(LANGS.indexOf(lang) + d + LANGS.length) % LANGS.length];
    definir(proximo);
    raiz.current?.querySelector<HTMLElement>(`[data-lang="${proximo}"]`)?.focus();
  };

  return (
    <div ref={raiz} className={styles.raiz}>
      <button
        ref={gatilho}
        type="button"
        className={styles.gatilho}
        aria-expanded={aberto}
        aria-controls={id}
        aria-label={t.opcoes.abrir}
        onClick={() => setAberto((a) => !a)}
      >
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <line className={styles.t1} x1="1" y1="4" x2="15" y2="4" />
          <line className={styles.t2} x1="1" y1="12" x2="15" y2="12" />
          <line className={styles.t3} x1="5" y1="8" x2="15" y2="8" />
        </svg>
      </button>

      <div id={id} className={styles.painel} data-aberto={aberto || undefined} inert={!aberto}>
        <div className={styles.linha} style={{ '--i': 0 } as React.CSSProperties}>
          <span className={styles.rotulo}>{t.opcoes.idioma}</span>
          <div className={styles.idiomas} role="radiogroup" aria-label={t.opcoes.idioma} onKeyDown={aoTeclarIdioma}>
            {LANGS.map((l) => (
              <button
                key={l}
                type="button"
                role="radio"
                data-lang={l}
                aria-checked={l === lang}
                tabIndex={l === lang ? 0 : -1}
                className={styles.idioma}
                onClick={() => definir(l)}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <Regua ativa={aberto} />

        <div className={styles.linha} style={{ '--i': 2 } as React.CSSProperties}>
          <span className={styles.rotulo}>{t.opcoes.versao}</span>
          <span className={styles.versao}>{__VERSAO__}</span>
        </div>
      </div>
    </div>
  );
}

/** quantos traços a régua tem; ímpar, para haver um no meio */
const TRACOS = 29;
/** quanto uma seta anda na régua */
const PASSO = 0.05;
/** o quanto do caminho até o alvo a marca anda por quadro: desliza e freia, sem passar */
const SEGUE = 0.14;

/**
 * A régua de qualidade: qualquer ponto de "desempenho" a "qualidade".
 *
 * Mostra o que o motor sabe desta máquina (ver `stage.ts`): o ponto `ideal`, onde
 * a cena para sozinha, e o `limite` recomendado, com os traços de depois dele
 * apagados. Arrastar ou usar as setas fixa um nível, e "auto" devolve a decisão à
 * cena. Os traços perto da marca crescem e acendem pela distância a ela, a conta
 * do `exposure-slider` do SmoothUI.
 *
 * Lê o motor só enquanto o menu está aberto, e a marca anda por `requestAnimationFrame`
 * escrevendo direto nos traços: nada disso é estado do React por quadro.
 */
function Regua({ ativa }: { ativa: boolean }) {
  const { t } = useLanguage();
  const reduzido = useReducedMotion();
  const [medida, setMedida] = useState<MedidaQualidade | null>(null);
  const trilho = useRef<HTMLDivElement>(null);
  const tracos = useRef<(HTMLSpanElement | null)[]>([]);
  const desenhada = useRef<number | null>(null);

  useEffect(() => {
    if (!ativa) return;
    const ler = () => setMedida(qualidade.ler());
    ler();
    const intervalo = setInterval(ler, 400);
    return () => clearInterval(intervalo);
  }, [ativa]);

  const q = medida?.q ?? null;
  const limite = medida?.limite ?? null;

  useEffect(() => {
    if (q === null) return;
    const pintar = (p: number) => {
      trilho.current?.style.setProperty('--p', p.toFixed(4));
      const c = p * (TRACOS - 1);
      tracos.current.forEach((el, i) => {
        if (!el) return;
        const d = Math.abs(i - c);
        const alem = limite !== null && i / (TRACOS - 1) > limite + 0.001;
        el.style.transform = `scaleY(${d < 0.5 ? 1 : d < 3 ? 0.75 - d * 0.12 : 0.3})`;
        el.style.opacity = String((d < 0.5 ? 1 : d < 1.5 ? 0.6 : d < 3 ? 0.4 : 0.22) * (alem ? 0.45 : 1));
      });
    };
    if (reduzido || desenhada.current === null) {
      desenhada.current = q;
      pintar(q);
      return;
    }
    let raf = 0;
    const passo = () => {
      const atual = desenhada.current ?? q;
      const prox = atual + (q - atual) * SEGUE;
      desenhada.current = Math.abs(q - prox) < 0.001 ? q : prox;
      pintar(desenhada.current);
      if (desenhada.current !== q) raf = requestAnimationFrame(passo);
    };
    raf = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(raf);
  }, [q, limite, reduzido]);

  const escolher = (v: number | null) => {
    qualidade.fixar(v);
    setMedida(qualidade.ler());
  };

  const peloPonteiro = (e: PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    escolher(Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)));
  };

  const aoTeclar = (e: KeyboardEvent) => {
    if (q === null) return;
    const v =
      e.key === 'ArrowRight' || e.key === 'ArrowUp'
        ? q + PASSO
        : e.key === 'ArrowLeft' || e.key === 'ArrowDown'
          ? q - PASSO
          : e.key === 'Home'
            ? 0
            : e.key === 'End'
              ? 1
              : null;
    if (v === null) return;
    e.preventDefault();
    e.stopPropagation();
    escolher(Math.min(1, Math.max(0, Math.round(v / PASSO) * PASSO)));
  };

  const n = Math.round((q ?? 0) * 100);
  const manual = medida?.manual ?? false;

  return (
    <div className={`${styles.linha} ${styles.qualidade}`} style={{ '--i': 1 } as React.CSSProperties}>
      <div className={styles.cabeca}>
        <span className={styles.rotulo}>{t.opcoes.qualidade}</span>
        <button
          type="button"
          className={styles.auto}
          aria-pressed={!manual}
          title={t.opcoes.autoDica}
          onClick={() => escolher(null)}
        >
          {manual ? `${n}%` : t.opcoes.auto}
        </button>
      </div>

      <div
        ref={trilho}
        className={styles.regua}
        role="slider"
        tabIndex={0}
        aria-label={t.opcoes.regua}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={n}
        aria-valuetext={limite !== null && (q ?? 0) > limite ? format(t.opcoes.acima, { n: String(n) }) : `${n}%`}
        aria-disabled={q === null || undefined}
        onKeyDown={aoTeclar}
        onPointerDown={(e) => {
          if (q === null) return;
          e.currentTarget.setPointerCapture(e.pointerId);
          peloPonteiro(e);
        }}
        onPointerMove={(e) => {
          if (e.currentTarget.hasPointerCapture(e.pointerId)) peloPonteiro(e);
        }}
      >
        {Array.from({ length: TRACOS }, (_, i) => (
          <span
            key={i}
            className={styles.traco}
            ref={(el) => {
              tracos.current[i] = el;
            }}
          />
        ))}
        <span className={styles.marca} aria-hidden="true" />
        {limite !== null && (
          <>
            <span className={styles.limite} style={{ '--em': limite } as React.CSSProperties} aria-hidden="true" />
            <span className={styles.ideal} style={{ '--em': limite * 0.85 } as React.CSSProperties} aria-hidden="true" />
          </>
        )}
      </div>

      <div className={styles.pontas} aria-hidden="true">
        <span>{t.opcoes.desempenho}</span>
        <span>{t.opcoes.detalhe}</span>
      </div>
      {limite !== null && (
        <div className={styles.legenda} aria-hidden="true">
          <i className={styles.legendaIdeal} />
          {t.opcoes.ideal}
          <i className={styles.legendaLimite} />
          {t.opcoes.limite}
        </div>
      )}
    </div>
  );
}
