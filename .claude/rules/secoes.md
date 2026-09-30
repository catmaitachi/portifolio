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

**Maço de crachás + ficha.** Cada experiência é um crachá, e todos pendem do mesmo cordão, um atrás
do outro (`Maco`, em `Cracha.tsx`); a ficha da escolhida fica ao lado, e no celular o maço vai para
cima. Escolhido numa rodada da skill `inspiration` (30/09/2026), depois de três refazer: a primeira
leva (terminal, índice e constelação) foi achada com pouca personalidade, a segunda trouxe o crachá
sozinho, e a escolhida é a mistura que o Lucas pediu, **o maço de uma variação com a lateral de
texto do crachá sozinho**. Antes era a órbita (ver *A órbita saiu*).

- **O crachá da frente é a escolhida**, em cor cheia; os de trás recuam 16px cada, encolhem e
  apagam, e mostram o **período numa orelha** embaixo do da frente. Clicar numa orelha traz aquele à
  frente. Cinco ficam à vista (`VISIVEIS`), e o resto se esconde atrás deles; a ordem dá a volta, mas
  **a navegação não é circular**: as pontas da lista são pontas.
- **O cordão é um pêndulo** (`usePendulo`): um chute soma velocidade, a gravidade puxa para o meio e o
  atrito segura. Ele chega balançando quando a seção entra, balança de novo a cada troca, e arrastar
  de lado o empurra (`touch-action: pan-y`: o arraste vertical continua rolando a página). O rAF **só
  existe enquanto ele balança** e escreve direto no `style` (`rotate` e `--torce`, que gira o cartão no
  próprio eixo pela velocidade, como um crachá de verdade). Com `prefers-reduced-motion`, nada
  balança.
- **O crachá é do portador, e a ficha é do trabalho: nada é dito nos dois.** O crachá tem a marca
  de quem o emitiu, por máscara (a silhueta; sem marca, a sigla), o nome de quem o usa
  (`hero.nome`) grande, o cargo embaixo, e a **stack como código de barras**, seis barras por
  tecnologia pela conta do nome, sem os nomes. A ficha tem o tipo e desde quando, a empresa como
  título, o texto e a stack nomeada em chips. Na primeira versão o cartão repetia quase tudo da
  ficha (tipo, cargo, empresa, período, e a stack três vezes: barras, nomes no cartão e chips);
  escolhida entre quatro divisões (30/09/2026). A fita é impressa com o nome, como toda fita de
  crachá, e o brilho segue o ponteiro sobre o da frente, como na carta do retrato.
- **O cartão é em pé** (3:4, `--cracha-ar`): a marca ocupa o que sobra da altura, o nome fica sob um
  risco, e o código de barras corre na largura inteira. Com a marca numa foto deitada (1,7:1) ele
  saía pequeno e quadrado; na proporção de um cartão de verdade (54 × 86) ficou alto demais ao lado
  da ficha. A coluna é `clamp(220px, 22vw, 260px)`.
- **O maço é desenho** (`aria-hidden`), como as capas do deque de Jogos: quem usa leitor de tela
  navega pela ficha e pelos passos, e as cartas são botões fora da tabulação.
- **A ficha abre com uma linha**: o tipo e "desde" o período (`experiencia.cracha.desde`); depois a
  empresa como título (link quando há `url`), o parágrafo e a stack em chips. A posição ("01 / 03")
  saiu da linha: a contagem entre os passos já a diz, e com uma experiência só não diz nada. O
  trilho vertical que ela tinha (índice, risco e tipo em pé) também saiu. A ficha começa na altura do crachá, e não da
  fita (`--fita-h`).
- Navegação: clicar numa orelha, as setas ←/→ (sem foco, enquanto a seção está ativa) ou os passos de
  38px embaixo da ficha, que apagam nas pontas. **Com uma experiência só, os passos não aparecem** e
  o maço é um crachá.

**As fichas se empilham na mesma célula do palco** (`grid-area: 1 / 1`) e só a escolhida aparece,
com opacidade e 18px de deslocamento. O palco tem a altura da ficha maior, então trocar não o faz
pular. Antes a altura era fixa (`--exph`), com as fichas em `position: absolute`, e um texto mais
longo passava do palco.

- **O texto é um parágrafo, e não uma lista.** As três atividades numeradas liam como relatório; um
  `<p>` justificado, como a bio, conta o que o trabalho foi na voz de quem o fez. Ele não repete o nome
  da empresa, que já é o título.
- **O título (a empresa) vira link** quando a experiência tem `url`, marcado só por um sublinhado de 1px que
  acende sob o ponteiro, sem ícone.
