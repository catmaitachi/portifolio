import { useRef } from 'react';
import { format } from '~/content';
import { useRolagemLateral } from '~/hooks/useRolagemLateral';
import { useT } from '~/i18n/useLanguage';
import styles from './Faixa.module.css';
import comum from './section.module.css';

interface FaixaProps {
  /** o rótulo da lista, que é também o nome da região rolável */
  titulo: string;
  /** o atraso de onde a entrada desta faixa começa, para duas listas não chegarem juntas */
  base?: number;
  children: React.ReactNode;
  /** quantos itens a faixa tem, para as pontas serem medidas de novo quando ele muda */
  total: number;
}

/**
 * Uma faixa de cartões que rola de lado.
 *
 * Ela nasceu em Filmes e virou peça comum quando Jogos passou a mostrar os
 * recentes do mesmo jeito. **Duas seções vizinhas com a mesma fileira de cartões
 * e mecânicas diferentes leem como descuido**, e o custo de manter as duas em
 * sincronia por cópia já tinha aparecido: a faixa tem cinco detalhes que não são
 * opcionais e nenhum deles é óbvio ao ler o CSS.
 *
 * A rolagem é **nativa**: arrasto, roda e inércia vêm de graça, e não há um
 * quadro de JavaScript envolvido. É a mesma escolha do carrossel de formações e
 * da faixa de seções do mobile.
 *
 * Três coisas nela já morderam este projeto em outro lugar:
 *
 * - **`flex: none` nos itens.** Sem ele os cartões se comprimem para caber, a
 *   faixa nunca transborda e a rolagem não tem o que rolar;
 * - **`overscroll-behavior-inline: contain`**, senão chegar ao fim da faixa
 *   encadeia o gesto para fora dela;
 * - **o recuo com margem negativa**, porque `overflow-x` obriga o eixo Y a
 *   computar `auto` junto e corta tudo que passar da caixa — e o cartão passa,
 *   porque ele cresce e inclina ao ser apontado.
 *
 * O `scroll-snap` é `proximity`, não `mandatory`: aqui não há item ativo que
 * precise assentar, e obrigar o encaixe tiraria de quem arrasta a liberdade de
 * parar onde quiser.
 *
 * **As setas ficam na linha do título**, e não sobre os cartões. Sobrepostas
 * elas cobririam justamente a arte que a faixa existe para mostrar, e teriam de
 * ganhar um fundo para serem legíveis por cima dela — que é uma caixa cheia numa
 * página feita de linhas de 1px. Na linha do título elas fecham pela direita a
 * régua que o rótulo abre pela esquerda, que é o arranjo do ícone de perfil no
 * cabeçalho da seção.
 *
 * **A faixa que coube inteira não ganha seta nenhuma**, porque não há o que
 * rolar. Onde elas existem, elas **apagam** nas pontas e continuam no lugar,
 * como os passos da Trajetória: sumir na ponta jogaria o foco no `body` no meio
 * do gesto de quem navega por teclado, já que a ponta muda durante a rolagem.
 *
 * A faixa continua entrando na tabulação, porque uma região rolável que não
 * recebe foco é inalcançável por teclado, e as setas não substituem isso: elas
 * são o caminho de quem usa o ponteiro e não descobriu que a fileira anda.
 */
export function Faixa({ titulo, base = 0, total, children }: FaixaProps) {
  const t = useT();
  const faixaRef = useRef<HTMLUListElement>(null);
  const { rola, antes, depois, rolar } = useRolagemLateral(faixaRef, total);

  return (
    <div className={styles.grupo}>
      <div className={styles.linha}>
        <p className={styles.titulo}>{titulo}</p>

        {/* a faixa que coube inteira não ganha controle nenhum: não há o que rolar */}
        {rola && (
          <div className={styles.setas}>
            {(['antes', 'depois'] as const).map((lado) => (
              <button
                key={lado}
                type="button"
                className={styles.seta}
                data-lado={lado}
                /* na ponta ele apaga e continua no lugar, como os passos da
                   Trajetória: sumir tiraria o foco do teclado no meio do gesto */
                disabled={lado === 'antes' ? !antes : !depois}
                aria-label={format(lado === 'antes' ? t.a11y.faixaAntes : t.a11y.faixaDepois, {
                  lista: titulo,
                })}
                onClick={() => rolar(lado === 'antes' ? -1 : 1)}
              >
                <span className={comum.ponta} data-lado={lado} aria-hidden="true" />
              </button>
            ))}
          </div>
        )}
      </div>

      <ul
        ref={faixaRef}
        className={styles.faixa}
        style={{ '--base': `${base}ms` } as React.CSSProperties}
        tabIndex={0}
        aria-label={titulo}
      >
        {children}
      </ul>
    </div>
  );
}
