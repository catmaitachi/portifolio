## Direção visual

- Preto profundo, **paleta estritamente monocromática** (preto/branco). Sem cor, sem gradiente
  colorido. A única exceção é o vermelho da marca UFMG, que é logo de terceiro.
- Estética sci-fi/HUD minimalista: linhas de 1px, tracejados finos, tipografia mono
  (IBM Plex Mono 200/300/400).
- Tudo sutil. A intensidade foi reduzida várias vezes na fase de design (nebulosa, halo, borda do
  horizonte) — ao mexer nesses valores, mexer para baixo.
- **O céu é brilho, não ponto.** Cada estrela é um núcleo aceso dentro de um halo fraco, assado a
  partir do shader que serviu de referência (ver `motor.md`). A regra acima vale em dobro aqui: um
  halo cobre muito mais tela que um ponto de 1px, e a primeira calibragem chegou a 4,7% de
  luminância média — uma parede de bolhas, com o preto profundo virado cinza. Hoje são 0,09%. Se o
  fundo voltar a clarear, o botão é `GLOW_ALPHA` em `engine/star.ts`, e depois dele a densidade
  do `Starfield`.

### Cantos chanfrados

Todo retângulo de conteúdo com borda tem o canto **superior-esquerdo e o inferior-direito**
cortados em diagonal. Os outros dois seguem no raio de 2px de sempre — o chanfro em dois cantos
opostos dá direção ao bloco; nos quatro, a caixa vira um losango achatado e some a leitura de painel.

| Onde | Chanfro |
|---|---|
| `ProjectCard → .cartao` | 18px |
| `PortraitCard → .carta` | 14px |
| `ChannelCard → .canal` | 14px |
| `DiplomaCard → .cracha` | 18px |
| `DiplomaCard → .selo` | 7px |
| `FilmsSection → .posto` | 6px |
| `JourneySection → .seta` | 9px |
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
- **A borda de 1px acompanha o corte sozinha**, e o mesmo vale para `border-style: dashed` (vaga,
  pretensão, canal sem `url`) e para o `overflow: hidden` do cartão e do retrato. Nada disso
  precisou de regra extra.

Ficam **de fora**, e por motivo: os campos do formulário de contato (`.entrada`, `.enviar`) são um
sublinhado de 1px, não uma caixa — não há canto para chanfrar; os marcadores geométricos do
`ProjectCard` (`.glifo`) são ornamento com raio e rotação próprios por índice; e tudo que é círculo
(anéis do HUD, nós da linha do tempo, medidor da supernova).

### A carta que inclina

Toda imagem enquadrada da página **inclina seguindo o ponteiro**, com um brilho especular
acompanhando o cursor: o retrato do Sobre, os crachás de formação, os pôsteres de Filmes, as artes de
Jogos e a capa do que está tocando em Música. O efeito nasceu no retrato e virou
`hooks/useInclinacao` quando passou a valer para os cinco, pela mesma razão que a gravidade e o
desenho da estrela moram num módulo só no motor: cinco cópias do mesmo rAF sairiam de sincronia na
primeira calibragem.

Quatro coisas nele não são detalhe:

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
  de pôsteres passaria por cima de vários cartões levantando cada um pelo caminho.

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
