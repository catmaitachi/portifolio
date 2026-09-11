## HUD

Diâmetro `82.35vmin`, calculado para que o **anel interno (inset 33%) coincida com o horizonte**
(28vmin). Quatro anéis: inset 33% / 20% / 9% / 0, girando alternadamente em 60s / 96s / 150s
(o externo é estático — é a referência parada contra a qual os outros se movem).

Cronograma da abertura. Os instantes moram **num lugar só**, os `--abertura-*` do `reset.css`, e o
zoom é `DURACAO.cameraZoom`, em `scene/scenePlan.ts`:

1. `0–1.2s` zoom out (canvas)
2. `0.75–1.7s` anéis se formam **de baixo para cima**, do interno ao externo, 0.12s entre eles
   (`ringIn` com `clip-path`), começando enquanto o zoom termina
3. `1.35s` mira (4 ticks cardinais) surge com `miraIn` e, assentada, passa a pulsar em cascata

Na página: etiqueta 1.2s, nome 1.35s (`tituloIn`: borrão + `letter-spacing` fechando), legenda
1.85s, menu 2.15s, cabeçalho de modo 2.2s, crédito 2.3s, seletor de idioma 2.4s e versão 2.5s. A
aparição comum das peças do HUD dura `--abertura-fina` (0.8s).

**A abertura já levou o dobro.** A primeira versão punha o nome na tela aos 3,75s e só assentava aos
6,6s. O tempo morto estava entre o fim do zoom e o nome: os anéis se formavam um a um e só depois o
texto começava, e a câmera, com a curva de saída forte, já tinha andado 97% do caminho aos 60% do
tempo. Hoje o nome se forma enquanto os anéis terminam e tudo assenta em 3,3s, na mesma ordem de
antes. Mexer no ritmo é mexer nos tokens.

O cabeçalho chega **junto do menu** porque os dois são navegação: um decide o lado do site, o outro a
seção dentro dele. Terminada a cascata (`--abertura-fim`, 3,3s), o brilho do nome começa a passar
(ver `HeroSection`). A abertura acontece uma vez só: numa volta ao Início a cascata do nome se refaz
sem a espera do HUD, e o brilho entra em laço assim que o nome se forma (ver `entradas.md`).

Tudo em `transform`, `clip-path` e `opacity` = compositor da GPU. O crédito era a exceção: os riscos
cresciam em `width` e remontavam a linha a cada quadro, com o texto escorregando entre eles. Hoje
crescem em `scaleX`, como a régua do Início.

### Cabeçalho de modo

`ModeHeader` fica **centrado no topo**, e é um **menu**: recolhido mostra só o lado em vigor, um
clique abre o outro, o seguinte escolhe. Quem manda no que ele faz está em `navegacao.md`; aqui
ficam as decisões de HUD.

**No celular ele fica à esquerda, e o seletor de idioma continua à direita, como no desktop, na
mesma linha.** A frase do hover encosta à esquerda junto com o chip, senão a mais longa passaria da
tela numa janela estreita. Os dois já
estiveram empilhados no centro, o idioma em cima e o cabeçalho embaixo, porque o cabeçalho mostrava
os dois nomes lado a lado (218px numa tela de 375) e não cabia ao lado de mais nada. Recolhido, ele
mostra só o lado em vigor: o chip mede ~155px e o seletor ~68, e sobra mais de 100px entre os dois.
Lado a lado o topo voltou a ser uma linha só, e o conteúdo ganhou os ~32px que a pilha reservava. Os
dois usam o mesmo recuo de borda, `--hud-borda`, e espelham um ao outro em relação ao centro.
A posição do cabeçalho é token (`--cab-left`, `--cab-right`, `--cab-tx`), e a faixa do celular só
os redefine.

**O topo tem tokens, como o rodapé.** `--hud-topo-linha` é a altura de uma linha e
`--hud-topo-altura` é o que o HUD ocupa, uma linha em qualquer tela. O respiro que as seções
reservam sai dessa conta: um número solto de um dos lados sairia de sincronia com o outro, que é
exatamente o defeito que o rodapé já teve. O `--hud-topo-entre`, que separava as duas linhas da
pilha, saiu junto com ela.

