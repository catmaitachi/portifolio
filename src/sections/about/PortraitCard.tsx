import { useEffect, useRef } from 'react';
import { Figure } from '~/components/Figure';
import { RETRATO } from '~/content';
import { useReducedMotion } from '~/hooks/useReducedMotion';
import { useT } from '~/i18n/useLanguage';
import styles from './PortraitCard.module.css';
import { useAsciiArt } from './useAsciiArt';

/**
 * A grade do raio-x.
 *
 * As colunas são o que decide a nitidez, e 58 é onde o rosto ainda se reconhece
 * sem o texto virar ruído. As linhas saem da geometria: a moldura tem a
 * proporção `--retrato-ar` (1,25 de altura por 1 de largura) e a célula de um
 * monoespaçado é 0,6 de largura por 1 de altura, então `58 × 1,25 × 0,6` dá 44.
 *
 * Os dois números aparecem de novo no CSS, que dimensiona a fonte por
 * `100cqw / colunas / 0,6` e a entrelinha por `100cqh / linhas` — é isso que faz
 * a grade cobrir a moldura **exatamente**, em vez de sobrar ou faltar um pedaço
 * conforme o tamanho da tela.
 */
const COLUNAS = 58;
const LINHAS = 44;

/**
 * Retrato como carta: inclina seguindo o ponteiro, cresce um pouco e um brilho
 * especular acompanha o cursor.
 *
 * Escreve **direto no `style`**, dentro de um rAF coalescido — um `setState` por
 * `pointermove` re-renderizaria a seção inteira dezenas de vezes por segundo
 * para mudar dois números de `transform`.
 *
 * **O ponteiro também revela o retrato em ASCII**, como um raio-x. A arte é
 * calculada uma vez, quando a imagem carrega (`useAsciiArt`), e o hover é
 * opacidade em CSS: nada é recalculado enquanto o cursor anda. O preto por
 * baixo dos glifos é translúcido, então a foto continua fantasmando atrás
 * deles, que é o que separa um raio-x de uma troca de imagem.
 *
 * Sem ponteiro não há raio-x, e é aceito: quem está no celular vê o retrato, que
 * é o conteúdo. Um gesto de toque para revelá-lo disputaria com a rolagem da
 * seção, e a camada não carrega informação nenhuma que a foto não carregue.
 */
export function PortraitCard() {
  const t = useT();
  const caixaRef = useRef<HTMLDivElement>(null);
  const cartaRef = useRef<HTMLDivElement>(null);
  const semMovimento = useReducedMotion();
  const ascii = useAsciiArt(RETRATO, COLUNAS, LINHAS);

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
        {/* `aria-hidden`: é o mesmo retrato, desenhado com outra tinta */}
        {ascii && (
          <pre
            className={styles.raio}
            style={{ '--colunas': COLUNAS, '--linhas': LINHAS } as React.CSSProperties}
            aria-hidden="true"
          >
            {ascii}
          </pre>
        )}
        <span className={styles.brilho} aria-hidden="true" />
      </div>
    </div>
  );
}
