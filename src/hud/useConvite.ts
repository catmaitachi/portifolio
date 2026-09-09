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

/** O intervalo entre os dois estalos de um ciclo, em ms. */
const ENTRE = 700;

/** O silêncio entre um ciclo e o seguinte, em ms. */
const PAUSA = 1500;

/** Quantos estalos tem um ciclo. Dois: um se perde, três viram pisca-pisca. */
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
 * **E ele insiste.** São dois estalos seguidos, um silêncio de 1,5 s, e de novo,
 * em laço, até o primeiro clique no cabeçalho. Um convite que acontece uma vez
 * só depende de o visitante estar olhando para aquele canto naquele segundo, o
 * que é justamente o que não se pode supor de quem acabou de chegar numa página
 * cheia de coisas se acendendo. Repetindo, ele encontra o olho em vez de esperar
 * por ele.
 *
 * **Nada disso fica gravado.** A descoberta vale para a visita, e não para
 * sempre: quem volta semanas depois encontra o convite de novo, porque a
 * pergunta que ele responde continua sendo a mesma. Foi decisão explícita, e é o
 * contrário do que a dica da supernova fazia com o `localStorage`.
 *
 * Três coisas o calam:
 *
 * - **o visitante já mexeu no cabeçalho**, que é o `dispensado`: quem descobriu
 *   não precisa de convite, e insistir seria ruído;
 * - **`prefers-reduced-motion`**, pela regra de sempre — é movimento inesperado
 *   e ninguém pediu por ele;
 * - **a aba estar escondida**, e este é o caso que já mordeu a dica da
 *   supernova: um cronômetro do navegador continua andando com a aba em segundo
 *   plano e o `rAF` que desenha não, então o convite piscaria para uma tela que
 *   ninguém está olhando e ainda empilharia faíscas para o quadro do retorno.
 *   Aqui o laço **para** quando a aba sai e retoma quando ela volta, sem repetir
 *   a espera inicial.
 */
export function useConvite(dispensado: boolean): number {
  const [pulso, setPulso] = useState(0);
  const semMovimento = useReducedMotion();

  useEffect(() => {
    if (dispensado || semMovimento) return;

    const relogios = new Set<number>();
    /** a espera inicial já correu: voltar para a aba retoma o laço, não o começo */
    let esperou = false;

    const marcar = (ms: number, o_que: () => void) => {
      const r = window.setTimeout(() => {
        relogios.delete(r);
        o_que();
      }, ms);
      relogios.add(r);
    };

    const parar = () => {
      relogios.forEach(clearTimeout);
      relogios.clear();
    };

    /** Um ciclo: os estalos em sequência, o silêncio, e de novo. */
    const ciclo = () => {
      esperou = true;
      for (let i = 0; i < VEZES; i++) marcar(i * ENTRE, () => setPulso((n) => n + 1));
      marcar((VEZES - 1) * ENTRE + PAUSA, ciclo);
    };

    const seguir = () => (esperou ? ciclo() : marcar(ESPERA, ciclo));

    /**
     * O laço só corre com a aba à vista.
     *
     * `setTimeout` continua andando em segundo plano, e o `rAF` que desenha os
     * estalos não: o convite piscaria para uma tela que ninguém está olhando e
     * ainda empilharia faíscas para o quadro do retorno. É a mesma razão pela
     * qual a recarga da supernova vive no relógio do motor.
     */
    const aoMudarVisibilidade = () => (document.hidden ? parar() : seguir());

    if (!document.hidden) seguir();
    document.addEventListener('visibilitychange', aoMudarVisibilidade);
    return () => {
      document.removeEventListener('visibilitychange', aoMudarVisibilidade);
      parar();
    };
  }, [dispensado, semMovimento]);

  return pulso;
}
