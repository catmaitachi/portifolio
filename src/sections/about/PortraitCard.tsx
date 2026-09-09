import { useEffect, useRef } from 'react';
import { Figure } from '~/components/Figure';
import { RETRATO } from '~/content';
import { useReducedMotion } from '~/hooks/useReducedMotion';
import { useT } from '~/i18n/useLanguage';
import styles from './PortraitCard.module.css';

/**
 * Retrato como carta: inclina seguindo o ponteiro, cresce um pouco e um brilho
 * especular acompanha o cursor.
 *
 * Escreve **direto no `style`**, dentro de um rAF coalescido — um `setState` por
 * `pointermove` re-renderizaria a seção inteira dezenas de vezes por segundo
 * para mudar dois números de `transform`.
 */
export function PortraitCard() {
  const t = useT();
  const caixaRef = useRef<HTMLDivElement>(null);
  const cartaRef = useRef<HTMLDivElement>(null);
  const semMovimento = useReducedMotion();

  useEffect(() => {
    const caixa = caixaRef.current;
    const carta = cartaRef.current;
    if (!caixa || !carta || semMovimento) return;

    const brilho = carta.querySelector<HTMLElement>(`.${styles.brilho}`);
    let px = 0.5;
    let py = 0.5;
    let dentro = false;
    let pendente = 0;

    const pintar = () => {
      pendente = 0;
      const rx = (0.5 - py) * 15;
      const ry = (px - 0.5) * 17;
      carta.style.transform = dentro
        ? `rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) scale(1.045)`
        : 'rotateX(0deg) rotateY(0deg) scale(1)';
      // a sombra acompanha a inclinação, como se a luz viesse de cima
      carta.style.boxShadow = dentro
        ? `${(-ry * 1.4).toFixed(1)}px ${(rx * 1.4 + 16).toFixed(1)}px 46px -18px rgba(0,0,0,.95)`
        : 'none';
      if (brilho) {
        brilho.style.setProperty('--bx', `${(px * 100).toFixed(1)}%`);
        brilho.style.setProperty('--by', `${(py * 100).toFixed(1)}%`);
        brilho.style.opacity = dentro ? '1' : '0';
      }
    };

    const mover = (e: PointerEvent) => {
      const r = caixa.getBoundingClientRect();
      px = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
      py = Math.max(0, Math.min(1, (e.clientY - r.top) / r.height));
      dentro = true;
      // enquanto o ponteiro está dentro, só a sombra transiciona: a inclinação
      // precisa colar no cursor
      carta.style.transition = 'box-shadow .3s ease';
      if (!pendente) pendente = requestAnimationFrame(pintar);
    };

    const sair = () => {
      dentro = false;
      carta.style.transition =
        'transform .55s cubic-bezier(.2,.8,.2,1),box-shadow .55s ease';
      pintar();
    };

    caixa.addEventListener('pointermove', mover);
    caixa.addEventListener('pointerleave', sair);
    caixa.addEventListener('pointercancel', sair);
    return () => {
      caixa.removeEventListener('pointermove', mover);
      caixa.removeEventListener('pointerleave', sair);
      caixa.removeEventListener('pointercancel', sair);
      if (pendente) cancelAnimationFrame(pendente);
    };
  }, [semMovimento]);

  return (
    <div ref={caixaRef} className={styles.caixa}>
      <div ref={cartaRef} className={styles.carta}>
        <Figure src={RETRATO} alt={t.a11y.retrato} placeholder={t.a11y.retrato} fit="cover" />
        <span className={styles.brilho} aria-hidden="true" />
      </div>
    </div>
  );
}
