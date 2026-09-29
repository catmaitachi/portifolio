---
paths:
  - "**/*.css"
  - "src/hooks/useInclinacao.ts"
  - "public/**"
  - "index.html"
---

## Direção visual

- Preto profundo, **paleta estritamente monocromática** (preto/branco). Sem cor, sem gradiente
  colorido. As exceções são identidade de terceiro: as capas, artes e pôsteres das seções de dado
  remoto.
- Estética sci-fi/HUD minimalista: linhas de 1px, tracejados finos, tipografia mono
  (IBM Plex Mono 300/400).
- Tudo sutil. A intensidade foi reduzida várias vezes na fase de design (nebulosa, halo, borda do
  horizonte) — ao mexer nesses valores, mexer para baixo.
- **O céu é brilho, não ponto.** Cada estrela é um núcleo aceso dentro de um halo fraco, assado a
  partir do shader que serviu de referência (ver `motor.md`). A regra acima vale em dobro aqui: um
  halo cobre muito mais tela que um ponto de 1px, e a primeira calibragem chegou a 4,7% de
  luminância média — uma parede de bolhas, com o preto profundo virado cinza. Hoje são 0,09%. Se o
  fundo voltar a clarear, o botão é `GLOW_ALPHA` em `engine/star.ts`, e depois dele a densidade
  do `Starfield`.

### A direção cinematográfica: Travelling, com os detalhes da Exposição

Escolhida numa rodada da skill `creative-block` (preview com três direções rodando, a mistura por
slot foi do Lucas). O mundo não mudou: cena espacial, supernova, preto e branco e a gramática
mono/HUD continuam. O que mudou foi a **encenação**, e ela tem uma física só: **a câmera anda no eixo
da profundidade**. Os padrões abaixo valem para o que existe e para o que for escrito depois.

| Slot | Padrão | Onde mora | Referências |
|---|---|---|---|
| abertura | a câmera sai de dentro do buraco negro e as letras do nome chegam do fundo, do desfoque ao foco, o meio primeiro | `stage.camera.zoomOut` e `HeroSection` (`letraChega`) | getlayers/Flora, reactbits/BlurText |
| tipografia | texto que entra vem da profundidade: pequeno (ou grande, se é letra), fora de foco e apagado, e assenta; nunca desliza de baixo | `.bloco` em `section.module.css`, `.letra` no Início | reactbits/BlurText, reactbits/SplitText |
| rolagem | rolar a tela empurra a câmera pelo campo de estrelas, e as seções de uma pilha chegam da profundidade ao aparecer | `scene/camera.ts`, `Starfield`, `Tela` | getlayers/Flora, magicui/floating-3d-particles |
| troca de tela | um salto: as estrelas viram riscos radiais, o campo de visão abre, um clarão curto; a tela que sai passa pela câmera e a que chega vem do fundo | `stage.camera.saltar`, `Tela.module.css` | reactbits/Hyperspeed |
| detalhes | luz rasante: um fio de luz corre pela borda do cartão seguindo o cursor (**sem uso hoje**: saiu com o bilhete de projeto) | estava em `components/LuzRasante` | magicui/magic-card |
| vitrines | as capas e os projetos se mostram em moldura; apontar uma capa a traz para o foco e apaga as outras; o site de um projeto é uma foto que vira o site ao vivo num clique | `MusicSection`, `Projeto` | aceternity/focus-cards, magicui/safari, aceternity/link-preview |

Cinco regras decorrem disso:

- **nada entra deslizando.** Uma entrada nova chega da profundidade (escala + desfoque + opacidade),
  com `--ease-entrada` e `backwards`. Distância de entrada continua acompanhando o tamanho: as letras
  vêm de 1,9×, um bloco de 0,86×;
- **movimento de câmera é do motor, nunca do CSS.** O que a câmera faz com o céu passa por
  `scene/camera.ts`; o CSS só acompanha o conteúdo (a tela que sai e a que chega);
- **a luz rasante é para cartão com moldura que não é imagem.** Ela vivia no bilhete de projeto, e
  saiu com ele: a vitrine de hoje mostra a foto do site, e numa imagem a borda só tem cor quando a
  imagem não veio (ver adiante), e a luz a reacenderia. Se voltar, é para um cartão de texto;
- **sem textura por cima da página.** O grão de filme da direção Exposição entrou e saiu: a
  superfície é preto limpo;
