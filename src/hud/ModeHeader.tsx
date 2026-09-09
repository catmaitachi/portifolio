import { useEffect, useRef, useState } from 'react';
import { MODOS, type ModoKey } from '~/content';
import { useT } from '~/i18n/useLanguage';
import styles from './ModeHeader.module.css';

interface ModeHeaderProps {
  modo: ModoKey;
  trocar: (m: ModoKey) => void;
}

/**
 * O cabeçalho: em que lado do site o visitante está.
 *
 * É o **segundo eixo** da navegação, e não substitui o primeiro: aqui se escolhe
 * o lado, e o menu de seções continua sendo as seções daquele lado.
 *
 * **É um menu, e recolhido mostra só o lado em vigor.** Os dois nomes lado a
 * lado o tempo todo seriam duas afirmações onde só uma é verdade, e no canto
 * superior esquerdo, que é o primeiro lugar onde o olho cai, isso disputa com o
 * nome da pessoa. Recolhido ele responde "você está no profissional"; aberto,
 * pergunta. O mesmo botão troca de papel conforme `aberto`, e o rótulo de
 * acessibilidade troca com ele.
 *
 * **Apontar um nome revela uma linha sobre aquele lado**, no lugar onde a lista
 * de seções ficava. A lista era informação que o menu de seções já dá assim que
 * a troca acontece, e repeti-la ali cobrava do visitante ler cinco palavras para
 * decidir uma coisa só. A frase responde a pergunta que ele de fato tem: o que
 * tem desse lado?
 *
 * **As duas frases ficam montadas**, empilhadas numa célula de grade só. É isso
 * que permite animar a troca de uma pela outra: uma frase que só existisse
 * enquanto o seu nome estivesse apontado não teria de onde sair. E o lado de
 * onde cada uma entra sai da posição dela em `MODOS`, por `--lado`, então
 * ninguém escreve "direita" em lugar nenhum.
 *
 * No toque não existe hover, e a frase não aparece (`hover: none` no módulo): um
 * painel que abrisse no toque ficaria aberto cobrindo o topo da seção até o
 * toque seguinte. Ali o menu é a interação inteira.
 */
export function ModeHeader({ modo, trocar }: ModeHeaderProps) {
  const t = useT();
  const [aberto, setAberto] = useState(false);
  /** qual frase está à mostra; `null` com o ponteiro e o foco fora do cabeçalho */
  const [mostrando, setMostrando] = useState<ModoKey | null>(null);
  const grupoRef = useRef<HTMLElement>(null);
  const iMostrando = mostrando ? MODOS.findIndex((m) => m.key === mostrando) : -1;

  // menu aberto: Esc e o toque fora fecham, como em qualquer menu
  useEffect(() => {
    if (!aberto) return;
    const aoTeclar = (e: KeyboardEvent) => e.key === 'Escape' && setAberto(false);
    const aoApontar = (e: PointerEvent) => {
      if (!grupoRef.current?.contains(e.target as Node)) setAberto(false);
    };
    window.addEventListener('keydown', aoTeclar);
    window.addEventListener('pointerdown', aoApontar);
    return () => {
      window.removeEventListener('keydown', aoTeclar);
      window.removeEventListener('pointerdown', aoApontar);
    };
  }, [aberto]);

  return (
    <nav
      ref={grupoRef}
      className={styles.cabecalho}
      data-aberto={aberto || undefined}
      aria-label={t.a11y.modos}
      onMouseLeave={() => setMostrando(null)}
      /* o blur do React borbulha: só fecha quando o foco sai do cabeçalho inteiro */
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) {
          setMostrando(null);
          setAberto(false);
        }
      }}
    >
      <div className={styles.lista}>
        {MODOS.map((m) => {
          const escolhido = m.key === modo;
          // recolhido, o botão do lado em vigor é o gatilho do menu
          const gatilho = !aberto && escolhido;
          return (
            <button
              key={m.key}
              type="button"
              className={styles.modo}
              data-escolhido={escolhido || undefined}
              data-oculto={(!aberto && !escolhido) || undefined}
              /* fechado ele é gatilho, aberto é opção: os dois papéis não dividem
                 o mesmo atributo */
              aria-label={gatilho ? t.a11y.modosAbrir : undefined}
              aria-expanded={gatilho ? false : undefined}
              aria-current={aberto && escolhido ? 'true' : undefined}
              aria-describedby={`modo-descricao-${m.key}`}
              tabIndex={aberto || escolhido ? 0 : -1}
              onMouseEnter={() => setMostrando(m.key)}
              onFocus={() => setMostrando(m.key)}
              onClick={() => {
                if (gatilho) {
                  setAberto(true);
                  return;
                }
                trocar(m.key);
                setAberto(false);
              }}
            >
              {t.modos[m.key].rotulo}
            </button>
          );
        })}
      </div>

      {/* as frases descrevem os botões acima (`aria-describedby`), então continuam na
          árvore de acessibilidade mesmo apagadas: quem não vê o hover recebe a mesma
          informação ao chegar no nome */}
      <div className={styles.painel}>
        {MODOS.map((m, i) => {
          const visivel = m.key === mostrando;
          // fechado, todas ficam em zero: o painel só se apaga, sem escolher lado
          const lado = iMostrando < 0 ? 0 : i - iMostrando;
          return (
            <p
              key={m.key}
              id={`modo-descricao-${m.key}`}
              className={styles.descricao}
              data-visivel={visivel || undefined}
              style={{ '--lado': lado } as React.CSSProperties}
            >
              {t.modos[m.key].descricao}
            </p>
          );
        })}
      </div>
    </nav>
  );
}
