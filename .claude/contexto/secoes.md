## Seção "Sobre"

- Seção com `overflow-y: auto` e centragem por **margens automáticas**
  (`.rolavel > *:first-child { margin-top: auto }` / `:last-child { margin-bottom: auto }`): fica
  centrada quando cabe e **rola** quando não cabe, sem cortar o topo. `justify-content: center`
  faria o conteúdo alto transbordar para fora do alcance da rolagem.
  **Toda seção rolável nova precisa de `.rolavel`.**
- Filhos com `flex: none`, sem `flex-shrink`, que antes comprimia e clipava o conteúdo.
- Bloco de parágrafos com rolagem própria (`--txt`, barra de 3px, `overscroll-behavior: contain`):
  chegar ao fim da bio não pode encadear a rolagem para a seção. **Só fora do mobile** (ver adiante).
- **No mobile a seção é diagramada como jornal.** O retrato fica no canto esquerdo, o título ao lado
  dele, e o texto começa sob o título e continua por baixo da foto quando ela acaba. Empilhado, o
  retrato ocupava uma linha inteira para uma imagem de 96px, com vazio dos dois lados.

  Quem faz o texto contornar é `float`, e isso decide o resto: uma caixa que forma contexto de
  formatação próprio (grid, flex, `overflow` diferente de `visible`) fica **ao lado** do float, sem
  contornar. Por isso o `.corpo` vira `flow-root`, a coluna e o texto viram bloco comum e **a bio
  perde a rolagem própria** no mobile: com ela, o texto voltaria a ser uma coluna estreita ao lado da
  foto. A bio é curta, e se não couber quem responde é o `useEscalaQueCabe`, e abaixo do piso dele a
  rolagem da seção. O `flow-root` também contém o float, senão uma bio curta deixaria a foto vazar
  por cima dos fatos.

  O float mora numa classe que o Sobre passa ao `PortraitCard` (`className`), e não no módulo do
  retrato: onde a foto fica é decisão da seção, não do cartão.

  **A base da foto é a linha de base da última linha ao lado dela.** A altura é o título
  (`--titulo-fs`, token de `section.module.css`), o respiro dele e seis linhas da bio, menos o
  trecho entre a linha de base e o fundo da caixa de linha (`--ate-base`); a largura sai disso pela
  proporção, ~113px. Três versões ficaram pelo caminho:
  - com uma altura qualquer, a base da foto caía no meio de uma linha, que ia inteira para depois
    dela e deixava um vão de até uma linha entre a imagem e o texto;
  - encostada no fundo da caixa de linha, a foto ficava colada no texto de baixo;
  - com quatro linhas (~86px) a coluna ao lado justificava melhor, mas a foto ficava pequena e o
    bloco apertado.

  Na linha de base, a foto termina junto com as letras ao lado, e o que a separa do texto de baixo é
  a mesma distância entre duas linhas. Pelo mesmo motivo os parágrafos se separam por uma linha
  inteira no mobile: uma quebra ao lado da foto com outro respiro tiraria o texto da régua.

  **O preço é a justificação ao lado da foto.** A coluna ali tem uns 28 caracteres, e numa fonte
  monoespaçada o ajuste só sai do espaço entre palavras. Sem hifenização, perto de metade das linhas
  ao lado da foto abre vãos de mais de dois espaços. Com hifenização, que todo celular tem, a conta
  melhora. `--linhas-foto` é o botão: menos linhas, foto menor e coluna mais larga.

  O navegador embutido do ambiente de desenvolvimento **não hifeniza nada**, nem em inglês nem em
  português. Uma foto dele mostra a bio sem nenhum hífen, e isso não é o que um celular mostra:
  para avaliar a justificação, medir os vãos no DOM.
- **A coluna de texto não passa da base do retrato.** O texto rola dentro do que sobra depois do
  título, em vez de descer sozinho ao lado de uma imagem que já acabou — numa tela de 1080px eram
  ~56px de sobra. O teto é `--coluna-max`, e quem cede altura é o `.texto`: `min-height: 0` deixa o
  `flex-shrink` ir abaixo do tamanho mínimo do conteúdo, e sem isso a base transborda de novo. Não
  há `flex-grow` — o texto cede altura, nunca reivindica.

  O número sai de onde já existia: `--retrato` deixou de ser `100%` e virou um **comprimento**
  (`28cqw`), então `--coluna-max` é ele vezes a proporção. Onde uma faixa responsiva troca
  `--retrato` por um valor fixo (150px em telas baixas), o teto acompanha sozinho. É para isso que o
  `.corpo` é um `container-type: inline-size`: o bloco tem `max-width`, então a coluna não é fração
  da viewport e `vw` não serviria. No mobile o texto passa por baixo do retrato e não há base a
  respeitar, então `--coluna-max: none`.

  A proporção mora em `--retrato-ar` e o `PortraitCard` monta o `aspect-ratio` com ela
  (`1 / var(--retrato-ar)`), para a altura do retrato e o teto da coluna não saírem de sincronia.
