import { useEffect } from 'react';

/** Abaixo disto o texto de 11px cai de 8px e a leitura sofre; dali em diante a seção rola. */
const MINIMA = 0.74;

/** Diferença de escala que não vale um reflow: abaixo dela a medição parou de andar. */
const EPSILON = 0.004;

/**
 * Quanto do espaço disponível o conteúdo pode ocupar.
 *
 * Encostar nos 100% deixa o texto colado no rodapé e no topo, e basta uma linha
 * a mais numa tradução para voltar a estourar. A sobra é o que faz a seção
 * respirar.
 */
const FOLGA = 0.97;

/**
 * Encolhe o conteúdo de uma seção até ele caber na altura disponível.
 *
 * O CSS já adapta o que dá: os respiros saem de `svh` e as peças densas têm
 * tokens próprios no mobile. Mas há um piso que nenhuma media query alcança —
 * título, índice, rótulos e chips têm tamanho de leitura e não encolhem com a
 * tela. Num iPhone SE a soma dessas partes fixas passa da altura útil, e o
 * conteúdo corre por baixo do rodapé.
 *
 * A escala é **medida, não estimada**. Degraus por faixa de altura foram a
 * primeira tentativa e não funcionam: os valores saem de uma conta de quanto o
 * conteúdo *deveria* ocupar, e essa conta erra a cada texto novo, a cada troca
 * de idioma e a cada projeto acrescentado. Aqui a razão vem do DOM, então o
 * ajuste continua certo sem ninguém recalibrar nada.
 *
 * **A medida é da seção inteira, não de um filho.** Medir só o bloco de conteúdo
 * foi a segunda tentativa, e ela deixava de fora tudo que fosse irmão dele: no
 * Sobre, o carrossel de formações é filho direto da seção, então nem entrava na
 * conta nem recebia a escala. A seção parecia caber enquanto os badges
 * transbordavam por baixo.
 *
 * `scrollHeight` também não serve: quando o conteúdo cabe ele empata com
 * `clientHeight`, e não há como saber o quanto sobrava. A altura vem da soma dos
 * filhos mais os `gap` entre eles, que é o número real dos dois lados.
 *
 * **A medida é iterativa de propósito.** `getBoundingClientRect` devolve a altura
 * já com o `zoom` aplicado, então a altura natural sai dividindo pela escala em
 * vigor. Aplicar a escala nova muda a medida e acorda o observador de novo, mas
 * na segunda passagem a diferença cai abaixo de `EPSILON` e a coisa para. É o
 * `EPSILON` que fecha o laço, não um limite de tentativas.
 *
 * O `--esc` é escrito na seção e o `zoom` mora nos filhos dela (ver
 * `section.module.css`), o que deixa o padding de fora: o espaço do HUD no
 * rodapé não se negocia com a altura da tela, e encolher junto o traria de volta
 * para debaixo da barra de seções.
 */
export function useEscalaQueCabe(secaoRef: React.RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const secao = secaoRef.current;
    if (!secao) return;

    let raf = 0;

    /**
     * Teto da escala, vindo do CSS (`--esc-max`).
     *
     * O mobile já começa abaixo de 1: mesmo quando cabe, o conteúdo desenhado no
     * tamanho de desktop fica grande demais na tela pequena. O hook só **reduz**
     * a partir daqui, nunca aumenta — quem decide o tamanho de partida é o CSS,
     * que é onde moram as faixas responsivas.
     */
    const teto = () => parseFloat(getComputedStyle(secao).getPropertyValue('--esc-max')) || 1;

    const medir = () => {
      raf = 0;
      const estilo = getComputedStyle(secao);
      const dentro =
        secao.clientHeight - parseFloat(estilo.paddingTop) - parseFloat(estilo.paddingBottom);
      if (dentro <= 0) return;

      const filhos = Array.from(secao.children) as HTMLElement[];
      if (!filhos.length) return;
      const espaco = parseFloat(estilo.rowGap) || 0;
      const ocupado =
        filhos.reduce((soma, el) => soma + el.getBoundingClientRect().height, 0) +
        espaco * (filhos.length - 1);
      if (ocupado <= 0) return;

      const limite = teto();
      const atual = parseFloat(secao.style.getPropertyValue('--esc')) || limite;
      // a altura que o conteúdo teria sem escala nenhuma
      const natural = ocupado / atual;
      const nova = Math.min(limite, Math.max(MINIMA, (dentro * FOLGA) / natural));

      if (Math.abs(nova - atual) < EPSILON) return;
      // no teto, devolve a decisão ao CSS em vez de fixar o mesmo número inline
      if (nova >= limite) secao.style.removeProperty('--esc');
      else secao.style.setProperty('--esc', nova.toFixed(3));
    };

    const agendar = () => {
      if (raf) return;
      raf = requestAnimationFrame(medir);
    };

    /**
     * O observador olha a seção **e cada filho dela**: a seção muda com a tela, e
     * os filhos mudam com o conteúdo (uma troca de idioma reescreve o texto
     * inteiro sem a seção mexer um pixel).
     */
    const observador = new ResizeObserver(agendar);
    observador.observe(secao);
    for (const filho of Array.from(secao.children)) observador.observe(filho);
    agendar();

    return () => {
      observador.disconnect();
      if (raf) cancelAnimationFrame(raf);
    };
  }, [secaoRef]);
}
