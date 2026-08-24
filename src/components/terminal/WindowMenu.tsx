/**
 * Menu da barra de título — só ações do terminal.
 *
 * Preferências que valem para o site inteiro (cor, aparência, scanlines,
 * idioma) ficam no botão flutuante, não aqui.
 */
import { useT } from '@/settings';

export interface MenuEntry {
  id: string;
  label: string;
  hint?: string;
  disabled?: boolean;
  onSelect?(): void;
}

export interface WindowMenuProps {
  entries: MenuEntry[];
}

export function WindowMenu({ entries }: WindowMenuProps) {
  const t = useT();

  return (
    <div className="menu" role="menu">
      <div className="menu__label">{t('menu.title')}</div>

      {entries.map((entry) => (
        <button
          key={entry.id}
          type="button"
          role="menuitem"
          className="menu__item"
          disabled={entry.disabled}
          onClick={entry.onSelect}
        >
          {entry.label}
          {entry.hint ? <span className="menu__hint">{entry.hint}</span> : null}
        </button>
      ))}
    </div>
  );
}
