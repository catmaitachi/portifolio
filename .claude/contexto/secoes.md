## Seção "Sobre"

- Seção com `overflow-y: auto` e centragem por **margens automáticas**
  (`.rolavel > *:first-child { margin-top: auto }` / `:last-child { margin-bottom: auto }`): fica
  centrada quando cabe e **rola** quando não cabe, sem cortar o topo. `justify-content: center`
  faria o conteúdo alto transbordar para fora do alcance da rolagem.
  **Toda seção rolável nova precisa de `.rolavel`.**
- Filhos com `flex: none` — sem `flex-shrink`, que antes comprimia e clipava os badges.
- Bloco de parágrafos com rolagem própria (`--txt`, barra de 3px, `overscroll-behavior: contain`):
  chegar ao fim da bio não pode encadear a rolagem para a seção.
- **A coluna de texto não passa da base do retrato.** O texto rola dentro do que sobra depois do
  título, em vez de descer sozinho ao lado de uma imagem que já acabou — numa tela de 1080px eram
  ~56px de sobra. O teto é `--coluna-max`, e quem cede altura é o `.texto`: `min-height: 0` deixa o
  `flex-shrink` ir abaixo do tamanho mínimo do conteúdo, e sem isso a base transborda de novo. Não
  há `flex-grow` — o texto cede altura, nunca reivindica.

  O número sai de onde já existia: `--retrato` deixou de ser `100%` e virou um **comprimento**
  (`28cqw`), então `--coluna-max` é ele vezes a proporção. Onde uma faixa responsiva troca
  `--retrato` por um valor fixo (150px em telas baixas), o teto acompanha sozinho. É para isso que o
  `.corpo` é um `container-type: inline-size`: o bloco tem `max-width`, então a coluna não é fração
  da viewport e `vw` não serviria. No mobile o retrato fica **acima** do texto e não há base a
  respeitar — `--coluna-max: none`.

  A proporção mora em `--retrato-ar` e o `PortraitCard` monta o `aspect-ratio` com ela
  (`1 / var(--retrato-ar)`), para a altura do retrato e o teto da coluna não saírem de sincronia.
- Retrato (`PortraitCard`): inclina seguindo o ponteiro com brilho especular, escrito **direto no
  `style`** dentro de um rAF coalescido. Um `setState` por `pointermove` re-renderizaria a seção
  dezenas de vezes por segundo para mudar dois números de `transform`.

### Carrossel de formações

Grade estática **enquanto os badges cabem**; vira carrossel só quando não cabem. Um `ResizeObserver`
compara `clientWidth` com `n·(bw+gap) − gap`, e **`bw`/`gap` são lidos do DOM**
(`children[0].offsetWidth`, `columnGap`) — nenhum número de layout duplicado no JS, então mexer no
CSS não exige mexer no hook. A leitura acontece **no `ResizeObserver`**, não por quadro: o gap é
`getComputedStyle`, e chamá-lo dentro do rAF obrigava o navegador a recalcular estilo 60 vezes por
segundo para um número que só muda quando o layout muda.

- Badge de 312px (`--bw`; 246px no mobile): 3 × 312 + 2 × 12 = os 960px do bloco acima.
- Modo carrossel: trilho com **duas cópias** da lista; o laço reposiciona `(scrollWidth+gap)/2`, que
  é exatamente uma cópia mais o seu gap (a emenda é imperceptível). A segunda cópia é `aria-hidden`:
  um leitor de tela não deve encontrar a mesma formação duas vezes.
- Rolagem **nativa** (swipe e inércia de graça) + deriva de ~34px/s num rAF com acumulador subpixel.
  Arraste, roda do mouse e ←/→ com foco pausam a deriva por 2,2s.
- O rAF só corre com o carrossel **na tela** (`IntersectionObserver`). A página tem cinco seções e
  uma está visível por vez: sem isso, o trilho continuaria escrevendo `scrollLeft` a cada quadro
  enquanto o visitante lê Contato, disputando quadro com a cena em canvas por um movimento que
  ninguém vê.

### O que o hover revela

O badge acende (borda e fundo) e a **barra encolhe para a esquerda**, abrindo espaço para o detalhe:
a data em `concluido`, a fração `feito/total` em `cursando`. Em `cursando` a barra é a fração real o
tempo todo — o hover só põe o número ao lado do que a barra já estava dizendo.

- Quem não tem detalhe **não acende**: um realce que não revela nada promete informação que não
  existe. É por isso que o gatilho é `[data-detalhe]`, e não o badge inteiro.
- O espaço sai da `.trilha` (`flex: 1`), então nada mais na linha se mexe. A margem negativa do
  detalhe cancela o `gap` do medidor enquanto ele está fechado — senão sobrariam 8px de respiro para
  um elemento de largura zero.
- Fecha por **largura**, não por `display`/`visibility`: o texto continua na árvore de
  acessibilidade, então a data e a fração existem para quem nunca vai passar um ponteiro por cima.
  E em `(hover: none)` ele já nasce aberto, senão seria inalcançável no celular.

---

