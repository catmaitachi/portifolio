## Seções e navegação

### São dois eixos, e eles não se misturam

O site tem **dois lados**, pessoal e profissional, e o cabeçalho no canto superior esquerdo é quem os
alterna. Ele **não substitui** o menu de seções: o cabeçalho decide o lado, o menu continua sendo as
seções daquele lado.

Ele é um **menu recolhido** — mostra só o lado em vigor, um clique abre o outro — e apontar um nome
revela uma linha sobre o que existe daquele lado. Os detalhes de por que assim estão em `hud.md`.

O modo é dado, não `if`: `shared.json → modos` traz, para cada um, as seções que ele tem e os canais
de contato que ele mostra. `secoesDoModo` e `canaisDoModo` (`content/index.ts`) são as duas portas, e
as duas devolvem sempre lista utilizável, porque a chave pode vir de um hash digitado errado ou de um
`localStorage` de uma versão anterior.

Três consequências que não são detalhe:

- **`SECOES` deixou de ser a ordem de rolagem** e virou a ordem canônica, a lista completa contra a
  qual as listas dos modos são conferidas (`check:i18n` reclama de chave que não existe ali, e
  também de canal que não existe em `canais`, que o TypeScript não pega porque chave de canal é
  `string`);
- **o JSX não pode mais listar as seções de cima para baixo.** `MONTAR`, no `App`, liga chave a
  componente, e a lista sai num `Fragment`. Nunca num elemento de embrulho: as seções precisam ser
  filhas diretas de `.rolagem` para o `scroll-snap` valer, e o filtro da supernova exige que o alvo
  do toque seja a caixa de uma `<section>`. Uma `<div>` no meio quebra os dois de uma vez, sem erro
  no console;
- **o número da seção saiu dos dicionários** e virou a posição na ordem em vigor. Escrito como texto,
  o lado pessoal leria 02, 05, 03.

**Trocar de modo mantém a seção quando ela existe do outro lado**, e vai para o Início quando não
existe. Quem está lendo o Sobre não deve ser jogado para o topo por ter trocado de lado. O destino
fica num ref e é alcançado num efeito de **layout**, nunca no mesmo passo do `setModo`: a rolagem
precisa que o contêiner já tenha as seções novas, senão o alvo cai fora da altura que existe e é
limitado.

### O endereço

`#personal/music`, lido e escrito por `navigation/useHashRoute.ts`. É hash e não caminho porque o
site é estático: um caminho de verdade exigiria o servidor devolvendo `index.html` para qualquer
rota, e o `base: './'` deixaria de valer.

**Os nomes no endereço são em inglês, e as chaves do projeto continuam em português.** As chaves são
a língua em que o código é escrito, e o conteúdo é bilíngue por dicionário; o endereço não é chave,
é a única parte da página que alguém lê **fora** do site — num link colado numa mensagem ou numa
candidatura —, e ali o inglês alcança os dois idiomas. Traduzir o slug por idioma seria pior: o mesmo
lugar teria dois endereços, e um link mudaria de sentido conforme a preferência de quem o abriu.

A tradução mora em `SLUG_MODO` e `SLUG_SECAO`, dois `Record` **totais** — uma seção ou um modo novo
quebra o build até ganhar nome no endereço.

- **modo entra por `pushState`, seção por `replaceState`.** Trocar de lado é navegação e o botão
  voltar deve desfazê-la; rolar não pode encher o histórico, senão voltar do Contato ao Início
  pediria cinco cliques;
- **nada é escrito quando o hash já diz o que se quer escrever**, e isso resolve sem sinalizador o
  caso de chegar por `popstate`: ali o hash já é o do destino, então não nasce uma entrada nova em
  cima da que o visitante acabou de alcançar;
- **a posição inicial é seca.** Abrir `#pessoal/contato` posiciona a página; animar faria a página
  desfilar por tudo que vem antes na frente de quem acabou de chegar. É o `suave: false` de `irPara`;
- **a página assume a restauração de rolagem** (`history.scrollRestoration = 'manual'`, no `main`).
  O navegador devolve a posição salva **depois** do carregamento, o que chega tarde: o endereço já
  disse em que seção a página abre, e a restauração passava por cima, deixando o React na seção certa
  e a rolagem no topo, com a tela mostrando uma seção inativa, isto é, vazia;
