## Acessibilidade

- `aria-label` no nav, no seletor de idioma, no carrossel de projetos, na linha do tempo e no grupo
  de canais — todos vindos de `a11y` no dicionário. **Textos de a11y também passam pelo i18n**,
  nunca literais no componente.
- `aria-current` no item de seção ativo e no nó ativo da linha do tempo.
- Carrosséis como `role="group"` focáveis, navegáveis por setas.
- Fichas de trajetória inativas ficam `inert`: um leitor de tela não deve encontrar quatro empregos
  empilhados no mesmo lugar.
- O que está fora da janela da linha do tempo sai da tabulação (`tabIndex -1`), e o mesmo vale para o
  link do cartão de projeto que não está na frente: tabular para um controle que o visitante não
  consegue ver é perder o foco no meio da tela.
- **Nenhum cartão é um botão.** O cartão de projeto era `role="button"` com um link dentro, o que
  ARIA não permite, e o painel de descrição que justificava isso deixou de existir. Hoje o único
  elemento interativo dentro de um cartão é o link, e trocar de projeto é trabalho das setas e dos
  traços-índice, que são botões de verdade. O clique no cartão lateral continua existindo para o
  mouse, que nunca teve esse problema.
- **As faixas que rolam de lado entram na tabulação**, porque uma região rolável que não recebe foco
  é inalcançável por teclado. As setas ao lado do rótulo **não substituem isso**: elas são o caminho
  de quem usa o ponteiro e não descobriu que a fileira anda. Nas pontas elas ficam `disabled` e no
  lugar, nunca escondidas — a ponta muda durante a própria rolagem, e um botão que deixa de existir
  enquanto está focado joga o foco no `body` no meio do gesto. Faixa que coube inteira não desenha
  seta nenhuma.
- O rótulo das setas leva o nome da faixa (`{lista}`): "anterior" sozinho não diz anterior do quê
  numa seção com duas faixas, que é justamente onde a pergunta aparece.
- Foco visível só para navegação por teclado (`:focus-visible`).
