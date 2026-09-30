import { type CSSProperties, useRef } from 'react';
import styles from './Boneco.module.css';
import { useComportamento, VIDA } from './comportamento';
import { Modelo, type Nos } from './modelo';

/** A fumaça da morte: direções fixas, espalhadas, calculadas uma vez. */
const FUMACA = Array.from({ length: 14 }, (_, i) => {
  const a = (i / 14) * Math.PI * 2 + (i % 3) * 0.4;
  const r = 5 + (i % 4) * 2.5;
  return { '--dx': Math.cos(a) * r, '--dy': Math.sin(a) * r * 0.8 - 6, '--atraso': (i % 5) * 40 };
});

interface BonecoProps {
  nome: string;
  skin: string;
  slim: boolean;
  capa: string | null;
  /** a seção está em cena */
  ativo: boolean;
}

/**
 * O boneco no pedestal, com a placa do nome, a vida e o comportamento do jogo.
 *
 * - **Parado, ele olha o ponteiro**: a cabeça segue, o tronco vai junto, bem menos.
 * - **Segurar e arrastar gira o corpo**, na direção da mão.
 * - **Ao chegar, faz um gesto** sorteado de `GESTOS` (hoje, o aceno do Bedrock).
 * - **Clicar é um golpe**: ele fica vermelho, é empurrado para trás num pulo,
 *   volta andando e, se estava de costas, vira para quem bateu. A vida aparece
 *   só depois de um golpe, e some. Sem vida ele tomba de lado, vira fumaça e
 *   renasce.
 *
 * **Ele chega quando aparece, e não quando a seção abre.** Mora no fim de
 * Jogos, embaixo do deque, e um gesto no abrir da seção aconteceria fora de
 * vista. Um `IntersectionObserver` marca `data-visto` na primeira vez que ele
 * entra na tela com a seção ativa: é o que dispara a chegada (CSS) e o gesto.
 *
 * **Tudo o que se move por quadro é escrito direto no `style`**, num rAF que só
 * existe enquanto algo anda (a cabeça até o alvo, o empurrão, a queda), como a
 * mola do deque. A vida muda por atributo nos corações. Um `setState` por
 * quadro re-renderizaria 72 faces para mudar alguns ângulos.
 *
 * É desenho (`aria-hidden`): o nome vai no rótulo de quem o envolve.
 */
export function Boneco({ nome, skin, slim, capa, ativo }: BonecoProps) {
  const palco = useRef<HTMLDivElement>(null);
  const vida = useRef<HTMLSpanElement>(null);
  const nos = useRef<Nos>({
    corpo: { current: null },
    cabeca: { current: null },
    bracoD: { current: null },
    bracoE: { current: null },
    pernaD: { current: null },
    pernaE: { current: null },
  }).current;
  useComportamento(palco, vida, nos, ativo);

  return (
    <div
      ref={palco}
      className={styles.palco}
      style={
        {
          '--skin': `url("${skin}")`,
          '--capa': capa ? `url("${capa}")` : undefined,
        } as CSSProperties
      }
      aria-hidden="true"
      onAnimationEnd={(e) => {
        // a respiração não termina nunca; quem termina é o gesto
        if ((e.target as HTMLElement).classList.contains(styles.gesto)) {
          palco.current?.removeAttribute('data-gesto');
        }
      }}
    >
      <div className={styles.cena}>
        <Pedestal />
        <Modelo slim={slim} capa={Boolean(capa)} nos={nos} />
        <span className={styles.fumaca}>
          {FUMACA.map((f, i) => (
            <i key={i} style={f as CSSProperties} />
          ))}
        </span>
        <span className={styles.nome}>{nome}</span>
        <span ref={vida} className={styles.vida}>
          {Array.from({ length: VIDA / 2 }, (_, i) => (
            <i key={i} data-v="cheio" />
          ))}
        </span>
      </div>
    </div>
  );
}

function Pedestal() {
  return (
    <span className={styles.pedestal}>
      <i />
      <i />
      <i />
    </span>
  );
}

/**
 * O lugar do boneco sem ele: o pedestal, no mesmo tamanho. É a forma que o
 * molde desenha enquanto a skin não chega.
 */
export function PedestalVazio() {
  return (
    <div className={styles.palco} data-visto="">
      <div className={styles.cena}>
        <Pedestal />
      </div>
    </div>
  );
}