**Só o lado em vigor aparece**, e isso não é economia de espaço. Os dois nomes lado a lado o tempo
todo seriam duas afirmações onde só uma é verdade, e no canto onde o olho cai primeiro isso disputa
com o nome da pessoa. Recolhido, o cabeçalho responde "você está no profissional"; aberto, pergunta.
O mesmo botão troca de papel conforme `aberto`, e o rótulo de acessibilidade troca com ele:
`aria-expanded` enquanto é gatilho, `aria-current` enquanto é opção.

**O lado em vigor fica sempre em cima**, por `order`. Sem isso o nome recolhido apareceria na posição
que a chave dele ocupa em `MODOS`, e ao abrir saltaria de lugar — que é exatamente o quadro em que o
olho está olhando para ele. O que está recolhido tem **altura zero**, não `display: none`: o menu abre
animado, e um elemento fora da árvore não tem de onde crescer.

**Apontar um nome revela uma linha sobre aquele lado.** Ali havia a lista de seções daquele modo, e
ela saiu: é informação que o menu de seções dá assim que a troca acontece, e repeti-la cobrava do
visitante ler cinco palavras para decidir uma coisa só. A frase responde a pergunta que ele de fato
tem, que é o que existe desse lado. Ela é o `aria-describedby` do botão, então quem não vê o hover
recebe a mesma informação ao chegar no nome.

**O topo ganhou um contrato, como o rodapé já tinha.** `--hud-topo-base`, `--hud-topo-altura` e
`--hud-topo` moram em `:root` (`reset.css`), e o `--pt` das seções é `max(--pt-livre, --hud-topo +
respiro)`. As media queries redefinem só `--pt-livre`: quem mexer na altura do cabeçalho mexe em um
número só, e as seções acompanham. Foi exatamente esse número solto em dois lugares que deixou o
conteúdo correr por baixo da barra do rodapé uma vez.

**As duas frases ficam montadas**, empilhadas numa célula de grade só. É isso que permite animar a
troca: uma frase que só existisse enquanto o seu nome estivesse apontado não teria de onde sair. A
célula tem a largura da mais longa, então nada salta.

**O lado de onde cada uma entra sai da posição em `MODOS`**, por `--lado`: a mostrada fica em zero e
as outras se deslocam pela diferença de índice. Ninguém escreve "direita" em lugar nenhum, e um
terceiro modo não pediria conta nova.

**Sem ponteiro não há frase** (`@media (hover: none)`): num aparelho de toque o menu é a interação
inteira, e um painel que abrisse no toque ficaria aberto cobrindo o topo da seção até o toque
seguinte. O que está recolhido também sai da tabulação, pela regra de sempre.

**O painel é `position: absolute`** para que a caixa do `<nav>` continue sendo só o menu. O cabeçalho
não é o canvas nem uma `<section>`, então pressioná-lo não acende supernova, e uma zona morta do
tamanho da frase, no canto onde o olho cai primeiro, seria zona morta o tempo todo. Ele fica em
`top: 100%` e **desce junto** quando o menu abre, porque quem cresceu foi a caixa do menu: a frase é
sobre o nome apontado e precisa continuar embaixo dele.

O menu aberto e a frase **não entram** em `--hud-topo-altura`: os dois são transitórios e passam por
cima do conteúdo, como qualquer menu. O que as seções reservam é a linha recolhida.

### Versão

`Version` fica no canto inferior direito, alinhada ao mesmo recuo do menu e do seletor
(`--hud-borda`). No mobile vai para o centro e encosta no rodapé, com o mesmo recuo de borda do
seletor de idioma no topo (`max(2.4vh, 20px)`) — os dois são espelho um do outro. O crédito não
disputa espaço ali: em ≤640px ele sai de cena, porque a faixa de baixo é do menu.

O número **não é uma string escrita no componente nem uma chave de dicionário**: vem do `version` do
`package.json` por `define` do Vite (`__VERSAO__`, tipado em `vite-env.d.ts`), reduzido a
`major.minor`. Publicar uma versão e exibir outra é uma divergência que ninguém percebe até
constranger. E ela fica fora do i18n de propósito: `v1.0` é dado, não texto — uma chave por idioma
só criaria dois lugares para errar.

