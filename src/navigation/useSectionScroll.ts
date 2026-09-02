import { useCallback, useEffect, useRef, useState } from 'react';
import { SECOES } from '~/content';
import { editandoTexto } from '~/hooks/useArrowKeys';

export interface SectionScroll {
  ref: React.RefObject<HTMLDivElement | null>;
  /** índice da seção ativa, dentro de `SECOES` */
  indice: number;
  irPara: (i: number) => void;
  /** posiciona a página **entre** seções, para um gesto que a arrasta continuamente */
  seguirFracao: (f: number) => void;
  /** encerra esse gesto, assentando a página na seção `i` */
  soltarFracao: (i: number) => void;
}

/**
 * Se a rolagem suave for interrompida, o alvo nunca chega. Passado este tempo
 * ele é abandonado, e o índice volta a seguir a posição real.
 */
const DESISTIR = 700;

/** Tempo dado ao assentamento do gesto antes de o `scroll-snap` voltar. */
const ASSENTAR = 480;

/**
 * Rolagem por seções: leitura do índice ativo e navegação por teclado.
 *
 * O índice sai de um rAF por rajada de scroll, e o `setState` só acontece quando
 * ele **muda** — sem isso, cada quadro de uma rolagem suave dispararia um render
 * da árvore inteira.
 *
 * **Durante uma rolagem programática o índice fica travado no alvo.** A animação
 * suave atravessa fisicamente as seções do caminho, e sem a trava cada uma delas
 * vira um `setIndice` — ir de Início a Projetos publicava `1` no meio e `2` no
 * fim. Isso não tinha efeito visível enquanto o menu apenas destacava o item,
 * mas a faixa do mobile segue o índice: ela corria até a seção intermediária e
 * voltava. A trava vale para os três caminhos (clique no menu, teclado e faixa),
 * porque todos passam por `irPara`.
 *
 * O teclado é global (↑/↓, PageUp/Down, Home/End) para funcionar sem que o
 * visitante precise clicar em nada primeiro, mas sai do caminho quando o foco
 * está num campo de texto.
 */
export function useSectionScroll(): SectionScroll {
  const ref = useRef<HTMLDivElement>(null);
  const [indice, setIndice] = useState(0);
  const rafRef = useRef(0);
  // o handler global lê o índice sem entrar nas dependências do efeito, o que
  // manteria o listener sendo trocado a cada seção
  const indiceRef = useRef(0);
  indiceRef.current = indice;
  /** seção para onde uma rolagem programática está indo; `null` fora dela */
  const alvoRef = useRef<number | null>(null);
  const desistirRef = useRef(0);
  /** devolve o `scroll-snap` depois que o assentamento do gesto chega */
  const snapRef = useRef(0);

  const limparAlvo = useCallback(() => {
    alvoRef.current = null;
    clearTimeout(desistirRef.current);
  }, []);

  const irPara = useCallback(
    (i: number) => {
      const el = ref.current;
      const n = SECOES.length || 1;
      const alvo = Math.max(0, Math.min(n - 1, i));
      alvoRef.current = alvo;
      clearTimeout(desistirRef.current);
      desistirRef.current = window.setTimeout(limparAlvo, DESISTIR);
      el?.scrollTo({ top: alvo * el.clientHeight, behavior: 'smooth' });
      setIndice(alvo);
    },
    [limparAlvo],
  );

  /**
   * A página acompanha um gesto que corre **entre** seções.
   *
   * O `scroll-snap-type: y mandatory` do contêiner precisa sair enquanto isso
   * dura: com ele, toda posição fracionária é puxada de volta para a seção mais
   * próxima e a rolagem contínua simplesmente não existe. Ele volta em
   * `soltarFracao`.
   *
   * A escrita é direta em `scrollTop`, nunca `scrollTo` suave: o movimento aqui
   * já é o do dedo, e interpor uma animação faria a página perseguir o gesto com
   * atraso.
   */
  const seguirFracao = useCallback(
    (f: number) => {
      const el = ref.current;
      if (!el || !el.clientHeight) return;
      // gesto direto manda sobre navegação programática
      limparAlvo();
      // um gesto novo cancela a devolução do snap do gesto anterior
      clearTimeout(snapRef.current);
      el.style.scrollSnapType = 'none';
      const n = SECOES.length || 1;
      el.scrollTop = Math.max(0, Math.min(n - 1, f)) * el.clientHeight;
    },
    [limparAlvo],
  );

  /**
   * Assenta a página e devolve o encaixe.
   *
   * **A posição é decidida antes de o snap voltar.** Religado primeiro, é o
   * navegador quem escolhe a seção mais próxima, e ela pode não ser a que o
   * gesto escolheu — os dois encaixes, o da faixa e o da página, divergiriam
   * justamente quando o dedo para no meio do caminho.
   *
   * O assentamento **desliza**, não salta: soltar a 2,4 são quatro décimos de
   * tela, e escrevê-los de uma vez lê como falha em vez de encaixe. O snap volta
   * só depois que a rolagem chega, e como o destino já é um snap point exato,
   * devolvê-lo não move mais nada. A espera é um `setTimeout` porque rolagem
   * suave não tem evento de término confiável entre navegadores; um gesto novo
   * no meio dela cancela o timer, em `seguirFracao`.
   */
  const soltarFracao = useCallback((i: number) => {
    const el = ref.current;
    if (!el || !el.clientHeight) return;
    const n = SECOES.length || 1;
    const alvo = Math.max(0, Math.min(n - 1, i));
    el.scrollTo({ top: alvo * el.clientHeight, behavior: 'smooth' });
    clearTimeout(snapRef.current);
    snapRef.current = window.setTimeout(() => {
      const atual = ref.current;
      if (atual) atual.style.scrollSnapType = '';
    }, ASSENTAR);
    setIndice(alvo);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const aoRolar = () => {
      if (rafRef.current) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = 0;
        if (!el.clientHeight) return;
        const i = Math.round(el.scrollTop / el.clientHeight);
        if (alvoRef.current !== null) {
          // ainda a caminho: as seções atravessadas não são escolhas
          if (i !== alvoRef.current) return;
          limparAlvo();
        }
        setIndice((atual) => (atual === i ? atual : i));
      });
    };

    el.addEventListener('scroll', aoRolar, { passive: true });
    return () => {
      el.removeEventListener('scroll', aoRolar);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [limparAlvo]);

  // nenhum dos dois timers pode sobreviver à desmontagem
  useEffect(
    () => () => {
      clearTimeout(desistirRef.current);
      clearTimeout(snapRef.current);
    },
    [],
  );

  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => {
      if (editandoTexto(e.target)) return;
      switch (e.key) {
        case 'ArrowDown':
        case 'PageDown':
          e.preventDefault();
          irPara(indiceRef.current + 1);
          break;
        case 'ArrowUp':
        case 'PageUp':
          e.preventDefault();
          irPara(indiceRef.current - 1);
          break;
        case 'Home':
          e.preventDefault();
          irPara(0);
          break;
        case 'End':
          e.preventDefault();
          irPara(SECOES.length - 1);
          break;
      }
    };
    window.addEventListener('keydown', aoTeclar);
    return () => window.removeEventListener('keydown', aoTeclar);
  }, [irPara]);

  return { ref, indice, irPara, seguirFracao, soltarFracao };
}
