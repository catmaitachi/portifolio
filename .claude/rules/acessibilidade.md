---
paths:
  - "src/**/*.tsx"
---

## Acessibilidade

- `aria-label` no nav, no gatilho do menu de opções (`opcoes.abrir`), na régua de qualidade, na
  órbita da Carreira e no grupo de canais — todos vindos de `a11y` no dicionário. **Textos de a11y também passam pelo i18n**,
  nunca literais no componente.
- `aria-current` no item de seção ativo e no corpo escolhido da órbita.
- Fichas de carreira inativas ficam `inert`: um leitor de tela não deve encontrar quatro empregos
  empilhados no mesmo lugar.
- Tabular para um controle que o visitante não consegue ver é perder o foco no meio da tela: o que
  está escondido sai da tabulação (`inert` ou `tabIndex -1`).
- **Nenhum cartão é um botão.** O cartão de projeto já foi `role="button"` com um link dentro, o que
  ARIA não permite. Na vitrine de hoje os únicos elementos interativos de um projeto são os links e o
  botão da janela, que troca a foto pelo site ao vivo (`aria-pressed`). A foto tem o nome do projeto
  como texto alternativo (`a11y.previa`), e o site ao vivo, o mesmo nome como título do iframe.
- **As capas de Música são links com o nome da faixa e dos artistas** (`aria-label`), porque a
  legenda que sobe no hover é desenho (`aria-hidden`) e não aparece para quem não aponta.
- **As capas do deque de Jogos são desenho** (`aria-hidden`): quem usa leitor de tela navega pelo
  painel ao lado, que diz o rótulo, o nome (link para o jogo) e as horas, num `aria-live`. Trocar de
  jogo é pelas setas ←/→ ou pelos passos (`jogos.anterior`, `jogos.proximo`).
- **Os passos ficam `disabled` nas pontas e no lugar, nunca escondidos**, em Jogos e na Carreira:
  um botão que deixa de existir enquanto está focado joga o foco no `body` no meio do gesto. Com um
  item só não há passo nenhum.
- **A órbita da Carreira é um `role="group"`** com `a11y.experiencia` como nome, e cada corpo é um
  botão com o cargo, a empresa e o período no `aria-label`; o escolhido leva `aria-current`. O foco
  num corpo segura a órbita, para o alvo não andar enquanto está focado.
- **O pôster que segue o cursor em Filmes é desenho** (`aria-hidden`, num portal): o título é o link,
  e o que distingue cada filme (a posição, o dia, a nota) está escrito na linha.
- **O nome da instituição de cada formação é o nome acessível do logo** (`role="img"` com
  `aria-label`, que é o alt de uma imagem de fundo). Os logos já trazem o nome desenhado, e o texto
  repetido embaixo deles saiu da tela; sem logo, ele volta a ser escrito.
- **O menu de opções** tem gatilho com `aria-expanded` e `aria-controls`, e fechado é `inert`. O
  idioma é um `radiogroup` (←/→ trocam, um só na tabulação) e a qualidade um `slider` de 0 a 100 cujo
  `aria-valuetext` avisa quando o valor passa do limite recomendado (`opcoes.acima`). `Esc` fecha e
  devolve o foco ao gatilho.
- Foco visível só para navegação por teclado (`:focus-visible`).
- **Nenhuma região focável apaga o contorno.** A curva do tempo, que existiu na Carreira, tinha
  `outline: none`, e quem chegava pelo teclado não via onde estava. O único `outline: none` que sobra
  é o dos campos do Contato, cujo risco acende no foco e cumpre o mesmo papel.
- **Os rótulos das listas de dado remoto são `<h3>`**, sob o `<h2>` da seção. "Mais tocadas" e
  "Mais ouvidos" são sub-títulos, e é por título que um leitor de tela pula de uma lista para a
  outra. Em Filmes as duas listas viraram abas: botões com `aria-pressed`, e só uma lista existe de
  cada vez.
- O cabeçalho marca a tela em vigor com `aria-current="page"`. A lista de subseções de cada tela
  abre com o foco do teclado como abre com o hover, o botão da tela leva `aria-expanded` e
  `aria-controls`, só a lista aberta entra na tabulação, e a subseção que ocupa a tela leva
  `aria-current`.
- Os ícones de canal do rodapé têm o nome do canal como rótulo (`aria-label`), e a imagem é `alt=""`,
  porque o rótulo já diz o que ela diz. O canal sem endereço não é link: é `role="img"` com
  `a11y.emBreve` ("TikTok (em breve)"). Fora do Início a barra fica `inert`.
- **As telas fora de vista são `inert`**: montadas para guardar a rolagem, mas fora do foco e da
  árvore de acessibilidade. A tela aberta recebe o foco (sem entrar na tabulação) para o teclado
  rolá-la.
- **`prefers-contrast: more`** sobe todos os textos acima de 4,5:1 e as linhas junto, redefinindo só
  os tokens de cor do `reset.css`. O desenho padrão é apagado de propósito, e boa parte dos rótulos
  fica abaixo do WCAG AA (ver `pendencias.md`); quem pede contraste ao sistema recebe a mesma página
  com tudo legível.