## Seção "Projetos"

**Carrossel em órbita 3D** (`useOrbit`). Os cartões ocupam pontos de um círculo horizontal; para
cada um, `ang = (i − ativo)·2π/n` dá `sen` (deslocamento em X) e `cos` (profundidade). Da
profundidade saem `escala` (.62→1), `foco` (opacidade) e `camada` (`z-index` 100±50). Um
`rotateY(−sen·34°)` inclina os laterais para dentro e o palco tem `perspective`.

O giro parece um anel de verdade, mas **todo texto continua de frente**: um anel com `preserve-3d`
esconderia os cartões de trás por `backface-visibility`, e com n=3 isso seria dois terços da lista.

**Nada de rAF**: `ativo` muda e as `transition` de `transform`/`opacity` (.95s) fazem a volta.
Girar: clique num cartão lateral, ←/→ com foco no palco, arraste de 46px ou os traços-índice abaixo.
O arraste é decidido no `pointerup` justamente para o clique no cartão continuar vivo.

**O arraste começa na faixa do cartão da frente**, não no palco inteiro. O palco é largo porque
precisa acomodar os cartões laterais, e capturar o gesto em toda essa largura fazia a órbita ser dona
de metade da seção. A faixa sai do DOM — centro do palco, `offsetWidth` do cartão com `data-frente`,
que é medida de **layout** e por isso não acompanha o `transform`: não balança durante o giro nem
duplica o `--pcw` do CSS no JavaScript. Só o início do gesto é filtrado; terminá-lo fora da faixa
continua valendo. O `cursor: grab` saiu do palco e foi para o **cartão da frente**, que é onde o
gesto passou a viver — uma mão aberta sobre a largura toda prometeria o que a maior parte dela não
atende mais. `:active` troca para `grabbing`, sem estado no React.

**O `click` que segue um arraste é engolido** por um listener de captura no palco, solto num
`setTimeout(0)` para não sobreviver a um gesto que não gerou clique. Sem isso o arraste sobre o
cartão da frente girava *e* o clique caía no cartão que estava ali, abrindo o painel de um cartão
que já tinha virado lateral. A captura no palco basta porque o React escuta na raiz do documento e
dispara `onClick` na subida, que deixa de acontecer.

**O cartão da frente é opaco** (`rgb(0 0 0 / 92%)`, contra os 42% dos demais). A órbita é fechada de
propósito — `--pr` foi reduzido para os cartões não passarem sob o menu — e por isso a caixa do
cartão da frente cobre um pedaço dos vizinhos: 2% em tela larga, 31% em janela média, 43% no mobile.
Com o preto translúcido, o vizinho aparecia através dele e não respondia ao clique, porque ali o
clique é do cartão da frente. Prometer um alvo que não existe é pior que escondê-lo: **o que se vê
do lateral é exatamente o que responde.** Devolver a área inteira aos laterais exigiria `--pr ≈ 0,99
· --pcw`, o que no mobile jogaria os cartões para fora da tela.

`foco` tem **piso alto** (`.52 + .48·prof`; vaga `.34 + .3·prof`): com n=3 a profundidade dos
laterais é só .25 e um falloff linear os apagaria por completo no céu preto.

**Descrição cobre o cartão**: painel `inset: 0` sobre o cartão inteiro (por isso o cartão é
`position: relative`), de `translateY(100%)` a 0. O link *ver ao vivo* só entra na tabulação quando
aberto. Sair da seção fecha o painel.

Marcador geométrico por cartão: dois contornos de 1px com raio/rotação próprios, escolhidos pelo
índice entre quatro variantes.

---

## Seção "Trajetória"

**Curva animada + ficha estruturada.** Um palco de altura fixa (`--exph`) onde todas as fichas ficam
sobrepostas (`inset: 0`) e só a ativa aparece — opacidade + 18px de deslocamento, sem rAF, e o palco
não pula ao trocar. A ficha é uma grade `--exp-rail 1fr`: trilho com índice, risco em degradê e o
tipo escrito na vertical (`writing-mode`); no conteúdo, o período como **número fantasma**
(opacidade .075) atrás do cargo, organização com ponto, atividades numeradas e a stack em chips de 1px.

A geometria é matemática pura em `timelineGeometry.ts` — sem React e sem DOM.

- A onda está ancorada no **tempo**, não na tela: `y = 66 − 42·sen(2π(u − ⅛))` amostrada a 72
  pontos por janela, cobrindo **cinco janelas** (u de −2 a 3), calculada uma única vez. Navegar é um
  `translateX` no `<g>` — a onda anda junto com os nós e o caminho **nunca é recalculado**. Ele não
  depende do número de vagas: elas mudam o espaçamento dos nós e o quanto a curva desliza, nunca o
  desenho dela.
- Duas cópias do caminho: a cinza inteira e a branca de progresso, **cortada por um `clipPath`
  vertical** que vem do passado e para exatamente na data ativa. A curva é função de x, então a
  borda vertical do corte cai sobre o nó — erro de 0px por construção.
  *Tracejado com `pathLength` foi descartado: com `non-scaling-stroke` o dash é medido em pixels de
  tela e a escala do viewBox não é uniforme, então o traço passava do ponto.*
