import { useEffect, useLayoutEffect, useRef, useState, type ComponentType } from 'react';
import type { SectionKey, Tela as TelaConfig } from '~/content';
import type { SectionProps } from '~/sections/types';
import styles from './Tela.module.css';

interface TelaProps {
  config: TelaConfig;
  ativa: boolean;
  /** a seção que ocupa a tela agora, avisada só quando muda */
  aoMudarParte: (parte: SectionKey) => void;
  montar: Record<SectionKey, ComponentType<SectionProps>>;
  /** o contêiner que rola, para o `App` levar a tela até uma seção pelo endereço */
  registrar: (el: HTMLDivElement | null) => void;
  /** o progresso da rolagem da tela ativa, de 0 a 1: é o que move a câmera do céu */
  aoRolar: (progresso: number) => void;
}

/**
 * Quanto de uma seção precisa estar na tela para ela contar como vista e entrar.
 *
 * Um quarto da altura da tela, e não da seção: o Sobre pode ser mais alto que a
 * janela, e medido contra a própria altura ele nunca chegaria à metade.
 */
const VISTA = 0.25;

/**
 * A linha que decide qual seção ocupa a tela, em fração da altura: a seção que a
 * cruza é a atual, e é ela que acende o céu, o endereço e o título da aba.
 *
 * É a mesma medida da entrada (`VISTA`): a seção vira a atual no instante em que
 * um quarto da tela a mostra, que é quando o conteúdo dela começa a entrar. Com a
 * linha no meio da tela, o céu chegava depois do conteúdo: a 40%, o Sobre (mais
 * alto que a janela) já estava inteiro à vista e Câncer nem tinha começado a
 * acender, e a 60% ainda sobrava um atraso em toda seção.
 *
 * **No topo da página ela começa alta** (a um quarto da tela) e desce até o seu
 * lugar nos primeiros pixels de rolagem, dois por pixel rolado. Uma primeira
 * seção mais baixa que a linha, como Música ou Projetos, nunca chegaria a ser a
 * atual: a página abria com o céu da seção seguinte.
 */
const LINHA_ATUAL = 1 - VISTA;
const linhaAtual = (rolado: number, altura: number) =>
  Math.min(LINHA_ATUAL, VISTA + (2 * rolado) / altura);

/**
 * Uma tela: uma área que rola por dentro e junta seções.
 *
 * Todas as telas ficam montadas, empilhadas no mesmo lugar. Só a ativa aparece e
 * recebe ponteiro; as outras ficam `inert`, que as tira do foco, do clique e da
 * árvore de acessibilidade de uma vez. Montadas, elas guardam a rolagem e a aba de
 * cada uma, e voltar a uma tela é voltar ao ponto em que se estava.
 *
 * As seções ficam uma embaixo da outra, como partes de um documento, e são
 * **filhas diretas** do contêiner, sem embrulho. É isso que permite ao `App`
 * alcançar uma pelo índice e ao filtro da supernova continuar achando a caixa de
 * uma `<section>`. Cada uma fica ativa enquanto um quarto da tela a mostra, e é
 * isso que dispara a entrada dela: a mesma prop `ativo` de sempre, vinda da
 * rolagem. As subseções de cada tela ficam na lista que o cabeçalho abre
 * (`SectionNav`), que rola até elas.
 *
 * O contêiner recebe o foco quando a tela abre (`tabIndex={-1}`): é o que faz
 * ↑/↓, PageUp/PageDown e espaço rolarem a tela, que é nativo, em vez de morrerem
 * no documento, que não rola.
 */
