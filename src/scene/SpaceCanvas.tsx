import { useEffect, useLayoutEffect, useRef } from 'react';
import type { SectionKey } from '~/content';
import { useReducedMotion } from '~/hooks/useReducedMotion';
import { CEUS, DURACAO, nomeDoCeu, NOVA_NIVEIS, SECAO_DO_BURACO_NEGRO } from './scenePlan';
import styles from './SpaceCanvas.module.css';

interface SpaceCanvasProps {
  secao: SectionKey;
  /**
   * Chamado quando uma supernova é de fato acesa (e não engolida pela recarga),
   * com o nível que a carga atingiu. É por ele que o HUD sabe qual recarga
   * desenhar.
   */
  onNova?: (nivel: number) => void;
}

/**
 * Ponte entre o React e o motor de cena.
 *
 * O canvas fica **fora** do ciclo de render: o motor é criado uma vez e a única
 * coisa que atravessa a fronteira depois disso é a seção ativa. Trocar de idioma,
 * abrir um projeto ou navegar na linha do tempo não toca na cena.
 *
 * O motor entra por `import()` dinâmico — ele é o maior pedaço de JavaScript da
 * página e nada na primeira pintura depende dele.
 *
 * É aqui também que mora a regra de **quando um gesto vira supernova**. O canvas
 * fica atrás do contêiner de rolagem, então nenhum clique chega a ele: quem
 * escuta é a janela, e a decisão de "isto foi o vazio, não o conteúdo" é
 * conhecimento do DOM da página — o motor não deve tê-lo. A camada só recebe o
 * começo, o fim e a desistência do gesto, e responde com o nível que saiu dali.
 * Mover o ponteiro no meio do caminho não é mais decisão dela: o gesto só é
 * julgado pelo alvo no início e no fim, nunca pelo percurso entre eles.
 */
