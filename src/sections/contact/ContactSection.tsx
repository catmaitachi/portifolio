import { CANAIS } from '~/content';
import { useT } from '~/i18n/useLanguage';
import comum from '../section.module.css';
import { ChannelCard } from './ChannelCard';
import styles from './ContactSection.module.css';
import { useMailto } from './useMailto';

/**
 * Contato: e-mail como link gigante, formulário de uma linha e canais.
 *
 * Sem moldura e sem back-end — o e-mail em tamanho de título é o caminho
 * principal, e o formulário só monta um `mailto:` para quem prefere digitar ali.
 *
 * O `<form>` com `onSubmit` é deliberado: dá o Enter de graça em qualquer campo,
 * que é como se envia um formulário de uma linha.
 */
export function ContactSection({ ativo }: { ativo: boolean }) {
  const t = useT();
  const form = useMailto(t);

  return (
    <section
      className={`${comum.secao} ${comum.rolavel} ${styles.secao}`}
      aria-label={t.nav.contato}
    >
      <div className={`${comum.bloco} ${styles.bloco}`} data-ativo={ativo || undefined}>
        <p className={comum.indice}>
          <span>{t.contato.indice}</span>
          <span className={comum.indiceRisco} aria-hidden="true" />
        </p>

        <div className={comum.cabecalho}>
          <h2 className={comum.titulo}>{t.contato.titulo}</h2>
          <p className={comum.intro}>{t.contato.intro}</p>
        </div>

        <a className={styles.email} href={`mailto:${t.contato.email}`}>
          <span>{t.contato.email}</span>
          <span className={styles.risco} aria-hidden="true" />
        </a>

        <form
          className={styles.form}
          onSubmit={(e) => {
            e.preventDefault();
            form.enviar();
          }}
        >
          <label className={styles.campo}>
            <span className={styles.rotulo}>{t.contato.campos.nome.rotulo}</span>
            <input
              className={styles.entrada}
              type="text"
              name="nome"
              autoComplete="name"
              value={form.nome}
              placeholder={t.contato.campos.nome.dica}
              onChange={(e) => form.setNome(e.target.value)}
            />
          </label>

          <label className={styles.campo}>
            <span className={styles.rotulo}>{t.contato.campos.mensagem.rotulo}</span>
            <input
              className={styles.entrada}
              type="text"
              name="mensagem"
              value={form.mensagem}
              placeholder={t.contato.campos.mensagem.dica}
              onChange={(e) => form.setMensagem(e.target.value)}
            />
          </label>

          <button type="submit" className={styles.enviar}>
            <span>{t.contato.enviar}</span>
            <span className={styles.seta} aria-hidden="true">
              &#8594;
            </span>
          </button>
        </form>

        {/* `aria-live` anuncia o erro e a confirmação a quem não vê a mensagem aparecer */}
        <span className={styles.status} data-visivel={form.status ? true : undefined} role="status" aria-live="polite">
          {form.status || ' '}
        </span>

        <div className={styles.canais}>
          <span className={styles.ou}>{t.contato.ou}</span>
          <div className={styles.grade} role="group" aria-label={t.a11y.canais}>
            {CANAIS.map((c, i) => (
              <ChannelCard
                key={c.key}
                canal={c}
                entrando={ativo}
                indice={i}
                total={CANAIS.length}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