export function Tela({
  config,
  ativa,
  aoMudarParte,
  montar,
  registrar,
  aoRolar,
}: TelaProps) {
  const ref = useRef<HTMLDivElement>(null);
  /* quais seções estão à vista, e qual ocupa a tela */
  const [vistas, setVistas] = useState<ReadonlySet<SectionKey>>(() => new Set([config.partes[0]]));
  const aoMudarParteRef = useRef(aoMudarParte);
  useLayoutEffect(() => {
    aoMudarParteRef.current = aoMudarParte;
  });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    let atual: SectionKey | null = null;

    /**
     * Mede as seções contra a janela da tela.
     *
     * Um laço sobre quatro retângulos por quadro de rolagem, e não um
     * `IntersectionObserver`: a pergunta "qual seção está no meio" não sai de uma
     * razão de interseção, e as duas respostas precisam sair da mesma medida.
     */
    const medir = () => {
      raf = 0;
      const caixa = el.getBoundingClientRect();
      const meio = caixa.top + caixa.height * linhaAtual(el.scrollTop, caixa.height);
      const minimo = caixa.height * VISTA;
      const novas = new Set<SectionKey>();
      let doMeio: SectionKey = config.partes[0];
      Array.from(el.children).forEach((filho, i) => {
        const r = filho.getBoundingClientRect();
        const visivel = Math.min(r.bottom, caixa.bottom) - Math.max(r.top, caixa.top);
        const parte = config.partes[i];
        if (visivel >= Math.min(minimo, r.height * 0.9)) novas.add(parte);
        if (r.top <= meio && r.bottom > meio) doMeio = parte;
      });
      /**
       * No fim da rolagem a seção atual é a última, esteja ela onde estiver. Uma
       * última seção mais curta que a tela pode nunca chegar à linha: sem isto,
       * ir ao Contato pelo cabeçalho ou pelo endereço deixava a página no fim,
       * com o Sobre ainda cruzando a linha, e o endereço voltava para ele.
       */
      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 2) {
        doMeio = config.partes[config.partes.length - 1];
      }
      setVistas((antes) =>
        antes.size === novas.size && [...novas].every((p) => antes.has(p)) ? antes : novas,
      );
      if (doMeio !== atual) {
        atual = doMeio;
        aoMudarParteRef.current(doMeio);
      }
    };
    const agendar = () => {
      if (!raf) raf = requestAnimationFrame(medir);
    };

    medir();
    el.addEventListener('scroll', agendar, { passive: true });
    const ro = new ResizeObserver(agendar);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', agendar);
      ro.disconnect();
      if (raf) cancelAnimationFrame(raf);
    };
  }, [config.partes]);

  // abrir a tela leva o foco para ela, sem rolar nada (ver o comentário do componente)
  useEffect(() => {
    if (ativa) ref.current?.focus({ preventScroll: true });
  }, [ativa]);

  /**
   * A câmera do céu segue a rolagem da tela ativa.
   *
   * Só a ativa avisa, e avisa também ao abrir: cada tela guarda a própria
   * rolagem, então voltar a uma tela rolada até o fim leva a câmera de volta
   * para onde ela estava ali. O salto da troca cobre a diferença.
   */
  useEffect(() => {
    const el = ref.current;
    if (!ativa || !el) return;
    const avisar = () => {
      const curso = el.scrollHeight - el.clientHeight;
      aoRolar(curso > 0 ? el.scrollTop / curso : 0);
    };
    avisar();
    el.addEventListener('scroll', avisar, { passive: true });
    return () => el.removeEventListener('scroll', avisar);
  }, [ativa, aoRolar]);

  /**
   * A tela que chega por troca vem do fundo (`data-veio`), e a da abertura não:
   * ali quem entra é a câmera saindo do buraco negro, e as duas chegadas juntas
   * brigariam. Estado derivado durante o render, como o `data-volta` do Início.
   */
  const [foiInativa, setFoiInativa] = useState(!ativa);
  if (!ativa && !foiInativa) setFoiInativa(true);
  const veio = ativa && foiInativa;

  const ligar = (el: HTMLDivElement | null) => {
    ref.current = el;
    registrar(el);
  };

  /**
   * O número de cada seção no cabeçalho de ficha dela. O Início não tem
   * cabeçalho e conta como zero, então num Dossiê o Sobre é 01; numa tela que não
   * abre com ele a primeira seção já é 01.
   */
  const base = config.partes[0] === 'inicio' ? 0 : 1;

  return (
    <div
      ref={ligar}
      className={styles.tela}
      data-ativa={ativa || undefined}
      data-veio={veio || undefined}
      inert={!ativa}
      tabIndex={-1}
    >
      {config.partes.map((parte, i) => {
        const Secao = montar[parte];
        return (
          <Secao key={parte} ativo={ativa && vistas.has(parte)} indice={String(i + base).padStart(2, '0')} />
        );
      })}
    </div>
  );
}
