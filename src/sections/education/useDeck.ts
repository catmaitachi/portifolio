import { useCallback, useLayoutEffect, useRef, useState } from 'react';

export interface GeometriaDeck {
  /** deslocamento vertical, como `calc()` sobre o raio da pilha */
  pilhaY: string;
  /** inclinação do diploma para dentro do anel, em `rotateX` */
  giro: string;
  escala: number;
  /** empilhamento: quem está na frente cobre quem está atrás */
  camada: number;
  opacidade: number;
  naFrente: boolean;
  /** distância em passos até o diploma da frente, para escalonar a entrada */
  ordem: number;
}

export interface Deck {
  ativo: number;
  andar: (delta: number) => void;
  focar: (i: number) => void;
  geometria: (i: number) => GeometriaDeck;
}

/**
 * A pilha vertical dos diplomas.
 *
 * É a órbita de Projetos deitada: `ang = (i − ativo)·2π/n` dá o seno (agora o
 * deslocamento em **Y**) e o cosseno (a profundidade), e da profundidade saem
 * escala, opacidade e `z-index`. O de cima e o de baixo se inclinam para dentro
 * por `rotateX`, então a pilha lê como um anel visto de lado, e não como três
 * cartões soltos.
 *
 * **Nada de rAF**: `ativo` muda e as `transition` de `transform` e `opacity`
 * fazem a volta, como lá.
 *
 * **E, ao contrário de lá, não há arraste.** Em Projetos o gesto é horizontal e
 * não disputa nada; aqui ele seria vertical, que é exatamente o eixo em que a
 * página rola com `scroll-snap`. Segurar o gesto para a pilha exigiria
 * `touch-action: none` sobre o maior elemento da seção, e o visitante perderia a
 * rolagem justamente onde o dedo cai primeiro. Sobram o clique num diploma de
 * trás, as setas ←/→ e os traços ao lado, que é o mesmo conjunto de sempre menos
 * o gesto que não cabia.
 */
export function useDeck(total: number): Deck {
  const [ativo, setAtivo] = useState(0);

  const n = Math.max(1, total);
  const nRef = useRef(n);

  // escrita num efeito, nunca no corpo do componente: o render precisa ser puro
  useLayoutEffect(() => {
    nRef.current = n;
  });

  const andar = useCallback((delta: number) => {
    const total = nRef.current;
    setAtivo((atual) => (((atual + delta) % total) + total) % total);
  }, []);

  const focar = useCallback((i: number) => setAtivo(i), []);

  const geometria = useCallback(
    (i: number): GeometriaDeck => {
      const ang = ((i - ativo) * 2 * Math.PI) / n;
      const sen = Math.sin(ang);
      const cos = Math.cos(ang);
      const prof = (cos + 1) / 2; // 1 na frente, 0 atrás
      return {
        pilhaY: `calc(var(--dr, 120px) * ${sen.toFixed(4)})`,
        giro: `${(sen * 24).toFixed(2)}deg`,
        escala: Number((0.72 + 0.28 * prof).toFixed(3)),
        camada: 100 + Math.round(cos * 50),
        /**
         * Piso alto pelo mesmo motivo da órbita: com n=3 a profundidade dos de
         * trás é 0,25, e um falloff linear os apagaria no céu preto.
         */
        opacidade: Number((0.34 + 0.66 * prof).toFixed(3)),
        naFrente: i === ativo,
        // circular: com n=3, o último está a um passo do primeiro
        ordem: Math.min(Math.abs(i - ativo), n - Math.abs(i - ativo)),
      };
    },
    [ativo, n],
  );

  return { ativo, andar, focar, geometria };
}
