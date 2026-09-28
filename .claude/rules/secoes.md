---
paths:
  - "src/sections/**"
---

## Seção "Sobre": o dossiê

A primeira parte do Dossiê depois do Início é um **arquivo pessoal**, e ele foi desenhado para ler
como documento, e não como página de "sobre mim". Duas partes:

- **a ficha**: o retrato e, ao lado dele, os campos, rótulo em versalete e valor na mesma linha,
  separados por um tracejado de 1px, como um formulário preenchido. O tracejado é o que separa a ficha
  de um parágrafo: cada linha é um dado, e não uma frase. No celular o rótulo sobe para cima do valor;
- **as seções**, numeradas, com o título em versalete e um risco fechando a linha: Perfil, Propósito,
  Valores e Formação. O espaço entre elas é curto (`--parte-gap`), porque é o mesmo documento
  continuando.

**Os campos saem de onde o dado já mora**: o nome completo de `sobre.nomeCompleto` (o do `hero` é o
nome de uso, e continua no título do relatório), a ocupação do `hero`, residência e aniversário de
`sobre.dados`. O codinome saiu. O que ainda não existe aparece
como **reservado** (`sobre.reservado`), apagado. É um campo que ninguém
preencheu, e não pode ser preenchido com texto inventado (ver `pendencias.md`).

**O cabeçalho é de ficha**, e não o título grande das outras seções: número, título em versalete
(`Arquivo pessoal`) e um risco. O assunto do dossiê é a pessoa, e o nome dela é o primeiro campo. O
desenho mora em `section.module.css` (`.ficha`, `.fichaIndice`, `.fichaTitulo`, `.fichaRisco`) porque o
Contato, que fecha o dossiê, usa o mesmo.

**Cada seção de texto decifra os próprios parágrafos** quando o dossiê entra, o que aqui lê como o
arquivo sendo aberto. São contêineres separados porque o `useDecipher` trabalha nos `<p>` filhos
diretos de um só, e os títulos no meio impedem que dividam um.

**A formação é uma lista, com o trilho ao lado desenhado como a curva da Trajetória, em pé** (`Onda`,
no componente). É adaptação, e não cópia: as mesmas peças da curva (a onda apagada, a mesma onda
espelhada no eixo e mais apagada, o trecho aceso, um pulso correndo por ela e o nó com o anel), numa
linha vertical. Sem janela, sem navegação e sem troca entre formações: todas ficam à vista.

- **O nó cai onde a onda cruza o eixo**, no meio de cada formação, e por isso os nós ficam em coluna.
  A onda cruza a intervalos iguais, então as linhas da lista têm a mesma altura (`grid-auto-rows:
  1fr`) e nenhum `gap`: o espaço entre elas é `padding` da própria linha. A caixa do nó tem o tamanho
  do ponto e se centra por `translate`: numa caixa de 0×0 o ponto caía meio ponto fora do cruzamento.
  Entre a onda e a lista há um respiro próprio (`--onda-folga`).
- **O trecho aceso** vai do nó do que está em curso ao do último concluído, o caminho já andado; a
  pretensão fica no apagado. O nó em curso é o ativo da Trajetória (maior, cheio, com o anel), o
  concluído é cheio e pequeno, a pretensão é tracejada.
- **A entrada é a da Trajetória, em pé**: lá as ondas correm em sentidos opostos e param; aqui elas
  se desenham em sentidos opostos (`clip-path`), e os nós acendem atrás. Deslizar a onda no próprio
  eixo descobriria as pontas, que aqui são curtas. As pontas somem por máscara.
- **A ordem é a dos estados** (`ORDEM_ESTADO`): primeiro o que está em curso, porque responde "onde
  ele está hoje", depois o concluído, e a pretensão por último. Dentro do mesmo estado vale a ordem do
  dicionário, porque `sort` é estável.
