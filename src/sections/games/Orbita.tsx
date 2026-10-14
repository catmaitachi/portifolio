import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { format } from '~/content';
import type { Insignia, PerfilSteam } from '~/data/types';
import { useReducedMotion } from '~/hooks/useReducedMotion';
import { useLanguage } from '~/i18n/useLanguage';
import comum from '../section.module.css';
import styles from './Orbita.module.css';

/**
 * A geometria, numa régua de 300 de largura: a inclinação das três órbitas, o
 * quanto o círculo achata (é a órbita vista de lado) e, de cada uma, o raio e
 * os segundos de uma volta. A de dentro anda mais depressa, como toda órbita.
 */
const REGUA = 300;
const INCLINA = (-12 * Math.PI) / 180;
const ACHATA = 0.44;
const ORBITAS = [
  { raio: 62, volta: 70 },
  { raio: 104, volta: 110 },
  { raio: 144, volta: 160 },
] as const;
/** Quantas insígnias sem arte cabem na órbita de dentro: as de mais XP. */
const DE_DENTRO = 7;

interface Corpo {
  insignia: Insignia;
  orbita: (typeof ORBITAS)[number];
  fase: number;
  /** o diâmetro, em px */
  tamanho: number;
}

/**
 * O anel do centro: dez arcos, um por nível da dezena em que a conta está. Os
 * níveis da Steam mudam de forma de dez em dez, e é a dezena que o anel mede.
 */
const ARCOS = Array.from({ length: 10 }, (_, i) => {
  const ponto = (t: number) => `${(48 * Math.cos(t)).toFixed(2)} ${(48 * Math.sin(t)).toFixed(2)}`;
  const de = (i / 10) * 2 * Math.PI - Math.PI / 2 + 0.06;
  const ate = ((i + 1) / 10) * 2 * Math.PI - Math.PI / 2 - 0.06;
  return `M${ponto(de)} A48 48 0 0 1 ${ponto(ate)}`;
});

/**
 * A órbita de insígnias: a conta da Steam no centro, e o que ela ganhou girando
 * em volta.
 *
 * O avatar leva o anel da dezena de níveis e a placa do nível. As insígnias de
 * jogo são a arte do jogo, do tamanho do nível delas, na órbita do meio; as de
 * comunidade são pontos do tamanho do XP, as maiores perto e o resto longe.
 * Apontar uma **para o relógio** (ela não pode fugir do ponteiro), apaga as
 * outras, e a legenda ao lado, de medida fixa, diz qual é.
 *
 * **O corpo é posto pela mesma conta que desenha a trilha** (`pintar` e as
 * elipses do SVG usam `raio`, `ACHATA` e `INCLINA`), que é a lição da órbita
 * que a Carreira já teve. O rAF escreve direto no `style` e só roda com a
 * seção em cena; sem movimento, os corpos ficam onde nasceram.
 *
 * É desenho (`aria-hidden`): apontar é gesto de ponteiro, e a informação que
 * existe para todos (quantas são, o nível e o XP) vai escrita para o leitor de
 * tela, e à vista na legenda.
 */
