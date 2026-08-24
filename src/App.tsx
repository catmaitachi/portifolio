/**
 * Raiz da aplicação.
 *
 * Responsabilidades: prover as preferências globais, carregar o conteúdo,
 * guardar a sessão do visitante e decidir entre a tela de boas-vindas e o
 * terminal. Nada de lógica de comandos aqui.
 */
import { useCallback, useState } from 'react';
import { Backdrop } from '@/components/Backdrop';
import { SettingsFab } from '@/components/SettingsFab';
import { WelcomeScreen } from '@/components/WelcomeScreen';
import { TerminalScreen } from '@/components/terminal/TerminalScreen';
import { config } from '@/config';
import { useContent } from '@/hooks/useContent';
import { logVisitor } from '@/lib/sessionLog';
import { SettingsProvider, useT } from '@/settings';
import type { NicknameOrigin, TerminalSession } from '@/terminal/types';

function BootScreen() {
  const t = useT();
  return (
    <div className="boot">
      {t('boot.loading')}
      <span className="boot__cursor" aria-hidden="true" />
    </div>
  );
}

function Portfolio() {
  const { content, status, error } = useContent();
  const t = useT();
  const [session, setSession] = useState<TerminalSession | null>(null);

  const startSession = useCallback((nickname: string, origin: NicknameOrigin) => {
    void logVisitor(nickname, origin);
    setSession({
      nickname,
      origin,
      prompt: nickname || config.terminal.defaultPrompt,
      startedAt: Date.now(),
    });
  }, []);

  const endSession = useCallback(() => setSession(null), []);

  return (
    <main className="app">
      <Backdrop />

      {!content ? (
        <BootScreen />
      ) : session ? (
        <TerminalScreen content={content} session={session} onExit={endSession} />
      ) : (
        <WelcomeScreen
          onEnter={startSession}
          notice={
            status === 'degraded'
              ? t('welcome.notice.degraded', {
                  error: error ?? t('welcome.notice.unknownError'),
                })
              : null
          }
        />
      )}

      {/* Opções globais: valem para as duas telas e para a aba de projeto. */}
      <SettingsFab />
    </main>
  );
}

export default function App() {
  return (
    <SettingsProvider>
      <Portfolio />
    </SettingsProvider>
  );
}
