import { useT } from '@/settings';

/** Chips de comandos sugeridos — a lista vem de VITE_SUGGESTED_COMMANDS. */
export interface SuggestionBarProps {
  commands: string[];
  onRun(command: string): void;
}

export function SuggestionBar({ commands, onRun }: SuggestionBarProps) {
  const t = useT();
  if (commands.length === 0) return null;

  return (
    <div className="suggestions">
      <div className="suggestions__label">{t('suggestions.label')}</div>
      <div className="suggestions__items">
        {commands.map((command) => (
          <button
            key={command}
            type="button"
            className="suggestions__chip"
            onClick={() => onRun(command)}
          >
            <span aria-hidden="true">›</span>
            {command}
          </button>
        ))}
      </div>
    </div>
  );
}