- **O medidor são linhas simples de 1px**, uma por período (`progresso.total`, ou 8). As dos períodos
  feitos (`progresso.feito`, ou todas quando concluído) se preenchem da esquerda para a direita, uma
  depois da outra, quando o dossiê entra (pende de `data-ativo`, como as entradas). Uma barra de
  caixas com borda pesava mais que o curso. O logo da instituição fica a .72. A pretensão de mestrado
  saiu do conteúdo.

Ela já foi uma tela à parte, com uma faixa de crachás, badges no pé do Sobre, um trilho reto de 1px
com logos em branco cheio (um segundo desenho de linha do tempo na página, e os logos e o medidor
acesos eram as coisas mais fortes do relatório) e, por um momento, uma cópia da curva horizontal da
Trajetória com uma ficha por vez, que escondia a lista.

**Os títulos das seções centram o nome na altura do número.** Na linha de base, o versalete de 10px
ficava rente ao pé do número de 28px e lia desalinhado.

**Perfil, Propósito e Valores têm destaque sutil**: os nomes usam `--fs-pequeno` (11px) e
`--tx-corpo`, com peso 400. A regra `.parteTitulo:has(+ .texto, + .reservado)` identifica as
seções de texto também quando estão vazias; os números continuam em `--tx-marcador` e o título
de Formação usa os valores base.

**O retrato não tem cantos de mira.** Eles existiram, em L, e saíram.

- Retrato (`PortraitCard`): inclina seguindo o ponteiro com brilho especular (`hooks/useInclinacao`,
  ver `direcao-visual.md`). Ele escreve **direto no `style`** num rAF coalescido: um `setState` por
  `pointermove` re-renderizaria a seção dezenas de vezes por segundo para mudar dois números.
- A largura do retrato é `--retrato` (200px, 104px no celular) e a proporção é `--retrato-ar`, que o
  `PortraitCard` usa no `aspect-ratio`.
- **A bio é o texto do Lucas em três partes** (Perfil, Propósito e Valores), revisada com o
  `/humanizer` e com a voz da bio antiga ("pra", frases curtas). Texto novo dele passa pelo mesmo
  filtro antes de entrar.

---

## Seção "Projetos pessoais"

**Só projeto pessoal, e o que aparece de cada um vem do GitHub.** O que foi trabalho para alguém mora
na Carreira, e aqui fica o que é dele. A escolha é a dedo, em `shared.json → projetos`, e o resto é o
que o repositório diz de si, lido por `api/github` (ver `dados.md`).

**Sem escolha nenhuma, a seção diz isso** (`projetos.vazio`), na mesma linha dos estados de dado
remoto, e não chama a função. Escolhidos que não voltam, porque são privados, foram renomeados ou
apagados, caem no vazio de sempre. A função aceita doze por consulta.

### Em vitrine

**Cada projeto é uma linha: a janela com o site dele, e o que o repositório diz de si ao lado**
(`Projeto`). As linhas alternam de lado, para a coluna das janelas não virar um muro, e no celular
viram uma coluna, a janela sempre em cima. Escolhida entre três direções num preview (a Vitrine; as
outras eram um índice tipográfico com a foto sob o cursor e uma janela fixa que trocava com a
rolagem), e dentro dela o cabeçalho da janela e o desenho das linguagens também foram escolhidos
entre três.

- **A janela mostra a foto do site**, de `api/preview` (ver `dados.md`), e o botão dela troca a foto
  pelo site rodando de verdade ali dentro, e volta. **A foto é o estado de sempre** porque o site ao
  vivo carrega a página inteira do projeto (scripts, imagens) e fica rodando enquanto se lê outra
  coisa. O site ao vivo roda com o dobro da largura da janela e é reduzido à metade, em CSS, para não
  se ver como num celular.
- **Sem site, a janela mostra o código de barras dos commits**: um traço por commit, no dia em que ele
  aconteceu, dentro dos últimos doze meses, sobre um hachurado. É o retrato do projeto que existe
  quando não há página. A janela vem da função, e não do relógio do navegador, para o desenho depender
  só do dado.
