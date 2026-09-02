import { TELA_ESTREITA, useMediaQuery } from '~/hooks/useMediaQuery';
import { VAGAS, VAGAS_ESTREITO } from './timelineGeometry';

/**
 * Quantos eventos cabem na janela da linha do tempo, reativo à largura da tela.
 *
 * Isto **não** cabe no CSS. O número de vagas decide o espaçamento dos nós, o
 * quanto a curva desliza a cada passo e o quanto um arraste anda — geometria que
 * vive no JavaScript, não estilo. A media query é a mesma `≤640px` do resto da
 * página, para a janela encolher no mesmo ponto em que o layout vira coluna.
 */
export function useVagas(): number {
  return useMediaQuery(TELA_ESTREITA) ? VAGAS_ESTREITO : VAGAS;
}
