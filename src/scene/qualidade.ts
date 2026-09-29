import type { Medicao, MedidaQualidade } from '~/engine';

/**
 * A régua de qualidade do menu de opções, sem passar pelo React.
 *
 * Mesmo desenho de `camera.ts`: o menu escreve e lê aqui, e o `SpaceCanvas`, que
 * continua sendo a única ponte com o motor, liga o motor ao canal quando ele fica
 * pronto. A escolha fica guardada no navegador e é aplicada nesse momento, então
 * quem escolheu um nível o encontra na próxima visita. O limite que a cena mede
 * também fica, e a visita seguinte começa no ideal dele.
 *
 * O que o motor mede muda a cada janela, e o menu só lê enquanto está aberto
 * (ver `hud/Opcoes`): nada disso passa pelo estado do `App`.
 */
export interface FonteQualidade {
  ler(): MedidaQualidade;
  fixar(v: number | null): void;
  comecar(m: Medicao): void;
  aoMedir(fn: (m: Medicao) => void): void;
}

export type { MedidaQualidade };

const CHAVE = 'portfolio.qualidade';
/**
 * O que a cena mediu nesta máquina (ver `stage.ts`): a próxima visita começa no
 * ideal. O sufixo muda quando a conta muda: as de antes guardaram, no celular,
 * um ideal medido contra um teto de consumo que o toque não tem mais.
 */
const CHAVE_MEDICAO = 'portfolio.medicao-3';

function medicaoSalva(): Medicao | null {
  try {
    const m = JSON.parse(localStorage.getItem(CHAVE_MEDICAO) ?? 'null') as Partial<Medicao> | null;
    const ok = (v: unknown): v is number => typeof v === 'number' && v >= 0 && v <= 1;
    return m && ok(m.limite) && ok(m.ideal) ? { limite: m.limite, ideal: m.ideal } : null;
  } catch {
    return null;
  }
}

let fonte: FonteQualidade | null = null;

function salva(): number | null {
  try {
    const v = Number.parseFloat(localStorage.getItem(CHAVE) ?? '');
    return Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : null;
  } catch {
    return null;
  }
}

export const qualidade = {
  /** `null` enquanto o motor não chegou */
  ler(): MedidaQualidade | null {
    return fonte?.ler() ?? null;
  },
  /** o nível escolhido, de 0 a 1; `null` devolve a decisão à cena */
  fixar(v: number | null): void {
    try {
      if (v === null) localStorage.removeItem(CHAVE);
      else localStorage.setItem(CHAVE, v.toFixed(3));
    } catch {
      /* sem persistência: a escolha vale só para esta visita */
    }
    fonte?.fixar(v);
  },
};

/** Liga o motor ao canal; devolve quem o desliga. */
export function ligarQualidade(f: FonteQualidade): () => void {
  fonte = f;
  // a medição primeiro: uma escolha guardada na régua passa por cima dela
  const medicao = medicaoSalva();
  if (medicao) f.comecar(medicao);
  f.aoMedir((m) => {
    try {
      localStorage.setItem(CHAVE_MEDICAO, JSON.stringify({ limite: +m.limite.toFixed(3), ideal: +m.ideal.toFixed(3) }));
    } catch {
      /* sem persistência: a próxima visita mede do zero */
    }
  });
  const v = salva();
  if (v !== null) f.fixar(v);
  return () => {
    if (fonte === f) fonte = null;
  };
}