- Retrato (`PortraitCard`): inclina seguindo o ponteiro com brilho especular. O efeito nasceu aqui e
  hoje é `hooks/useInclinacao`, compartilhado com os crachás de formação, os pôsteres de Filmes, as
  artes de Jogos e a capa de Música (ver `direcao-visual.md`). Ele escreve **direto no `style`**
  dentro de um rAF coalescido: um `setState` por `pointermove` re-renderizaria a seção dezenas de
  vezes por segundo para mudar dois números de `transform`.

### A bio muda de lado

`sobre.paragrafos` é um `Record` **total por modo**: quem chega pelo lado pessoal não deve ler um
parágrafo sobre práticas de Engenharia de Software, e quem chega pelo profissional não deve ler
sobre o que eu ando jogando. O título fica, porque é o mesmo assunto, e a seção continua sendo uma
só, e o que muda é qual lista o `useDecipher` recebe.

Um lado novo do site **quebra o build** até ter o próprio texto, que é a regra de sempre para
`Record` de modo (a etiqueta e a legenda do Início já eram assim).

### Os dois fatos, no lugar da formação

A formação **saiu daqui e virou seção** (ver adiante), e no lugar dela ficaram aniversário e
residência: rótulo em versalete espaçado com o valor embaixo, separados do corpo por um risco de
1px, **um em cada extremo do bloco**. Encostados um no outro eles leem como uma legenda só; nas
pontas, cada um é um dado, e o risco liga os dois. São os dois fatos que o retrato não diz, e custam uma linha em vez do bloco mais denso da
página.

Eles ficam **dentro do bloco**, ao contrário do carrossel que ocupava este lugar: um irmão do
`.bloco` só se justifica para algo que precise da largura inteira da seção. O valor mora no
dicionário, e não em `shared.json`, apesar de ser dado: a cidade leva o país escrito no idioma de
quem lê, e "MG" não diz nada a quem chegou em inglês. **A data segue o mesmo caminho**: `07/07/2005`
em português e `July 7, 2005` em inglês, escritos um em cada dicionário. Não há formatador nenhum
envolvido, e não deveria haver: é um valor só, e um `Intl.DateTimeFormat` carregaria uma data de
verdade para produzir a mesma string que já cabe no JSON.

---

## Seção "Formação"

Os badges que ficavam no pé do Sobre, agora com seção própria, **só no modo profissional**. Ela não
sabe disso: quem decide é a lista do modo em `shared.json`.

Saíram de lá por duas razões que se somam. A primeira é de tamanho: o badge é a peça mais densa da
página (ver `responsivo.md`), e era ele que obrigava o Sobre inteiro a encolher para caber num
celular, e com ele fora ela volta ao teto da escala sozinha. A segunda é de leitura: formação
tem estado, data e progresso, e no rodapé de uma biografia isso lia como legenda do retrato.

**A ordem é a dos estados, não a do dicionário**: primeiro o que está **em curso**, porque é o que
responde "onde ele está academicamente hoje"; depois o que foi **concluído**, que é o que ele tem; e
por último a **pretensão**, que ainda não é nem uma coisa nem outra. Cronologia não serviria: ela
poria a intenção no meio do caminho, ou no começo, conforme a data, e é justamente a menos afirmativa
das três.

A regra vive no componente (`ORDEM_ESTADO`), e não na ordem em que as formações estão escritas: assim
ela vale sozinha quando uma formação nova entrar, e continua valendo no dia em que um `cursando`
virar `concluido`. Dentro do mesmo estado manda a ordem do dicionário, de graça, porque `sort` é
estável. O `01 / 03` do pé segue a ordem que se vê, que é a única que o visitante tem.

**A faixa só anda quando não cabe.** Numa tela larga os três crachás ficam parados e centrados, à
vista de uma vez, que é o melhor estado possível: nada se move, nada passa, e tudo está lido. Andar
ali seria movimento sem motivo. Onde a largura não dá para os três, e não dá em celular nenhum sem
encolher o texto até o ilegível, a faixa desliza devagar e passa cada um pelo meio.

