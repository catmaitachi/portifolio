## Seção "Sobre"

- Seção com `overflow-y: auto` e centragem por **margens automáticas**
  (`.rolavel > *:first-child { margin-top: auto }` / `:last-child { margin-bottom: auto }`): fica
  centrada quando cabe e **rola** quando não cabe, sem cortar o topo. `justify-content: center`
  faria o conteúdo alto transbordar para fora do alcance da rolagem.
  **Toda seção rolável nova precisa de `.rolavel`.**
- Filhos com `flex: none`, sem `flex-shrink`, que antes comprimia e clipava o conteúdo.
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

### A bio muda de lado

`sobre.paragrafos` é um `Record` **total por modo**: quem chega pelo lado pessoal não deve ler um
parágrafo sobre práticas de Engenharia de Software, e quem chega pelo profissional não deve ler
sobre o que eu ando jogando. O título fica, porque é o mesmo assunto, e a seção continua sendo uma
só, e o que muda é qual lista o `useDecipher` recebe.

Um lado novo do site **quebra o build** até ter o próprio texto, que é a regra de sempre para
`Record` de modo (a etiqueta e a legenda do Início já eram assim).

### Os dois fatos, no lugar da formação

A formação **saiu daqui e virou seção** (ver adiante), e no lugar dela ficaram nascimento e
residência: rótulo em versalete espaçado com o valor embaixo, separados do corpo por um risco de
1px. São os dois fatos que o retrato não diz, e custam uma linha em vez do bloco mais denso da
página.

Eles ficam **dentro do bloco**, ao contrário do carrossel que ocupava este lugar: um irmão do
`.bloco` só se justifica para algo que precise da largura inteira da seção. O valor mora no
dicionário, e não em `shared.json`, apesar de ser dado: a cidade leva o país escrito no idioma de
quem lê, e "MG" não diz nada a quem chegou em inglês.

---

## Seção "Formação"

Os badges que ficavam no pé do Sobre, agora com seção própria, **só no modo profissional**. Ela não
sabe disso: quem decide é a lista do modo em `shared.json`.

Saíram de lá por duas razões que se somam. A primeira é de tamanho: o badge é a peça mais densa da
página (ver `responsivo.md`), e era ele que obrigava o Sobre inteiro a encolher para caber num
celular, e com ele fora ela volta ao teto da escala sozinha. A segunda é de leitura: formação
tem estado, data e progresso, e no rodapé de uma biografia isso lia como legenda do retrato.

O carrossel é filho **da seção**, não do bloco, como já era no Sobre: a entrada dele pende de
`data-secao-ativa` no ancestral, e `useEscalaQueCabe` mede a seção inteira justamente para alcançar
irmãos do bloco.

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
- O rAF só corre com o carrossel **na tela** (`IntersectionObserver`). A página mostra uma seção por
  vez: sem isso, o trilho continuaria escrevendo `scrollLeft` a cada quadro
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

## Seções "Música", "Jogos" e "Filmes"

As três do lado pessoal, e as únicas da página que mostram dado que não é do projeto. De onde ele
vem, e por que precisa de uma função sem servidor, está em `dados.md`; aqui está o que se vê.

**As três têm a mesma espinha**: um destaque grande em cima e o resto embaixo. Não é economia de
desenho, é o que o dado pede — em Música e Jogos existe um item que é *agora*, e o resto é histórico;
misturá-los numa lista só apagaria a diferença que a seção existe para mostrar.

**E as três precisam funcionar caladas.** Ninguém escuta música o dia inteiro nem está sempre numa
partida, então o destaque tem dois estados e o segundo é o comum: sem nada tocando, o lugar passa a
ser a última faixa ouvida, com o rótulo dizendo que ela é passado. Uma seção que só funciona enquanto
o dono está de fone é uma seção quebrada na maior parte do dia. O ponto que pulsa ao lado do rótulo é
o que separa um estado do outro.

| | Destaque | Resto |
|---|---|---|
| Música | o que está tocando: capa, faixa, artista e a barra de progresso | mais tocadas e mais ouvidos do mês, em duas listas de 1px |
| Jogos | jogando agora, ou o último jogado: arte, nome e horas | os das duas últimas semanas, em grade |
| Filmes | não tem: todo filme é passado | uma lista escolhida a dedo e os últimos assistidos, em duas faixas de pôsteres |

**Em Música o destaque fica no pé**, e é a única das três em que ele não abre a seção. Ele é o único
bloco que muda enquanto alguém está olhando, e no alto empurrava para baixo o que a seção tem de
conteúdo — as duas listas, que são o mês inteiro. Embaixo, ele é o rodapé vivo de um bloco parado, e
é para lá que o olho volta.

**Calado, ele se apaga e a capa perde a cor.** A seção é sobre o que está tocando *agora*, e um
bloco em cor cheia afirmaria isso mesmo com o rótulo dizendo o contrário. A capa é a única cor da
seção, e tirá-la é a diferença mais visível que existe aqui sem escrever nada.

**E no mobile ele não muda de forma.** Empilhar a capa sobre o texto foi a primeira versão e estava
errada: dobrava a altura do bloco justamente na tela onde ela é mais disputada, e o que está tocando
deixava de ser reconhecível de relance por ter virado outro desenho. Ali quem cede é o texto, que já
corta com reticências — cortar um título é mais barato que reorganizar o bloco.

