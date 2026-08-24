/**
 * Registro de visitantes.
 *
 * "Seu nick fica guardado nos registros só pra saciar a minha curiosidade."
 *
 * Sem endpoint configurado, grava apenas no localStorage do próprio
 * visitante. Com `VITE_SESSION_LOG_ENDPOINT` definido, envia um POST —
 * é o gancho pronto para uma tabela `visitors` no banco.
 */
import { config } from '@/config';
import type { NicknameOrigin } from '@/terminal/types';
import { readJson, writeJson } from './storage';

export interface VisitorRecord {
  nickname: string;
  /** `random` quando o nome foi sorteado em vez de informado. */
  origin: NicknameOrigin;
  at: string;
  referrer?: string;
  locale?: string;
}

export function readVisitors(): VisitorRecord[] {
  return readJson<VisitorRecord[]>(config.sessionLog.storageKey, []);
}

export async function logVisitor(nickname: string, origin: NicknameOrigin): Promise<void> {
  if (!config.sessionLog.enabled) return;

  const record: VisitorRecord = {
    nickname,
    origin,
    at: new Date().toISOString(),
    referrer: document.referrer || undefined,
    locale: navigator.language,
  };

  const previous = readVisitors();
  writeJson(config.sessionLog.storageKey, [...previous.slice(-49), record]);

  if (!config.sessionLog.endpoint) return;

  try {
    await fetch(config.sessionLog.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record),
      keepalive: true,
    });
  } catch (error) {
    console.warn('[sessionLog] não foi possível registrar a visita', error);
  }
}
