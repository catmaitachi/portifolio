import { useState, type AnimationEvent } from 'react';
import styles from './Notice.module.css';

interface NoticeProps {
  /** o pai decide quando o aviso vale; a saída é animada antes de desmontar */
  aberto: boolean;
  titulo: string;
  texto: string;
  /** rótulo do botão de dispensar — vem do dicionário, como todo texto de a11y */
  rotuloFechar: string;
  onFechar: () => void;
}

/**
 * Modelo de notificação do HUD: painel no canto superior esquerdo, com título
 * curto, uma linha de texto e um botão de dispensar.
 *
 * É genérico de propósito — quem monta decide **quando** o aviso aparece e o que
 * ele diz. A primeira feature a usá-lo é a dica da supernova (`useNovaHint`),
 * mas nada aqui sabe disso.
 *
 * O aviso mora no canto superior esquerdo, **abaixo do cabeçalho de modo**, que
 * é o outro morador do canto. Os demais cantos estão tomados: seletor de idioma
 * no topo à direita, menu à direita, versão embaixo à direita e medidor da
 * supernova embaixo à esquerda.
 *
 * O recuo é medido contra o cabeçalho **aberto**, não recolhido. Ele é um menu
 * de uma linha que vira duas ao ser acionado, e ainda revela uma frase embaixo;
 * medido pelo estado recolhido, o painel preto cobriria exatamente essa frase no
 * instante em que ela existe para ser lida.
 *
 * **Fica montado durante a animação de saída.** Desmontar no mesmo quadro em que
 * `aberto` vira `false` faria o painel sumir de uma vez, e um aviso que pisca e
 * desaparece lê como falha de renderização. O `animationEnd` do próprio elemento
 * — nunca o de um filho — é que tira o painel do DOM.
 *
 * `role="status"` com `aria-live="polite"` anuncia o texto sem interromper o que
 * o leitor de tela estiver dizendo: é uma sugestão, não um alerta.
 */
export function Notice({ aberto, titulo, texto, rotuloFechar, onFechar }: NoticeProps) {
  const [montado, setMontado] = useState(aberto);

  /**
   * A montagem é decidida **durante o render**, não num efeito.
   *
   * Num efeito, o quadro em que `aberto` vira `true` ainda renderiza com
   * `montado` falso e devolve `null`; só o render seguinte põe o painel no DOM.
   * O aviso perdia um quadro para aparecer, e a animação de entrada começava
   * atrasada em relação ao que a disparou. Aqui o React descarta esta saída e
   * re-renderiza na hora, sem pintar o estado intermediário.
   *
   * A atualização converge porque a própria condição deixa de valer depois dela.
   */
  if (aberto && !montado) setMontado(true);

  if (!montado) return null;

  const aoTerminarAnimacao = (e: AnimationEvent<HTMLElement>) => {
    // o evento borbulha: só a animação do próprio painel encerra a montagem
    if (!aberto && e.target === e.currentTarget) setMontado(false);
  };

  return (
    <aside
      className={styles.aviso}
      data-aberto={aberto || undefined}
      role="status"
      aria-live="polite"
      onAnimationEnd={aoTerminarAnimacao}
    >
      <span className={styles.risco} aria-hidden="true" />

      <div className={styles.corpo}>
        <p className={styles.titulo}>{titulo}</p>
        <p className={styles.texto}>{texto}</p>
      </div>

      <button type="button" className={styles.fechar} aria-label={rotuloFechar} onClick={onFechar}>
        <span aria-hidden="true">&#215;</span>
      </button>
    </aside>
  );
}