**Quem responde isso é uma medida do DOM**, não uma media query: a largura do crachá muda por faixa
responsiva e o bloco inteiro ainda passa pelo `zoom` do `useEscalaQueCabe`, então qualquer largura
escrita num `@media` erraria na primeira dessas mudanças. `useCabeNaFaixa` compara a extensão da
primeira volta com a largura do palco, medindo os dois com `getBoundingClientRect` — o que também
resolve o `zoom` de graça, porque ele entra nas duas pontas da comparação. É a mesma decisão do
`useEscalaQueCabe`: **medida, não estimada**.

**Andando, ela não tem passo.** Esta seção já foi uma pilha e já foi um carrossel que parava em cada
formação por alguns segundos, e as duas falhavam pelo mesmo motivo, por caminhos diferentes: na
pilha, o que estava atrás aparecia como dois riscos e ninguém adivinhava que eram cartões; no
carrossel com espera, a parada era comprida demais para quem já leu e curta demais para quem estava
lendo, e a troca chegava como um salto. Sem parada, o que muda é só qual crachá está passando pelo
meio.

Três coisas decorrem disso, e nenhuma é detalhe:

- **A lista aparece três vezes no DOM**, e é o que fecha o laço. A faixa translada exatamente uma
  volta, e no instante em que a animação reinicia a cópia está ocupando o lugar da original. Sem ela
  haveria um salto a cada volta, e nenhuma duração o esconderia. Foram **duas** cópias até o arraste
  existir: o deslocamento do dedo e o da animação se somam, cada um vale até uma volta, e com duas a
  faixa acabava no meio do gesto e sobrava vazio na borda. As passadas extras são `aria-hidden`,
  porque são a mesma formação de novo, e **só existem enquanto a faixa anda**.
- **Ela é arrastável enquanto anda**, e o dedo mora num elemento próprio: o trilho carrega o
  `transform` do arraste e a faixa carrega o da animação, porque no mesmo elemento os dois se
  apagariam — é a separação do `<g>` da curva da Trajetória e da entrada do cartão de projeto. O
  deslocamento **dá a volta**, reduzido ao resto da divisão por uma volta medida no DOM
  (`offsetLeft`, que é layout e não acompanha os `transform` em cima dela), e o salto de uma volta
  inteira é invisível porque a faixa é periódica. `touch-action: pan-y` divide o toque com a página,
  como em Projetos. **Sem inércia**: a faixa já está em movimento por conta própria, e um empurrão
  com desaceleração se somaria a ele — o gesto deixaria de ser "eu movo isto" para virar "eu chuto
  isto".
- **A duração é por crachá, não por volta.** `--cvolta` é o tempo de um passo e a animação dura isso
  vezes o número de formações. Com uma duração fixa de volta, acrescentar uma formação aceleraria a
  faixa, e velocidade é justamente o que se percebe aqui.
- **Não há estado nenhum além dessa medida**: nem cartão ativo, nem índice, nem relógio em
  JavaScript. Foi embora com eles o arraste, as setas ←/→ e os traços-índice, porque nada disso tem
  sentido sem um passo para onde ir. O movimento é uma animação de CSS, o que o põe no compositor da
  GPU.
- **Há um terceiro estado, para quem pediu menos movimento.** Ali a faixa não pode andar, mas o que
  não cabe também não pode ficar inalcançável, e é o que aconteceria com o `overflow: hidden` do
  palco. Sob `prefers-reduced-motion` ele vira uma **região que rola de lado**, com encaixe por
  proximidade, foco de teclado e rótulo próprios — o mesmo arranjo das faixas de pôsteres de Filmes,
  e pela mesma razão. A resposta vem do `useReducedMotion`, porque a decisão é de renderização e não
  de estilo.

**Apontar a faixa a segura**, e `:focus-within` faz o mesmo pelo teclado. Não é conveniência: com o
texto andando, ler um crachá inteiro depende de ele ficar parado, e o ponteiro em cima dele é
exatamente o sinal de que alguém está lendo.

**O palco corta o que passa da largura do bloco**, e um `mask-image` curto amacia as duas bordas. Ele
é curto de propósito: o que a seção existe para mostrar são os crachás inteiros, e um degradê longo
devolveria como sombra justamente isso. A máscara existe **só enquanto a faixa anda**: parada, não há
nada entrando nem saindo, e ela apagaria de leve o primeiro e o último sem ter o que amaciar.

