import { useEffect, useRef } from 'react';
import { SECOES } from '~/content';
import { useT } from '~/i18n/useLanguage';
import styles from './NavMenu.module.css';

interface NavMenuProps {
  indice: number;
  irPara: (i: number) => void;
  seguirFracao: (f: number) => void;
  soltarFracao: (i: number) => void;
}

/** Espera sem eventos de scroll para considerar a faixa parada. */
const REPOUSO = 140;

/**
 * Menu de seções: rótulo + risco de 1px que cresce na seção ativa.
 *
 * No desktop é uma coluna à direita. No mobile vira uma **faixa rolável ligada à
 * página**: rolar a faixa rola a página, e rolar a página recentraliza a faixa.
 *
 * A ligação é **contínua**, não por saltos. Enquanto o dedo arrasta, a posição da
 * faixa é convertida numa **fração de seção** e a página é levada até ali no
 * mesmo quadro — a 1,6 corresponde a seis décimos do caminho entre a segunda e a
 * terceira seção. Por isso o rótulo aceso muda no meio do gesto e não só no fim:
 * o índice continua saindo do `scrollTop` da página, que agora acompanha o dedo.
 *
 * (Antes a leitura acontecia só em repouso e a página saltava. Ficava barato,
 * mas o gesto não tinha retorno nenhum enquanto durava.)
 *
 * As duas pontas escrevem uma na outra, então precisam **não se realimentarem**:
 *
 * - **enquanto o gesto corre, a faixa manda.** O efeito que a centraliza fica
 *   suspenso; sem isso, o índice muda no meio do arraste, o efeito dispara um
 *   `scrollTo` na faixa e briga com o dedo;
 * - **a rolagem que o próprio componente provoca é marcada**, e não vira gesto;
 * - **a marca só é posta quando o `scrollTo` de fato move alguma coisa.** Posta
 *   sobre uma rolagem de zero, ela não teria evento para consumi-la e ficaria
 *   pendurada, engolindo o gesto seguinte. É o caso comum, porque o `snap`
 *   costuma deixar o item já centralizado.
 *
 * **O início e o fim do gesto são decididos por sinais diferentes**, e isso não
 * é assimetria gratuita. O **início** vem de scroll que não é programático, para
 * que trackpad, roda com shift e teclado entrem pelo mesmo caminho. O **fim**
 * precisa do dedo: um arraste real está cheio de pausas de mais de `REPOUSO`,
 * porque o dedo desacelera, inverte a direção ou simplesmente segura. Enquanto o
 * fim saía só do repouso da faixa, cada uma dessas pausas era lida como gesto
 * terminado — a página encaixava na seção mais próxima e o `scroll-snap`
 * voltava, no meio do movimento, e o visitante via a página ser puxada sozinha.
 * Com o dedo na tela o gesto não termina, por mais parada que a faixa esteja.
 *
 * As medidas são `offsetLeft`/`offsetWidth`, coordenadas de layout: elas não
 * mudam com o `scrollLeft`, então a conta não se realimenta.
 * `getBoundingClientRect` daria um valor diferente a cada medição.
 *
 * A medida acontece um quadro depois da troca de seção, então **o layout da
 * faixa no mobile não pode depender de qual seção está ativa**: se ele mudar, a
 * medida sai sobre uma faixa que ainda vai se acomodar. Por isso o risco ativo
 * cresce em escala e não em largura (ver `NavMenu.module.css`). Animar largura
 * ali de novo traz o desalinhamento de volta.
 */
