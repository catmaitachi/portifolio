import { CANAIS, format, ICONES, urlExterna } from '~/content';
import { useT } from '~/i18n/useLanguage';
import styles from './Canais.module.css';

/**
 * Os canais, em ícones, no rodapé do Início: onde ficava o crédito.
 *
 * São peça do HUD, e não do Início, por uma razão de desenho: a faixa de baixo
 * da tela é apagada de propósito (o `mask-image` da `Tela`, que protege o HUD do
 * conteúdo que rola), e dentro da seção eles ficariam justamente nela. Fixos no
 * rodapé, eles aparecem só com o Início em cena (`ativo`), como os anéis.
 *
 * Entram todos os canais de `shared.json`, na ordem de lá. O que ainda não tem
 * `url` aparece apagado e sem link: diz que o canal vem aí, e ganha o link
 * sozinho quando o endereço for preenchido. O e-mail não entra: o endereço mora
 * no formulário do Contato, que é onde se escreve. Ícone é glifo branco local,
 * nunca CDN (ver `conteudo.md`), e o nome do canal é o rótulo acessível.
 */
export function Canais({ ativo }: { ativo: boolean }) {
  const t = useT();

  return (
    <nav className={styles.canais} data-ativo={ativo || undefined} aria-label={t.a11y.canais} inert={!ativo}>
      {CANAIS.map((c) =>
        c.url ? (
          <a key={c.key} href={urlExterna(c.url)} target="_blank" rel="noopener noreferrer" aria-label={c.rotulo}>
            <img src={ICONES[c.icone]} alt="" width={18} height={18} />
          </a>
        ) : (
          <span key={c.key} role="img" aria-label={format(t.a11y.emBreve, { rede: c.rotulo })} data-em-breve="">
            <img src={ICONES[c.icone]} alt="" width={18} height={18} />
          </span>
        ),
      )}
    </nav>
  );
}
