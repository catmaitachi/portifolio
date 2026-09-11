## Acessibilidade

- `aria-label` no nav, no seletor de idioma, no carrossel de projetos, na linha do tempo e no grupo
  de canais — todos vindos de `a11y` no dicionário. **Textos de a11y também passam pelo i18n**,
  nunca literais no componente.
- `aria-current` no item de seção ativo e no nó ativo da linha do tempo.
- Carrosséis como `role="group"` focáveis, navegáveis por setas.
- Fichas de trajetória inativas ficam `inert`: um leitor de tela não deve encontrar quatro empregos
  empilhados no mesmo lugar.
- O que está fora da janela da linha do tempo sai da tabulação (`tabIndex -1`), e o mesmo vale para os links do cartão de projeto que não está na frente: tabular para um controle que o visitante não
  consegue ver é perder o foco no meio da tela.
- **Nenhum cartão é um botão.** O cartão de projeto era `role="button"` com um link dentro, o que
  ARIA não permite, e o painel de descrição que justificava isso deixou de existir. Hoje os únicos elementos interativos dentro de um cartão são os links, e trocar de projeto é trabalho das setas e dos
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
- **O nome da instituição de cada formação é o nome acessível do logo** (`role="img"` com
  `aria-label`, que é o alt de uma imagem de fundo). Os logos já trazem o nome desenhado, e o texto
  repetido embaixo deles saiu da tela; sem logo, ele volta a ser escrito.
- Foco visível só para navegação por teclado (`:focus-visible`).
- **Nenhuma região focável apaga o contorno.** O palco da órbita e a curva do tempo entram na
  tabulação e respondem às setas, e os dois tinham `outline: none`: quem chegava pelo teclado não via
  onde estava. O único `outline: none` que sobra é o do campo de texto do Contato, cujo sublinhado
  acende no foco e cumpre o mesmo papel.
- **Os rótulos das listas de dado remoto são `<h3>`**, sob o `<h2>` da seção. "Mais tocadas",
  "Favoritos" e "Recentes" são sub-títulos, e é por título que um leitor de tela pula de uma lista
  para a outra.
- O botão do lado em vigor, no cabeçalho de modo, leva `aria-expanded` **nos dois estados**. Antes o
  atributo só existia com o menu fechado, e quem o abria nunca ouvia que ele tinha aberto.
- **`prefers-contrast: more`** sobe todos os textos acima de 4,5:1 e as linhas junto, redefinindo só
  os tokens de cor do `reset.css`. O desenho padrão é apagado de propósito, e boa parte dos rótulos
  fica abaixo do WCAG AA (ver `pendencias.md`); quem pede contraste ao sistema recebe a mesma página
  com tudo legível.
