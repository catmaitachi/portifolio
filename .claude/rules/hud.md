---
paths:
  - "src/hud/**"
  - "src/styles/**"
---

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

Na página: etiqueta 1.2s, nome 1.35s (as letras chegando do fundo, 70ms por passo de distância ao
centro, ver `direcao-visual.md`), legenda
1.85s, cabeçalho 2.2s e menu de opções 2.4s (os canais do rodapé também). A
aparição comum das peças do HUD dura `--abertura-fina` (0.8s).

**A abertura já levou o dobro.** A primeira versão punha o nome na tela aos 3,75s e só assentava aos
6,6s. O tempo morto estava entre o fim do zoom e o nome: os anéis se formavam um a um e só depois o
texto começava, e a câmera, com a curva de saída forte, já tinha andado 97% do caminho aos 60% do
tempo. Hoje o nome se forma enquanto os anéis terminam e tudo assenta em 3,3s, na mesma ordem de
antes. Mexer no ritmo é mexer nos tokens.

O cabeçalho chega logo depois do nome, porque é a navegação. Terminada a cascata (`--abertura-fim`, 3,3s), o brilho do nome começa a passar
(ver `HeroSection`). A abertura acontece uma vez só: numa volta ao Início a cascata do nome se refaz
sem a espera do HUD, e o brilho entra em laço assim que o nome se forma (ver `entradas.md`).

Tudo em `transform`, `clip-path` e `opacity` = compositor da GPU. Risco que cresce, cresce em
`scaleX` e nunca em `width`: o crédito que existiu no rodapé crescia os dele em `width`, remontava a
linha a cada quadro e o texto escorregava entre eles.

**Os anéis não encolhem com o buraco negro.** Isso foi tentado (a moldura seguindo a presença dele
pela rolagem) e desfeito: fora do Início o HUD já cai para opacidade .16, e anéis diminuindo junto
com o buraco competiam com o conteúdo que chegava, em vez de sair do caminho.

### O cabeçalho

É a nav entre as telas, e o que ele faz está em `navegacao.md`. Ele ocupou o lugar de um seletor de
lado (`ModeHeader`), que saiu junto com os dois lados do site, e herdou dele:

- **a posição e os tokens do topo.** Centrado no desktop (com o nome do meio no eixo da tela, ver
  `navegacao.md`), à esquerda no celular, na mesma linha do
  menu de opções, os dois com o recuo `--hud-borda` e espelhando um ao outro. `--hud-topo-linha`
  é a altura da linha e `--hud-topo-altura` o que o HUD ocupa; o `--pt` das seções é `max(--pt-livre,
  --hud-topo + respiro)`, e as media queries redefinem só `--pt-livre`. Quem mexer na altura do
  cabeçalho mexe em um número só;
- **a linha de 26px**, que a moldura de antes pediu e ficou: o gatilho do menu de opções tem essa
  altura. O recuo da esquerda de cada nome leva o `letter-spacing` a mais, porque ele entra também
  depois da última letra e deslocaria o nome em relação ao próprio risco.

A moldura chanfrada com fundo que ele herdou do seletor saiu: ficava apertada, e o fundo preto era
uma caixa cheia numa página feita de linhas. O que diz que os nomes são controle é o risco da tela
em vigor e as subseções que abrem ao apontar (ver `navegacao.md`).

**O que não voltar a fazer, do tempo do seletor.** O nome do lado não parecia clicável, e por um tempo
isso foi resolvido com estalos de luz que acendiam sozinhos sob ele (`Faiscas`, adaptado do
`ClickSpark` do React Bits). Saiu por decisão de quem escreve a página: um efeito em laço no canto
onde o olho cai primeiro compete com o conteúdo em todo ciclo. O que respondeu foi mudar o cabeçalho
(a moldura), e não pôr movimento em volta dele.

### Canais

`hud/Canais` são os ícones dos canais no rodapé, centrados, onde ficava o crédito: todos os de
`shared.json → canais`, na ordem de lá. **Canal sem `url` aparece apagado** (opacidade .14, sem link e
sem hover, rótulo `a11y.emBreve`): diz que o canal vem aí, e vira link sozinho quando o endereço for
preenchido. Hoje é o TikTok. **O e-mail não entra**: o endereço mora no Contato (ver `secoes.md`), e o
ícone `email` saiu de `ICONES`.
São peça do HUD, e não do Início, porque a faixa de baixo da tela é apagada de propósito pela máscara
da `Tela`, e dentro da seção eles ficariam justamente nela. A barra entra uma vez, na abertura; a
presença é dos ícones, que se apagam fora do Início e voltam sem esperar a abertura de novo (o
`inert` os tira do clique e do foco).

### Menu de opções

`hud/Opcoes` fica no canto superior direito, onde morava o seletor de idioma, e reúne o **idioma**, a
**qualidade** da cena e a **versão**, que saiu do canto de baixo. Escolhido numa rodada da skill
`inspiration` (28/09/2026), com a mistura por slot feita pelo Lucas:

