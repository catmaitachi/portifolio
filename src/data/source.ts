/**
 * Contrato de origem de conteúdo.
 *
 * Uma fonte só precisa saber devolver um `PortfolioContent`. Isso permite
 * evoluir de arquivo local → API → banco de dados sem tocar na UI.
 */
import type { PortfolioContent } from './types';

export interface ContentSource {
  /** Identificador legível, exibido pelo comando `diag`. */
  readonly id: string;
  load(signal?: AbortSignal): Promise<PortfolioContent>;
}

export class ContentSourceError extends Error {
  constructor(
    message: string,
    readonly sourceId: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'ContentSourceError';
  }
}
