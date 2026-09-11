/**
 * O nome do repositório do jeito que se lê: `Controlador_Tuya` vira
 * `Controlador Tuya`. É desenho, e não dado: o `id` continua sendo o nome de
 * verdade, e é ele que liga o cartão ao GitHub.
 */
export const nomeLegivel = (nome: string): string => nome.replace(/[_-]+/g, ' ').trim();