| Slot | Padrão | Referências |
|---|---|---|
| gatilho | três traços da mira do HUD; aberto, o de cima e o de baixo cruzam num X e o do meio recolhe | reactbits/BranchedMenu |
| painel | moldura chanfrada que se desenha do canto de onde saiu (`clip-path` abrindo de cima-direita), e as linhas chegam da profundidade, uma depois da outra | reactbits/GlideSelect, motionprimitives/morphing-popover |
| idioma | nada se desloca: o escolhido se enche de luz de baixo para cima, em corte seco | animata/metis-text |
| qualidade | uma régua de 29 traços; **qualquer ponto** de "desempenho" a "qualidade", e os traços perto da marca crescem e acendem pela distância a ela | smoothui/exposure-slider, reactbits/WakeSlider |

- **A régua mostra o que o motor sabe da máquina**: um ponto no **ideal**, onde a cena para sozinha,
  e um risco tracejado no **limite recomendado**, com os traços de depois dele apagados. A legenda só
  aparece depois da primeira medição. Arrastar, clicar ou usar as setas (5%, `Home`/`End`) fixa um
  nível; o botão da direita diz "auto" ou o valor escolhido, e clicado devolve a decisão à cena (ver
  `motor.md`). O pedido que decidiu isso: perfis fixos ("desempenho"/"qualidade") esconderiam a escala.
- **O menu só lê o motor enquanto está aberto** (a cada 0,4s), e a marca anda por rAF escrevendo
  direto nos traços: nada disso é estado do `App`, e fechado ele não custa nada.
- **Abre só pelo clique**, e fecha pelo gatilho, pelo `Esc` (que devolve o foco ao gatilho) ou por
  um toque fora. Fechado, o painel é `inert`. Não é o pop-up que a regra de baixo proíbe: é um
  controle que o visitante abre, e nada aparece sozinho.
- **As setas dentro dele não navegam a seção de trás.** O idioma (um `radiogroup`) e a régua (um
  `slider`) param a propagação, senão o `useArrowKeys` da Carreira ou de Jogos andaria junto.
- **O recorte aberto passa da borda** (`inset(-6px)`), para não cortar o contorno de foco, que é o
  motivo de o chanfro do site não ser `clip-path` (ver `direcao-visual.md`).

### O painel de `?pisos`

`hud/Pisos` calibra os pisos da qualidade (ver `motor.md`) e só existe com `?pisos` no endereço: o
`App` o carrega por `lazy`, e quem não o pede não baixa o código. É ferramenta de quem escreve a
página, não conteúdo, e por isso é **a única peça com texto literal fora do dicionário**. O que ele
muda não fica guardado.

Ele também mostra o **tempo de quadro da página inteira** (mediana e p95 dos últimos 120 quadros, e
quantos passaram de 20ms), medido por rAF. É a medida que importa para travamento: o consumo do motor
só conta o canvas, e um tranco que vem do navegador (compor camadas, filtros, a máscara da tela) não
aparece nele.

### Versão

Mora no menu de opções, na última linha. O número **não é uma string escrita no componente nem uma chave de dicionário**: vem do `version` do
`package.json` por `define` do Vite (`__VERSAO__`, tipado em `vite-env.d.ts`), reduzido a
`major.minor`. Publicar uma versão e exibir outra é uma divergência que ninguém percebe até
constranger. E ela fica fora do i18n de propósito: `v1.0` é dado, não texto — uma chave por idioma
só criaria dois lugares para errar.

### Escondido por visibilidade, nunca por `display: none`

Uma peça do HUD que entra por animação atrasada e some numa media query sai com `visibility: hidden`,
nunca com `display: none`. `display: none` tira o elemento da árvore de renderização e leva a animação
junto: ao voltar para a faixa larga (rotação, janela redimensionada, DevTools) ela recomeça do zero,
e com o atraso da abertura em `both` a peça fica segundos invisível, o que lê como "não voltou mais".
Foi o que aconteceu com o crédito que existiu no rodapé. `visibility` mantém a animação correndo
escondida, e já tira a peça do clique e da tabulação.

### Medidor da supernova

`NovaGauge` fica no canto inferior esquerdo, nos recuos do HUD (`--hud-borda` e `--hud-fundo`; no
mobile desce para `--hud-topo-base`, a distância do cabeçalho ao topo).

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

### O grão de filme saiu

Existiu um `hud/Grao`, uma camada de ruído por cima da página inteira, que veio com os detalhes da
direção Exposição. Saiu por decisão de quem escreve a página. O que fica registrado, para o caso de
voltar: a primeira calibragem acinzentou o preto profundo (~3% de luminância média), e mistura
`screen` por cima de tudo obrigaria o navegador a compor o fundo inteiro à parte.

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

Foi assim que a abertura inteira ficou morta por um tempo (anéis parados, mira sem pulso). `animation: :global(nome)` **não** é saída: o parser do PostCSS recusa o `:` no
valor. A saída é declarar o keyframe no próprio módulo — `fina` está duplicado em Hero,
`SectionNav`, `Opcoes` e `Canais`, e o brilho do nome está copiado em Música, onde a barra do que está
tocando usa a mesma varredura. Quatro linhas repetidas custam menos que uma animação que não roda,
e o que se compartilha nesses casos são os **números**, não a declaração.

Corolário: **layout não pode morar só no estado final de uma animação.** Uma peça centrada por
`translateX(-50%)` tem esse `transform` na própria regra, e a animação só refaz o caminho até lá. O
crédito que existiu no rodapé tinha a centragem só no fim da animação, e quando ela falhou isso virou
um bug visível em vez de uma entrada mais seca.