### O crachá

O cartão deitado, na proporção de um diploma, virou um **retângulo em pé**. A forma resolve dois
problemas de uma vez: cada peça ganha uma faixa inteira em vez de dividir uma linha com as outras
três, e numa faixa que anda de lado um cartão estreito é um cartão que cabe, então três aparecem por
inteiro onde antes cabia um.

| Onde | O quê |
|---|---|
| topo | o **furo da fita**, e o logo da instituição em escala óptica própria (`shared.json → logos`) |
| abaixo | o nível, e o **selo** com o estado |
| miolo | o curso, na maior tipografia do cartão |
| pé | a posição na lista e o dado do estado, e embaixo a barra com a fração em número |

- **O furo é o que faz a forma ser lida como crachá.** É um risco de 1px como todo o resto, sem
  preenchimento e sem ilusão de recorte. Ele substituiu a moldura dupla, que era a gramática de um
  certificado e deixou de valer quando o cartão trocou de forma.
- **O nome da instituição está no logo, e só nele.** Os logos trazem o nome desenhado, e o texto em
  versalete que ficava embaixo repetia a mesma palavra a um centímetro de distância. Ele continua
  como o nome acessível do logo (o `aria-label` do `role="img"`), e volta a ser escrito só quando a
  formação não tem logo, senão ela ficaria sem nome na tela. O branco dos logos é assunto do arquivo,
  não do CSS (ver `conteudo.md`).
- **O centro é consequência, não estética**: numa coluna estreita, texto à esquerda sob um logo
  centrado leria como duas colunas que não existem. O rodapé é a exceção, e é onde a leitura fecha.
- **O curso tem margens automáticas**, então a folga se divide acima e abaixo dele. Sem isso o bloco
  ficaria colado no alto com o rodapé pendurado lá embaixo.
- **O estado mora no selo, e só nele.** No medidor a mesma palavra apareceria duas vezes no mesmo
  cartão, e ali ela competiria com a fração, que é o número que a barra explica.
- **O rótulo do dado é traduzido, o valor não.** "2022.12" e "4/8" são dados, idênticos nos dois
  idiomas, como a versão no rodapé; quem traduz é o "Conclusão" e o "Períodos" ao lado
  (`formacoes.rotulos`).
- **A pretensão é um cartão vago**: o furo da fita, o nível no miolo e o selo, e nada mais. Sem
  instituição, sem logo, sem curso e sem medidor, e o dado não tem esses campos: `instituicao` e
  `curso` são opcionais no tipo justamente para ela. Detalhada, ela ganhava o mesmo peso das duas
  formações que existem, e o que ela tem para dizer é só a direção. É também **mais apagada** em
  tudo, e o apagado sai das cores, não de `opacity`: a entrada anima a opacidade até 1 e, ao
  terminar, um `opacity` no cartão o faria apagar num salto. A moldura é contínua e mais fraca: ela
  já foi tracejada, com o `dashed` do navegador e depois com traços espaçados, e nas duas vezes o
  tracejado pesava mais que o conteúdo do cartão.

**No mobile os três não cabem ao mesmo tempo**, e nenhum ajuste de largura resolve isso sem deixar o
texto ilegível: três crachás legíveis pedem mais de 600px. É justamente essa falta que o movimento
cobre, porque cada um passa pelo meio sozinho — e é ela que a medida encontra, sem que ninguém
escreva "no mobile ela anda" em lugar nenhum.

---

## Seção "Projetos"

**Só projeto pessoal, e o que aparece de cada um vem do GitHub.** A seção mostrava tudo o que foi
feito, e dividia mal o assunto com a Trajetória. Hoje o que foi trabalho para alguém mora lá, e aqui
fica o que é dele. A escolha é a dedo, em `shared.json → projetos`, e o resto é o que o repositório
diz de si, lido por `api/github` (ver `dados.md`).

**Sem escolha nenhuma, a seção diz isso** (`projetos.vazio`), na mesma linha dos estados de dado
remoto, e não chama a função. Escolhidos que não voltam, porque são privados, foram renomeados ou
apagados, caem no vazio de sempre. A órbita não tem teto de cartões; a função aceita doze por
consulta.

### O cartão é um bilhete

O cartão é deitado e desenhado como o **bilhete de uma missão**: o corpo, à esquerda, diz o que o
repositório é; o canhoto, à direita e numa peça à parte, diz o que se confere nele. No celular ele
fica em pé, com o canhoto embaixo: deitado, numa tela de 375px, a descrição viraria uma coluna de uma
palavra por linha.