- **clarão de tela cheia é fraco e único.** O do salto passa de 10% de branco só no auge; um corte com
  flash forte ou repetido é risco para quem tem fotossensibilidade, e foi descartado no preview.

### Padrões escolhidos na rodada de 27/09/2026 (Contato, Jogos, Filmes e Carreira)

Escolhidos numa rodada da skill `inspiration` (vitrine com três direções por seção, a mistura foi do
Lucas). Continuam na física da Travelling: nada entra deslizando, e o que se move anda na
profundidade ou se enche de luz.

| Seção | Padrão | Onde mora | Referências |
|---|---|---|---|
| Contato | cartaz: o título em contorno gigante **se enche de baixo para cima conforme a mensagem cresce** (o título é o medidor); o endereço copia ao clique; o formulário é uma frase para completar | `ContactSection` | animata/metis-text, reactbits/CountUp |
| Jogos | deque em profundidade: as capas recuam no eixo z, a da frente em cor e em foco, as de trás apagam e desfocam pela distância; arraste, setas e passos | `GamesSection` (`Deque`) | reactbits/DepthCarousel, cultui/three-d-carousel |
| Filmes | créditos: o título em contorno que se enche ao ser apontado, e o pôster que segue o cursor, inclinado pela velocidade | `FilmsSection` | aceternity/link-preview, animata/reveal-image |
| Carreira | órbita: cada experiência é um corpo que gira **sobre a linha** de uma elipse vista de lado; escolher traz o corpo para a frente pelo caminho da órbita | `Orbita`, `orbitaGeometria` | animata/orbiting-items-3-d |

Quatro regras saíram da rodada (a do `@property`, de um defeito achado depois) e valem para o que
vier depois:

- **o que anda num traço é calculado pela mesma conta que desenha o traço.** A primeira órbita
  inclinava um círculo de CSS e posicionava os corpos por uma elipse à parte, e eles não caíam na
  linha; a curva da Carreira que existiu antes já seguia a regra;
- **encher é preenchimento de corte seco, não degradê de cor.** O título do Contato, o endereço, o
  envio e os títulos de Filmes usam `background-clip: text` com um degradê branco/transparente de
  corte seco, cuja posição anda. O hook de design do Impeccable o aponta como "gradient text", e a
  exceção está gravada em `.impeccable/config.json` por arquivo (Contato, Filmes e o idioma do menu
  de opções);
- **`@property` é global, então o nome registrado é único no site.** O CSS Modules não escopa o
  registro. O título do Contato registrava `--cheio` com `inherits: false`, e a nota de Filmes, que
  passa uma variável com o mesmo nome da marca para o preenchimento, parou de herdá-la: toda nota
  aparecia vazia. Hoje o do Contato é `--grito-cheio`;
- **uma última seção curta precisa poder chegar ao topo** (ver `navegacao.md`): o Contato ficava
  encostado embaixo quando era o foco.

### Padrões escolhidos na rodada de 29/09/2026 (GitHub e menu de opções)

| Onde | Padrão | Referências |
|---|---|---|
| GitHub, o ano | céu de estrelas que um feixe de luz acende; apontar mostra o dia com um risco-guia | reactbits/DotGrid, cultui/lightboard, animata/animated-beam |
| GitHub, os números | um número grande em contorno que se enche de luz enquanto conta, e a ficha pontilhada ao lado | animata/metis-text, magicui/number-ticker |
| GitHub, as linguagens | nuvem de ícones numa esfera que gira, a escolhida vem para a frente e acende; ao lado, um cabeçalho fixo e uma grade de chips iguais | magicui/icon-cloud, reactbits/GlideSelect |
| menu de opções | ver `hud.md` | |

Quatro regras gerais saíram das observações da rodada: **arrastar gira na direção da mão**, **o item
escolhido se destaca no próprio lugar** (e não só num painel ao lado), **um painel de detalhe tem
medida fixa**, sem mudar de largura a cada escolha, e **os blocos empilhados de uma seção têm a mesma
largura**: o que cresce para preencher é o espaço interno, e não o objeto.

### Tokens: a régua é uma só

Cor, tipo e tempo moram em `:root`, no `reset.css`, e os módulos escolhem um degrau. Antes cada
módulo escrevia o seu número: eram cerca de quarenta níveis de branco só para texto, seis curvas de
tempo e sete tamanhos de rótulo entre 7px e 9,5px, com diferenças que ninguém via e que só serviam
para sair de sincronia.