- **um alvo sem altura fica pendurado, não vira zero.** A posição de uma seção é
  `índice × clientHeight`, e num contêiner de altura zero isso dá zero para qualquer índice. Quando
  a viewport ainda não tem tamanho, `irPara` guarda o alvo e o aplica no primeiro `resize` que
  trouxer altura.

O modo também vai para o `localStorage` (`portfolio.modo`), como o idioma, mas **o hash ganha dele**:
um link recebido agora diz mais sobre a intenção de quem clicou do que a última visita. Ali a chave
é a de sempre (`pessoal`), não o slug: o armazenamento é interno, e traduzi-lo só criaria um segundo
vocabulário para manter em sincronia.

### O título da aba segue o endereço

`navigation/useDocumentTitle.ts`. A página é uma só e nunca recarrega, então sem ele a aba diria a
mesma coisa do começo ao fim, e quem abrisse dois lugares do site em duas abas não teria como
distingui-las. O histórico tem o mesmo problema: ele guarda o título de cada entrada, e são as trocas
de modo que viram entrada.

**No Início a parte é a etiqueta do modo, não o nome da seção.** "Início" não diz em que lado do site
alguém está, e é exatamente ali que os dois lados mostram a mesma seção com textos diferentes.

O texto sai do dicionário (`documento`), com marcador em vez de concatenação: inverter as duas
partes, ou trocar o separador, é editar uma string nos dois idiomas e não mexer em componente
nenhum. O `<title>` do `index.html` existe só até o React assumir, e traz o mesmo formato para o modo
padrão — assim não há um pisca de título na abertura.

### A rolagem

Contêiner `.rolagem` (fixo, `scroll-snap-type: y mandatory`, barra oculta) sobre o canvas; cada
seção tem `height: 100%` e `scroll-snap-align: start`. **Só ele rola** — o documento tem
`overflow: hidden`. O canvas e o HUD ficam fixos atrás.

Sobre, Formação, Projetos, Trajetória e Contato compartilham a mesma **composição aberta** (`section.module.css`,
puxada por `composes`): índice + risco, título grande, conteúdo sem moldura, bordas de 1px a 13% com
raio de 2px. Entram por opacidade + 26px de deslocamento quando a seção é a ativa.

`useSectionScroll(total)` lê o índice num rAF por rajada de scroll e só faz `setState` quando ele
**muda**. O total vem por parâmetro porque cada modo tem a sua lista, e ele é lido por ref: trocar de
modo não recria `irPara` nem faz o listener de teclado ser registrado de novo.
O teclado (↑/↓, PageUp/Down, Home/End) é global, mas **sai do caminho quando o foco está num campo
de texto** — senão a navegação roubaria o cursor do formulário de contato.

**Durante uma rolagem programática o índice fica travado no alvo.** A animação suave atravessa
fisicamente as seções do caminho, e sem a trava cada uma delas vira um `setIndice`: ir de Início a
Projetos publicava `1` no meio e `2` no fim. Isso não tinha efeito visível enquanto o menu apenas
destacava o item, e passou a ter quando a faixa do mobile começou a seguir o índice — ela corria até
a seção intermediária e voltava. A trava vale para os três caminhos de navegação, porque clique,
teclado e faixa passam todos por `irPara`. Ela tem prazo (`DESISTIR`): uma rolagem interrompida
nunca chega ao alvo, e sem o prazo o índice pararia de acompanhar a página para sempre.

### As setas horizontais são da seção ativa

↑/↓ são da rolagem; **←/→ são de quem está na tela**. Chegar em Projetos ou em Trajetória rolando
já habilita as setas — não há clique prévio, porque quem rolou até ali não tem foco em lugar nenhum
e a tecla morreria no vazio.

Isso vive num lugar só: `useArrowKeys(ativo, andar)` (`src/hooks/`), que registra o listener na
janela **enquanto a seção está ativa** e o remove ao sair. Duas seções nunca disputam a mesma tecla,
porque fora da seção o listener não existe.

