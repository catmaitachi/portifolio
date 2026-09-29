import { useEffect, useState } from 'react';
import { qualidade, type MedidaQualidade } from '~/scene/qualidade';
import styles from './Pisos.module.css';

/** os pisos com que o motor começa (ver `stage.ts`); o painel parte deles */
const INICIAL = { densidade: 0.3, escala: 0.7 };

/**
 * Painel de calibragem dos pisos da qualidade, aberto com `?pisos` no endereço.
 *
 * Ferramenta de quem escreve a página, não conteúdo: por isso os textos são
 * literais e ficam fora do dicionário, e o `App` só o carrega (por `lazy`) quando
 * o parâmetro está lá. Mexer aqui não fica guardado. O valor escolhido volta para
 * `PISO_DENSIDADE` e `PISO_ESCALA` em `stage.ts`, e "copiar" põe os números na
 * área de transferência para isso.
 *
 * A qualidade em si se escolhe na régua do menu de opções, ou no controle daqui,
 * que é a mesma chamada. **Mexer num piso põe a cena nele** (ver `calibrar` em
 * `stage.ts`): o da densidade leva a qualidade a 50%, o da resolução a 0.
 */
export default function Pisos() {
  const [densidade, setDensidade] = useState(INICIAL.densidade);
  const [escala, setEscala] = useState(INICIAL.escala);
  const [trinta, setTrinta] = useState(false);
  const [m, setM] = useState<MedidaQualidade | null>(null);
  const [quadro, setQuadro] = useState<{ p50: number; p95: number; perdidos: number } | null>(null);

  /**
   * O tempo de quadro da página inteira, medido por rAF: o que o visitante vê, e
   * não só o que o motor gasta no canvas. Um tranco que vem do navegador (compor
   * camadas, filtros, a máscara da tela) não aparece no consumo do motor, e aparece
   * aqui. Os últimos 120 quadros; "perdidos" são os que passaram de 20ms.
   */
  useEffect(() => {
    const deltas: number[] = [];
    let antes = performance.now();
    let raf = 0;
    const passo = (agora: number) => {
      deltas.push(agora - antes);
      antes = agora;
      if (deltas.length > 120) deltas.shift();
      raf = requestAnimationFrame(passo);
    };
    raf = requestAnimationFrame(passo);
    const id = setInterval(() => {
      const d = deltas.slice().sort((a, b) => a - b);
      if (!d.length) return;
      setQuadro({
        p50: d[Math.floor(d.length * 0.5)],
        p95: d[Math.floor(d.length * 0.95)],
        perdidos: deltas.filter((x) => x > 20).length,
      });
    }, 500);
    return () => {
      cancelAnimationFrame(raf);
      clearInterval(id);
    };
  }, []);

  useEffect(() => {
    // com o painel aberto a densidade muda na hora, em vez de subir devagar
    qualidade.calibrar({});
    const ler = () => setM(qualidade.ler());
    ler();
    const id = setInterval(ler, 300);
    return () => clearInterval(id);
  }, []);

  const calibrar = (c: { densidade?: number; escala?: number; trinta?: boolean }) => {
    qualidade.calibrar(c);
    setM(qualidade.ler());
  };

  const copiar = () => {
    void navigator.clipboard?.writeText(
      `PISO_DENSIDADE = ${densidade.toFixed(2)}; PISO_ESCALA = ${escala.toFixed(2)}`,
    );
  };

  const pct = (v: number | null | undefined) => (v === null || v === undefined ? '—' : `${Math.round(v * 100)}%`);

  return (
    <aside className={styles.painel} aria-label="Calibragem dos pisos">
      <p className={styles.titulo}>pisos da qualidade</p>
      <p className={styles.dica}>mexer num piso põe a cena nele: densidade em 50%, resolução em 0%</p>

      <label className={styles.campo}>
        <span>
          qualidade <b>{pct(m?.q)}</b> {m?.manual ? '' : '(auto)'}
        </span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={m?.q ?? 0}
          onChange={(e) => {
            qualidade.fixar(Number(e.target.value));
            setM(qualidade.ler());
          }}
        />
      </label>
      <button type="button" className={styles.botao} onClick={() => { qualidade.fixar(null); setM(qualidade.ler()); }}>
        voltar ao auto
      </button>

      <label className={styles.campo}>
        <span>
          piso da densidade <b>{pct(densidade)}</b> da metade opcional
        </span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={densidade}
          onChange={(e) => {
            const v = Number(e.target.value);
            setDensidade(v);
            calibrar({ densidade: v });
          }}
        />
      </label>

      <label className={styles.campo}>
        <span>
          piso da resolução <b>{escala.toFixed(2)}</b> px por px
        </span>
        <input
          type="range"
          min={0.4}
          max={1}
          step={0.05}
          value={escala}
          onChange={(e) => {
            const v = Number(e.target.value);
            setEscala(v);
            calibrar({ escala: v });
          }}
        />
      </label>

      <label className={styles.marcar}>
        <input
          type="checkbox"
          checked={trinta}
          onChange={(e) => {
            setTrinta(e.target.checked);
            calibrar({ trinta: e.target.checked });
          }}
        />
        30 fps
      </label>

      <dl className={styles.leitura}>
        <dt>céu aceso</dt>
        <dd>{m ? pct(0.5 + m.densidade / 2) : '—'}</dd>
        <dt>resolução</dt>
        <dd>{m ? `${m.escala.toFixed(3)} px/px` : '—'}</dd>
        <dt>taxa</dt>
        <dd>{m ? `${m.fps} fps` : '—'}</dd>
        <dt>consumo</dt>
        <dd>{pct(m?.consumo)} de um núcleo</dd>
        <dt>quadro</dt>
        <dd>{quadro ? `${quadro.p50.toFixed(1)} · p95 ${quadro.p95.toFixed(1)} ms` : '—'}</dd>
        <dt>perdidos</dt>
        <dd>{quadro ? `${quadro.perdidos} de 120` : '—'}</dd>
        <dt>ideal · limite</dt>
        <dd>
          {pct(m?.ideal)} · {pct(m?.limite)}
        </dd>
      </dl>

      <button type="button" className={styles.botao} onClick={copiar}>
        copiar os pisos
      </button>
    </aside>
  );
}