export function NavMenu({ indice, irPara, seguirFracao, soltarFracao }: NavMenuProps) {
  const t = useT();
  const navRef = useRef<HTMLElement>(null);
  // o listener de scroll é registrado uma vez; o índice corrente chega por ref
  const indiceRef = useRef(indice);
  indiceRef.current = indice;
  const programaticoRef = useRef(false);
  const emGestoRef = useRef(false);
  /** o ponteiro está na faixa: enquanto estiver, o gesto não pode terminar */
  const dedoRef = useRef(false);

  /** `scrollLeft` que põe o item `i` no centro da faixa. */
  const encaixeDe = (nav: HTMLElement, i: number) => {
    const el = nav.children[i] as HTMLElement;
    return el.offsetLeft + el.offsetWidth / 2 - nav.clientWidth / 2;
  };

  /**
   * Onde a faixa está, em índice fracionário.
   *
   * Os encaixes não são igualmente espaçados — os rótulos têm larguras
   * diferentes —, então a conversão procura o par que contém a posição atual e
   * interpola entre os dois índices. Fora das pontas, prende na ponta.
   */
  const fracaoDe = (nav: HTMLElement) => {
    const n = nav.children.length;
    if (n < 2) return 0;
    const x = nav.scrollLeft;
    for (let i = 0; i < n - 1; i++) {
      const a = encaixeDe(nav, i);
      const b = encaixeDe(nav, i + 1);
      if (x < a) return i;
      if (x <= b) return b === a ? i : i + (x - a) / (b - a);
    }
    return n - 1;
  };

  // a faixa acompanha a seção ativa
  useEffect(() => {
    const centralizar = () => {
      const nav = navRef.current;
      if (!nav || !nav.children.length) return;
      // durante o gesto quem manda é o dedo
      if (emGestoRef.current) return;
      // no desktop a coluna não transborda, e não há nada a rolar; a tolerância
      // de 1px é para o arredondamento de subpixel não passar por transbordo
      if (nav.scrollWidth - nav.clientWidth < 1) return;
      const i = Math.max(0, Math.min(nav.children.length - 1, indiceRef.current));
      const alvo = encaixeDe(nav, i);
      // já está no lugar: rolar zero não gera evento, e a marca ficaria pendurada
      if (Math.abs(alvo - nav.scrollLeft) < 1) return;
      programaticoRef.current = true;
      nav.scrollTo({ left: alvo });
    };

    // um quadro de espera: no primeiro render as larguras ainda não existem
    const raf = requestAnimationFrame(centralizar);
    window.addEventListener('resize', centralizar);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', centralizar);
    };
  }, [indice]);

  // e a página acompanha a faixa, quadro a quadro
  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    let espera = 0;

    const aoParar = () => {
      // o dedo ainda está na tela: a faixa parou, o gesto não
      if (dedoRef.current) return;
      if (!emGestoRef.current) {
        // era a rolagem que o efeito acima provocou, e ela terminou
        programaticoRef.current = false;
        return;
      }
      emGestoRef.current = false;
      soltarFracao(Math.round(fracaoDe(nav)));
    };

    const adiarParada = () => {
      clearTimeout(espera);
      espera = window.setTimeout(aoParar, REPOUSO);
    };

    const aoRolar = () => {
      if (!programaticoRef.current && nav.scrollWidth - nav.clientWidth >= 1) {
        emGestoRef.current = true;
        seguirFracao(fracaoDe(nav));
      }
      adiarParada();
    };

    const aoTocar = () => {
      dedoRef.current = true;
    };

    /**
     * Soltar também precisa agendar a verificação.
     *
     * Um gesto que termina com a faixa já parada — o dedo para, passa o
     * `REPOUSO`, e só então solta — não geraria evento de scroll novo para
     * rearmar o timer, e o gesto ficaria aberto para sempre.
     */
    const aoSoltar = () => {
      if (!dedoRef.current) return;
      dedoRef.current = false;
      adiarParada();
    };

    nav.addEventListener('scroll', aoRolar, { passive: true });
    /**
     * **Touch, e não pointer.**
     *
     * Pointer events não servem para acompanhar um gesto de rolagem: assim que o
     * navegador assume o toque para rolar, ele dispara `pointercancel` e nunca
     * manda o `pointerup`. Ouvindo esses eventos, o dedo era dado como retirado
     * no primeiro milímetro de arraste, e o gesto voltava a terminar em cada
     * pausa — a página era puxada para a seção mais próxima enquanto o visitante
     * ainda segurava a faixa. Os eventos de touch sobrevivem ao scroll: o
     * `touchend` chega quando o dedo sai de verdade.
     *
     * O gesto **começa na faixa e termina na janela**. A faixa tem cerca de 44px
     * de altura, e um arraste horizontal sai dela pela borda com facilidade;
     * ouvindo o fim só no nav, soltar um dedo que já saiu deixaria `dedoRef`
     * preso e o gesto aberto para sempre.
     *
     * Quem rola sem tocar (roda do mouse, trackpad, teclado) nunca liga o
     * `dedoRef`, e para esses o repouso da faixa continua sendo o fim do gesto —
     * não há o que segurar.
     */
    nav.addEventListener('touchstart', aoTocar, { passive: true });
    window.addEventListener('touchend', aoSoltar, { passive: true });
    window.addEventListener('touchcancel', aoSoltar, { passive: true });
    return () => {
      nav.removeEventListener('scroll', aoRolar);
      nav.removeEventListener('touchstart', aoTocar);
      window.removeEventListener('touchend', aoSoltar);
      window.removeEventListener('touchcancel', aoSoltar);
      clearTimeout(espera);
    };
  }, [seguirFracao, soltarFracao]);

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
