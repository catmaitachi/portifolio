import { format, ICONES, PERFIS, urlExterna, type SectionKey } from '~/content';
import { useT } from '~/i18n/useLanguage';
import comum from './section.module.css';

/**
 * O ícone do serviço de onde o dado da seção vem, com link para o perfil.
 *
 * Quatro seções mostram dado que não é do projeto, e o crédito
 * a quem o serve não é enfeite: quem lê "o que anda tocando no meu Spotify"
 * imediatamente quer o perfil, e sem ele a seção é uma vitrine sem porta.
 *
 * Ele vive na **linha do título**, à direita, e não no meio do conteúdo: é sobre
 * a seção inteira, não sobre nenhum dos itens dela, e ali ele fecha a linha
 * horizontal que o título já abre.
 *
 * **A marca fica em `shared.json`, não no dicionário.** "Spotify" é nome
 * próprio, como o `rotulo` dos canais de contato, e não muda de idioma; quem
 * traduz é a frase em volta dela (`a11y.perfil`). Seção sem perfil não desenha
 * nada, e é por isso que `PERFIS` é parcial — Sobre e Contato não têm de onde
 * vir.
 */
export function PerfilExterno({ secao }: { secao: SectionKey }) {
  const t = useT();
  const perfil = PERFIS[secao];
  const icone = perfil && ICONES[perfil.icone];
  if (!perfil || !icone) return null;

  return (
    <a
      className={comum.perfil}
      href={urlExterna(perfil.url)}
      target="_blank"
      rel="noreferrer"
      aria-label={format(t.a11y.perfil, { rede: perfil.rotulo })}
    >
      <img src={icone} alt="" width={22} height={22} loading="lazy" />
    </a>
  );
}
