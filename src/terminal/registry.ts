/**
 * Registry de comandos.
 *
 * Um comando é um módulo isolado que se declara aqui. Adicionar
 * funcionalidade ao terminal = criar um arquivo em `commands/` e
 * incluí-lo na lista de `commands/index.ts`. Nada mais precisa mudar.
 */
import { config } from '@/config';
import type { CommandDefinition, CommandRegistry } from './types';

/** Distância de Levenshtein — usada para sugerir "você quis dizer…". */
function distance(a: string, b: string): number {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const matrix: number[][] = Array.from({ length: rows }, (_, i) => [i, ...Array<number>(cols - 1).fill(0)]);
  for (let j = 0; j < cols; j += 1) matrix[0][j] = j;

  for (let i = 1; i < rows; i += 1) {
    for (let j = 1; j < cols; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(matrix[i - 1][j] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j - 1] + cost);
    }
  }
  return matrix[rows - 1][cols - 1];
}

export function createRegistry(initial: CommandDefinition[] = []): CommandRegistry {
  const commands = new Map<string, CommandDefinition>();
  const aliases = new Map<string, string>();
  const disabled = new Set(config.terminal.disabledCommands.map((name) => name.toLowerCase()));

  const registry: CommandRegistry = {
    register(command) {
      const name = command.name.toLowerCase();
      if (disabled.has(name)) return;
      if (commands.has(name)) {
        console.warn(`[terminal] comando "${name}" registrado duas vezes — o último vence.`);
      }
      commands.set(name, command);
      for (const alias of command.aliases ?? []) {
        aliases.set(alias.toLowerCase(), name);
      }
    },

    get(name) {
      const key = name.toLowerCase();
      return commands.get(key) ?? commands.get(aliases.get(key) ?? '');
    },

    has(name) {
      return registry.get(name) !== undefined;
    },

    all() {
      return [...commands.values()];
    },

    visible() {
      return registry.all().filter((command) => !command.hidden);
    },

    names(includeAliases = false) {
      const base = registry.visible().map((command) => command.name);
      if (!includeAliases) return base.sort();
      return [...base, ...aliases.keys()].sort();
    },

    completions(prefix) {
      const key = prefix.toLowerCase();
      return registry
        .names(true)
        .filter((name) => name.startsWith(key))
        .filter((name, index, arr) => arr.indexOf(name) === index);
    },

    suggest(name) {
      const key = name.toLowerCase();
      if (!key) return null;
      const ranked = registry
        .names(true)
        .map((candidate) => ({ candidate, score: distance(key, candidate) }))
        .sort((a, b) => a.score - b.score);
      const best = ranked[0];
      if (!best) return null;
      const threshold = key.length <= 4 ? 2 : 3;
      return best.score <= threshold ? best.candidate : null;
    },
  };

  initial.forEach(registry.register);
  return registry;
}