### Crédito: escondido por visibilidade, nunca por `display: none`

Em ≤640px o crédito sai de cena — mas com `--credito-vis: hidden`, não com `display: none`. Um
elemento com `display: none` sai da árvore de renderização e leva a animação junto: ao voltar para
desktop (rotação, janela redimensionada, DevTools), `creditIn` recomeça do zero, e como ela tem
**o atraso da abertura com `both`** (eram 5,2s na época), o crédito ficava mais de cinco segundos invisível — o que na tela lê
como "não voltou mais".

`visibility: hidden` mantém o elemento na árvore: a animação corre escondida e o crédito reaparece
no mesmo quadro em que a faixa larga volta. A visibilidade já o tira do clique e da tabulação, então
não precisa de `pointer-events` extra.

A regra vale para qualquer coisa do HUD que entre por animação atrasada e suma numa media query.

### Medidor da supernova

`NovaGauge` fica no canto inferior esquerdo, com os mesmos recuos do menu e da versão
(`--hud-borda` e `--hud-fundo`; no mobile desce para `--hud-topo-base` e encosta na esquerda, no
mesmo recuo do cabeçalho de modo, onde não disputa
espaço com a versão centrada nem com a faixa do menu).

Só existe no DOM depois da primeira supernova, e `key={disparo}` é o que reinicia a animação a cada
estrela. A recarga inteira é CSS de duração `--recarga`; o perímetro do arco vem do componente
(`2π·r`), que é quem conhece o `r` do SVG.

**O número de segundos vem do disparo, não de uma constante.** A supernova tem três níveis de carga
e cada um cobra uma recarga própria; a cena avisa qual nível acendeu e o `App` lê a recarga daquele
nível na mesma `NOVA_NIVEIS` que o motor usa para cobrá-la. É o mesmo contrato de sempre, agora com
uma tabela no lugar de um número: o círculo precisa fechar exatamente quando o próximo disparo passa
a ser aceito.

O **nível** não aparece aqui. Ele se mostra na cena, sob o dedo que está carregando, que é onde o
visitante já está olhando — trazê-lo para o canto custaria um caminho novo entre o motor e o React
durante a carga, para dizer o que a tela já diz. `aria-hidden` porque não há informação ali: é o retorno
visual de um gesto de ponteiro, e nada existe só por esse caminho.

Detalhe que já custou uma iteração: a animação de saída usa `forwards`, **nunca `both`**. Com
`backwards`, ela aplicaria o próprio estado inicial durante os segundos de atraso e passaria por
cima da animação de entrada, que vem antes na mesma lista. Pelo mesmo motivo o núcleo acende ao
longo da recarga em vez de pulsar `infinite`: uma animação infinita continuaria rodando depois de o
medidor apagar, e ele fica no DOM até um próximo disparo que pode nunca vir.

### O cabeçalho já teve um convite, e ele saiu

O nome do lado do site não parece clicável, e por um tempo isso foi resolvido com estalos de luz que
acendiam sozinhos sob o nome alguns segundos depois do carregamento (`hud/Faiscas.tsx` e
`hud/useConvite.ts`, adaptados do `ClickSpark` do React Bits). O problema que eles respondiam
continua existindo; a resposta é que foi descartada, por decisão de quem escreve a página.

O que fica registrado, para o caso de o assunto voltar, é **por onde ele não deve voltar**: um efeito
que se repete em laço no canto onde o olho cai primeiro compete com o conteúdo em todo ciclo, e não
tem como parar de competir, porque insistir era justamente o que o fazia funcionar. Uma segunda
tentativa precisa mudar o cabeçalho, e não acrescentar movimento em volta dele.

### O que respondeu: moldura e ponta

A segunda tentativa mudou o cabeçalho, como a regra acima pedia. O nome ganhou duas coisas, e as
duas são paradas:

