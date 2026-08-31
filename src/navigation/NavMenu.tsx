import { useEffect, useRef, useState } from 'react';
import { SECOES } from '~/content';
import { useT } from '~/i18n/useLanguage';
import styles from './NavMenu.module.css';

interface NavMenuProps {
  indice: number;
  irPara: (i: number) => void;
}

/**
 * Menu de seções: rótulo + risco de 1px que cresce na seção ativa.
 *
 * No desktop é uma coluna à direita. No mobile vira uma faixa horizontal que
 * **desliza para pôr a seção ativa no centro da tela**: `--navdx` é medido em
 * coordenadas de layout (`offsetLeft`/`offsetWidth`), imunes ao `transform` já
 * aplicado ao próprio nav — `getBoundingClientRect` daria um valor que se
 * realimenta a cada medição.
 */
export function NavMenu({ indice, irPara }: NavMenuProps) {
  const t = useT();
  const navRef = useRef<HTMLElement>(null);
  const [dx, setDx] = useState(0);

  useEffect(() => {
    const medir = () => {
      const nav = navRef.current;
      if (!nav || !nav.children.length) return;
      const i = Math.max(0, Math.min(nav.children.length - 1, indice));
      const alvo = nav.children[i] as HTMLElement;
      const proximo = Math.round(nav.offsetWidth / 2 - (alvo.offsetLeft + alvo.offsetWidth / 2));
      setDx((atual) => (atual === proximo ? atual : proximo));
    };

    // um quadro de espera: no primeiro render as larguras ainda não existem
    const raf = requestAnimationFrame(medir);
    window.addEventListener('resize', medir);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', medir);
    };
  }, [indice]);

  return (
    <nav
      ref={navRef}
      className={styles.nav}
      aria-label={t.a11y.secoes}
      style={{ '--navdx': `${dx}px` } as React.CSSProperties}
    >
      {SECOES.map((s, i) => {
        const ativo = i === indice;
        return (
          <button
            key={s.key}
            type="button"
            className={styles.item}
            data-ativo={ativo || undefined}
            aria-current={ativo ? 'true' : undefined}
            onClick={() => irPara(i)}
          >
            <span className={styles.rotulo}>{t.nav[s.key]}</span>
            <span className={styles.risco} aria-hidden="true" />
          </button>
        );
      })}
    </nav>
  );
}
