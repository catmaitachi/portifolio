import { useCallback, useLayoutEffect, useRef, useState } from 'react';

/**
 * Quantos diplomas aparecem atrás do da frente. O resto some.
 *
 * A seção lê este número para dimensionar o palco: a altura dele é o cartão mais
 * o passo de cada um que pode espiar por baixo, e um número solto no CSS sairia
 * de sincronia com este no dia em que a pilha mostrasse um a mais.
 */
export const VISIVEIS_ATRAS = 3;

export interface GeometriaDeck {
  /** deslocamento vertical, em `calc()` sobre o passo da pilha */
  deslocamento: string;
  escala: number;
  /** empilhamento: quem está por cima cobre quem está por baixo */
  camada: number;
  opacidade: number;
  naFrente: boolean;
  /** se o diploma está na tela: fora dela ele sai do clique e da tabulação */
  visivel: boolean;
  /** distância até o da frente, para escalonar a entrada */
  ordem: number;
}

export interface Deck {
  ativo: number;
  andar: (delta: number) => void;
  focar: (i: number) => void;
  geometria: (i: number) => GeometriaDeck;
}

/**
 * A pilha de diplomas.
 *
 * **É uma pilha, e não um anel**, e a diferença é a regra inteira: o da frente
 * está por cima, os seguintes espiam por baixo dele, e avançar tira o de cima da
 * mesa. Voltar devolve à mesa o que tinha saído, por cima — nunca traz para a
 * frente o que estava embaixo, que é o que um anel faz e é o que não se parece
 * com papel empilhado.
 *
 * Daí decorre que **a navegação não é circular**: as pontas são pontas, como na
 * linha do tempo da Trajetória. Do último não se avança para o primeiro, porque
 * não há nada embaixo do último.
 *
 * O que já passou sobe e se apaga, em vez de encolher junto com os de trás: ele
 * saiu da pilha, e continuar desenhando-o menor o poria de novo lá dentro.
 *
 * **Nada de rAF**: `ativo` muda e as `transition` de `transform` e `opacity`
 * fazem o movimento, como na órbita de Projetos.
 *
 * **E não há arraste.** Em Projetos o gesto é horizontal e não disputa nada;
 * aqui ele seria vertical, que é o eixo em que a página rola com `scroll-snap`.
 * Segurá-lo para a pilha exigiria `touch-action: none` sobre o maior elemento da
 * seção, e o visitante perderia a rolagem justamente onde o dedo cai primeiro.
 */
export function useDeck(total: number, inicial: number): Deck {
  const [ativo, setAtivo] = useState(inicial);

  const n = Math.max(1, total);
  const nRef = useRef(n);

  // escrita num efeito, nunca no corpo do componente: o render precisa ser puro
  useLayoutEffect(() => {
    nRef.current = n;
  });

  const andar = useCallback((delta: number) => {
    setAtivo((atual) => Math.min(nRef.current - 1, Math.max(0, atual + delta)));
  }, []);

  const focar = useCallback((i: number) => setAtivo(i), []);

  const geometria = useCallback(
    (i: number): GeometriaDeck => {
      const d = i - ativo;

      // já passou: sai por cima e se apaga
      if (d < 0) {
        return {
          deslocamento: `calc(var(--dsaida, 60px) * ${d})`,
          escala: 1.03,
          camada: 100 + d,
          opacidade: 0,
          naFrente: false,
          visivel: false,
          ordem: -d,
        };
      }

      const opacidade = Math.max(0, Number((d === 0 ? 1 : 0.66 - 0.22 * (d - 1)).toFixed(3)));
      return {
        deslocamento: `calc(var(--dpasso, 34px) * ${d})`,
        // encolher acompanha o afastamento: a pilha ganha profundidade sem perspectiva
        escala: Number(Math.max(0.7, 1 - 0.045 * d).toFixed(3)),
        camada: 200 - d,
        opacidade,
        naFrente: d === 0,
        visivel: d <= VISIVEIS_ATRAS && opacidade > 0,
        ordem: d,
      };
    },
    [ativo],
  );

  return { ativo, andar, focar, geometria };
}