- **A janela não tem barra de navegador.** A primeira versão desenhava as três bolinhas do macOS, que
  eram a única citação de outro sistema na página. A foto fica emoldurada em 1px, e o endereço vira a
  **legenda** embaixo dela, com um risco e o estado: "no ar", com o ponto que pulsa, ou "só código".
- **As linguagens são trechos**: uma barra de 3px dividida pelo tamanho de cada uma, um degrau de
  branco por trecho, porque a paleta não tem outra coisa, e a mesma amostra na legenda liga um ao
  outro. As três maiores têm nome; o resto vira um último trecho, o mais apagado. Os trechos se
  preenchem ao entrar, um depois do outro.
- **Estrela e fork só aparecem quando existem**: um "0" em cada projeto pessoal diria menos sobre o
  projeto do que sobre a contagem.
- **O nome é o do repositório, legível**: `Controlador_Tuya` vira `Controlador Tuya` (`nome.ts`), e o
  `id` continua sendo o nome de verdade. Acima dele fica o dono.
- A descrição, os tópicos e o nome chegam no idioma em que foram escritos no GitHub: é dado, e não
  interface.

**A órbita saiu.** Antes a seção era um carrossel em órbita 3D de cartões desenhados como bilhete de
missão (`useOrbit`, `ProjectCard`), com giro por clique, arraste, setas e traços-índice. Ela mostrava um
projeto por vez e escondia os outros atrás de um giro, e não tinha onde pôr o site de cada um; a
vitrine mostra todos, cada um com o site. Com ela saíram a `LuzRasante` (o fio de luz que corria pela
borda do bilhete), o arraste e as setas ←/→ desta seção.

---

## Seção "Carreira"

**Trabalho de verdade, contado como a bio.** A seção guarda o profissional inteiro, em três
categorias: extensão, freelance e emprego, que é o trabalho remunerado constante, do estágio à CLT. A
lista foi refeita com esse critério e ficou só com o que é contribuição real: trabalhos de curso,
monitorias e participações em evento saíram, porque não passavam a credibilidade que a seção existe
para passar.

**Órbita + ficha.** Cada experiência é um corpo numa órbita vista de lado (`Orbita`), e a ficha do
escolhido fica ao lado; no celular a órbita vai para cima. Escolhida numa rodada da skill
`inspiration` (a direção Profundidade, com o pedido de a órbita girar de verdade e os corpos ficarem
na linha); antes era a curva em onda com uma janela deslizante (ver *A curva saiu*).

- **A órbita gira de verdade**, uma volta por minuto (`PERIODO`), e os corpos andam sobre a linha.
  Os de trás são menores e mais apagados e passam por trás dos da frente (`--z`, a profundidade, de
  0 em cima a 1 embaixo, decide tamanho, brilho e `z-index`). A metade de trás do anel é mais
  apagada que a da frente, e é isso que dá o lado de cá a uma elipse.
- **O desenho e os corpos saem da mesma conta** (`orbitaGeometria.ts`, matemática pura). O anel é
  uma elipse num `viewBox` de 1000×560, o contêiner tem exatamente essa proporção
  (`aspect-ratio`), e cada corpo vai para `ponto(ângulo)`, que é a equação da mesma elipse: o centro
  dele cai sobre a linha com erro de 0px por construção (conferido no navegador: a equação dá
  1,0002 no centro medido). A primeira versão, na vitrine, inclinava um círculo de CSS em `rotateX`
  e posicionava os corpos por uma elipse calculada à parte, e os dois não coincidiam: foi isso que o
  Lucas apontou como "não está orbitando certo".
- **Escolher traz o corpo para a frente pelo caminho da órbita**, sempre no sentido do giro
  (`faseParaFrente`), em 1,2s, e daí ele segue girando. Andar para trás leria como a órbita voltando
  no tempo.