- **No celular o título e o texto se afastam um pouco mais** (`--exp-bloco-gap`): ali o texto corre
  na largura inteira, e com o espaçamento de desktop título e parágrafo liam como um bloco só.
- **A marca da empresa não fica na ficha.** Ela já foi um fundo grande à direita (no celular o texto
  passava por cima), o pé da ficha (onde um parágrafo longo a reduzia a quase nada), o canto de cima
  à direita, ao lado do cargo, e o centro da órbita. Hoje mora no crachá.

### A órbita saiu

Entre 27 e 30/09/2026 a seção foi uma órbita vista de lado (`Orbita`, `orbitaGeometria`): cada
experiência um corpo girando sobre a linha de uma elipse, uma volta por minuto, e escolher trazia o
corpo para a frente pelo caminho da órbita. Saiu pelo maço de crachás. Com ela saíram o
`a11y.experiencia` (o nome do grupo da órbita) e a regra de a posição inicial ser pintada num
`useLayoutEffect`. A lição dela continua valendo para qualquer coisa que ande num traço: **o que anda
num traço é calculado pela mesma conta que desenha o traço**.

### A curva saiu

Antes a seção era uma curva em onda (`TimelineCurve`, `useTimeline`, `timelineGeometry`,
`useVagas`): a onda ancorada no tempo, uma janela de seis eventos (quatro no celular) que deslizava
por arraste, o trecho aceso cortado por `clipPath`, pulsos SMIL correndo pela linha e duas ondas
opostas na entrada. Saiu na mesma rodada, pela órbita. Duas lições dela continuam valendo, e a
órbita as segue: **o que anda num traço é calculado pela mesma conta que desenha o traço**, e
**a data é rótulo, não posição**. A formação do Sobre continua com a sua onda em pé (`Onda`), que é
desenho próprio e não dependia dos arquivos que saíram.

---

## Seção "GitHub" (título: Estatísticas)

**Na tela ela se chama Estatísticas** (`nav.github` e `github.titulo`, "Statistics" em inglês), a pedido
do Lucas; no código, no endereço (`#journey/github`) e nesta documentação continua sendo GitHub, que é
de onde o dado vem. O ícone do perfil ao lado do título segue dizendo qual é a fonte.

**O que o GitHub registrou do último ano**, na Trajetória, entre a Carreira e os Projetos. Os Projetos
mostram cada repositório; esta seção mostra o ano de trabalho inteiro. O dado vem de `api/atividade`
(ver `dados.md`), uma vez por entrada, e a seção só desenha: as contas moram na função.

Escolhida numa rodada do /inspiration (29/09/2026, modo hard), misturando as direções: o **Céu** para
o ano, o **cartaz** para os números e a **nuvem de ícones** para as linguagens, que foi sugestão do
Lucas (o Icon Cloud do Magic UI). As três foram harmonizadas numa física só, **tudo se acende**:

- **o cartaz**: um número grande só, os commits do ano, em contorno, que se enche de luz de baixo para
  cima enquanto conta (o corte seco do título do Contato, com a variável própria `--gh-cheio`, sem
  `@property`, ver `direcao-visual.md`). As outras contas ficam numa ficha pontilhada ao lado:
  contribuições, dias com código, maior sequência, dia mais cheio, repositórios com commits e desde
  quando. Na vitrine o céu tinha o próprio total em destaque, e dois números gigantes brigavam; o total
  foi para a ficha;
- **o céu do ano** (`CeuDoAno`): 53 semanas por 7 dias, cada dia uma estrela com tamanho e brilho pela
  raiz do número do dia, e os dias vazios como pontos quase apagados. Ao entrar, um feixe de luz
  atravessa as semanas e o céu acende atrás dele. Apontar um dia mostra a data e o número com um risco
  até a estrela, e acende a coluna da semana, escrevendo direto nos nós. **No celular o céu rola de
  lado** (largura mínima de 680px) e abre no fim, que é o agora: espremidas em 390px as 53 semanas
  ficavam ilegíveis;
- **as linguagens** (`NuvemDeLinguagens`): uma esfera de Fibonacci girando, com estrelas entre os
  ícones, e cada ícone do tamanho do peso da linguagem. O bloco tem a largura do cartaz e do céu, mas
  **quem cresce é a legenda, não a nuvem**: ela fica em 360px (`--gh-nuvem`) e a legenda vai até a
  borda. Uma versão esticou a nuvem até 520px para preencher o vão, e ficou desproporcional. Ícones e
  estrelas acompanham o tamanho da nuvem (as medidas são de uma de 300px, multiplicadas pela escala).
  O título diz de onde vem o dado, "Linguagens de todo o código que publiquei": sozinho, "Linguagens"
  não dizia se era do ano, de um projeto ou do perfil.
