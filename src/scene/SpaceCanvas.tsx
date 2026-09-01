import { useEffect, useRef } from 'react';
import type { SectionKey } from '~/content';
import { useReducedMotion } from '~/hooks/useReducedMotion';
import { CEUS, DURACAO, nomeDoCeu, SECAO_DO_BURACO_NEGRO, TOQUE_PARADO } from './scenePlan';
import styles from './SpaceCanvas.module.css';

interface SpaceCanvasProps {
  secao: SectionKey;
  /** chamado quando uma supernova é de fato acesa (e não engolida pela recarga) */
  onNova?: () => void;
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
 * É aqui também que mora a regra de **quando um toque vira supernova**. O canvas
 * fica atrás do contêiner de rolagem, então nenhum clique chega a ele: quem
 * escuta é a janela, e a decisão de "isto foi o vazio, não o conteúdo" é
 * conhecimento do DOM da página — o motor não deve tê-lo. A camada só recebe um
 * ponto e responde se aceitou ou não.
 */
export function SpaceCanvas({ secao, onNova }: SpaceCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const onNovaRef = useRef(onNova);
  onNovaRef.current = onNova;
  const semMovimento = useReducedMotion();

  // a cena aplicada mais recente e a função que sabe aplicá-la; ficam em ref
  // porque mudam sem que nada precise ser redesenhado pelo React
  const aplicarRef = useRef<((secao: SectionKey) => void) | null>(null);
  const pendenteRef = useRef<SectionKey>(secao);
  const semMovimentoRef = useRef(semMovimento);
  semMovimentoRef.current = semMovimento;

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;

    let vivo = true;
    let destruir: (() => void) | null = null;

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
      if (!vivo) return;

      // Ordem do array = ordem de update; `z` = ordem de desenho. O buraco negro
      // atualiza antes do campo de estrelas porque publica a gravidade que ele lê.
      const ceus = Object.entries(CEUS).map(([key, ceu]) =>
        Constellations({
          name: nomeDoCeu(key as SectionKey),
          opacity: 0,
          placements: ceu.placements,
        }),
      );

      const nova = Supernova({
        cooldown: DURACAO.novaRecarga,
        wave: DURACAO.novaOnda,
      });

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
       * Toque no vazio = supernova.
       *
       * "Vazio" é literalmente o canvas ou a caixa de uma seção — nunca um
       * descendente dela. Clicar num cartão, num botão, num campo ou no bloco de
       * conteúdo é interação com a página, e a página vem primeiro.
       *
       * O par pointerdown/pointerup existe por causa das superfícies de arraste:
       * a órbita de Projetos e a curva da Trajetória são arrastadas por cima
       * dessa mesma área, e um arraste não pode terminar em estrela. Acima de
       * `TOQUE_PARADO` px o gesto é de outro dono.
       */
      let alvoVazio = false;
      let px = 0;
      let py = 0;

      const noVazio = (alvo: EventTarget | null): boolean =>
        alvo instanceof Element && (alvo === cv || alvo.tagName === 'SECTION');

      const aoDescer = (e: PointerEvent) => {
        alvoVazio =
          !semMovimentoRef.current &&
          e.isPrimary &&
          (e.pointerType !== 'mouse' || e.button === 0) &&
          noVazio(e.target);
        px = e.clientX;
        py = e.clientY;
      };

      const aoSubir = (e: PointerEvent) => {
        if (!alvoVazio) return;
        alvoVazio = false;
        if (Math.abs(e.clientX - px) > TOQUE_PARADO) return;
        if (Math.abs(e.clientY - py) > TOQUE_PARADO) return;
        // durante o zoom da intro a cena ainda está chegando: nada de onda
        if (stage.env.camera.moving) return;
        if (nova.disparar(e.clientX, e.clientY)) onNovaRef.current?.();
      };

      const aoCancelar = () => {
        alvoVazio = false;
      };

      window.addEventListener('pointerdown', aoDescer, { passive: true });
      window.addEventListener('pointerup', aoSubir, { passive: true });
      window.addEventListener('pointercancel', aoCancelar, { passive: true });

      destruir = () => {
        aplicarRef.current = null;
        window.removeEventListener('pointerdown', aoDescer);
        window.removeEventListener('pointerup', aoSubir);
        window.removeEventListener('pointercancel', aoCancelar);
        stage.destroy();
      };
    })();

    return () => {
      vivo = false;
      destruir?.();
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
