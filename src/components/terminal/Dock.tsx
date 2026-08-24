import { useT } from '@/settings';

/** Barra inferior exibida quando a janela está minimizada. */
export interface DockProps {
  label: string;
  onRestore(): void;
}

export function Dock({ label, onRestore }: DockProps) {
  const t = useT();
  return (
    <button type="button" className="dock" onClick={onRestore}>
      <span className="dock__mark" aria-hidden="true" />
      <span className="dock__label">{label}</span>
      <span className="dock__hint">{t('dock.hint')}</span>
    </button>
  );
}
