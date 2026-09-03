## Acessibilidade

- `aria-label` no nav, no seletor de idioma, no carrossel de projetos, na linha do tempo e no grupo
  de canais — todos vindos de `a11y` no dicionário. **Textos de a11y também passam pelo i18n**,
  nunca literais no componente.
- `aria-current` no item de seção ativo e no nó ativo da linha do tempo.
- Carrosséis como `role="group"` focáveis, navegáveis por setas.
- Fichas de trajetória inativas ficam `inert`: um leitor de tela não deve encontrar quatro empregos
  empilhados no mesmo lugar.
- O que está fora da janela ou do painel fechado sai da tabulação (`tabIndex -1`). Com um painel de
  projeto aberto, **só o cartão dele continua focável**: os outros ficam atrás do painel, e tabular
  para um cartão que não se vê é perder o foco no meio da tela. Eles seguem clicáveis — o mouse não
  tem esse problema — e `Esc` fecha o painel, que é a saída explícita que faltava para o teclado.
- Foco visível só para navegação por teclado (`:focus-visible`).
