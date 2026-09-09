import { Figure } from '~/components/Figure';
import { RETRATO } from '~/content';
import { useInclinacao } from '~/hooks/useInclinacao';
import { useT } from '~/i18n/useLanguage';
import comum from '../section.module.css';
import styles from './PortraitCard.module.css';

/**
 * Retrato como carta: inclina seguindo o ponteiro, cresce um pouco e um brilho
 * especular acompanha o cursor.
 *
 * O efeito nasceu aqui e hoje mora em `hooks/useInclinacao`, porque passou a
 * valer também para os crachás de formação, os pôsteres de Filmes e as capas de
 * Jogos. A sombra é ligada só neste: o retrato tem tamanho para mostrá-la, e nos
 * cartões pequenos ela seria um borrão preto sobre um fundo preto.
 */
export function PortraitCard() {
  const t = useT();
  const { alvoRef, brilhoRef } = useInclinacao<HTMLDivElement>({ sombra: true });

  return (
    <div className={styles.caixa}>
      <div ref={alvoRef} className={styles.carta}>
        <Figure src={RETRATO} alt={t.a11y.retrato} placeholder={t.a11y.retrato} fit="cover" />
        <span ref={brilhoRef} className={comum.brilho} aria-hidden="true" />
      </div>
    </div>
  );
}
