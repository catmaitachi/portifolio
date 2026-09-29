import { useEffect, useState } from 'react';
import { useT } from '~/i18n/useLanguage';
import comum from '../section.module.css';
import type { SectionProps } from '../types';
import styles from './ContactSection.module.css';
import { useMailto } from './useMailto';

/** Quanto tempo o "copiado" fica no lugar da dica, em ms. */
const DURACAO_COPIADO = 1800;

/**
 * Quantos caracteres enchem o título: o bastante para uma primeira mensagem.
 * Passar disso não enche mais, e escrever menos não é erro nenhum.
 */
const CHEIO = 280;

/**
 * Contato: o fim do dossiê, como um cartaz.
 *
 * De um lado, "Vamos conversar" em contorno gigante, que **se enche de baixo
 * para cima conforme a mensagem cresce**: o título é o medidor, e não há outro.
 * Embaixo dele, o endereço, que copia ao ser clicado. Do outro lado, o
 * formulário é uma frase para completar ("Oi, Lucas. Aqui é ___.") e a
 * mensagem logo abaixo. Sem back-end, o envio monta um `mailto:`.
 *
 * O `<form>` com `onSubmit` dá o Enter no campo do nome; na mensagem o Enter
 * quebra a linha, e Ctrl/⌘+Enter envia.
 */
export function ContactSection({ ativo, indice }: SectionProps) {
  const t = useT();
  const form = useMailto(t);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    if (!copiado) return;
    const id = window.setTimeout(() => setCopiado(false), DURACAO_COPIADO);
    return () => window.clearTimeout(id);
  }, [copiado]);

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(t.contato.email);
      setCopiado(true);
    } catch {
      // sem permissão de área de transferência o endereço continua à vista e selecionável
    }
  };

  const cheio = Math.min(1, form.mensagem.length / CHEIO) * 100;

  return (
    <section
      className={`${comum.secao} ${comum.rolavel} ${styles.secao}`}
      aria-label={t.nav.contato}
    >
      <div className={`${comum.bloco} ${styles.bloco}`} data-ativo={ativo || undefined}>
        <p className={comum.indice}>
          <span>{indice}</span>
          <span className={comum.indiceRisco} aria-hidden="true" />
        </p>

        <div className={styles.grade}>
          <div className={styles.chamada}>
            <h2 className={styles.grito} style={{ '--grito-cheio': `${cheio}%` } as React.CSSProperties}>
              {t.contato.titulo}
            </h2>
            <button
              type="button"
              className={styles.endereco}
              aria-describedby="contato-dica"
              onClick={copiar}
            >
              {t.contato.email}
            </button>
            {/* a dica vira a confirmação: é o mesmo lugar, e `aria-live` a anuncia */}
            <span
              id="contato-dica"
              className={styles.dica}
              data-ok={copiado || undefined}
              aria-live="polite"
            >
              {copiado ? t.contato.copiado : t.contato.copiar}
            </span>
          </div>

          <form
            className={styles.carta}
            onSubmit={(e) => {
              e.preventDefault();
              form.enviar();
            }}
          >
            <p className={styles.frase}>
              {t.contato.campos.frase.antes}{' '}
              <input
                className={styles.nome}
                type="text"
                name="nome"
                autoComplete="name"
                aria-label={t.contato.campos.nome.rotulo}
                value={form.nome}
                placeholder={t.contato.campos.nome.dica}
                // o campo cresce com o nome, para a frase continuar lendo como frase
                size={Math.max(t.contato.campos.nome.dica.length, form.nome.length + 1)}
                onChange={(e) => form.setNome(e.target.value)}
              />
              {t.contato.campos.frase.depois}
            </p>

            <textarea
              className={styles.mensagem}
              name="mensagem"
              rows={5}
              aria-label={t.contato.campos.mensagem.rotulo}
              value={form.mensagem}
              placeholder={t.contato.campos.mensagem.dica}
              onChange={(e) => form.setMensagem(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) e.currentTarget.form?.requestSubmit();
              }}
            />

            <div className={styles.pe}>
              {/* o status toma o lugar do sinal enquanto existe; `aria-live` o anuncia
                  a quem não o vê aparecer */}
              <span className={styles.sinal} role="status" aria-live="polite">
                <i aria-hidden="true" />
                {form.status || t.contato.sinal}
              </span>
              <button type="submit" className={styles.enviar}>
                <span className={styles.enviarTexto}>{t.contato.enviar}</span>
                {/* dois elementos porque são dois `transform`: o de fora leva o avanço
                    do hover e o de dentro, a rotação da ponta (ver `section.module.css`) */}
                <span className={styles.seta} aria-hidden="true">
                  <span className={comum.ponta} data-lado="depois" />
                </span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}
