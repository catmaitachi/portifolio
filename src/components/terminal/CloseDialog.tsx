/** Confirmação de encerramento da sessão. */
import { useEffect, useRef } from 'react';
import { useT } from '@/settings';

export interface CloseDialogProps {
  prompt: string;
  onCancel(): void;
  onConfirm(): void;
}

export function CloseDialog({ prompt, onCancel, onConfirm }: CloseDialogProps) {
  const t = useT();
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    confirmRef.current?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onCancel]);

  return (
    <div className="dialog-overlay" role="presentation" onClick={onCancel}>
      <div
        className="dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="dialog__command">$ exit</div>
        <p className="dialog__title" id="dialog-title">
          {t('dialog.exit.title')}
        </p>
        <p className="dialog__text">{t('dialog.exit.text', { name: prompt })}</p>
        <div className="dialog__actions">
          <button type="button" className="dialog__button dialog__button--ghost" onClick={onCancel}>
            {t('dialog.cancel')}
          </button>
          <button
            type="button"
            ref={confirmRef}
            className="dialog__button dialog__button--danger"
            onClick={onConfirm}
          >
            {t('dialog.confirm')}
          </button>
        </div>
      </div>
    </div>
  );
}