export function Orbita({ perfil, ativo }: { perfil: PerfilSteam; ativo: boolean }) {
  const { t, lang } = useLanguage();
  const txt = t.jogos.insignias;
  const reduzido = useReducedMotion();
  const [foco, setFoco] = useState<number | null>(null);

  const ceu = useRef<HTMLDivElement>(null);
  const nos = useRef<(HTMLSpanElement | null)[]>([]);
  const tempo = useRef(0);
  const escala = useRef(1);
  const parado = useRef(false);

  const corpos = useMemo<Corpo[]>(() => {
    const deJogo = perfil.insignias.filter((b) => b.arte);
    const resto = perfil.insignias.filter((b) => !b.arte);
    const grupos = [resto.slice(0, DE_DENTRO), deJogo, resto.slice(DE_DENTRO)];
    return grupos.flatMap((grupo, k) =>
      grupo.map((insignia, i) => ({
        insignia,
        orbita: ORBITAS[k],
        // cada órbita começa num ponto diferente, para os corpos não se alinharem
        fase: (i / grupo.length) * 2 * Math.PI + k * 0.7,
        tamanho: insignia.arte
          ? 20 + Math.min(insignia.nivel, 6) * 2.4
          : Math.max(4, Math.min(18, Math.sqrt(insignia.xp) / 3.2)),
      })),
    );
  }, [perfil.insignias]);

  const pintar = useCallback(() => {
    corpos.forEach((c, i) => {
      const el = nos.current[i];
      if (!el) return;
      const a = c.fase + (tempo.current / 1000 / c.orbita.volta) * 2 * Math.PI;
      const x = c.orbita.raio * Math.cos(a);
      const y = c.orbita.raio * ACHATA * Math.sin(a);
      const px = (x * Math.cos(INCLINA) - y * Math.sin(INCLINA)) * escala.current;
      const py = (x * Math.sin(INCLINA) + y * Math.cos(INCLINA)) * escala.current;
      // 1 na frente, 0 atrás: quem passa por trás do avatar encolhe e apaga
      const frente = (Math.sin(a) + 1) / 2;
      el.style.transform = `translate(${px.toFixed(1)}px, ${py.toFixed(1)}px) scale(${(0.62 + 0.38 * frente).toFixed(3)})`;
      el.style.opacity = (0.32 + 0.68 * frente).toFixed(3);
      el.style.zIndex = Math.sin(a) > 0 ? '3' : '1';
    });
  }, [corpos]);

  // a largura é medida quando muda, e não a cada quadro
  useLayoutEffect(() => {
    const el = ceu.current;
    if (!el) return;
    const medir = () => {
      escala.current = el.clientWidth / REGUA;
      pintar();
    };
    medir();
    const observador = new ResizeObserver(medir);
    observador.observe(el);
    return () => observador.disconnect();
  }, [pintar]);

  useEffect(() => {
    if (!ativo || reduzido) return;
    let quadro = 0;
    let antes = performance.now();
    const passo = (agora: number) => {
      if (!parado.current) tempo.current += agora - antes;
      antes = agora;
      pintar();
      quadro = requestAnimationFrame(passo);
    };
    quadro = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(quadro);
  }, [ativo, reduzido, pintar]);

  const focar = (i: number | null) => {
    parado.current = i !== null;
    setFoco(i);
  };

  const n = new Intl.NumberFormat(lang);
  const naDezena = perfil.nivel % 10;
  const apontada = foco === null ? null : corpos[foco]?.insignia;

  return (
    <div className={styles.orbita} data-ativo={ativo || undefined}>
      <span className={comum.oculto}>
        {format(txt.resumo, {
          n: n.format(perfil.insignias.length),
          nivel: String(perfil.nivel),
          xp: n.format(perfil.xp),
        })}
      </span>

      <div
        ref={ceu}
        className={styles.ceu}
        data-foco={foco !== null || undefined}
        aria-hidden="true"
        onPointerLeave={() => focar(null)}
      >
        <svg className={styles.trilhas} viewBox="-150 -110 300 220">
          {ORBITAS.map((o) => (
            <ellipse
              key={o.raio}
              rx={o.raio}
              ry={o.raio * ACHATA}
              transform={`rotate(${(INCLINA * 180) / Math.PI})`}
            />
          ))}
        </svg>

        <div className={styles.centro}>
          <svg viewBox="-50 -50 100 100">
            {ARCOS.map((d, i) => (
              <path key={d} d={d} data-feito={i < naDezena || undefined} />
            ))}
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
        </div>
        <span className={styles.placa}>{perfil.nivel}</span>

        {corpos.map((c, i) => (
          <span
            key={c.insignia.id}
            ref={(el) => {
              nos.current[i] = el;
            }}
            className={styles.corpo}
            data-aceso={foco === i || undefined}
            style={{ '--t': `${c.tamanho.toFixed(1)}px` } as React.CSSProperties}
            onPointerEnter={() => focar(i)}
          >
            {c.insignia.arte ? (
              <img
                src={c.insignia.arte}
                alt=""
                draggable={false}
                loading="lazy"
                onError={(e) => {
                  e.currentTarget.hidden = true;
                }}
              />
            ) : null}
          </span>
        ))}
      </div>

      {/* medida fixa: apontar uma insígnia não mexe em nada em volta */}
      <div className={styles.legenda}>
        <span className={styles.rotulo}>
          {apontada
            ? apontada.comunidade === null
              ? txt.deJogo
              : txt.comunidade
            : format(txt.conta, { nome: perfil.nome, n: String(perfil.nivel) })}
        </span>
        <strong className={styles.nome}>
          {apontada
            ? apontada.comunidade === null
              ? (apontada.jogo ?? txt.semNome)
              : (txt.nomes[String(apontada.comunidade)] ?? txt.semNome)
            : format(txt.total, { n: n.format(perfil.insignias.length) })}
        </strong>
        <span className={styles.meta}>
          {apontada ? (
            <>
              {apontada.nivel > 1 && <span>{format(txt.nivel, { n: String(apontada.nivel) })}</span>}
              <span>
                <b>{n.format(apontada.xp)}</b> {txt.xp}
              </span>
              {apontada.ano && <span>{apontada.ano}</span>}
            </>
          ) : (
            <>
              <span>
                <b>{n.format(perfil.xp)}</b> {txt.xp}
              </span>
              <span>
                {format(txt.faltam, { n: n.format(perfil.xpFalta), nivel: String(perfil.nivel + 1) })}
              </span>
            </>
          )}
        </span>
      </div>
    </div>
  );
}
