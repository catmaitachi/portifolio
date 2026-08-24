/**
 * Catálogo de comandos.
 *
 * Para adicionar um comando: crie o módulo nesta pasta exportando um
 * `CommandDefinition` e inclua-o na lista abaixo. Para desligar um comando
 * sem apagar código, use `VITE_DISABLED_COMMANDS` no `.env`.
 */
import type { CommandDefinition } from '../types';

import { ajudaCommand } from './ajuda';
import { contatoCommand } from './contato';
import { diagCommand } from './diag';
import { experienciaCommand } from './experiencia';
import { historicoCommand } from './historico';
import { idiomaCommand } from './idioma';
import { limparCommand } from './limpar';
import { projetosCommand } from './projetos';
import { sairCommand } from './sair';
import { skillsCommand } from './skills';
import { sobreCommand } from './sobre';
import { sudoCommand } from './sudo';
import { temaCommand } from './tema';
import { voltarCommand } from './voltar';
import { whoamiCommand } from './whoami';

export const commands: CommandDefinition[] = [
  ajudaCommand,
  sobreCommand,
  projetosCommand,
  skillsCommand,
  experienciaCommand,
  contatoCommand,
  temaCommand,
  idiomaCommand,
  whoamiCommand,
  historicoCommand,
  diagCommand,
  limparCommand,
  voltarCommand,
  sairCommand,
  sudoCommand,
];

export * from './ajuda';
export * from './contato';
export * from './diag';
export * from './experiencia';
export * from './historico';
export * from './idioma';
export * from './limpar';
export * from './projetos';
export * from './sair';
export * from './skills';
export * from './sobre';
export * from './sudo';
export * from './tema';
export * from './voltar';
export * from './whoami';