- **os ícones das linguagens são do Devicon e não moram no projeto.** `api/atividade` procura cada
  linguagem que o GitHub devolve no Iconify, numa cascata (o Devicon simplificado em uma cor, depois o
  original, que a nuvem pinta de branco), e entrega o SVG junto com o dado; sem ícone, a nuvem desenha
  a sigla num círculo fino, como um elemento da tabela periódica. Uma linguagem nova amanhã ganha
  ícone sozinha. Escolhido numa terceira vitrine contra o File Icons e as siglas puras; antes eram
  arquivos do Simple Icons guardados em `assets/`, que cobriam só as linguagens de hoje. O SVG só vira
  imagem no canvas, nunca entra no DOM como marcação. Os ícones são do Simple Icons (CC0), guardados
  em `assets/linguagens/` e pintados de branco no canvas; linguagem sem ícone aparece pela sigla.

Três ajustes da nuvem saíram das observações da vitrine e valem para o que vier:

- **arrastar gira na direção da mão**: a face da frente acompanha o ponteiro. Na demo ela ia ao
  contrário;
- **a escolhida se destaca na própria nuvem**: vem para a frente pelo menor giro, cresce, ganha um
  anel, e as outras recuam. A nuvem para de girar enquanto há uma escolhida;
- **a legenda ao lado tem medida fixa** (a Legenda compacta, escolhida numa segunda vitrine contra
  uma régua de peso e um anel de rótulos): um cabeçalho de altura fixa diz a linguagem em foco (posição,
  peso, o nome e um risco do tamanho do peso) e uma grade de chips iguais, quatro por linha (dois no
  celular), lista todas com a escolhida acesa. Na demo era um nome grande que mudava de largura a cada
  escolha. Os chips são também o caminho do teclado e do leitor de tela (`aria-pressed`, e o cabeçalho
  é uma região `aria-live`); o canvas é desenho.

O laço da nuvem só roda com a seção ativa, na tela e com a aba visível. No toque, o arraste vertical
continua rolando a página (`touch-action: pan-y`) e o horizontal gira.

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
| Filmes | não tem: todo filme é passado | uma lista escolhida a dedo e os últimos assistidos, em duas abas de película |

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

**O andar de baixo: o LoL e o Minecraft.** Embaixo do deque, dois sub-títulos (`<h3>`, com o risco
de `comum.tituloLista`, o mesmo da Música): o League of Legends com a parte maior, e o Minecraft
fechando a seção, mais estreito. Escolhido numa rodada da skill `inspiration` (30/09/2026, Andares
+ Pedestal); na vitrine o Minecraft vinha primeiro, com o nick e um texto embaixo do boneco, e as
observações do Lucas foram pô-lo por último, menor que o LoL, e tirar os textos.

