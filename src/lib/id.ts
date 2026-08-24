let counter = 0;

/** Id curto e estável para linhas do histórico. */
export function nextId(prefix = 'line'): string {
  counter += 1;
  return `${prefix}-${counter.toString(36)}-${Date.now().toString(36)}`;
}