| Onde | O quê |
|---|---|
| corpo | o número e o dono, o nome, a descrição em até duas linhas, os tópicos, o código de barras de commits e as linguagens |
| canhoto | os dados (commits, estrelas, forks, desde e último push) e os links |

- **O código de barras é feito dos commits.** Cada traço é um commit, no dia em que ele aconteceu,
  dentro dos últimos doze meses, entre as duas datas escritas embaixo. Não há contagem nem escala: um
  mês parado é espaço vazio, um mês intenso vira faixa cheia, e o ritmo do repositório se lê como a
  largura das faixas de um código de barras. São os cem commits mais recentes da janela, que para um
  projeto pessoal é mais de um ano de trabalho, num `<path>` só, com `non-scaling-stroke`. A janela vem
  da função, e não do relógio do navegador, para o desenho depender só do dado.
- **O canhoto é uma peça à parte**, a um espaço de verdade do corpo (`--pfolga`), como um canhoto
  já destacado. Ele já foi colado ao corpo por um picote tracejado, e a divisão lia como uma linha a
  mais dentro de uma caixa só. São dois retângulos com borda própria, e o chanfro fica um em cada: o
  canto de cima à esquerda no corpo e o de baixo à direita no canhoto, que é a silhueta de um cartão
  só, pela regra dos cantos, dividida em duas. As duas peças acendem juntas sob o ponteiro. A base do
  código de barras continua tracejada, porque é apoio, e não dado.
- **O número do cartão abre o corpo**, no canto de cima à esquerda, onde ficava um marcador
  geométrico escolhido pelo índice. O marcador era ornamento que dizia a mesma coisa que o número, de
  um jeito que ninguém lia como número.
- **As linguagens são o medidor da página, em trechos.** A barra de 1px se divide pelo tamanho de
  cada linguagem, com um degrau de branco por trecho, porque a paleta não tem outra coisa, e a mesma
  amostra na legenda liga um ao outro. Só as três maiores têm nome; o resto vira um último trecho
  apagado.
- **Os números são rótulo e valor, como no pé do crachá**, empilhados no canhoto, onde o olho os
  encontra sem procurar. **Estrela e fork só aparecem quando existem**: um "0" em cada cartão de
  projeto pessoal diria menos sobre o projeto do que sobre a contagem.
- **O nome é o do repositório, legível**: `Controlador_Tuya` vira `Controlador Tuya` (`nome.ts`), e o
  `id` continua sendo o nome de verdade. Acima dele fica o dono, como a origem escrita no alto de um
  bilhete.
- A descrição, os tópicos e o nome chegam no idioma em que foram escritos no GitHub, como o título de
  uma faixa ou de um filme: é dado, e não interface.

O bilhete substituiu um cartão em pé, com a atividade por mês no alto, no lugar do banner. Em pé, a
descrição corria em linhas curtas e os números se espalhavam pelo corpo; deitado, o texto corre em
linhas longas e os números ficam numa coluna só.

Deitado, **o lateral aparece além da borda do da frente por uma faixa**, e não mais por inteiro. O
raio da órbita decide o tamanho dessa faixa, e o limite dele é o menu à direita: com 340px, a 1280px
de largura, a borda do lateral encostava no rótulo do menu.

### A órbita

**Carrossel em órbita 3D** (`useOrbit`). Os cartões ocupam pontos de um círculo horizontal; para
cada um, `ang = (i − ativo)·2π/lugares` dá `sen` (deslocamento em X) e `cos` (profundidade). Da
profundidade saem `escala` (.62→1), `foco` (opacidade) e `camada` (`z-index` 100±50). Um
`rotateY(−sen·34°)` inclina os laterais para dentro e o palco tem `perspective`.

**A órbita tem ao menos três lugares** (`lugares = max(n, 3)`). Com dois cartões e o círculo dividido
por dois, o segundo ficaria a 180°, exatamente atrás do primeiro, e a seção pareceria ter um cartão
só. Com três lugares ele fica ao lado, e o terceiro lugar fica vazio. Com um cartão só não há o que
girar, e os traços-índice não aparecem, pela regra da faixa que coube inteira.

O giro parece um anel de verdade, mas **todo texto continua de frente**: um anel com `preserve-3d`
esconderia os cartões de trás por `backface-visibility`, e com n=3 isso seria dois terços da lista.