- **O LoL** (`Liga`) tem a carta do invocador e o pódio das maestrias lado a lado, e as últimas
  partidas embaixo, numa gaveta. Escolhido numa segunda rodada da skill `inspiration` (30/09/2026,
  Carta + Pódio + Linhas), com as observações do Lucas: a carta só com ícone, borda, nível, nick e
  região, e os campeões do pódio com o ícone redondo; depois, as partidas num dropdown com a seta no
  fim da linha do título.
  - **A carta** é o ícone dentro da borda de nível do jogo, o nível na placa, o nick e a região; é
    chanfrada e inclina com o ponteiro (`useInclinacao`), como o retrato do Sobre.
  - **O pódio** põe o 1º no meio (`order`, e o DOM continua na ordem para o leitor de tela); o degrau
    tem a altura dos pontos e sobe do chão quando a seção entra, depois do bloco (520ms).
  - **As partidas** são linhas: um fio cheio (vitória) ou tracejado (derrota, com o campeão sem cor,
    como no deque), o K/D/A, KDA e CS, a fila (pelo `queueId`, no dicionário), a duração, os sete
    itens e há quanto tempo. Moram num `<details>` fechado ao chegar, com a `.ponta` no fim da linha
    do título; abrir desliza a altura (`interpolate-size`, sem animação onde não há suporte).
  - **O dado vem de `api/riot`**, uma vez por entrada. Esperando, ou com a Riot fora (chave vencida
    responde 401), a forma é a mesma desenhada com `liga.molde.ts`, apagada, com o aviso por cima,
    como nas outras seções remotas. Na primeira versão os números de exemplo apareciam de verdade,
    com uma etiqueta dizendo que eram de exemplo; ela saiu quando a função chegou.
  - **ARAM: Desordem não aparece, e a gaveta diz isso** (`jogos.lol.semDesordem`): a Riot não
    publica a fila 2400 na API (some do histórico e dá 403 pelo id; bug aberto no
    `RiotGames/developer-relations`, #1109). Quem mostra essas partidas lê o cliente do jogo no PC,
    o que não serve a um site. O Lucas notou porque as últimas dele eram todas desse modo.
  - **A fila é nome do dicionário** (`jogos.lol.filas`, pelo `queueId`), e a que não está lá vira
    "Partida". A 1750 não está nem na lista oficial da Riot: é a Arena de 18 jogadores (`CHERRY`).
  - **A borda de nível e o brasão de maestria não vêm da API**: são arte do jogo guardada em
    `src/assets/lol` em webp pequeno (21 bordas e 10 brasões, ~40KB cada contra ~300KB do original),
    e a página só baixa a que usa. O tema da borda sai do nível (até o 29, do 30 ao 49, e daí um a
    cada 25 até o 500); o ícone cabe no buraco, que tem 54% da arte, e o nível fica a 80% da altura,
    no meio da placa (medido nos 21 temas).
- **O Minecraft é um boneco 3D com a skin de verdade** (`Boneco`, `modelo.tsx`, `comportamento.ts`),
  em CSS 3D, sem three.js: seis caixas de seis faces, cada face um `<i>` com o recorte da textura
  pela UV do jogo, a segunda camada meio texel para fora, o modelo slim ou largo e a capa. A skin vem
  de `api/minecraft` e troca sozinha quando ela muda no jogo. Sem ela, o molde é o pedestal vazio.
- **O comportamento é o do jogo, em ticks de 50ms**: parado, a cabeça segue o ponteiro e o tronco
  acompanha a um quarto (de costas, a mira se espelha, e ele olha para o lado da tela em que o
  ponteiro está); segurar e arrastar gira o corpo; **ao aparecer na tela ele chega do fundo e faz um
  gesto sorteado de `GESTOS`** (hoje só o aceno do Bedrock); **clicar é um golpe**: 30% de vermelho
  por cima da textura, meio segundo de invulnerabilidade, o empurrão com a física do jogo (gravidade
  0,08, atrito de ar e de chão, força 0,2 no lugar dos 0,4 do soco, para caber no palco), a volta
  andando com o balanço de pernas do `HumanoidModel`, e, se estava de costas, ele vira para quem bateu.
  A vida (20, dez corações) só aparece depois de um golpe e some em 3s; sem vida ele tomba de lado em
  20 ticks, vira fumaça e renasce 1,5s depois, chegando de novo.
- **Ele acena quando aparece, e não quando a seção abre**: mora no fim de Jogos, e um gesto no abrir
  da seção aconteceria fora de vista. Um `IntersectionObserver` (60% à vista) marca `data-visto`.
- **O pedestal é chão de verdade**: três anéis de 1px deitados no 3D, com a mesma câmera do boneco.
  A primeira versão os desenhava como elipses em 2D, e o boneco parecia flutuar ao lado deles.
- **A entrada anima a `.cena`, plana, e não o `.boneco`**: `opacity` e `filter` achatam um elemento
  `preserve-3d`, e as faces de trás passariam na frente durante a chegada.
- É desenho (`aria-hidden`), dentro de um `role="img"` com o nick e o que ele é
  (`jogos.minecraft.boneco`).

Antes os recentes eram uma faixa que rolava de lado, compartilhada com Filmes (`sections/Faixa`, com
o hook `useRolagemLateral`), e o destaque era uma caixa com a arte deitada. As duas saíram nesta
rodada, e a faixa junto, porque nenhuma seção a usa mais. Duas versões anteriores também ficaram pelo
caminho: uma inclinava cada capa em 3D como uma prateleira vista de esguelha (o ângulo que fazia a
fileira parecer prateleira deixava a arte ilegível), e outra era uma pilha que abria no ponto do
ponteiro.

**Filmes é uma película** (`Pelicula`). Os pôsteres correm numa tira de filme, devagar, para a
esquerda, com os furos desenhados em 1px nas duas bordas, e embaixo fica a legenda do quadro em foco:
o que distingue o filme naquela lista, o ano, e o título **se decifrando** como a bio. Escolhida numa
rodada da skill `inspiration` (30/09/2026), entre o obturador (fendas que abrem) e a claquete (um
pôster grande e o rol de títulos); antes era a lista de créditos (ver *Os créditos saíram*).

- **A velocidade é o gesto** (o ScrollVelocity da React Bits, sem a mola do motion): a roda do mouse
  sobre a tira e o arraste entram como velocidade, que volta à base (28px/s) aos poucos, e a
  velocidade **inclina os quadros** (até 8°). A roda **não é engolida**: a página continua rolando e a
  tira só sente o empurrão. No toque, o arraste de lado empurra e o vertical rola a página
  (`touch-action: pan-y`).
- **Só o quadro em foco tem cor.** Os outros ficam em cinza e apagados: a cor é do filme da legenda.
  Sem ninguém apontando, o foco é o quadro no centro, e a legenda troca quando ele passa; apontar um
  quadro para a tira e a legenda passa a ser dele. O foco do teclado traz o quadro para o meio, para
  ele não passar fora de vista.
- **A lista vem duas vezes** para a tira dar a volta sem emenda; a segunda cópia é desenho
  (`aria-hidden`, fora da tabulação). Cada quadro é um link para o filme, com o título, o ano e, nos
  favoritos, a posição no `aria-label`.
- **O rAF só roda com a seção em cena** e escreve direto no `style` (`transform` do trilho e
  `--furos`, a posição dos furos); a largura do quadro é medida quando muda, e não a cada quadro. A
  legenda troca por estado, mas só quando o filme em foco muda (a cada poucos segundos), e **não é
  `aria-live`**: trocando sozinha, ela falaria sem parar.
- **O título se decifra num nó novo a cada filme** (`key`), e o efeito escreve no `textContent` dele,
  como a bio: sem a `key`, o React perderia o nó de texto que o efeito substituiu.
- **Sem movimento, a tira não anda**: vira uma faixa que rola de lado, com uma cópia só, e a legenda
  segue o ponteiro e o foco.
- **Duas abas, Favoritos e Vistos por último**, como antes: os favoritos abrem, com uma lista só não
  há abas, e trocar de aba refaz a película (`key`). Nos favoritos a legenda diz a posição; nos
  recentes, o dia em que foi visto (`Intl.DateTimeFormat`) e a nota.
- Sem pôster, o quadro mostra o título dentro da moldura de 1px, que é o espaço reservado de toda
  imagem da página.

### Os créditos saíram

De 27 a 30/09/2026 Filmes foi uma lista de créditos (`Creditos`): o título em contorno gigante, que se
enchia ao ser apontado, e o pôster que seguia o ponteiro num portal no `body`, inclinado pela
velocidade. Saiu pela película, e com ela o portal, a exceção de "gradient text" de
`FilmsSection.module.css` no `.impeccable/config.json` e os tokens `--marcador-col` e `--credito-fs`.

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

### Esperando e vazio: a forma da seção, sem o dado

As cinco seções de dado remoto (Música, Jogos, Filmes, GitHub e Projetos) desenham **a própria
forma** enquanto esperam e quando não há nada: cada uma tem um `Molde` que monta as mesmas caixas e
grades com as classes dela, com `Traco` (de `EstadoRemoto`) no lugar do texto. `EstadoRemoto`
recebe o molde como `children` e decide o resto:

- **esperando, a forma respira e não há texto à vista.** O "Buscando…" saiu a pedido do Lucas: a
  forma pulsando já diz que algo vem. O aviso continua no DOM, escondido, com `role="status"` e
  `aria-busy`, para o leitor de tela;
- **vazio ou erro, a forma fica parada, apagada e sumindo para baixo**, com o aviso por cima, no alto
  da forma (no meio ela cairia fora da tela em Projetos e Música). É só o
  texto, "Nada aqui por ora.", sem caixa: um fundo preto com borda atrás dele saiu a pedido do Lucas;
- **a página não pula quando o dado chega**, porque as caixas já tinham o tamanho certo. O deque de
  Jogos põe as três capas vazias pela mesma conta da mola (`pose`), e Projetos desenha uma linha por
  repositório escolhido, que já se sabe quantos são;
- tentou-se tracejar as molduras no vazio com `.forma * { border-style: dashed }`, e isso acendeu
  borda de 3px em todo elemento que não tinha borda (o estilo `none` escondia a largura `medium`).
  Não voltar a isso: o vazio se distingue pela quietude e pela etiqueta.

O intervalo entre as partes do bloco virou token (`--bloco-gap`, em `.secao`), porque a forma do
molde precisa do mesmo respiro que o `.bloco`.

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
