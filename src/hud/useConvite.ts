import { useEffect, useState } from 'react';
import { useReducedMotion } from '~/hooks/useReducedMotion';

/**
 * Espera antes do primeiro estalo, em ms.
 *
 * A abertura da página termina em 6,2 s (a versão entra em 5,6 s e leva 0,6 s),
 * e um convite antes disso disputaria com o resto do HUD chegando. 7 s é o
 * primeiro instante em que a tela já está parada, e é a mesma conta que a dica
 * da supernova fazia quando existia.
 */
const ESPERA = 7000;

/** O intervalo entre os dois estalos, em ms. */
const INTERVALO = 1100;

/** Quantas vezes o convite acontece. Duas: uma se perde, três insistem. */
const VEZES = 2;

/**
 * Quando convidar o visitante a clicar no cabeçalho de modo.
 *
 * O nome do lado do site fica no topo, em texto, sem moldura e sem ícone, e
 * **não parece clicável**: quem não passa o ponteiro por cima dele não descobre
 * que ali se troca o lado inteiro do site. O convite é um estalo de luz no lugar
 * onde o clique deveria acontecer, e o valor devolvido é um contador que o
 * `Faiscas` consome.
 *
 * Ele é o oposto do aviso que a página tinha e perdeu de propósito: não cobre
 * nada, não pede para ser dispensado e não escreve nada em cima do conteúdo. É
 * um piscar no lugar certo, e quem não olhar naquele instante não perdeu texto
 * nenhum.
 *
 * Três coisas o calam:
 *
 * - **o visitante já mexeu no cabeçalho**, que é o `dispensado`: quem descobriu
 *   não precisa de convite, e insistir seria ruído;
 * - **`prefers-reduced-motion`**, pela regra de sempre — é movimento inesperado
 *   e ninguém pediu por ele;
 * - **a aba estar escondida**, e este é o caso que já mordeu a dica da
 *   supernova: um cronômetro do navegador continua andando com a aba em segundo
 *   plano, e o convite aconteceria inteiro para uma tela que ninguém está
 *   olhando. Aqui a espera só **começa** quando a aba aparece.
 */
export function useConvite(dispensado: boolean): number {
  const [pulso, setPulso] = useState(0);
  const semMovimento = useReducedMotion();

  useEffect(() => {
    if (dispensado || semMovimento) return;

    const relogios: number[] = [];

    const agendar = () => {
      for (let i = 0; i < VEZES; i++) {
        relogios.push(window.setTimeout(() => setPulso((n) => n + 1), ESPERA + i * INTERVALO));
      }
    };

    if (!document.hidden) {
      agendar();
      return () => relogios.forEach(clearTimeout);
    }

    // a aba está escondida: a espera só começa quando ela voltar
    const aoAparecer = () => {
      if (document.hidden) return;
      document.removeEventListener('visibilitychange', aoAparecer);
      agendar();
    };
    document.addEventListener('visibilitychange', aoAparecer);
    return () => {
      document.removeEventListener('visibilitychange', aoAparecer);
      relogios.forEach(clearTimeout);
    };
  }, [dispensado, semMovimento]);

  return pulso;
}