**Nada de rAF**: `ativo` muda e as `transition` de `transform`/`opacity` (.95s) fazem a volta.
Girar: clique num cartão lateral, ←/→ com a seção ativa, arraste de 46px ou os traços-índice abaixo.
O arraste é decidido no `pointerup` justamente para o clique no cartão continuar vivo.

**O arraste começa na faixa do cartão da frente**, não no palco inteiro. O palco é largo porque
precisa acomodar os cartões laterais, e capturar o gesto em toda essa largura fazia a órbita ser dona
de metade da seção. A faixa sai do DOM: centro do palco e `offsetWidth` do cartão com `data-frente`,
que é medida de **layout** e por isso não acompanha o `transform`, então não balança durante o giro
nem duplica o `--pcw` do CSS no JavaScript. Só o início do gesto é filtrado; terminá-lo fora da faixa
continua valendo. O `cursor: grab` mora no **cartão da frente**, que é onde o gesto vive, e `:active`
troca para `grabbing`, sem estado no React.

**Os cartões chegam depois da seção**, porque vêm do GitHub, e o palco só existe quando há o que
girar. O efeito que registra o arraste roda de novo quando eles aparecem (`temCartoes` nas
dependências); sem isso ele encontraria a ref vazia uma vez e nunca mais olharia.

**O `click` que segue um arraste é engolido** por um listener de captura no palco, solto num
`setTimeout(0)` para não sobreviver a um gesto que não gerou clique. Sem isso o arraste sobre o
cartão da frente girava *e* o clique caía no cartão que estava ali, trazendo para o meio um cartão
que o gesto já tinha levado embora. A captura no palco basta porque o React escuta na raiz do
documento e dispara `onClick` na subida, que deixa de acontecer.

**O cartão da frente é opaco** (`rgb(0 0 0 / 92%)`, contra os 42% dos demais). A órbita é fechada de
propósito, com o `--pr` reduzido para os cartões não passarem sob o menu, e por isso a caixa do
cartão da frente cobre um pedaço dos vizinhos: 2% em tela larga, 31% em janela média, 43% no mobile.
Com o preto translúcido, o vizinho aparecia através dele e não respondia ao clique, porque ali o
clique é do cartão da frente. **O que se vê do lateral é exatamente o que responde.** Pela mesma
regra, a fresta entre o corpo e o canhoto não é do cartão (`pointer-events`): o vizinho que aparece
por ela responde ao clique ali.

`foco` tem **piso alto** (`.52 + .48·prof`): com três lugares a profundidade dos laterais é só .25, e
um falloff linear os apagaria por completo no céu preto.

**Não há painel de descrição, e o cartão não é um botão.** Um texto longo escondido atrás de um
clique era o único conteúdo oculto da página, e o cartão já mostra o que o projeto é. Contar o
projeto por extenso é trabalho do repositório, não do portfólio.

**Os links fecham o canhoto**, o código e, embaixo dele, o projeto no ar. Eles são o fim da
leitura e não o começo: quem chega até eles já passou pelo nome, pela descrição e pelos números, e a
pergunta que sobra é onde ver aquilo. O código existe para todo repositório; o projeto no ar, só
quando o repositório aponta um site no campo *Website*.

**E só o da frente responde.** Os links são desenhados em todos os cartões, para que o corpo tenha a
mesma geometria no meio do giro; fora da frente eles saem da tabulação e do ponteiro, porque ali o
clique é do cartão, que gira a órbita.

O cartão é um `<article>`, os links são os únicos elementos interativos dele, e quem navega por
teclado troca de projeto pelas setas ou pelos traços-índice. O clique no cartão lateral é
enriquecimento para o mouse (ver o falso positivo em `react.md`).

---

## Seção "Trajetória"

**Trabalho de verdade, contado como a bio.** A seção guarda o profissional inteiro, em três
categorias: extensão, freelance e emprego, que é o trabalho remunerado constante, do estágio à CLT. A
lista foi refeita com esse critério e ficou só com o que é contribuição real: trabalhos de curso,
monitorias e participações em evento saíram, porque não passavam a credibilidade que a seção existe
para passar.

**Curva animada + ficha.** Um palco de altura fixa (`--exph`) onde todas as fichas ficam sobrepostas
(`inset: 0`) e só a ativa aparece, com opacidade e 18px de deslocamento, sem rAF, e o palco não pula
ao trocar. A ficha é uma grade `--exp-rail 1fr`: no trilho, o índice, um risco em degradê e a
categoria escrita na vertical (`writing-mode`); no conteúdo, o cargo como título, a empresa ou o
projeto como subtítulo, um parágrafo de texto e a stack em chips de 1px.