- **uma moldura de 1px com chanfro**, no `.lista`. Solto, em versalete espaçado, o nome tinha o mesmo
  desenho da etiqueta e da legenda do Início, que são texto. O contorno é a gramática dos chips e dos
  cartões da página, e é também a caixa do menu: ao abrir, ela cresce junto com a segunda opção,
  porque as duas moram dentro dela. Apontar ou abrir acende a borda de `--linha` para `--linha-acesa`
  (14% e 36%). Ela já foi 22% em repouso com o nome em branco cheio, e o chip disputava o olho com o
  conteúdo logo abaixo; hoje o nome em vigor fica em `--tx-corpo` (66%) e sobe para `--tx-hover`
  (90%) ao ser apontado;
- **uma ponta para baixo**, desenhada, dentro do botão do lado em vigor. Aberto, ela gira para cima. O
  ajuste vertical que o V pede sai de `margin-top`, nunca de uma translação somada ao `rotate` (ver
  `direcao-visual.md`), e o recuo do `.modo` é igual dos dois lados, então o nome continua centrado
  na moldura com ou sem ponta.

A moldura soma 2px, e o `.modo` desconta isso da própria altura: a linha continua medindo
`--hud-topo-linha`, que é o que as seções reservam.

**Os botões têm a largura da moldura, e o nome se centra dentro deles** (`align-items: stretch`
no `.lista`, `justify-content: center` no `.modo`). A moldura mede o nome mais longo mesmo
recolhida, porque altura zero não tira largura, e com os botões centrados na moldura o de
"Pessoal" media só o próprio texto. As sobras dos dois lados eram da `.lista`, desenhadas como
parte do chip e mortas ao clique.

**A linha do topo passou de 21 para 26px por causa da moldura.** Com 21px o texto de 10px ficava
encostado nos dois fios e o chip lia apertado. O seletor de idioma se centra na mesma altura
(`height: var(--hud-topo-linha)`), senão no desktop, onde os dois dividem a linha, o idioma ficaria
alto em relação ao cabeçalho. O recuo horizontal do `.modo` também subiu, para 28px, e o da esquerda
leva o `letter-spacing` a mais, porque ele entra também depois da última letra e deslocaria o nome
para a esquerda dentro da moldura.

### O HUD não tem notificação, e a página não tem pop-up

Existiu aqui um `Notice`, um painel no canto superior esquerdo que sugeria a supernova a quem ainda
não a tinha descoberto, e ele **saiu**. A regra que ficou no lugar dele vale para a página inteira:
**nada de conteúdo oculto e nada de pop-up**. O que a página tem para dizer está escrito nela.

A supernova continua sendo a única coisa que ninguém descobre lendo, e essa era a razão do aviso. A
troca foi deliberada: um painel que aparece sozinho sobre o conteúdo, com um botão para dispensá-lo,
custa mais à leitura da página do que a descoberta que ele entregava. Quem clicar no vazio a encontra
como sempre encontrou, e o anel de recarga continua explicando o que aconteceu.

Sai junto disso o `localStorage` da descoberta (`portfolio.nova`): não havia mais nada para lembrar.

### `@keyframes` vive no módulo que o usa

**Nunca declarar `@keyframes` num CSS global para usá-lo de dentro de um `.module.css`.** CSS Modules
escopa os **dois** lados — o nome no `@keyframes` *e* o nome escrito em `animation`. Um keyframe
global chamado `fina` nunca casa com o `_fina_a1b2c_1` que o módulo passa a pedir: a animação
simplesmente não roda, sem erro de build e sem aviso no console.

Foi assim que a abertura inteira ficou morta por um tempo (anéis parados, mira sem pulso, crédito
descentralizado). `animation: :global(nome)` **não** é saída: o parser do PostCSS recusa o `:` no
valor. A saída é declarar o keyframe no próprio módulo — `fina` está duplicado em três (Hero,
NavMenu, LanguageToggle), e o brilho do nome está copiado em Música, onde a barra do que está
tocando usa a mesma varredura. Quatro linhas repetidas custam menos que uma animação que não roda,
e o que se compartilha nesses casos são os **números**, não a declaração.

Corolário: **layout não pode morar só no estado final de uma animação.** O crédito é centrado por um
`transform: translateX(-50%)` na própria regra, e os riscos já nascem com `width: 34px` — `creditIn`
e `creditLine` só refazem o caminho até lá. Quando a animação falhou, foi esse acoplamento que virou
um bug visível em vez de uma entrada mais seca.
