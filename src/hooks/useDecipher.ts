import { useEffect, useRef } from 'react';
import { useReducedMotion } from './useReducedMotion';

/**
 * Alfabeto do embaralhamento.
 *
 * Só ASCII técnico e Latin-1: a página inteira é IBM Plex Mono, e um glifo que
 * a fonte não tem vira caixa vazia — o efeito passaria de "texto cifrado" a
 * "fonte quebrada". Katakana e blocos foram descartados por isso.
 */
const GLIFOS = '#%&@$*+=<>/\|~^:;?!¤§±×÷¬∆∑0123456789';

/** Quanto cada parágrafo leva para se resolver, em ms. */
const DURACAO = 720;
/**
 * Atraso entre um parágrafo e o seguinte, em ms.
 *
 * Maior que antes, e por desempenho: com 190ms os três parágrafos ficavam
 * decifrando ao mesmo tempo quase o tempo todo, e o pico de trabalho por quadro
 * era o triplo do necessário. Sendo maior que metade de `DURACAO`, no máximo
 * dois se sobrepõem — e só na virada.
 */
const ESCALONAMENTO = 420;
/**
 * Intervalo entre repinturas, em ms.
 *
 * O embaralhamento não ganha nada a 60fps — a 15fps ele lê melhor, como um
 * terminal, e custa um quarto dos quadros. O rAF continua sendo o relógio (ele
 * pausa com a aba escondida); este número só decide quando vale reescrever.
 *
 * **É a alavanca principal de desempenho da animação.** Cada repintura muda o
 * texto de um `<p>` justificado e hifenizado, e o navegador remonta as linhas do
 * parágrafo inteiro — o que custa muito mais do que o JavaScript que monta a
 * string.
 */
const PASSO = 66;
/**
 * Quantos caracteres piscam à frente da parte já decifrada.
 *
 * Além dessa janela o texto fica na cifra **estática**, sorteada uma vez no
 * setup. Antes o parágrafo inteiro era resorteado a cada repintura — 400
 * sorteios e um `join` de 400 posições — para um efeito que o olho só percebe na
 * frente de onda. Agora cada repintura é ~48 sorteios e três `slice` nativos.
 */
const JANELA = 48;

interface Alvo {
  no: ChildNode;
  texto: string;
  /** o mesmo texto cifrado, sorteado uma vez: é o "ainda não chegou aqui" */
  cifra: string;
  /** buffer da janela, reutilizado: uma alocação no setup, nenhuma por quadro */
  buffer: string[];
  inicio: number;
  fim: number;
  /** 0 intocado · 1 cifra escrita · 2 decifrando · 3 pronto */
  estado: number;
}

/** Um caractere cifrado. Espaço e quebra passam intactos: são eles que seguram
 *  o comprimento das palavras, e com ele as quebras de linha. */
function glifo(c: string): string {
  return c === ' ' || c === '\n' ? c : GLIFOS[(Math.random() * GLIFOS.length) | 0];
}

/**
 * Decriptografia dos parágrafos: o texto chega cifrado e se resolve da esquerda
 * para a direita, um parágrafo depois do outro.
 *
 * Devolve a `ref` de um contêiner; o hook anima os `<p>` que estiverem dentro.
 * Um rAF só para todos eles — um por parágrafo seria três relógios para o mesmo
 * trabalho — e a escrita vai direto em `textContent`, fora do ciclo do React: um
 * `setState` por quadro re-renderizaria a seção inteira para trocar uma string.
 *
 * **Espaços nunca são embaralhados.** Como a fonte é monoespaçada e o número de
 * caracteres não muda, preservar os espaços mantém o comprimento de cada palavra
 * — e com isso as quebras de linha ficam de pé. Sem esse cuidado o parágrafo
 * remontaria a cada quadro e o bloco inteiro tremeria.
 *
 * É isso também que deixa a **justificação acontecer junto** com a decifragem,
 * em vez de num salto no fim. A hifenização fica ligada o tempo todo: o
 * navegador não hifeniza uma palavra cifrada — são símbolos, não letras — então
 * ela não muda de quebra enquanto pisca, e cada palavra que se resolve passa a
 * poder hifenizar e acomoda a linha ali mesmo. Desligar `hyphens` durante a
 * animação, que foi a primeira tentativa, guardava todo o reajuste para o
 * último quadro e o parágrafo inteiro pulava de uma vez.
 *
 * Enquanto corre, o contêiner leva `aria-busy`: o texto cifrado não é conteúdo,
 * e um leitor de tela não deve anunciá-lo. Com `prefers-reduced-motion` nada
 * disso acontece — o texto já nasce legível.
 *
 * **Os textos entram por parâmetro, e não são lidos do DOM.** Numa troca de
 * idioma o React escreve o texto novo, e só depois o efeito antigo é desfeito:
 * um cleanup que restaurasse "o que estava no nó" gravaria o idioma velho por
 * cima do novo, e o efeito seguinte o leria como se fosse a verdade. Foi
 * exatamente assim que a bio parou de trocar de idioma quando o visitante já
 * estava na seção.
 */