- **O texto é um parágrafo, e não uma lista.** As três atividades numeradas liam como relatório; um
  `<p>` justificado, como a bio, conta o que o trabalho foi na voz de quem o fez. Ele não repete o nome
  da empresa, que já está no subtítulo.
- **O subtítulo vira link** quando a experiência tem `url`, marcado só por um sublinhado de 1px que
  acende sob o ponteiro, sem ícone. O nome é a pergunta que o link responde, e é por isso que ele mora
  ali, e não num botão à parte.
- **No celular o cabeçalho e o texto se afastam um pouco mais** (`--exp-cab-gap` e
  `--exp-bloco-gap`). Ali o texto corre na largura inteira, e com o espaçamento
  de desktop cargo, subtítulo e parágrafo liam como um bloco só.
- **No canto de cima à direita fica a marca da empresa ou do projeto**, ao lado do cargo e do
  subtítulo e com a altura dos dois, no lugar do período, que ficava na ficha como número fantasma. A
  data continua na curva, onde organiza alguma coisa; na ficha ela só repetia o rótulo do nó. A marca
  é pintada **por máscara**, em `--tx-marcador`, então o arquivo pode ser o logo colorido da empresa e
  o que chega à tela é só a silhueta. Como fundo grande ela ficava a 5%, e ao lado do cargo esse tom a
  deixava quase invisível.

  O conteúdo da ficha é uma grade: o cabeçalho e a marca dividem a primeira linha, e a marca estica
  até a altura dela, com a largura num teto (`--exp-marca-w`) em que o logo cabe por `contain`. Ela
  já foi duas outras coisas. Primeiro um fundo grande à direita, centrado na altura da ficha, e no
  celular o texto passava por cima dela; depois o pé da ficha, acima dos chips, onde o tamanho era a
  folga que o texto deixava, e um parágrafo mais longo a reduzia a quase nada. Ao lado do cabeçalho o
  tamanho não depende do texto, e o lugar é o mesmo em qualquer tela.
- **Com um evento só, as setas não aparecem**, pela regra da faixa que coube inteira: duas setas
  apagadas para sempre seriam controle sem função. A curva continua, com o nó sozinho no centro.

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
assunto: com quatro vagas cada passo desloca ⅓ de período contra ⅕ com seis, então sete entradas deslocam **uma janela inteira** no mobile — cinco vezes o que deslocam no desktop. É por
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

**No mobile cada lista mostra cinco, não oito.** Empilhadas, as duas davam dezesseis linhas iguais
antes do destaque, e a seção lia como planilha. O corte é CSS (`.item:nth-child(n + 6)`) e não a
função: no desktop as oito cabem em duas colunas lado a lado, e a resposta do Spotify é a mesma para
as duas telas.

**A capa leva à faixa, e cada artista ao seu perfil.** A capa é a maior superfície do bloco e a
primeira coisa que o olho encontra, e era a única parte dele que parecia clicável sem ser; hoje ela é
um link para a mesma faixa que o nome ao lado, e inclina ao ser apontada como as outras artes da
página. Os artistas são **um link cada**, e é por isso que a faixa carrega uma lista em vez do nome já
juntado (`data/types.ts`): numa faixa de dois, o nome inteiro apontando para o primeiro seria uma
resposta errada disfarçada de link. Quem só precisa da linha, como as duas listas do mês, junta a
lista na hora de desenhar.

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

**Mas ela só vale nos vistos por último.** Nos favoritos a nota não diz nada: uma lista de favoritos
é feita de cincos, e cinco marcas cheias em doze cartões seriam a mesma informação repetida doze
vezes. Ali o que distingue um do outro é a **posição**, que é a única coisa que a lista afirma, e é
ela que aparece, num selo com o número. A ordem vem pronta da raspagem, na ordem em que a lista foi
montada, então não há ranking a inventar nem campo a pedir ao Letterboxd.

O selo tem moldura, e não é enfeite: dois algarismos soltos ao lado do ano, na mesma linha, leriam
como parte da data.

**Capas, artes e pôsteres ficam coloridos.** É identidade de terceiro, e não se repinta. **A moldura de 1px só aparece quando a imagem não veio**, e é o espaço reservado de toda imagem da página: o endereço da arte da Steam é perguntado a cada resposta e pode não vir
(ver `dados.md`), e sem a moldura sobraria o ícone de imagem quebrada do navegador, a única coisa
fora da paleta na página inteira. Sobre a arte ela não reservava nada, e por isso saiu (ver
`direcao-visual.md`).

