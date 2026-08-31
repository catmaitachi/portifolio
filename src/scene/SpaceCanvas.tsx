import { useEffect, useRef } from 'react';
import type { SectionKey } from '~/content';
import { useReducedMotion } from '~/hooks/useReducedMotion';
import { CEUS, DURACAO, nomeDoCeu, SECAO_DO_BURACO_NEGRO } from './scenePlan';
import styles from './SpaceCanvas.module.css';

/**
 * Ponte entre o React e o motor de cena.
 *
 * O canvas fica **fora** do ciclo de render: o motor é criado uma vez e a única
 * coisa que atravessa a fronteira depois disso é a seção ativa. Trocar de idioma,
 * abrir um projeto ou navegar na linha do tempo não toca na cena.
 *
 * O motor entra por `import()` dinâmico — ele é o maior pedaço de JavaScript da
 * página e nada na primeira pintura depende dele.
 */
export function SpaceCanvas({ secao }: { secao: SectionKey }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
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

      const stage = createStage(cv, [
        Nebula(), // z 0
        BlackHole(), // z 20 — publica a gravidade
        Starfield(), // z 10 — consome a gravidade
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

      destruir = () => {
        aplicarRef.current = null;
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
