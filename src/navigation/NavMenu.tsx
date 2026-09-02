import { useEffect, useRef } from 'react';
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
 * No desktop é uma coluna à direita. No mobile vira uma **faixa rolável** que se
 * centraliza sozinha na seção ativa: a rolagem é nativa, então o dedo alcança
 * qualquer item, e a centralização é um `scrollTo` a cada troca de seção.
 *
 * A medida é `offsetLeft`/`offsetWidth`, coordenadas de layout: elas não mudam
 * com o `scrollLeft` que este efeito escreve, então a conta não se realimenta.
 * `getBoundingClientRect` daria um valor diferente a cada medição.
 *
 * A medida acontece um quadro depois da troca de seção, então **o layout da
 * faixa no mobile não pode depender de qual seção está ativa**: se ele mudar, a
 * medida sai sobre uma faixa que ainda vai se acomodar. Por isso o risco ativo
 * cresce em escala e não em largura (ver `NavMenu.module.css`). Animar largura
 * ali de novo traz o desalinhamento de volta.
 */
export function NavMenu({ indice, irPara }: NavMenuProps) {
  const t = useT();
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const centralizar = () => {
      const nav = navRef.current;
      if (!nav || !nav.children.length) return;
      // no desktop a coluna não transborda, e não há nada a rolar
      if (nav.scrollWidth <= nav.clientWidth) return;
      const i = Math.max(0, Math.min(nav.children.length - 1, indice));
      const alvo = nav.children[i] as HTMLElement;
      nav.scrollTo({ left: alvo.offsetLeft + alvo.offsetWidth / 2 - nav.clientWidth / 2 });
    };

    // um quadro de espera: no primeiro render as larguras ainda não existem
    const raf = requestAnimationFrame(centralizar);
    window.addEventListener('resize', centralizar);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', centralizar);
    };
  }, [indice]);

  return (
    <nav ref={navRef} className={styles.nav} aria-label={t.a11y.secoes}>
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