**Jogos e Filmes mostram a mesma faixa**, e ela mora num lugar só: `sections/Faixa`. Uma fileira de
cartões que rola de lado com mecânicas diferentes em duas seções vizinhas do mesmo lado do site lê
como descuido, e a faixa tem detalhes que não são opcionais e nem um deles é óbvio ao ler o CSS.
Ficaram na peça comum a rolagem, o encaixe, o recuo com margem negativa, a tabulação, a ordem de
pintura do apontado e as setas; ficou em cada seção só o cartão, e a largura dele, por `--faixa-item`.

**Os recentes de Jogos são essa faixa**, com a capa **em pé** (600x900, a da biblioteca da Steam), na
mesma proporção 2:3 do pôster de Filmes, e é isso que faz as duas terem a mesma silhueta. Eram uma
grade `auto-fill`, e a troca resolve duas coisas: a grade gastava uma linha inteira por três ou
quatro jogos, e a seção vai passar a dividir o espaço com o League of Legends (ver `pendencias.md`).

**O cartão de Jogos é maior que o de Filmes, e menor que uma grade.** Filmes é pequeno porque tem
duas faixas empilhadas numa seção de uma tela de altura; Jogos tem uma só, com o destaque acima dela,
e ali sobra altura. Igualar os dois erraria pelos dois lados: no tamanho de Filmes a arte não
aproveita o espaço que existe, e maior que isso as duas seções vizinhas deixam de se parecer.

Duas versões ficaram pelo caminho antes desta, e vale saber por quê. Uma inclinava cada capa em 3D
para imitar uma prateleira vista de esguelha: o ângulo que fazia a fileira parecer uma prateleira era
o mesmo que deixava toda arte ilegível. A outra era uma pilha sobreposta que abria no ponto do
ponteiro, e ela funcionava, mas era um comportamento que só existia ali, ao lado de uma seção que
fazia a mesma coisa de outro jeito.

**As faixas têm setas**, na linha do rótulo, à direita. A rolagem nativa continua sendo o caminho
principal, mas ela só existe para quem já sabe que a fileira anda: um mouse sem roda horizontal, um
trackpad em que o gesto lateral não é óbvio, e uma faixa que não diz que continua termina no primeiro
cartão cortado. Elas ficam na linha do rótulo, e não sobre os cartões, porque sobrepostas cobririam a
arte que a faixa existe para mostrar e precisariam de um fundo para serem legíveis por cima dela, que
é uma caixa cheia numa página feita de linhas de 1px. Ali elas fecham pela direita a régua que o
rótulo abre pela esquerda, que é o arranjo do ícone de perfil no cabeçalho da seção.

**Faixa que coube inteira não ganha seta nenhuma**, porque não há o que rolar; onde elas existem,
**apagam** nas pontas e continuam no lugar, como os passos da Trajetória. Sumir na ponta jogaria o
foco no `body` no meio do gesto de quem navega por teclado, porque a ponta muda durante a própria
rolagem. E a faixa continua entrando na tabulação: as setas não substituem isso, elas são o caminho
de quem usa o ponteiro.

**Filmes tem duas faixas, e elas rolam de lado.** Os favoritos vêm antes dos recentes porque são uma
escolha, e a escolha diz mais sobre quem escreveu a página do que o registro. Empilhadas em grade as
duas passariam do rodapé, e reduzir o pôster até caber deixaria as duas ilegíveis; deitadas, cada
uma custa uma linha e o que não cabe na largura continua alcançável. A rolagem é **nativa** — arrasto,
roda e inércia de graça —, o encaixe é `proximity` e não `mandatory` (não há item ativo que precise
assentar), e a faixa entra na tabulação, porque uma região rolável que não recebe foco é inalcançável
por teclado.

**O pôster tem o tamanho do cartão de Jogos**, e já foi menor. O motivo de ser pequeno era altura:
2:3 é a proporção mais alta da página, e com duas faixas cada uma custa a largura vezes 1,5 mais o
nome e o rodapé, então com 118px elas corriam por baixo do crédito. O que mudou foi haver uma seção
vizinha com a mesma faixa: duas fileiras de cartões no mesmo lado do site, em tamanhos diferentes,
leem como dois desenhos e não como um. Quem cobre a diferença de altura é o `useEscalaQueCabe`, que é
medida e não estimativa, e foi para isso que ele existe; um número escolhido a dedo aqui erra na
primeira tradução mais longa.

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