export function SpaceCanvas({ secao, onNova }: SpaceCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const onNovaRef = useRef(onNova);
  const semMovimento = useReducedMotion();

  // a cena aplicada mais recente e a função que sabe aplicá-la; ficam em ref
  // porque mudam sem que nada precise ser redesenhado pelo React
  const aplicarRef = useRef<((secao: SectionKey) => void) | null>(null);
  const pendenteRef = useRef<SectionKey>(secao);
  const semMovimentoRef = useRef(semMovimento);

  /**
   * As refs de valor corrente são escritas **num efeito**, nunca no corpo: o
   * render precisa ser puro, porque o React pode executá-lo e descartar o
   * resultado. `useLayoutEffect` porque quem as lê é o laço da cena e um
   * listener de ponteiro, e o valor precisa estar novo antes da próxima pintura.
   */
  useLayoutEffect(() => {
    onNovaRef.current = onNova;
    semMovimentoRef.current = semMovimento;
  });

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;

    /**
     * O cleanup precisa **possuir** tudo que este efeito registra, e o que ele
     * registra nasce depois de um `await`.
     *
     * Os listeners vão num `AbortController`: `abort()` os remove de uma vez, e
     * funciona mesmo que o cleanup corra **antes** de eles existirem — o sinal já
     * está abortado quando o `addEventListener` acontece, e o navegador
     * simplesmente não registra. É o que dispensa rastrear cada listener por uma
     * variável que pode estar nula.
     *
     * O `stage` continua precisando de uma referência, porque criá-lo aloca
     * canvas, rAF e observadores que só ele sabe soltar.
     */
    const controle = new AbortController();
    let destruirStage: (() => void) | null = null;

    void (async () => {
      const {
        createStage,
        Nebula,
        Starfield,
        BlackHole,
        Constellations,
        Meteors,
        Supernova,
        tween,
      } = await import('~/engine');
      /**
       * A guarda fica **depois** do `await`, e é aí que ela serve.
       *
       * Ela não checa o resultado do import: checa se o componente ainda existe
       * depois da espera. Movida para antes, seria sempre verdadeira (o efeito
       * acabou de começar) e deixaria de proteger o único caso que importa —
       * desmontar enquanto o motor carrega, criando uma cena que ninguém desfaz.
       */
      if (controle.signal.aborted) return;

      // Ordem do array = ordem de update; `z` = ordem de desenho. O buraco negro
      // atualiza antes do campo de estrelas porque publica a gravidade que ele lê.
      const ceus = Object.entries(CEUS).map(([key, ceu]) =>
        Constellations({
          name: nomeDoCeu(key as SectionKey),
          opacity: 0,
          placements: ceu.placements,
          // menos movimento: a figura aparece inteira, sem se desenhar
          drawTime: semMovimentoRef.current ? 0 : DURACAO.constelacaoTraco,
        }),
      );

      const nova = Supernova({ niveis: NOVA_NIVEIS });

      const stage = createStage(cv, [
        Nebula(), // z 0
        BlackHole(), // z 20 — publica a gravidade
        nova, // z 14 — publica a onda de choque
        Starfield(), // z 10 — consome a gravidade e a onda
        ...ceus, // z 12
        Meteors(), // z 30
      ]);

      /**
       * Aplica a cena de uma seção: o buraco negro se afasta ao sair do Início e
       * os céus cruzam opacidade. `tween` cancela o anterior na mesma
       * propriedade, então trocar de seção duas vezes seguidas não deixa dois
       * rAF disputando o mesmo valor.
       */
      const aplicar = (alvo: SectionKey) => {
        const instantaneo = semMovimentoRef.current ? 0 : 1;

        const bh = stage.layer<import('~/engine').BlackHoleLayer>('blackhole');
        if (bh) {
          const presente = alvo === SECAO_DO_BURACO_NEGRO;
          const dur = presente ? DURACAO.buracoNegroEntrada : DURACAO.buracoNegroSaida;
          tween(bh, 'strength', presente ? 1 : 0, dur * instantaneo);
        }

        for (const [key, ceu] of Object.entries(CEUS)) {
          const camada = stage.layer<import('~/engine').ConstellationsLayer>(
            nomeDoCeu(key as SectionKey),
          );
          if (!camada) continue;
          const ativo = key === alvo;
          const dur = ativo ? ceu.entrada : DURACAO.ceuSaida;
          tween(camada, 'opacity', ativo ? 1 : 0, dur * instantaneo);
        }
      };

      aplicarRef.current = aplicar;
      if (!semMovimentoRef.current) {
        stage.camera.zoomOut(DURACAO.cameraFator, DURACAO.cameraZoom);
      }
      aplicar(pendenteRef.current);

      /**
       * Pressionar o vazio carrega; soltar acende.
       *
       * "Vazio" é literalmente o canvas ou a caixa de uma seção — nunca um
       * descendente dela. Clicar num cartão, num botão, num campo ou no bloco de
       * conteúdo é interação com a página, e a página vem primeiro.
       *
       * O gesto tem **duração**: a carga abre no `pointerdown` e o nível sobe
       * enquanto o botão fica pressionado. Mover o dedo ou o mouse **não cancela
       * a carga** — o poço continua ancorado no ponto onde o gesto começou, e é
       * isso que resolve um problema real do celular: o próprio dedo cobre o
       * efeito, e escorregá-lo para o lado sem soltar é a única forma de vê-lo.
       *
       * A pergunta que sobra é "onde o gesto terminou", e ela se resolve sozinha
       * no `pointerup`, checando `noVazio(e.target)` outra vez, sem medir
       * distância nenhuma:
       *
       * - no **toque**, `e.target` é sempre o elemento do `pointerdown` original
       *   (captura implícita) — mover o dedo livremente nunca muda o alvo, então
       *   a checagem passa sempre que o gesto começou no vazio;
       * - no **mouse**, o alvo muda de verdade conforme o cursor anda — se o
       *   botão for solto sobre um cartão de verdade, `noVazio` falha ali e a
       *   carga aborta sem disparar.
       *
       * Um arraste de página de verdade nunca chega a este ponto: quando o
       * navegador assume um toque para rolar, ele emite `pointercancel` para
       * aquele ponteiro, e é o `aoCancelar` abaixo quem cobre esse caso — a
       * mesma plataforma que já resolve isso na faixa de navegação do mobile.
       *
       * O `blur` é a rede de segurança do outro lado: soltar o botão fora da
       * janela pode não gerar `pointerup` nenhum, e uma carga sem fim ficaria
       * presa puxando o céu.
       */
      let alvoVazio = false;

      const noVazio = (alvo: EventTarget | null): boolean =>
        alvo instanceof Element && (alvo === cv || alvo.tagName === 'SECTION');

      const aoDescer = (e: PointerEvent) => {
        alvoVazio =
          !semMovimentoRef.current &&
          e.isPrimary &&
          (e.pointerType !== 'mouse' || e.button === 0) &&
          noVazio(e.target) &&
          // durante o zoom da intro a cena ainda está chegando: nada de carga
          !stage.env.camera.moving;
        if (alvoVazio) nova.carregar(e.clientX, e.clientY);
      };

      const aoSubir = (e: PointerEvent) => {
        if (!alvoVazio) return;
        alvoVazio = false;
        if (!noVazio(e.target)) {
          nova.abortar();
          return;
        }
        const nivel = nova.soltar();
        if (nivel) onNovaRef.current?.(nivel);
      };

      const aoCancelar = () => {
        alvoVazio = false;
        nova.abortar();
      };

      const sinal = controle.signal;
      window.addEventListener('pointerdown', aoDescer, { passive: true, signal: sinal });
      window.addEventListener('pointerup', aoSubir, { passive: true, signal: sinal });
      window.addEventListener('pointercancel', aoCancelar, { passive: true, signal: sinal });
      window.addEventListener('blur', aoCancelar, { passive: true, signal: sinal });

      destruirStage = () => {
        aplicarRef.current = null;
        stage.destroy();
      };

      // desmontou enquanto o resto desta função corria: desfaz na hora, porque o
      // cleanup já passou e não vai voltar
      if (sinal.aborted) {
        destruirStage();
        destruirStage = null;
      }
    })();

    return () => {
      controle.abort();
      destruirStage?.();
    };
  }, []);

  // A seção pode mudar antes de o motor terminar de carregar: `pendenteRef`
  // guarda a última pedida e o motor a aplica assim que fica pronto.
  useEffect(() => {
    pendenteRef.current = secao;
    aplicarRef.current?.(secao);
  }, [secao]);

  return <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />;
}