Corolário: os componentes de dentro (o palco da órbita, a curva do tempo) **não tratam ←/→**. Eles
continuam focáveis e rotulados, mas um segundo handler local só criaria a chance de um passo duplo —
foi assim que a órbita ficou dependente de foco. As três seções que reivindicam ←/→ hoje são
Projetos, Trajetória e Formação, e nenhuma delas duplica o listener por dentro.

`editandoTexto()` — a regra de "aqui a seta é do cursor" — mora junto do hook, e tanto a rolagem
quanto as seções a usam. Duplicada, ela sairia de sincronia no dia em que um campo novo aparecesse.

Menu vertical à direita: rótulo + risco de 1px que cresce (12px → 34px) na seção ativa.

**No mobile é uma faixa rolável em que rolar é navegar.** A versão anterior media a posição do item
ativo e deslocava o nav inteiro por `transform` num `--navdx`: centralizava, mas a faixa era
intocável, e o que saísse da tela só voltava navegando. Com `overflow-x` o dedo alcança qualquer
item, a inércia vem de graça, e a centralização do ativo passa a ser um `scrollTo` — a mesma medida
de antes (`offsetLeft`/`offsetWidth`, coordenadas de layout que não mudam com o `scrollLeft` que o
efeito escreve), agora aplicada ao eixo de rolagem em vez de a um transform.

**A ligação vale nos dois sentidos**, e é o que faz a faixa ser um controle e não um indicador:
trocar de seção recentraliza a faixa, e rolar a faixa rola a página.

**E é contínua, não por saltos.** Enquanto o dedo arrasta, a posição da faixa vira uma **fração de
seção** e a página é levada até ali no mesmo quadro: 1,6 são seis décimos do caminho entre a segunda
e a terceira seção. É daí que sai a simultaneidade entre o gesto lateral, a rolagem vertical e o
rótulo que acende — o índice continua saindo do `scrollTop` da página, que agora acompanha o dedo,
então o destaque não precisou de caminho novo.

Os encaixes **não são igualmente espaçados**, porque os rótulos têm larguras diferentes; a conversão
procura o par de encaixes que contém a posição atual e interpola entre os dois índices.

**O `scroll-snap-type: y mandatory` do `.rolagem` sai enquanto o gesto dura.** Com ele, toda posição
fracionária é puxada de volta para a seção mais próxima e a rolagem contínua simplesmente não
existe. Ele volta no fim do gesto, e a ordem ali importa: a posição final é escrita **antes** de o
snap voltar. Religado primeiro, é o navegador quem escolhe a seção mais próxima, e ela pode não ser
a que o gesto escolheu — os dois encaixes, o da faixa e o da página, divergiriam justamente quando o
dedo para no meio do caminho.

O risco de tudo isso é a realimentação, porque as duas pontas escrevem uma na outra. Três regras
sustentam a separação, e nenhuma é dispensável:

- **enquanto o gesto corre, a faixa manda**: o efeito que a centraliza fica suspenso. Sem isso o
  índice muda no meio do arraste, o efeito dispara um `scrollTo` na faixa e briga com o dedo;
- **a rolagem provocada pelo próprio componente é marcada**, e não vira gesto;
- **a marca só é posta quando o `scrollTo` de fato move alguma coisa.** Posta sobre uma rolagem de
  zero, ela não teria evento nenhum para consumi-la e ficaria pendurada, engolindo o gesto seguinte
  do visitante. É o caso comum: o `snap` costuma deixar o item já centralizado.

**O início e o fim do gesto vêm de sinais diferentes**, e a assimetria foi paga com um bug. O
**início** é scroll que não é programático, para que trackpad, roda com shift e teclado entrem pelo
mesmo caminho. O **fim** precisa do ponteiro.

Decidir o fim só pelo repouso da faixa parece a simplificação óbvia, e é ela que quebra: um arraste
real está cheio de pausas de mais de 140ms, porque o dedo desacelera, inverte a direção ou
simplesmente segura. Cada pausa dessas era lida como gesto terminado, a página encaixava na seção
mais próxima e o `scroll-snap` voltava **no meio do movimento** — e o visitante via a página pular
sozinha, em todas as seções, em toda passagem. Com o dedo na tela o gesto não termina, por mais
parada que a faixa esteja.

