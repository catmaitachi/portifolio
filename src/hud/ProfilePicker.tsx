import { useEffect, useRef, useState } from 'react';
import { PERFIS, type PerfilKey } from '~/content';
import { useFlip } from '~/hooks/useFlip';
import { useT } from '~/i18n/useLanguage';
import styles from './ProfilePicker.module.css';

/**
 * Os glifos, em traço de 1px como o resto da página.
 *
 * Ficam **inline**, e não em `assets/icons/`: aqueles são marcas de terceiros
 * carregadas como `<img>`, que não herdam cor; estes são desenhos de três linhas
 * que precisam acompanhar o `color` do botão em cada estado.
 */
const GLIFOS: Record<PerfilKey, React.ReactNode> = {
  // bússola: quem ainda não sabe para onde vai
  explorar: (
    <>
      <circle cx="12" cy="12" r="8.4" />
      <path d="M15.1 8.9 13.1 13.1 8.9 15.1 10.9 10.9Z" />
    </>
  ),
  // cubo isométrico: algo a ser construído
  projeto: (
    <>
      <path d="M12 2.8 20 7.4v9.2L12 21.2 4 16.6V7.4Z" />
      <path d="M12 12 20 7.4M12 12 4 7.4M12 12v9.2" />
    </>
  ),
  // barras subindo: o que a pessoa sabe fazer, medido
  vaga: (
    <>
      <path d="M4.6 20.4h15.2" />
      <path d="M8 20.4v-5.6M12 20.4V8.2M16 20.4v-8.8" />
      <path d="m6.4 9.4 4-4 3.2 3.2 4.4-5" />
    </>
  ),
};

interface ProfilePickerProps {
  perfil: PerfilKey;
  escolher: (p: PerfilKey) => void;
  /** só na abertura: fora dela o seletor sai de cena e da tabulação */
  ativo: boolean;
}

/**
 * Seletor de perfil de acesso: três orbes, só na seção de abertura.
 *
 * Cada orbe é uma esfera translúcida — dois meridianos girando em `rotateY`, um
 * equador deitado em `rotateX` e um brilho especular **parado**. A luz não gira
 * com o corpo: é justamente ela ficar no lugar enquanto os meridianos passam que
 * faz o olho ler uma esfera em rotação, e não um anel piscando. O glifo também
 * não gira — ele existe para ser lido.
 *
 * **São dois elementos, e isso não é decoração de marcação.** O de fora carrega
 * a entrada da cascata do HUD (`fina`, 5s de atraso, `both`); o de dentro
 * carrega a opacidade que diz se a abertura é a seção ativa. Numa camada só, o
 * `both` fixa `opacity: 1` no último quadro da animação e passa por cima do
 * estado — e o seletor, que devia existir apenas na abertura, reaparecia em
 * todas as seções depois dos 6s. É o mesmo motivo pelo qual a entrada da curva
 * da trajetória mora num `<g>` externo: **estado e animação não dividem
 * propriedade.**
 *
 * Sair da tela é por opacidade e `inert`, nunca por `display: none` — um
 * elemento que sai da árvore reinicia a animação atrasada ao voltar, e são cinco
 * segundos invisível, que na tela lê como "não voltou mais".
 *
 * **O seletor é um menu, sempre.** Só o perfil em vigor aparece; um clique abre
 * os outros dois, o seguinte escolhe. É por isso que o mesmo botão muda de papel
 * conforme `aberto`, e que o rótulo de acessibilidade muda com ele. Recolhido, o
 * seletor ocupa um orbe — a abertura é a seção do nome, e três esferas paradas
 * na lateral competiriam com ele em toda visita, inclusive nas de quem já
 * escolheu.
 *
 * A **direção** da expansão é a única diferença entre as telas, e mora inteira
 * no CSS: vertical no desktop, onde o seletor é uma coluna na lateral, e
 * horizontal no mobile, onde ele é uma faixa sob o seletor de idioma. O
 * componente não sabe em qual dos dois está.
 */
export function ProfilePicker({ perfil, escolher, ativo }: ProfilePickerProps) {
  const t = useT();
  const [aberto, setAberto] = useState(false);
  const grupoRef = useRef<HTMLDivElement>(null);
  const listaRef = useRef<HTMLDivElement>(null);

  /**
   * Abrir move o orbe que já estava lá.
   *
   * Os dois que entram têm a própria animação em `opacity`/`transform`, mas o
   * escolhido muda de posição por **layout** — com um item no fluxo ele está
   * numa ponta da lista, com três ele está no lugar que lhe cabe. Sem o FLIP ele
   * saltaria enquanto os vizinhos acendem, que é exatamente o quadro em que o
   * olho está olhando para ele.
   */
  useFlip(listaRef, aberto);

  // menu aberto: Esc e o toque fora fecham, como em qualquer menu
  useEffect(() => {
    if (!aberto) return;
    const aoTeclar = (e: KeyboardEvent) => e.key === 'Escape' && setAberto(false);
    const aoApontar = (e: PointerEvent) => {
      if (!grupoRef.current?.contains(e.target as Node)) setAberto(false);
    };
    window.addEventListener('keydown', aoTeclar);
    window.addEventListener('pointerdown', aoApontar);
    return () => {
      window.removeEventListener('keydown', aoTeclar);
      window.removeEventListener('pointerdown', aoApontar);
    };
  }, [aberto]);

  // sair da abertura fecha o menu: ele não pode ficar esperando escolha numa
  // seção onde o seletor nem aparece
  useEffect(() => {
    if (!ativo) setAberto(false);
  }, [ativo]);

  // só o escolhido aparece enquanto o menu está fechado
  const recolhido = !aberto;

  return (
    <div ref={grupoRef} className={styles.grupo} data-aberto={aberto || undefined}>
      <div
        ref={listaRef}
        className={styles.lista}
        data-ativo={ativo || undefined}
        role="group"
        aria-label={t.a11y.perfis}
        inert={!ativo}
      >
        {PERFIS.map((p) => {
          const escolhido = p.key === perfil;
          const texto = t.perfis[p.key];
          // o orbe escolhido é o gatilho do menu enquanto ele está fechado
          const gatilho = recolhido && escolhido;

          return (
            <button
              key={p.key}
              type="button"
              className={styles.item}
              data-flip={p.key}
              data-escolhido={escolhido || undefined}
              data-oculto={(recolhido && !escolhido) || undefined}
              aria-label={gatilho ? t.a11y.perfisAbrir : undefined}
              /* fechado o botão é gatilho, aberto é opção: os dois papéis não
                 dividem o mesmo atributo */
              aria-pressed={aberto ? escolhido : undefined}
              aria-expanded={gatilho ? false : undefined}
              title={texto.dica}
              onClick={() => {
                if (gatilho) {
                  setAberto(true);
                  return;
                }
                escolher(p.key);
                setAberto(false);
              }}
            >
              <span className={styles.orbe} aria-hidden="true">
                <span className={styles.meridianoA} />
                <span className={styles.meridianoB} />
                <span className={styles.equador} />
                <span className={styles.brilho} />
                <svg className={styles.glifo} viewBox="0 0 24 24" fill="none" strokeWidth="1.4">
                  {GLIFOS[p.key]}
                </svg>
              </span>
              <span className={styles.rotulo}>{texto.nome}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
