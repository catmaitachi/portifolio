/**
 * Tela do terminal: janela, estado de janela (minimizar/tela cheia/menu)
 * e ligação com o `useTerminal`.
 *
 * A janela não conhece comandos; o terminal não conhece a janela. As duas
 * partes se falam pelo objeto `host` de ações.
 */
import { useCallback, useMemo, useState } from 'react';
import { BlockActionsContext, type BlockActions } from '@/components/blocks';
import { useFullscreen } from '@/hooks/useFullscreen';
import { useTerminal, type HostActions } from '@/hooks/useTerminal';
import { useSettings } from '@/settings';
import type { PortfolioContent } from '@/data/types';
import type { TerminalSession } from '@/terminal/types';
import { CloseDialog } from './CloseDialog';
import { Dock } from './Dock';
import { OutputArea } from './OutputArea';
import { ProjectWindow } from './ProjectWindow';
import { SuggestionBar } from './SuggestionBar';
import { TitleBar } from './TitleBar';
import type { MenuEntry } from './WindowMenu';

export interface TerminalScreenProps {
  content: PortfolioContent;
  session: TerminalSession;
  /** Volta para a tela de boas-vindas. */
  onExit(): void;
}

export function TerminalScreen({ content, session, onExit }: TerminalScreenProps) {
  // Cor, aparência, scanlines e idioma são globais — vêm do contexto.
  const { scanlines, setAccent, setScanlines, t } = useSettings();
  const [minimized, setMinimized] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  /** Projeto aberto na aba de detalhes — `null` quando só há o terminal. */
  const [openProjectId, setOpenProjectId] = useState<string | null>(null);
  const fullscreen = useFullscreen();

  const closeMenu = useCallback(() => setMenuOpen(false), []);

  const projectIndex = content.projects.findIndex((project) => project.id === openProjectId);
  const openProject = projectIndex >= 0 ? content.projects[projectIndex] : null;

  /** Fechar a aba devolve o terminal ao lugar. */
  const closeProject = useCallback(() => {
    setOpenProjectId(null);
    setMinimized(false);
  }, []);

  const host = useMemo<HostActions>(
    () => ({
      back: onExit,
      requestClose: () => {
        setMenuOpen(false);
        setConfirmClose(true);
      },
      setAccent,
      toggleScanlines: (force?: boolean) => setScanlines(force ?? !scanlines),
      setFullscreen: fullscreen.toggle,
      // A aba abre por cima e o terminal recolhe para a barra de baixo;
      // a tela cheia é mantida para a troca não piscar.
      openProject: (projectId: string) => {
        setMenuOpen(false);
        setOpenProjectId(projectId);
        setMinimized(true);
      },
      minimize: () => {
        setMenuOpen(false);
        fullscreen.exit();
        setMinimized(true);
      },
      openUrl: (url: string) => window.open(url, '_blank', 'noopener,noreferrer'),
    }),
    [onExit, setAccent, setScanlines, scanlines, fullscreen],
  );

  const terminal = useTerminal({ content, session, host });

  const blockActions = useMemo<BlockActions>(
    () => ({ run: terminal.run, openUrl: host.openUrl }),
    [terminal.run, host],
  );

  // Só ações do terminal: aparência e idioma vivem no botão flutuante,
  // para não haver duas fontes de verdade na interface.
  const menuEntries = useMemo<MenuEntry[]>(
    () => [
      {
        id: 'history',
        label: t('menu.history'),
        hint: t('menu.history.hint'),
        onSelect: () => {
          terminal.run('historico');
          closeMenu();
        },
      },
      {
        id: 'clear',
        label: t('menu.clear'),
        hint: t('menu.clear.hint'),
        onSelect: () => {
          terminal.clear();
          closeMenu();
        },
      },
      {
        id: 'share',
        label: t('menu.share'),
        hint: t('menu.soon'),
        disabled: true,
      },
    ],
    [t, terminal, closeMenu],
  );

  const windowTitle = `${session.prompt} — ~/portfolio`;

  return (
    <div className={`terminal-screen${fullscreen.fullscreen ? ' terminal-screen--fullscreen' : ''}`}>
      {scanlines ? <div className="scanlines" aria-hidden="true" /> : null}

      {!minimized ? (
        <div className={`window${fullscreen.fullscreen ? ' window--fullscreen' : ''}`}>
          <TitleBar
            path={windowTitle}
            menuOpen={menuOpen}
            menuEntries={menuEntries}
            onClose={host.requestClose}
            onMinimize={host.minimize}
            fullscreen={fullscreen.fullscreen}
            onToggleFullscreen={() => {
              fullscreen.toggle();
              closeMenu();
            }}
            onToggleMenu={() => setMenuOpen((open) => !open)}
            onCloseMenu={closeMenu}
          />

          <BlockActionsContext.Provider value={blockActions}>
            <OutputArea
              history={terminal.history}
              prompt={session.prompt}
              input={terminal.input}
              busy={terminal.busy}
              onInputChange={terminal.setInput}
              onKeyDown={terminal.handleKeyDown}
            />
          </BlockActionsContext.Provider>

          <SuggestionBar commands={terminal.suggestions} onRun={terminal.run} />
        </div>
      ) : null}

      {openProject ? (
        <ProjectWindow
          project={openProject}
          fullscreen={fullscreen.fullscreen}
          previous={content.projects[projectIndex - 1]}
          next={content.projects[projectIndex + 1]}
          onClose={closeProject}
          onToggleFullscreen={() => fullscreen.toggle()}
          onNavigate={setOpenProjectId}
        />
      ) : null}

      {minimized ? <Dock label={windowTitle} onRestore={closeProject} /> : null}

      {confirmClose ? (
        <CloseDialog
          prompt={session.prompt}
          onCancel={() => setConfirmClose(false)}
          onConfirm={() => {
            setConfirmClose(false);
            setMinimized(false);
            setOpenProjectId(null);
            fullscreen.exit();
            onExit();
          }}
        />
      ) : null}
    </div>
  );
}