- **O ponteiro sobre a órbita, ou o foco num corpo, a segura**: um alvo que anda embaixo do cursor é
  difícil de acertar. Fora de cena, ou com `prefers-reduced-motion`, nenhum quadro roda e a
  escolhida fica na frente.
- O rAF escreve **direto no `style`** de cada corpo, como a inclinação do retrato. A posição inicial
  é pintada num `useLayoutEffect`, antes da primeira pintura; ler a ref da fase durante o render para
  pôr no `style` seria ler ref no render (ver `react.md`).
- **Os corpos são botões** de 38px, com o cargo, a empresa e o período no `aria-label`; o escolhido
  leva `aria-current` e o anel do nó ativo, que respira devagar. O rótulo embaixo de cada um é o
  período (**ano.mês**) e o tipo. No centro, qual é e de quantos (`01 / 03`).
- Navegação: clicar num corpo, as setas ←/→ (sem foco, enquanto a seção está ativa) ou os passos de
  38px embaixo da órbita (`.passo`, em `section.module.css`, o mesmo de Jogos), que apagam nas pontas.
  **A navegação não é circular**, mesmo com a órbita dando voltas: as pontas da lista são pontas.
- **Com um evento só, os passos não aparecem**, pela regra de sempre, e a órbita gira com o corpo
  sozinho.

**As fichas se empilham na mesma célula do palco** (`grid-area: 1 / 1`) e só a escolhida aparece,
com opacidade e 18px de deslocamento. O palco tem a altura da ficha maior, então trocar não o faz
pular. Antes a altura era fixa (`--exph`), com as fichas em `position: absolute`, e um texto mais
longo passava do palco. A ficha é uma grade `--exp-rail 1fr`: no trilho, o índice, um risco em
degradê e a categoria escrita na vertical (`writing-mode`); no conteúdo, o cargo como título, a
empresa ou o projeto como subtítulo, um parágrafo de texto e a stack em chips de 1px.

- **O texto é um parágrafo, e não uma lista.** As três atividades numeradas liam como relatório; um
  `<p>` justificado, como a bio, conta o que o trabalho foi na voz de quem o fez. Ele não repete o nome
  da empresa, que já está no subtítulo.
- **O subtítulo vira link** quando a experiência tem `url`, marcado só por um sublinhado de 1px que
  acende sob o ponteiro, sem ícone.
- **No celular o cabeçalho e o texto se afastam um pouco mais** (`--exp-cab-gap` e
  `--exp-bloco-gap`): ali o texto corre na largura inteira, e com o espaçamento de desktop cargo,
  subtítulo e parágrafo liam como um bloco só.
- **No canto de cima à direita fica a marca da empresa ou do projeto**, ao lado do cargo e do
  subtítulo e com a altura dos dois. A data mora na órbita, onde organiza alguma coisa; na ficha ela
  só repetiria o rótulo do corpo. A marca é pintada **por máscara**, em `--tx-marcador`, então o
  arquivo pode ser o logo colorido da empresa e o que chega à tela é só a silhueta. Ela já foi um
  fundo grande à direita (no celular o texto passava por cima) e o pé da ficha (onde um parágrafo
  longo a reduzia a quase nada); ao lado do cabeçalho o tamanho não depende do texto.

### A curva saiu

Antes a seção era uma curva em onda (`TimelineCurve`, `useTimeline`, `timelineGeometry`,
`useVagas`): a onda ancorada no tempo, uma janela de seis eventos (quatro no celular) que deslizava
por arraste, o trecho aceso cortado por `clipPath`, pulsos SMIL correndo pela linha e duas ondas
opostas na entrada. Saiu na mesma rodada, pela órbita. Duas lições dela continuam valendo, e a
órbita as segue: **o que anda num traço é calculado pela mesma conta que desenha o traço**, e
**a data é rótulo, não posição**. A formação do Sobre continua com a sua onda em pé (`Onda`), que é
desenho próprio e não dependia dos arquivos que saíram.

---

## Seções "Música", "Jogos" e "Filmes"

