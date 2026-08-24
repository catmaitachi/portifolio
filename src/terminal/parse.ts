/**
 * Parser da linha de comando: separa nome, argumentos e flags,
 * respeitando aspas simples e duplas.
 */

export interface ParsedInput {
  name: string;
  args: string[];
  flags: Record<string, string | boolean>;
  raw: string;
}

export function tokenize(input: string): string[] {
  const tokens: string[] = [];
  const pattern = /"([^"]*)"|'([^']*)'|(\S+)/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(input)) !== null) {
    tokens.push(match[1] ?? match[2] ?? match[3] ?? '');
  }
  return tokens;
}

export function parseInput(input: string): ParsedInput {
  const trimmed = input.trim();
  const tokens = tokenize(trimmed);
  const name = (tokens.shift() ?? '').toLowerCase();

  const args: string[] = [];
  const flags: Record<string, string | boolean> = {};

  for (const token of tokens) {
    if (token.startsWith('--')) {
      const [key, ...rest] = token.slice(2).split('=');
      flags[key] = rest.length > 0 ? rest.join('=') : true;
    } else if (token.startsWith('-') && token.length > 1 && !/^-\d/.test(token)) {
      flags[token.slice(1)] = true;
    } else {
      args.push(token);
    }
  }

  return { name, args, flags, raw: tokens.join(' ') };
}