**A barra do que está tocando anda sozinha, em CSS.** O que chega do Spotify é um instantâneo, e sem
nada ela ficaria parada por vinte segundos e daria um salto a cada resposta. Uma animação linear do
ponto atual até o fim, durando o que falta da faixa, mostra o tempo passando sem custar um quadro de
JavaScript; a `key` do elemento carrega o progresso, e é assim que cada resposta a reinicia em vez de
continuar a anterior.

Três coisas em volta dela, e cada uma resolve um problema diferente:

- **a cabeça.** Uma linha de 1px crescendo devagar é quase imperceptível de relance: o que se lê num
  medidor é a **borda**, não a área preenchida. Um traço curto e aceso encostado à direita do
  preenchimento viaja de graça com a mesma animação de largura;
- **o brilho do nome passa por ela.** É o mesmo degradê e o mesmo ciclo de 8,4s da abertura, e o
  keyframe é **copiado** para o módulo de Música, porque CSS Modules escopa os dois lados do nome de
  uma animação (ver `hud.md`). O que se compartilha são os números, não a declaração;
- **o tempo decorrido é o único JavaScript ali.** Escrito uma vez, o número ficaria vinte segundos
  parado ao lado de uma barra que anda, o que é pior que não ter número. Um `setInterval` de 1s
  escreve direto em `textContent`, como a decifragem da bio: um `setState` por segundo
  re-renderizaria a seção inteira para trocar quatro caracteres. O relógio parte do progresso que
  veio e a resposta seguinte o recoloca no lugar, então a deriva nunca passa de uma repetição.

**O ícone do serviço fica na linha do título, à direita, e leva ao perfil.** Quem lê "o que anda
tocando no meu Spotify" quer o perfil em seguida, e sem o link a seção é uma vitrine sem porta. Ele
é sobre a seção inteira, não sobre nenhum item dela, e por isso não desce para o conteúdo: ali ele
fecha a linha horizontal que o título abre. O componente é um só (`sections/PerfilExterno.tsx`), a
marca vive em `shared.json → perfis` porque nome próprio não se traduz, e seção sem perfil não
desenha nada. As três do lado pessoal têm o seu: Spotify, Steam e Letterboxd.

**A nota do Letterboxd é desenhada, não escrita.** Cinco marcas de 1px preenchidas pela fração cabem
na régua da página melhor que um glifo de estrela, que traria uma forma que não existe em nenhum
outro lugar aqui, e a meia estrela fica **exata** em vez de arredondada. É a mesma gramática do
medidor das formações. Quem usa leitor de tela recebe o número no `aria-label`: a marca é desenho.
**Sem nota é diferente de nota zero**, e quem marcou como visto sem avaliar recebe o rótulo, não
cinco marcas vazias, que afirmariam um julgamento que ninguém fez.

**Capas, artes e pôsteres ficam coloridos.** É identidade de terceiro, como os banners de projeto e o
vermelho da UFMG: não se repinta. A moldura de 1px existe mesmo sem a imagem, e é o mesmo espaço
reservado dos banners — a arte da Steam é montada a partir do `appid` por convenção e pode não
existir, e sem a moldura sobraria o ícone de imagem quebrada do navegador, a única coisa fora da
paleta na página inteira.

**A grade de Jogos é `auto-fill` com um mínimo**, nunca um número fixo de colunas: quem jogou um só
na quinzena não deve ver três vagas vazias, que leem como conteúdo que faltou carregar.

**Filmes tem duas faixas, e elas rolam de lado.** Os favoritos vêm antes dos recentes porque são uma
escolha, e a escolha diz mais sobre quem escreveu a página do que o registro. Empilhadas em grade as
duas passariam do rodapé, e reduzir o pôster até caber deixaria as duas ilegíveis; deitadas, cada
uma custa uma linha e o que não cabe na largura continua alcançável. A rolagem é **nativa** — arrasto,
roda e inércia de graça —, o encaixe é `proximity` e não `mandatory` (não há item ativo que precise
assentar), e a faixa entra na tabulação, porque uma região rolável que não recebe foco é inalcançável
por teclado.

O pôster é pequeno de propósito (104px no máximo). 2:3 é a proporção mais alta da página, e com duas
faixas cada uma custa a largura vezes 1,5 mais o nome e o rodapé: com 118px elas corriam por baixo do
crédito.

**O bloco de favoritos pode simplesmente não existir**, e a seção continua inteira sem ele. Ele sai
da raspagem de uma lista do Letterboxd, que não tem RSS, e a função devolve lista vazia em vez de
falha quando não há lista configurada ou quando o HTML mudou de forma (ver `dados.md`).

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
- **Os canais são os do modo**: Instagram e TikTok no pessoal, GitHub e LinkedIn no profissional. O
  cartão é o mesmo dos dois lados, muda só quem aparece, e a ordem é a que o modo lista, porque é
  dela que sai a distância ao centro da grade que escalona a entrada.
- Canal sem `url` é espaço reservado: tracejado, apagado e fora da navegação. A `url` passa pelo
  mesmo `urlExterna()` dos projetos — é o ponto único em que endereço de dicionário vira `href`.
- Ícones em `src/assets/icons/` — **glifos brancos locais, nunca CDN**: um ícone que não carrega
  deixa o cartão visualmente vazio e o visitante não descobre qual rede é. O LinkedIn usa a marca só
  com as letras (viewBox 448×512); a versão com placa vira um bloco branco.
