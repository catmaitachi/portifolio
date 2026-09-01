/**
 * Motor de cena espacial em canvas 2D.
 *
 * `createStage(canvas, layers)` é dono do canvas, do DPR, do ponteiro, do
 * relógio e do rAF. Cada camada é um objeto independente que só conversa com as
 * outras pelo `env` — nenhuma importa outra.
 *
 * Este arquivo é a única superfície pública do motor: a aplicação importa daqui,
 * nunca de `layers/*` diretamente. O motor não conhece React, i18n nem seções.
 */

export { createStage } from './stage';
export type { Stage } from './stage';
export { tween } from './tween';
export { fastSin, TAU } from './math';

export { Nebula } from './layers/nebula';
export { Starfield } from './layers/starfield';
export { BlackHole } from './layers/blackHole';
export type { BlackHoleLayer } from './layers/blackHole';
export { Constellations } from './layers/constellations';
export type { ConstellationsLayer, Placement } from './layers/constellations';
export { Meteors } from './layers/meteors';
export { Supernova } from './layers/supernova';
export type { SupernovaLayer } from './layers/supernova';

export { CONSTELLATIONS } from './catalog/constellations';
export type { ConstellationKey, ConstellationSpec } from './catalog/constellations';

export type {
  CameraState,
  FadableLayer,
  Gravity,
  Layer,
  Shock,
  StageBus,
  StageEnv,
} from './types';