| Família | Tokens |
|---|---|
| texto | `--tx-titulo` (#fff), `--tx-hover` 90%, `--tx-forte` 82%, `--tx-corpo` 66%, `--tx-apoio` 50%, `--tx-rotulo` 40%, `--tx-apagado` 32%, `--tx-marcador` 24% |
| linha | `--linha-sutil` 10%, `--linha` 14%, `--linha-forte` 24%, `--linha-acesa` 36%, `--linha-foco` 55%, `--linha-cheia` 78%, e o fundo `--fundo-sutil` 4% |
| tipo | `--fs-micro` 7,5px, `--fs-rotulo` 8,5px, `--fs-meta` 9px, `--fs-controle` 10px, `--fs-pequeno` 11px; fluidos `--fs-lista`, `--fs-corpo` e `--fs-destaque`; versalete `--ls-rotulo` (.28em) e `--ls-etiqueta` (.22em) |
| tempo | `--dur-hover` .35s, `--dur-retorno` .55s, `--ease-saida` (toda transição) e `--ease-entrada` (toda entrada) |
| abertura | `--abertura-*`, o cronograma inteiro (ver `hud.md`) |
| HUD | `--hud-borda` e `--hud-fundo`, os recuos das peças (ver `responsivo.md`) |

Três regras decorrem disso:

- **Os nomes dizem o papel.** Um rótulo novo usa `--tx-rotulo`, sem escolher um número. É o que deixa
  o `prefers-contrast: more` subir todos os textos redefinindo só os tokens (ver
  `acessibilidade.md`).
- **O estado muda pela cor quando o elemento é texto ou desenho em `currentcolor`**, e pela
  opacidade só quando é imagem. O menu de seções era as duas coisas ao mesmo tempo, uma cor a 55%
  num elemento a 50%, e ficava em 27% de branco por um caminho que nenhuma outra peça usava.
- **Fica fora da régua o que tem motivo próprio escrito onde está**: o degradê do nome e da barra de
  Música, os anéis e a mira do HUD.

### Cantos chanfrados

Todo retângulo de conteúdo com borda tem o canto **superior-esquerdo e o inferior-direito**
cortados em diagonal. Os outros dois seguem no raio de 2px de sempre — o chanfro em dois cantos
opostos dá direção ao bloco; nos quatro, a caixa vira um losango achatado e some a leitura de painel.

| Onde | Chanfro |
|---|---|
| `Projeto → .vista` (a janela do site) | 18px |
| `Projeto → .topicos li` | 5px |
| `PortraitCard → .carta` | 14px |
| `FilmsSection → .flutuante` (o pôster que segue o cursor) | 12px |
| `GamesSection → .arte` (as capas do deque) | 12px |
| `MusicSection → .capa` (o destaque) | 12px |
| `MusicSection → .faixaLink` (a parede de capas) | 12px |
| `section.module.css → .passo` (os passos de Jogos e da Carreira) | 9px |
| `JourneyEntry → .chip` | 6px |

O tamanho acompanha o elemento: um chanfro fixo lê como recorte de canto num cartão grande e como
caixa amassada num chip de 21px de altura. **Nunca passar de metade do lado menor.**

A implementação é `corner-shape: bevel` + `border-radius: <chanfro> 2px`, dentro de um
`@supports (corner-shape: bevel)`. Três coisas decorreram disso e não devem ser desfeitas:

- **`clip-path` foi descartado.** Ele corta o elemento inteiro, e o `:focus-visible` do projeto tem
  `outline-offset: 3px` — o contorno de foco fica *fora* do border-box e seria apagado por completo.
  Um portfólio que perde o foco de teclado para ganhar um canto bonito trocou a coisa errada.
- **O `@supports` não é enfeite.** Sem ele, um navegador sem `corner-shape` aplicaria o
  `border-radius` grande e mostraria cantos bem arredondados — o oposto da estética de linha reta.
  Dentro do `@supports`, quem não tem a propriedade fica com os 2px de hoje.
- **A borda de 1px acompanha o corte sozinha**, e o mesmo vale para `border-style: dashed` (canal
  sem `url`) e para o `overflow: hidden` do cartão e do retrato. Nada disso precisou de
  regra extra.
Ficam **de fora**, e por motivo: os campos do formulário de contato (`.nome`, `.mensagem`) são um
risco de 1px, não uma caixa — não há canto para chanfrar; e tudo que é círculo
(anéis do HUD, corpos da órbita da Carreira, medidor da supernova).

### A moldura da imagem é espaço reservado, não enfeite

Toda imagem enquadrada da página mora dentro de uma caixa com borda de 1px, e **a borda só tem cor
quando a imagem não veio**. Ela existe para o caso em que não vem: o endereço da arte da Steam é
perguntado a cada resposta, o Letterboxd tem filme sem pôster, e sem a moldura o que sobraria é o
ícone de imagem quebrada do navegador, a única coisa fora da paleta na página inteira.

Sobre a arte, ela não estava reservando nada. Era um fio branco em volta de toda imagem da página, e
num conjunto de capas coloridas isso lê como recorte mal feito, não como moldura.

Três coisas na implementação, e nenhuma é detalhe:

- **a borda continua declarada e só perde a cor**, então a caixa não muda de tamanho e nada em volta
  se mexe quando a imagem chega;
- **o fundo sai junto.** Com `background-clip: border-box`, que é o padrão, ele pintaria a faixa de
  1px que a borda transparente deixou ver, e o fio voltaria mais fraco;
- **o `:hover` não pode reacender a borda.** Onde ele fazia isso, o que sobrou foi a opacidade, que é
  o que já distinguia o cartão apontado.

A pergunta é feita pelo próprio elemento, com `:has(img:not([hidden]))`. O estado que interessa é "a
imagem chegou", e ele não existe no React: quem o produz é o `onError` da `<img>`, escrevendo
`hidden` no nó.

### Seta é desenho, nunca caractere

Toda ponta de seta da página é um quadrado com borda em dois lados adjacentes, girado
(`.ponta`, em `sections/section.module.css`, com o tamanho por `--ponta`). Nenhuma delas é um glifo,
e isso não é gosto: **o subconjunto de IBM Plex Mono que o Google Fonts serve não traz `U+2190` nem
`U+2192`**, as setas para a esquerda e para a direita. Traz `U+2191` e `U+2193`, as verticais, o que
torna a falta especialmente fácil de não notar.

O que acontece com o que falta é substituição por fonte de sistema, e ela é **por caractere**: as
duas setas do mesmo par podem nem vir da mesma fonte, e qual fonte é isso muda de aparelho para
aparelho. O sintoma que apareceu foi a seta da esquerda da Carreira saindo com outra espessura em
alguns celulares e não em outros.

Desenhada, ela é traço de 1px, que é a régua do resto da página, e fica idêntica em todo lugar.
Também deixa de ter peso de texto, que é o que um glifo tem por definição.

**Só a rotação, nunca uma translação junto.** Composta depois do `rotate`, a translação vale no eixo
**local** do canto, que é oposto entre as duas pontas: o mesmo deslocamento sobe uma e desce a outra.
Foi assim que as setas das faixas, que existiram em Jogos e Filmes, nasceram desencontradas na
vertical.

Onde a seta também se move, como a do botão de enviar do Contato, **são dois elementos**: o de fora
leva o avanço do `:hover` e o de dentro, a rotação. Dois `transform` no mesmo elemento se apagam, que
é a mesma regra que põe a entrada das capas do deque no miolo, e não na capa.

Os lugares que a usam hoje são os passos de Jogos e da Carreira (9px, num botão de 38px), o botão de
enviar do Contato (9px) e a seta de link externo dos canais de contato (6px, sem rotação nenhuma, que
é como ela aponta para fora); já foi usada nas faixas de Jogos e Filmes e no seletor de lado que o
cabeçalho substituiu. A dos canais era o caractere
`↗`, que também não está em nenhum subconjunto servido: a cobertura foi conferida no
`unicode-range` do CSS da fonte, e `←`, `→` e `↗` não aparecem em nenhum. Uma ponta no HUD é uma
cópia dos quatro valores, e não um import: o HUD não importa nada das seções.

### A carta que inclina

Toda imagem enquadrada da página **inclina seguindo o ponteiro**, com um brilho especular
acompanhando o cursor: o retrato do dossiê e a capa do que está tocando em Música. Os pôsteres de
Filmes e as artes de Jogos também inclinavam, e deixaram de inclinar quando as duas seções mudaram
de forma (o deque já move as capas em profundidade, e o pôster de Filmes segue o cursor inclinado pela
velocidade). O efeito nasceu no retrato e virou
`hooks/useInclinacao` quando passou a valer para cinco, pela mesma razão que a gravidade e o
desenho da estrela moram num módulo só no motor: cinco cópias do mesmo rAF sairiam de sincronia na
primeira calibragem.

Seis coisas nele não são detalhe:

- **a entrada é uma rampa.** Na primeira versão o primeiro `pointermove` já escrevia a inclinação
  cheia e a escala cheia, e como só a sombra tinha transição o elemento saltava do repouso para o
  máximo em um quadro. Hoje um fator vai de 0 a 1 em 320ms e multiplica os três valores, com curva
  suave nas duas pontas. A rampa **precisa** viver no rAF: uma `transition` de `transform` também
  suavizaria o retorno de cada micromovimento do cursor, e a inclinação deixaria de colar nele;
- **os graus caem com o tamanho.** 15° num retrato de 270px lê como carta na mão; os mesmos 15° num
  crachá de 348px de altura leem como página virando, e num pôster de 104px o cartão vira losango.
  O raio do brilho segue a mesma régua, por `--brilho-r`;
- **quem cresce precisa de por onde crescer.** Duas coisas cortam a borda de um cartão que se
  levanta, e as duas já morderam: um ancestral com `overflow` (a faixa de Filmes, que rola de lado, e
  o palco de Formação, que corta o que passa) e a **ordem de pintura** entre irmãos, porque um
  elemento com `transform` cria contexto de empilhamento mas continua sendo pintado na ordem do DOM.
  A primeira se resolve com recuo mais margem negativa, que abre folga sem mexer no layout; a
  segunda com `position: relative` e `z-index` no item apontado. `z-index` sozinho não resolve a
  primeira, e recuo sozinho não resolve a segunda;
- **toque não inclina.** Sem `hover` não há de onde o efeito nascer, e o dedo que arrasta uma faixa
  de pôsteres passaria por cima de vários cartões levantando cada um pelo caminho;
- **a transição de retorno é do CSS, e o hook só a desliga.** Cada cartão declara
  `transform var(--inclina-t, var(--dur-retorno)) var(--ease-saida)`, e com o ponteiro em cima o hook
  escreve `--inclina-t: 0s`. Ele já escreveu a `transition` inteira no `style`, e isso apagava as
  outras transições do cartão: depois do primeiro hover, a opacidade dos pôsteres e das capas passava
  a saltar em vez de acender;
- **sem `will-change`.** Uma transformação 3D ganha camada própria quando acontece. Declarada o tempo
  todo, a promessa reservava uma camada de GPU para cada cartão da página, em todas as seções
  montadas, e o celular pagava por todas sem nunca inclinar nenhuma. O `preserve-3d` saiu junto: com
  `overflow: hidden`, que todo cartão inclinável tem, o navegador já o trata como `flat`.

A sombra é ligada **só no retrato**: ele tem tamanho para mostrá-la, e nos cartões pequenos, sobre
preto, ela é um borrão que não se vê.

### Ícone da aba

`public/favicon.svg` — a cena da página reduzida a 32px: horizonte de eventos preto com borda
branca, uma órbita inclinada com duas estrelas e um punhado de estrelas soltas ao fundo. Preto e
branco, como o resto.

**Sem fundo.** O único preto do ícone é o miolo do horizonte; o resto é transparente e a barra de
abas aparece por trás. A consequência é que num tema de aba claro sobra só o disco preto — o anel e
as estrelas são brancos e somem. É a leitura desejada: o buraco negro continua sendo a forma, e o
campo estelar é o detalhe que se vê no tema escuro.

O `viewBox` é **32** para que as espessuras caiam em pixel inteiro quando a aba desenha a 16px — o
traço de 2 do horizonte vira 1px real. A órbita é desenhada **antes** do disco e some atrás dele no
meio: sobram as duas asas laterais, que é como um disco de acreção se lê quase de perfil.

SVG só, sem `.ico` nem PNG: é o formato que todos os navegadores atuais aceitam e o único que não
precisa de uma segunda cópia do desenho para manter em sincronia. No `index.html` o `href` é
**relativo** (`./favicon.svg`), como o `base: './'` do Vite — o portfólio também roda em subpasta.
