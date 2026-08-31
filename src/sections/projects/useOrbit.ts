import { useCallback, useEffect, useRef, useState } from 'react';

/** Deslocamento mínimo do arraste para contar como um passo da órbita, em px. */
const LIMIAR_ARRASTE = 46;

export interface Geometria {
  /** deslocamento horizontal, como `calc()` sobre o raio da órbita */
  orbitaX: string;
  /** inclinação do cartão para dentro do anel */
  giro: string;
  escala: number;
  /** empilhamento: quem está na frente cobre quem está atrás */
  camada: number;
  /** opacidade final do cartão */
  foco: number;
  naFrente: boolean;
}

export interface Orbit {
  palcoRef: React.RefObject<HTMLDivElement | null>;
  ativo: number;
  aberto: number | null;
  girar: (delta: number) => void;
  focar: (i: number) => void;
  /** clique no cartão: gira se for lateral, abre/fecha se estiver na frente */
  alternar: (i: number, podeAbrir: boolean) => void;
  fechar: () => void;
  geometria: (i: number, vaga: boolean) => Geometria;
}

/**
 * Órbita 3D dos cartões de projeto.
 *
 * Os cartões ocupam pontos de um círculo horizontal. Para cada um,
 * `ang = (i − ativo)·2π/n` dá o seno (deslocamento em X) e o cosseno
 * (profundidade); da profundidade saem escala, opacidade e `z-index`.
 *
 * **Nada de rAF**: `ativo` muda e as `transition` de `transform`/`opacity` fazem
 * a volta. O `rotateY` inclina os laterais para dentro e o palco tem
 * `perspective`, então o giro parece um anel de verdade — mas **todo texto
 * continua de frente**. Um anel real com `preserve-3d` esconderia os cartões de
 * trás por `backface-visibility`, e com n=3 isso significa dois terços da lista
 * invisíveis.
 */
export function useOrbit(total: number): Orbit {
  const palcoRef = useRef<HTMLDivElement>(null);
  const [ativo, setAtivo] = useState(0);
  const [aberto, setAberto] = useState<number | null>(null);

  const n = Math.max(1, total);
  const nRef = useRef(n);
  nRef.current = n;

  const girar = useCallback((delta: number) => {
    const total = nRef.current;
    setAtivo((atual) => {
      const alvo = (((atual + delta) % total) + total) % total;
      return alvo;
    });
    setAberto(null);
  }, []);

  const focar = useCallback((i: number) => {
    setAtivo(i);
    setAberto(null);
  }, []);

  const alternar = useCallback(
    (i: number, podeAbrir: boolean) => {
      if (i !== ativo) {
        focar(i);
        return;
      }
      if (!podeAbrir) return;
      setAberto((atual) => (atual === i ? null : i));
    },
    [ativo, focar],
  );

  const fechar = useCallback(() => setAberto(null), []);

  // Arraste horizontal no palco = um passo da órbita. Fica no `pointerup` (e não
  // num `pointermove` capturado) justamente para que o clique nos cartões
  // continue funcionando: um arraste curto é clique, um longo é giro.
  useEffect(() => {
    const el = palcoRef.current;
    if (!el) return;

    let x0: number | null = null;
    const inicio = (e: PointerEvent) => {
      x0 = e.clientX;
    };
    const fim = (e: PointerEvent) => {
      if (x0 === null) return;
      const d = e.clientX - x0;
      x0 = null;
      if (Math.abs(d) > LIMIAR_ARRASTE) girar(d < 0 ? 1 : -1);
    };
    const cancelar = () => {
      x0 = null;
    };

    el.addEventListener('pointerdown', inicio);
    el.addEventListener('pointerup', fim);
    el.addEventListener('pointercancel', cancelar);
    return () => {
      el.removeEventListener('pointerdown', inicio);
      el.removeEventListener('pointerup', fim);
      el.removeEventListener('pointercancel', cancelar);
    };
  }, [girar]);

  const geometria = useCallback(
    (i: number, vaga: boolean): Geometria => {
      const ang = ((i - ativo) * 2 * Math.PI) / n;
      const sen = Math.sin(ang);
      const cos = Math.cos(ang);
      const prof = (cos + 1) / 2; // 1 na frente, 0 atrás
      return {
        orbitaX: `calc(var(--pr, 300px) * ${sen.toFixed(4)})`,
        giro: `${(-sen * 34).toFixed(2)}deg`,
        escala: Number((0.62 + 0.38 * prof).toFixed(3)),
        camada: 100 + Math.round(cos * 50),
        /**
         * Piso alto de propósito: com n=3 a profundidade dos laterais é só .25 e
         * um falloff linear os apagaria por completo no céu preto.
         */
        foco: Number((vaga ? 0.34 + 0.3 * prof : 0.52 + 0.48 * prof).toFixed(3)),
        naFrente: i === ativo,
      };
    },
    [ativo, n],
  );

  return { palcoRef, ativo, aberto, girar, focar, alternar, fechar, geometria };
}
