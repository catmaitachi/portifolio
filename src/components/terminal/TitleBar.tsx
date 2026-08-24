/** Barra de título da janela: semáforo, caminho e menu. */
import { useEffect, useRef } from 'react';
import { useT } from '@/settings';
import { WindowMenu, type MenuEntry } from './WindowMenu';

export interface TitleBarProps {
  path: string;
  menuOpen: boolean;
  menuEntries: MenuEntry[];
  onClose(): void;
  onMinimize(): void;
  /** `true` quando a janela já ocupa a tela inteira. */
  fullscreen: boolean;
  onToggleFullscreen(): void;
  onToggleMenu(): void;
  onCloseMenu(): void;
}

export function TitleBar({
  path,
  menuOpen,
  menuEntries,
  onClose,
  onMinimize,
  fullscreen,
  onToggleFullscreen,
  onToggleMenu,
  onCloseMenu,
}: TitleBarProps) {
  const t = useT();
  const barRef = useRef<HTMLDivElement>(null);

  /** Fecha o menu ao clicar fora ou pressionar Esc. */
  useEffect(() => {
    if (!menuOpen) return undefined;

    const handlePointer = (event: MouseEvent) => {
      if (!barRef.current?.contains(event.target as Node)) onCloseMenu();
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCloseMenu();
    };

    document.addEventListener('mousedown', handlePointer);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handlePointer);
      document.removeEventListener('keydown', handleKey);
    };
  }, [menuOpen, onCloseMenu]);

  return (
    <div className="titlebar" ref={barRef}>
      <div className="titlebar__dots">
        <button
          type="button"
          className="titlebar__dot titlebar__dot--close"
          title={t('window.close')}
          aria-label={t('window.close')}
          onClick={onClose}
        />
        <button
          type="button"
          className="titlebar__dot titlebar__dot--min"
          title={t('window.minimize')}
          aria-label={t('window.minimize')}
          onClick={onMinimize}
        />
        <button
          type="button"
          className="titlebar__dot titlebar__dot--max"
          title={t(fullscreen ? 'window.fullscreen.exit' : 'window.fullscreen.enter')}
          aria-label={t(fullscreen ? 'window.fullscreen.exit' : 'window.fullscreen.enter')}
          aria-pressed={fullscreen}
          onClick={onToggleFullscreen}
        />
      </div>

      <span className="titlebar__path">{path}</span>

      <button
        type="button"
        className="titlebar__menu-button"
        title={t('window.menu')}
        aria-label={t('window.menu')}
        aria-expanded={menuOpen}
        onClick={onToggleMenu}
      >
        <span />
        <span />
        <span />
      </button>

      {menuOpen ? <WindowMenu entries={menuEntries} /> : null}
    </div>
  );
}