export function useDecipher(
  ativo: boolean,
  textos: readonly string[],
): React.RefObject<HTMLDivElement | null> {
  const ref = useRef<HTMLDivElement>(null);
  const semMovimento = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el || !ativo || semMovimento) return;

    // um <p> por texto, na mesma ordem; o nó de texto é o que escrevemos
    const alvos: Alvo[] = [];
    for (let i = 0; i < el.children.length && i < textos.length; i++) {
      const no = el.children[i].firstChild;
      const original = textos[i];
      if (!no || !original) continue;
      let cifra = '';
      for (let k = 0; k < original.length; k++) cifra += glifo(original[k]);
      alvos.push({
        no,
        texto: original,
        cifra,
        buffer: new Array<string>(JANELA),
        inicio: i * ESCALONAMENTO,
        fim: i * ESCALONAMENTO + DURACAO,
        estado: 0,
      });
    }
    if (!alvos.length) return;

    const total = alvos[alvos.length - 1].fim;
    el.setAttribute('aria-busy', 'true');

    let t0 = 0;
    let ultimo = -PASSO;
    let raf = 0;
    let concluido = false;

    const quadro = (agora: number) => {
      if (!t0) t0 = agora;
      const t = agora - t0;

      if (t - ultimo >= PASSO) {
        ultimo = t;
        for (const alvo of alvos) {
          const { texto: original, cifra, buffer } = alvo;
          const p = (t - alvo.inicio) / DURACAO;

          /**
           * Quem ainda não começou escreve a cifra *uma vez* e para. Antes cada
           * parágrafo à espera da sua vez era resorteado a cada quadro: trabalho
           * invisível, e — pior — um relayout de texto justificado por quadro
           * para um parágrafo que nem tinha começado a se decifrar.
           */
          if (p <= 0) {
            if (alvo.estado === 0) {
              alvo.no.textContent = cifra;
              alvo.estado = 1;
            }
            continue;
          }
          if (p >= 1) {
            if (alvo.estado !== 3) {
              alvo.no.textContent = original;
              alvo.estado = 3;
            }
            continue;
          }

          alvo.estado = 2;
          const n = original.length;
          const rev = (p * n) | 0;
          const ate = rev + JANELA < n ? rev + JANELA : n;
          for (let k = rev; k < ate; k++) buffer[k - rev] = glifo(original[k]);
          for (let k = ate - rev; k < JANELA; k++) buffer[k] = '';
          alvo.no.textContent = original.slice(0, rev) + buffer.join('') + cifra.slice(ate);
        }
      }

      if (t < total) {
        raf = requestAnimationFrame(quadro);
        return;
      }
      for (const alvo of alvos) {
        alvo.no.textContent = alvo.texto;
        alvo.estado = 3;
      }
      el.removeAttribute('aria-busy');
      concluido = true;
    };

    raf = requestAnimationFrame(quadro);

    return () => {
      cancelAnimationFrame(raf);
      /**
       * Só restaura quem ficou pelo caminho. Depois de a animação terminar o nó
       * já tem o texto certo, e reescrevê-lo aqui seria justamente o que
       * atropelava a troca de idioma.
       */
      if (!concluido) for (const alvo of alvos) alvo.no.textContent = alvo.texto;
      el.removeAttribute('aria-busy');
    };
  }, [ativo, textos, semMovimento]);

  return ref;
}
