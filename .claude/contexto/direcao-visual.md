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
  Música, a marca no fundo da ficha da Trajetória (5%), os anéis e a mira do HUD e a curva da onda de
  entrada da Trajetória.

### Cantos chanfrados

Todo retângulo de conteúdo com borda tem o canto **superior-esquerdo e o inferior-direito**
cortados em diagonal. Os outros dois seguem no raio de 2px de sempre — o chanfro em dois cantos
opostos dá direção ao bloco; nos quatro, a caixa vira um losango achatado e some a leitura de painel.

| Onde | Chanfro |
|---|---|
| `ProjectCard → .corpo` e `.canhoto` | 18px, um canto em cada peça |
| `PortraitCard → .carta` | 14px |
| `ChannelCard → .canal` | 14px |
| `DiplomaCard → .cracha` | 18px |
| `DiplomaCard → .selo` | 7px |
| `FilmsSection → .posto` | 6px |
| `FilmsSection → .poster` | 12px |
| `FilmsSection → .revisita` | 4px |
| `GamesSection → .destaque` | 14px |
| `GamesSection → .arte` | 12px |
| `GamesSection → .capa` | 12px |
| `MusicSection → .destaque` | 14px |
| `MusicSection → .capa` | 10px |
| `JourneySection → .seta` | 9px |
| `JourneyEntry → .chip` | 6px |
| `ModeHeader → .lista` | 6px |

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
Ficam **de fora**, e por motivo: os campos do formulário de contato (`.entrada`, `.enviar`) são um
sublinhado de 1px, não uma caixa — não há canto para chanfrar; e tudo que é círculo
(anéis do HUD, nós da linha do tempo, medidor da supernova).

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
aparelho. O sintoma que apareceu foi a seta da esquerda da Trajetória saindo com outra espessura em
alguns celulares e não em outros.

Desenhada, ela é traço de 1px, que é a régua do resto da página, e fica idêntica em todo lugar.
Também deixa de ter peso de texto, que é o que um glifo tem por definição.

**Só a rotação, nunca uma translação junto.** Composta depois do `rotate`, a translação vale no eixo
**local** do canto, que é oposto entre as duas pontas: o mesmo deslocamento sobe uma e desce a outra.
Foi assim que as setas das faixas nasceram desencontradas na vertical.

Onde a seta também se move, como a do botão de enviar do Contato, **são dois elementos**: o de fora
leva o avanço do `:hover` e o de dentro, a rotação. Dois `transform` no mesmo elemento se apagam, que
é a regra do `<g>` da curva da Trajetória.

Os lugares que a usam hoje são os passos da Trajetória (9px, num botão de 38px), as setas das
faixas de Jogos e Filmes (6px), o botão de enviar do Contato (6px), a seta de link externo dos canais de contato (6px, sem rotação nenhuma, que é como ela aponta para fora)
e o cabeçalho de modo
(4px, apontando para baixo e girando para cima quando o menu abre). A dos canais era o caractere
`↗`, que também não está em nenhum subconjunto servido: a cobertura foi conferida no
`unicode-range` do CSS da fonte, e `←`, `→` e `↗` não aparecem em nenhum. O do cabeçalho é uma cópia dos quatro
valores em `ModeHeader.module.css`, porque o HUD não importa nada das seções.

### A carta que inclina

Toda imagem enquadrada da página **inclina seguindo o ponteiro**, com um brilho especular
acompanhando o cursor: o retrato do Sobre, os crachás de formação, os pôsteres de Filmes, as artes de
Jogos e a capa do que está tocando em Música. O efeito nasceu no retrato e virou
`hooks/useInclinacao` quando passou a valer para os cinco, pela mesma razão que a gravidade e o
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
