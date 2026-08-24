/**
 * Ponte entre os blocos de saída e o terminal.
 *
 * Um bloco pode ser interativo (clicar num projeto executa
 * `projetos <id>`) sem receber props por toda a árvore.
 */
import { createContext, useContext } from 'react';

export interface BlockActions {
  run(command: string): void;
  openUrl(url: string): void;
}

const noop: BlockActions = {
  run: () => {},
  openUrl: (url: string) => window.open(url, '_blank', 'noopener,noreferrer'),
};

export const BlockActionsContext = createContext<BlockActions>(noop);

export function useBlockActions(): BlockActions {
  return useContext(BlockActionsContext);
}