As três do lado pessoal, e as únicas da página que mostram dado que não é do projeto. De onde ele
vem, e por que precisa de uma função sem servidor, está em `dados.md`; aqui está o que se vê.

**Música e Jogos separam o que é *agora* do resto**, e não é economia de desenho: é o que o dado
pede. Em Música o destaque fica em cima e o resto embaixo; em Jogos o destaque é a capa da frente do
deque e o resto vem atrás dela. Misturá-los sem distinção apagaria a diferença que a seção existe
para mostrar. Filmes não tem destaque: todo filme é passado.

**E as três precisam funcionar caladas.** Ninguém escuta música o dia inteiro nem está sempre numa
partida, então o destaque tem dois estados e o segundo é o comum: sem nada tocando, o lugar passa a
ser a última faixa ouvida, com o rótulo dizendo que ela é passado. Uma seção que só funciona enquanto
o dono está de fone é uma seção quebrada na maior parte do dia. O ponto que pulsa ao lado do rótulo é
o que separa um estado do outro.

| | Destaque | Resto |
|---|---|---|
| Música | o que está tocando: capa, faixa, artista e a barra de progresso | as oito mais tocadas numa parede de capas, e os oito mais ouvidos numa fileira de retratos |
| Jogos | jogando agora, ou o último jogado: a capa da frente do deque, com o painel ao lado | os das duas últimas semanas, atrás dela no deque |
| Filmes | não tem: todo filme é passado | uma lista escolhida a dedo e os últimos assistidos, em duas abas de créditos |

**Música é uma vitrine de capas.** O destaque abre a seção, sem caixa em volta, com a capa grande.
Embaixo, as oito mais tocadas são uma **parede de capas**, e apontar uma a traz para o foco: as outras
apagam, perdem a cor e desfocam de leve, e o nome sobe de dentro da capa apontada (o `focus-cards` da
Aceternity, refeito com `:has()`, sem JavaScript). Os oito mais ouvidos fecham numa fileira de
retratos redondos, sem cor até serem apontados. Escolhida entre três direções num preview; antes, o
resto eram duas listas de texto e o destaque ficava no pé da seção, numa caixa chanfrada como a de
Jogos. **Sem hover** (toque), a legenda não teria como aparecer, e vai para baixo da capa, com a
parede em duas colunas.

