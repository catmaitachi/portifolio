import { useCallback, useEffect, useRef, useState } from 'react';
import { useReducedMotion } from '~/hooks/useReducedMotion';

/** Marca que o visitante já acendeu uma estrela alguma vez. */
const CHAVE_DESCOBERTA = 'portfolio.nova';

/**
 * Espera antes de sugerir, em ms.
 *
 * A abertura da página termina em 6,2 s (a versão entra em 5,6 s e leva 0,6 s):
 * um aviso aos 5 s disputaria a entrada com o resto do HUD, e a primeira coisa
 * que o visitante veria seria tudo chegando ao mesmo tempo. 6,5 s é o primeiro
 * instante em que a tela já está parada.
 */
const ESPERA = 8500;

/** Quanto tempo o aviso fica na tela, em ms. */
const PERMANENCIA = 20000;

function jaDescobriu(): boolean {
  try {
    return localStorage.getItem(CHAVE_DESCOBERTA) === '1';
  } catch {
    /* armazenamento indisponível: a dica vale para esta visita */
    return false;
  }
}

function marcarDescoberta(): void {
  try {
    localStorage.setItem(CHAVE_DESCOBERTA, '1');
  } catch {
    /* sem persistência: a dica volta na próxima visita, e tudo bem */
  }
}

/**
 * `setTimeout` que só corre com a aba visível.
 *
 * Um cronômetro do navegador continua andando com a aba escondida — é a mesma
 * razão pela qual a recarga da supernova vive no relógio do motor. Aqui o efeito
 * seria pior: o aviso apareceria e expiraria enquanto o visitante está em outra
 * aba, e a dica que existe para ser lida nunca teria sido vista.
 */
function useEsperaVisivel(ms: number, ativo: boolean, aoTerminar: () => void): void {
  const cb = useRef(aoTerminar);
  cb.current = aoTerminar;

  useEffect(() => {
    if (!ativo) return;

    let restante = ms;
    let inicio = 0;
    let id: number | undefined;

    const correr = () => {
      if (document.hidden) return;
      inicio = performance.now();
      id = window.setTimeout(() => cb.current(), restante);
    };

    const pausar = () => {
      if (id === undefined) return;
      clearTimeout(id);
      id = undefined;
      restante -= performance.now() - inicio;
    };

    const aoMudarVisibilidade = () => (document.hidden ? pausar() : correr());

    correr();
    document.addEventListener('visibilitychange', aoMudarVisibilidade);

    return () => {
      pausar();
      document.removeEventListener('visibilitychange', aoMudarVisibilidade);
    };
  }, [ms, ativo]);
}

/**
 * Quando sugerir a supernova.
 *
 * A supernova é a única coisa da página que ninguém descobre lendo: não há
 * botão, não há rótulo, e quem não clica no vazio nunca sabe que ela existe.
 * Passados alguns segundos sem que nada tenha sido aceso, o aviso conta.
 *
 * Três condições apagam a dica, e cada uma por um motivo diferente:
 *
 * - **Já acendeu uma estrela** (nesta visita ou em qualquer outra): descobriu, e
 *   repetir a dica para quem já sabe é ruído. Fica em `localStorage`, então a
 *   sugestão não volta na próxima visita.
 * - **`prefers-reduced-motion`**: a supernova nem chega a disparar (ver
 *   `SpaceCanvas`), e convidar para o que não vai acontecer é pior que o silêncio.
 * - **O visitante fechou o aviso**: dispensar é resposta, não indiferença.
 *
 * O contador de disparos entra pelo `App`, que já o mantém para o medidor de
 * recarga — este hook não fala com a cena.
 */
export function useNovaHint(novas: number): { visivel: boolean; fechar: () => void } {
  const semMovimento = useReducedMotion();
  const [dispensado, setDispensado] = useState(jaDescobriu);
  const [visivel, setVisivel] = useState(false);

  // acender a primeira estrela é a descoberta: registra e nunca mais sugere
  useEffect(() => {
    if (!novas) return;
    marcarDescoberta();
    setDispensado(true);
  }, [novas]);

  const podeSugerir = !dispensado && !semMovimento;
  const mostrar = useCallback(() => setVisivel(true), []);
  const fechar = useCallback(() => setDispensado(true), []);

  // conta a espera; depois conta a permanência e o aviso se retira sozinho
  useEsperaVisivel(ESPERA, podeSugerir && !visivel, mostrar);
  useEsperaVisivel(PERMANENCIA, visivel, fechar);

  return { visivel: visivel && podeSugerir, fechar };
}
