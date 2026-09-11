import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

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
  /**
   * Distância em passos até o cartão da frente: 0 nele, 1 nos vizinhos, e assim
   * por diante. É o que escalona a entrada da seção — o do meio chega primeiro e
   * os outros vêm atrás, sem que o CSS precise saber quantos cartões existem.
   */
  ordem: number;
}

export interface Orbit {
  palcoRef: React.RefObject<HTMLDivElement | null>;
  ativo: number;
  girar: (delta: number) => void;
  focar: (i: number) => void;
  geometria: (i: number) => Geometria;
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

  const n = Math.max(1, total);
  const nRef = useRef(n);
  /**
   * Os cartões chegam depois da seção: eles vêm do GitHub, e o palco só existe
   * quando há o que girar. O efeito do arraste precisa rodar de novo quando ele
   * aparece, senão encontraria a ref vazia uma vez e nunca mais olharia.
   */
  const temCartoes = total > 0;

  // escrita num efeito, nunca no corpo: o render precisa ser puro e o React pode
  // descartá-lo (ver a nota longa em `NavMenu`)
  useLayoutEffect(() => {
    nRef.current = n;
  });

  const girar = useCallback((delta: number) => {
    const total = nRef.current;
    setAtivo((atual) => (((atual + delta) % total) + total) % total);
  }, []);

  const focar = useCallback((i: number) => setAtivo(i), []);

  /**
   * Arraste horizontal = um passo da órbita.
   *
   * Fica no `pointerup` (e não num `pointermove` capturado) justamente para que
   * o clique nos cartões continue funcionando: um arraste curto é clique, um
   * longo é giro.
   *
   * **O gesto começa na faixa do cartão da frente, não no palco inteiro.** O
   * palco é largo — ele precisa dar espaço aos cartões laterais, que ficam bem
   * além do centro — e capturar o arraste em toda essa largura tornava a órbita
   * dona de metade da seção. A faixa sai do DOM: o centro é o do palco, e a
   * largura é o `offsetWidth` do cartão da frente, que é medida de layout e
   * **não** acompanha o `transform` — então ela não balança durante o giro nem
   * duplica o `--pcw` do CSS aqui dentro.
   */
  useEffect(() => {
    const el = palcoRef.current;
    if (!el) return;

    let x0: number | null = null;
    let limpeza: number | undefined;

    /**
     * O `click` que vem logo depois de um arraste é do mesmo gesto e precisa
     * morrer aqui. Sem isso o arraste gira **e** o clique cai no cartão que
     * estava na frente, trazendo para o meio um cartão que já virou lateral.
     *
     * A captura no palco basta para o React nunca ver o evento: ele escuta na
     * raiz do documento e dispara `onClick` na subida, que não acontece mais.
     */
    const engolirClique = (ev: Event) => {
      ev.stopPropagation();
      ev.preventDefault();
    };

    const soltarEngolidor = () => {
      el.removeEventListener('click', engolirClique, true);
      clearTimeout(limpeza);
      limpeza = undefined;
    };

    const inicio = (e: PointerEvent) => {
      const frente = el.querySelector<HTMLElement>('[data-frente]');
      if (!frente) return;
      const palco = el.getBoundingClientRect();
      const meio = palco.left + palco.width / 2;
      if (Math.abs(e.clientX - meio) > frente.offsetWidth / 2) return;
      x0 = e.clientX;
    };

    const fim = (e: PointerEvent) => {
      if (x0 === null) return;
      const d = e.clientX - x0;
      x0 = null;
      if (Math.abs(d) <= LIMIAR_ARRASTE) return;

      el.addEventListener('click', engolirClique, { capture: true, once: true });
      // nem todo gesto gera `click` (soltar fora do elemento, por exemplo): sem
      // esta soltura o engolidor sobreviveria e comeria o próximo clique bom
      limpeza = window.setTimeout(soltarEngolidor, 0);

      girar(d < 0 ? 1 : -1);
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
      soltarEngolidor();
    };
  }, [girar, temCartoes]);

  /**
   * **A órbita tem ao menos três lugares.** Com dois cartões e o círculo dividido
   * por dois, o segundo ficaria a 180°, exatamente atrás do primeiro, e a seção
   * pareceria ter um cartão só. Com três lugares ele fica ao lado, e o terceiro
   * lugar fica vazio. A lista de projetos não tem mais tamanho fixo, e dois é um
   * tamanho tão provável quanto qualquer outro.
   */
  const lugares = Math.max(n, 3);

  const geometria = useCallback(
    (i: number): Geometria => {
      const ang = ((i - ativo) * 2 * Math.PI) / lugares;
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
        foco: Number((0.52 + 0.48 * prof).toFixed(3)),
        naFrente: i === ativo,
        // circular: com n=5, o cartão 4 está a um passo do cartão 0, não a quatro
        ordem: Math.min(Math.abs(i - ativo), n - Math.abs(i - ativo)),
      };
    },
    [ativo, n, lugares],
  );

  return { palcoRef, ativo, girar, focar, geometria };
}
