import type { MedidaQualidade } from '~/engine';

/**
 * A régua de qualidade do menu de opções, sem passar pelo React.
 *
 * Mesmo desenho de `camera.ts`: o menu escreve e lê aqui, e o `SpaceCanvas`, que
 * continua sendo a única ponte com o motor, liga o motor ao canal quando ele fica
 * pronto. A escolha fica guardada no navegador e é aplicada nesse momento, então
 * quem escolheu um nível o encontra na próxima visita.
 *
 * O que o motor mede muda a cada janela, e o menu só lê enquanto está aberto
 * (ver `hud/Opcoes`): nada disso passa pelo estado do `App`.
 */
export interface FonteQualidade {
  ler(): MedidaQualidade;
  fixar(v: number | null): void;
  calibrar(c: Calibragem): void;
}

/** os pisos da degradação e a taxa de 30, para o painel de `?pisos` (ver `stage.ts`) */
export interface Calibragem {
  densidade?: number;
  escala?: number;
  trinta?: boolean;
}

export type { MedidaQualidade };

const CHAVE = 'portfolio.qualidade';

let fonte: FonteQualidade | null = null;
/** o painel de `?pisos` pediu calibragem antes de o motor chegar */
let calibrando = false;

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
  /** não fica guardado: é para testar, e a próxima visita volta aos pisos do código */
  calibrar(c: Calibragem): void {
    calibrando = true;
    fonte?.calibrar(c);
  },
};

/** Liga o motor ao canal; devolve quem o desliga. */
export function ligarQualidade(f: FonteQualidade): () => void {
  fonte = f;
  const v = salva();
  if (v !== null) f.fixar(v);
  if (calibrando) f.calibrar({});
  return () => {
    if (fonte === f) fonte = null;
  };
}