**E o dedo tem de ser ouvido por eventos de touch, não de pointer.** Pointer events não acompanham
um gesto de rolagem: assim que o navegador assume o toque para rolar, ele dispara `pointercancel` e
nunca manda o `pointerup`. Com eles, o dedo era dado como retirado no primeiro milímetro de arraste
e o bug voltava inteiro, agora disfarçado de correção. `touchend` sobrevive ao scroll e chega quando
o dedo sai de verdade.

O gesto **começa na faixa e termina na janela**: `touchstart` no nav, `touchend` em `window`. A
faixa tem cerca de 44px de altura e um arraste horizontal sai dela pela borda com facilidade;
ouvindo o fim só no nav, soltar um dedo que já saiu deixaria o gesto aberto para sempre, a página
sem snap e sem assentar.

Quem rola sem tocar (roda do mouse, trackpad, teclado) nunca liga essa marca, e para esses o repouso
da faixa continua sendo o fim do gesto: não há o que segurar.

**O assentamento desliza, não salta.** Soltar a 2,4 são quatro décimos de tela, e escrevê-los de uma
vez lê como falha em vez de encaixe. O `scroll-snap` volta só depois que a rolagem chega
(`ASSENTAR`), e como o destino já é um snap point exato, devolvê-lo não move mais nada. Um gesto
novo no meio dessa espera cancela o timer, em `seguirFracao`, então os dois nunca se atropelam.

**Os rótulos aparecem no mobile, e é isso que dá o que rolar.** Enquanto eles ficavam ocultos, a
faixa eram cinco riscos de 12px somando 172px: a rolagem existia no CSS e não tinha nada para rolar,
em tela nenhuma. Com os nomes, o conteúdo mede ~460px em PT e transborda em qualquer celular. O item
virou uma coluna, rótulo em cima e risco embaixo, e o risco perdeu a rotação de 90° que tinha
enquanto era o único conteúdo visível — numa faixa horizontal ele lê como sublinhado do ativo.

**A seção ativa fica sempre no centro**, e o que garante isso é `padding-inline: 50%` — meia tela de
folga em cada ponta. Sem ele o primeiro e o último item nunca chegam ao meio: `scrollLeft` é limitado
a `[0, scrollWidth − clientWidth]`, e centralizar uma ponta pediria rolagem além disso. Eles ficavam
encostados na borda enquanto os do meio centralizavam, e o traço ativo saltava de posição conforme a
seção. Com a folga, centralizar o primeiro item custa metade da largura dele, que é alcançável, e o
último tem a mesma folga do outro lado.

O centro também vale **depois de um arraste**: `scroll-snap-type: x mandatory` na faixa e
`scroll-snap-align: center` nos itens fazem o mais próximo assumir o centro quando a rolagem para.
Sem isso, o `scrollTo` centralizaria a cada troca de seção mas um arraste solto no meio do caminho
deixaria a faixa parada onde o dedo saiu.

Duas coisas a mais que a rolagem trouxe junto e não são opcionais:

- **`flex: none` nos itens.** Sem ele os itens se comprimem para caber, a faixa nunca transborda e a
  rolagem volta a não ter o que rolar. É o mesmo modo de falhar dos rótulos ocultos.
- **`padding-block` na faixa.** `overflow-x: auto` obriga o eixo Y a computar `auto` junto, então
  tudo que passar da caixa do item é cortado pela própria faixa. Os 12px cobrem isso e dão altura de
  toque ao mesmo tempo.

**No mobile o risco ativo cresce em escala, não em largura** — e isso não é cosmético. A
centralização é medida **um quadro depois** da troca de seção; se a largura do risco fizesse parte
do layout, a faixa inteira estaria reflowando durante os 0.45s da transição e a medida sairia sobre
uma geometria que ainda ia se acomodar. O traço ativo parava exatamente 11px — `(34−12)/2` — fora do centro, para
o lado de onde veio. Com `--nav-risco-w` fixo e o crescimento em `scaleX`, o layout da faixa é
invariante: a medida continua vindo do DOM, sem número duplicado no JS, e acerta o centro em
qualquer índice. Os comprimentos vivem sem unidade (`--nav-risco: 12`, `--nav-risco-ativo: 34`)
justamente para que a escala seja a razão entre eles.

Fora da seção `inicio` o HUD cai para opacidade .16.