- Os pulsos que viajam pela curva saem do comprimento dela: `PULSOS = JANELAS` e
  `DUR_PULSO = 13s × JANELAS`, com defasagem `DUR_PULSO / PULSOS`. Assim um caminho mais longo ganha
  pulsos em vez de espaçá-los mais — 13s por janela mantém a **velocidade**, um pulso por janela
  mantém a **densidade** (em média um na tela), e eles ficam igualmente espaçados por construção.
  São cinco `<circle>` mais o anel maior que corre meio segundo à frente do primeiro.
- `vector-effect="non-scaling-stroke"` mantém 1px apesar do esticamento não uniforme.

**Janela de seis eventos — quatro no mobile —, passo uniforme.** O espaçamento é sempre
`1/(vagas−1)` da largura: `1/5` no desktop, `1/3` em `≤640px`. Mais entradas não poluem a linha,
elas entram pela janela, que desliza. A data é **rótulo, não posição** (formato **ano.mês**). Com
menos entradas que vagas o grupo fica centrado (`base`).

A curva ocupa a largura da tela em qualquer tamanho, então é a **distância entre os nós** que o
mobile aperta: seis em 360px caem a ~62px um do outro, e os rótulos `ano.mês` se encostam muito
antes de as áreas de toque de 38px ficarem ambíguas. Com quatro, a distância dobra.

Isso **não cabe numa media query**. O número de vagas decide o espaçamento dos nós, o quanto a curva
desliza por passo e o quanto um arraste anda — geometria em JavaScript, não estilo. Quem lê a
largura é `useVagas`, sobre o `useMediaQuery` de `src/hooks/` e a mesma consulta `≤640px` do resto
da página (`TELA_ESTREITA`), e é **reativo**: girar o
aparelho troca a janela, e um efeito em `useTimeline` puxa o deslocamento de volta o mínimo para o
evento ativo continuar visível. Limitar o deslocamento ao novo máximo não bastaria — a rotação não
pode apagar da tela justamente o que estava sendo lido.

**Menos vagas gastam mais folga da curva**, e é essa a única coisa que amarra as duas pontas do
assunto: com quatro vagas cada passo desloca ⅓ de período contra ⅕ com seis, então as sete entradas
de hoje deslocam **uma janela inteira** no mobile — cinco vezes o que deslocam no desktop. É por
isso que o caminho cobre cinco janelas e não as três de antes: com três, a ponta direita parava em
x=956 num viewBox de 1000, e o canto direito da curva ficava sem linha já no estado inicial. As
cinco dão teto para ~1,95 janela de deslocamento: **nove entradas no mobile, quinze no desktop.**
Passar disso pede uma janela a mais em `JANELAS`, e só isso — a duração dos pulsos e quantos são
saem de lá.

Os nós são **botões HTML por cima** do SVG, não `<circle>`: precisam de área de toque de 38px, foco
de teclado e um rótulo que não estica junto com o `preserveAspectRatio="none"`. Ficam posicionados
em `left/top` como % do mesmo viewBox. O rótulo troca de lado conforme a curva sobe ou desce.

Navegação: arrastar a curva (deslocamento **fracionário** enquanto o dedo está na tela — arrastar
`1/(vagas−1)` da largura = um evento, então o gesto acompanha o espaçamento que está na tela), as
setas ←/→ (com foco no palco **e também sem foco**, enquanto a seção
estiver ativa) ou os dois botões de 38px abaixo da curva, que apagam nas pontas.
A navegação **não é circular**: as pontas são pontas.

**Nada de régua de anos** — tentada e descartada na fase de design ("deixa muita informação").

---

## Seção "Contato"

Composição aberta de 840px. Sem moldura: índice + título, intro, o **e-mail como link gigante**
(risco que acende no hover), formulário reduzido a uma linha e três cartões de canal.

- **Envio por `mailto:`** (`useMailto`) — sem back-end: abre o cliente do visitante. Assunto e
  assinatura vêm de textos com marcador `{nome}`. Mensagem vazia → `contato.erro` por 3,6s.
- O nome é **opcional**; só a mensagem é obrigatória. Exigir nome para receber uma linha de texto
  perde a linha.
- É um `<form>` com `onSubmit` de propósito: dá o Enter de graça em qualquer campo.
- O status vai num `aria-live` e **reserva altura mesmo vazio**, senão a mensagem de erro empurraria
  os cartões ao aparecer.
- Canal sem `url` é espaço reservado: tracejado, apagado e fora da navegação. A `url` passa pelo
  mesmo `urlExterna()` dos projetos — é o ponto único em que endereço de dicionário vira `href`.
- Ícones em `src/assets/icons/` — **glifos brancos locais, nunca CDN**: um ícone que não carrega
  deixa o cartão visualmente vazio e o visitante não descobre qual rede é. O LinkedIn usa a marca só
  com as letras (viewBox 448×512); a versão com placa vira um bloco branco.