**Tocando, o rótulo leva um equalizador**: quatro traços de 1px subindo e descendo, cada um no seu
tempo, ao lado do ponto que pulsa. **Calado**, o rótulo diz há quanto tempo foi a última faixa ("Tocou
por último · há 9 horas"), escrito pelo `Intl.RelativeTimeFormat` no idioma da página, sem texto de
dicionário para a frase.

**Calado, a capa do destaque perde a cor.** A seção é sobre o que está tocando *agora*, e um
destaque em cor cheia afirmaria isso mesmo com o rótulo dizendo o contrário.

**E no mobile ele não muda de forma.** Empilhar a capa sobre o texto foi a primeira versão e estava
errada: dobrava a altura do bloco justamente na tela onde ela é mais disputada, e o que está tocando
deixava de ser reconhecível de relance por ter virado outro desenho. Ali quem cede é o texto, que já
corta com reticências — cortar um título é mais barato que reorganizar o bloco.

**A capa leva à faixa, e cada artista ao seu perfil.** A capa é a maior superfície do bloco e a
primeira coisa que o olho encontra, e era a única parte dele que parecia clicável sem ser; hoje ela é
um link para a mesma faixa que o nome ao lado, e inclina ao ser apontada como as outras artes da
página. Os artistas são **um link cada**, e é por isso que a faixa carrega uma lista em vez do nome já
juntado (`data/types.ts`): numa faixa de dois, o nome inteiro apontando para o primeiro seria uma
resposta errada disfarçada de link. Quem só precisa da linha, como a legenda das capas, junta a lista na
hora de desenhar.

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

**Jogos é um deque em profundidade** (`Deque`, em `GamesSection`). As capas em pé (a arte 600x900
da biblioteca da Steam) ficam uma atrás da outra num trilho que recua no eixo z: a da frente é a
escolhida, em cor e em foco, e as de trás afastam para o lado, giram um pouco, apagam, perdem a cor e
desfocam pela distância. Ao lado, o painel diz o que a da frente é: o rótulo, o nome (link para a
página do jogo) e as horas da quinzena e do total. Escolhido numa rodada da skill `inspiration`
(reactbits/DepthCarousel, com os números reduzidos), e teve a maior nota da rodada.

- **O destaque abre o deque**: o que está aberto agora, ou o último jogado, é a capa da frente ao
  chegar, e os recentes vêm atrás dele sem repeti-lo. O rótulo diz qual dos dois estados é, com o
  ponto que pulsa só quando é agora, e passa a "Duas últimas semanas" para as capas de trás.
- **A posição anda por uma mola num rAF** que escreve direto no `style` de cada capa; o React só sabe
  do alvo, que muda no fim de um arraste, num clique numa capa, nas setas ←/→ (sem foco, enquanto a
  seção está ativa) ou nos passos embaixo do painel. Durante o arraste a posição segue o dedo sem mola
  (90px por capa), e soltar arredonda para a mais perto. Sem movimento, a troca é direta.
- **As capas são desenho** (`aria-hidden`): quem usa leitor de tela navega pelo painel, que diz o
  nome, as horas e leva à página do jogo.
- A entrada anima o **miolo** da capa (`.arte`), porque o `transform` da capa é da mola.
- Com um jogo só não há passos, pela regra de sempre.

Antes os recentes eram uma faixa que rolava de lado, compartilhada com Filmes (`sections/Faixa`, com
o hook `useRolagemLateral`), e o destaque era uma caixa com a arte deitada. As duas saíram nesta
rodada, e a faixa junto, porque nenhuma seção a usa mais. Duas versões anteriores também ficaram pelo
caminho: uma inclinava cada capa em 3D como uma prateleira vista de esguelha (o ângulo que fazia a
fileira parecer prateleira deixava a arte ilegível), e outra era uma pilha que abria no ponto do
ponteiro.

**Filmes é uma lista de créditos** (`Creditos`). Cada filme é uma linha com o título em contorno
gigante, que se enche da esquerda ao ser apontado, e **o pôster segue o ponteiro**, ao lado dele,
inclinado pela velocidade com que ele anda (aceternity/link-preview e animata/reveal-image).
Escolhida numa rodada da skill `inspiration`, entre a folha de contato e o túnel em profundidade.

- **Duas abas, Favoritos e Vistos por último**, e os favoritos abrem, porque são uma escolha e a
  escolha diz mais sobre quem escreveu a página. Com uma lista só (sem `LETTERBOXD_LIST`) não há
  abas: o nome da lista vira o rótulo. Trocar de aba refaz a lista (`key`), e a cascata de entrada
  corre de novo.
- À esquerda fica o que distingue um filme do outro **naquela lista**: nos favoritos a posição, e nos
  recentes o dia em que foi visto (`Intl.DateTimeFormat` no idioma da página, sem texto de
  dicionário). À direita, o ano, a revisita e, nos recentes, a nota.
- **O pôster flutuante mora num portal no `body`.** As telas se movem por `transform`, e um
  `position: fixed` dentro delas passaria a medir a tela, e não a janela. A posição do ponteiro vem
  de um ref da própria seção (`onPointerMove`), sem `setState`, e o rAF só roda enquanto há um
  pôster à vista. Ele nasce onde o ponteiro entrou na linha, e não onde o último saiu.
- **Sem hover (toque), o pôster mora na linha**, pequeno, entre o marcador e o título.

**A nota do Letterboxd é desenhada, não escrita.** Cinco marcas de 1px preenchidas pela fração cabem
na régua da página melhor que um glifo de estrela, e a meia estrela fica **exata** em vez de
arredondada. É a mesma gramática do medidor das formações. Quem usa leitor de tela recebe o número no
`aria-label`: a marca é desenho. **Sem nota é diferente de nota zero**, e quem marcou como visto sem
avaliar recebe o rótulo, não cinco marcas vazias.

**Mas ela só vale nos vistos por último.** Nos favoritos a nota não diz nada: uma lista de favoritos
é feita de cincos. Ali o que distingue um do outro é a **posição**, que é a única coisa que a lista
afirma, e é ela que aparece no lugar do marcador, com a frase `filmes.posicao` para o leitor de tela.
A ordem vem pronta da raspagem.

**Capas, artes e pôsteres ficam coloridos.** É identidade de terceiro, e não se repinta. **A moldura
de 1px só aparece quando a imagem não veio**, que é o espaço reservado de toda imagem da página (ver
`direcao-visual.md`): o endereço da arte da Steam é perguntado a cada resposta e pode não vir.

**O bloco de favoritos pode simplesmente não existir**, e a seção continua inteira sem ele. Ele sai
da raspagem de uma lista do Letterboxd, que não tem RSS, e a função devolve lista vazia em vez de
falha quando não há lista configurada ou quando o HTML mudou de forma (ver `dados.md`).

---

## Seção "Contato"

**O fim do dossiê, como um cartaz.** De um lado, "Vamos conversar" em contorno gigante, que **se
enche de baixo para cima conforme a mensagem cresce** (cheio aos 280 caracteres): o título é o
medidor, e não há outro. Embaixo dele, o endereço, que copia ao ser clicado. Do outro lado, o
formulário é uma frase para completar ("Oi, Lucas. Aqui é ___.") e a mensagem logo abaixo. No
celular é uma coluna, o título em cima. Escolhido numa rodada da skill `inspiration`, depois de um
refazer: a primeira versão tinha o endereço correndo numa faixa; antes disso a seção era um console
com linhas de rótulo e valor.

- **O endereço mora aqui, e só aqui**: é um botão que copia (`clique para copiar` vira `copiado` por
  1,8s, no mesmo `aria-live`), em contorno que se enche ao ser apontado. Sem permissão de área de
  transferência o copiar não faz nada, e o endereço continua à vista.
- **A frase é do idioma**: `contato.campos.frase` são as duas metades em volta do campo do nome, e
  o campo cresce com o nome (`size`), para ela continuar lendo como frase. O nome acessível dos dois
  campos é `rotulo`, porque nenhum tem rótulo à vista. **É "Lucas", com c**: a grafia do nome.
- **Envio por `mailto:`** (`useMailto`), sem back-end: abre o cliente do visitante. Assunto e
  assinatura vêm de textos com marcador `{nome}`. Mensagem vazia → `contato.erro` por 3,6s.
- O nome é **opcional**; só a mensagem é obrigatória. Exigir nome para receber uma linha de texto
  perde a linha.
- É um `<form>` com `onSubmit`: o Enter no nome envia. Na mensagem não, porque ali o Enter é
  parágrafo; Ctrl/⌘+Enter envia.
- **A mensagem cresce com o texto** (`field-sizing: content`) até 16em, em vez de rolar por dentro.
- **O status toma o lugar do "canal aberto"** enquanto existe, no mesmo `aria-live`.
- O risco do campo acende quando ele tem foco, e é esse o sinal de foco dos campos.
- **O título que enche é um texto só**: `background-clip: text` num degradê de corte seco (branco ou
  transparente), cuja altura é `--cheio`, registrado por `@property` para transicionar. Não é
  degradê de cor, e o hook de design do Impeccable, que o aponta como "gradient text", tem a
  exceção gravada em `.impeccable/config.json` para este arquivo e o de Filmes.
- **O respiro antes do Contato é largo**, como entre todas as subseções de uma tela
  (`Tela.module.css`): é outra conversa, e não mais uma parte do arquivo.
