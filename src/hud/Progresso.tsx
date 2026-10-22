import { useImperativeHandle, useRef, type Ref } from 'react';
import styles from './Progresso.module.css';

/** O que o `App` pede à barra: o quanto a tela ativa já rolou. */
export interface ProgressoHandle {
  /** de 0 (topo) a 1 (fim) */
  definir(progresso: number): void;
}

/**
 * A barra de progressão da rolagem: um fio no topo da janela que se enche
 * conforme a tela ativa rola, com o brilho do nome passando por ele.
 *
 * **Não passa por estado.** A rolagem avisa a cada quadro, e uma prop por quadro
 * renderizaria o `App` inteiro (é o mesmo caminho que a câmera do céu segue, ver
 * `scene/camera.ts`). O `App` guarda a ref e escreve por `definir`, que escreve
 * direto no nó: o React não sabe o quanto a barra está cheia.
 *
 * O progresso é o da **tela**, e não o do site. Cada tela rola por dentro, guarda
 * a própria rolagem e avisa ao abrir, então trocar de tela leva a barra ao ponto
 * em que aquela tela estava.
 *
 * Desenho puro (`aria-hidden`): o navegador já anuncia a rolagem, e a barra não
 * diz nada que a página não diga.
 */
export function Progresso({ ref }: { ref: Ref<ProgressoHandle> }) {
  const barra = useRef<HTMLDivElement>(null);

  useImperativeHandle(
    ref,
    () => ({
      definir(progresso) {
        const el = barra.current;
        if (!el) return;
        /* a rolagem elástica do Safari passa dos extremos */
        const p = Math.min(1, Math.max(0, progresso));
        el.style.setProperty('--progresso', p.toFixed(4));
        /* o brilho só corre com a barra à vista (ver o CSS) */
        el.toggleAttribute('data-aceso', p > 0);
      },
    }),
    [],
  );

  return <div ref={barra} className={styles.progresso} aria-hidden="true" />;
}
