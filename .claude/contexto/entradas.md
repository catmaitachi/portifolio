## Entradas das seções

Como cada seção se apresenta quando vira a ativa, e os dois efeitos que dependem disso: as ondas da
curva da Trajetória e a decifragem da bio. A navegação em si está em `navegacao.md`.

### Cada seção entra de um jeito

A moldura é comum — `.bloco[data-ativo]` traz opacidade + 26px —, mas **o conteúdo de cada seção
entra com um gesto próprio**. `inicio` já tinha o seu: o zoom da câmera saindo do horizonte.

| Seção | Entrada | Onde |
|---|---|---|
| Sobre | a bio chega cifrada e se decifra da esquerda para a direita, um parágrafo depois do outro | `hooks/useDecipher.ts` |
| Projetos | os cartões sobem, o do meio primeiro | `ProjectCard.module.css` |
| Trajetória | duas ondas opostas giram e param; os nós acendem atrás delas | `TimelineCurve.module.css` |
| Contato | os canais chegam das laterais, o do meio primeiro | `ChannelCard.module.css` |

Projetos sobe e Contato vem de lado — o curso é diferente, a gramática é a mesma. O cartão de
projeto anda **120px** contra os 46 do canal, e não é exagero: ele tem 436px de altura, e um pulo de
40px nele mal se lê. Distância de entrada acompanha o tamanho do elemento.

Quatro decisões valem para todas, e são o que mantém isso barato e escalável:

- **CSS onde dá, JS só onde não dá.** Três das quatro são `@keyframes` disparados por um atributo
  (`data-entrada`) — compositor da GPU, zero custo de CPU, nada de rAF. Só a decifragem precisa de
  JavaScript, porque ali o que muda é texto, não transformação.
- **A ordem sai de dado que já existe.** `--ordem` nos cartões de projeto vem de `geo.ordem`
  (`useOrbit`, distância circular ao cartão da frente); nos canais, da distância ao centro da grade;
  nos nós da linha do tempo, da posição **na janela** — nunca do índice na lista, que abriria buracos
  no ritmo quando a janela desliza. Acrescentar um projeto, um canal ou um emprego não pede nada no
  CSS.
- **`backwards`, nunca `forwards`.** O estado final dessas animações já é o estado natural do
  elemento; o que precisa ser coberto é o **atraso**. Com `forwards` a animação ficaria segurando o
  elemento depois de terminar, e o `:hover` e as transições do componente parariam de responder.
- **Sem quique.** A primeira versão dos cartões passava do lugar e voltava; era gesto de desenho
  animado e brigava com a régua de 1px do resto da página. O que dá caráter é a ordem das duas
  coisas — a opacidade chega antes do movimento, então o elemento se materializa e só depois assenta.

### As duas ondas da Trajetória

A curva tem um **par espelhado**: a mesma onda invertida no eixo, bem mais apagada
(`rgba(255,255,255,.05)` contra os `.12` da principal). Não há caminho novo para ela — `scaleY(-1)`
em torno de y=66 devolve exatamente a onda oposta, sobre o mesmo `d`.

**As duas andam sempre em sentidos opostos**, e isso vale nos dois momentos:

| Quando | Principal | Inversa |
|---|---|---|
| entrada da seção | corre de +820px até parar | corre de −820px até parar |
| navegar no tempo | `translateX(shiftX)` | `translateX(−shiftX)` |

Navegar abre e fecha o par como um fole, e é isso que dá leitura de rotação a uma figura que só
translada.

O curso de entrada vem do próprio desenho: o caminho cobre **cinco** janelas (u de −2 a 3), de
x=−1780 a x=2780 num `viewBox` de 1000. As quatro janelas de sobra são a folga por onde a onda
desliza, e **duas coisas a gastam ao mesmo tempo**: o deslocamento da janela e estes 820px de
entrada, que correm em sentidos opostos para a principal e a inversa. Passar da folga descobre a
ponta da curva e a onda aparece começando do nada no meio da tela.

A animação de entrada mora num `<g>` **externo**: o de dentro carrega o `translateX` da janela,
escrito pelo JS, e uma animação de `transform` no mesmo elemento o apagaria — o mesmo motivo pelo
qual a entrada dos cartões de projeto mora no `.cartao` e não no `.orbe`. Anima `transform`, então
é trabalho de compositor e o custo não depende do tamanho da curva.

**Os pulsos só existem com a seção ativa.** Os quatro `<animateMotion>` são SMIL: não respondem a
`animation-play-state`, e o navegador não os pausa por estarem fora de vista — quatro animações de
caminho seguiriam rodando enquanto o visitante lê Contato. Desmontá-los é o único jeito de pararem,
e ao voltar reiniciam junto com a entrada.

**Só o ponto que virou o ativo cintila.** Fazer todos piscarem a cada passo enchia a linha de
movimento sem informação nenhuma: o que mudou foi *qual* nó está selecionado, e é esse que deve
responder.

Quem reinicia a animação é o próprio CSS — `data-frente` aparece, o `animation-name` passa de `none`
para `pontoAcende` e ela começa do zero. Sem `key`, sem remontagem, sem contador. (A `key` foi a
primeira tentativa e não é necessária; e o botão em volta nunca poderia remontar, porque é ele que
carrega a transição de `left`/`top` — o nó saltaria para a posição nova em vez de deslizar até ela.)

O componente decide só **quando**, com dois tokens que valem juntos:

| | `--pisca` | `--fila` |
|---|---|---|
| entrada da seção | 980ms — o ponto acende atrás das ondas | 90ms por posição, um depois do outro |
| passo no tempo | 0 | 0 — qualquer atraso aqui é só demora |

`--fila` existe justamente para o escalonamento poder ser **desligado**: `data-entrada` fica no
elemento enquanto a seção está ativa e não distingue "acabou de entrar" de "está navegando". O
estado que separa os dois é derivado durante o render (o padrão do React para "mudou a prop, ajusta
o estado"), então não custa um efeito nem um quadro pintado a mais.

**Um nó que chega pela ponta da janela não pode demorar a existir.** Ele é o passo em que o
visitante está esperando algo novo aparecer, e três tempos se somavam contra isso — a opacidade do
botão, a animação do ponto começando em zero e mergulhando duas vezes, e o crescimento do ponto
ativo. Somados davam quase um segundo entre invisível e apagado. As três alavancas hoje:

| O quê | Valor | Por quê |
|---|---|---|
| opacidade do nó | **0,14s** ao entrar, 0,4s ao sair | assimétrica de propósito: quem chega precisa estar lá, quem sai pode se apagar com calma |
| `pontoAcende` | **0,42s**, com vales em 0.45 e 0.7 | o piscar nunca apaga o ponto — um ponto que mergulha até quase nada lê como "ainda não carregou" |
| tamanho do ponto ativo | 0,32s | acompanha o resto em vez de arrastar |

O deslocamento segue nos 0,85s da curva nos dois casos: a posição pode levar o tempo da onda para
assentar, a presença não.

### A decifragem da bio

Um rAF só para todos os parágrafos (um por parágrafo seriam três relógios para o mesmo trabalho), a
15fps. A escrita vai direto em `textContent`: um `setState` por quadro re-renderizaria a seção
inteira para trocar uma string.

**O custo dominante não é o JavaScript, é o layout.** Mudar o texto de um `<p>` justificado e
hifenizado obriga o navegador a remontar as linhas do parágrafo inteiro, e isso pesa muito mais que
montar a string. Todas as decisões de desempenho aqui saem disso:

| Alavanca | O que era | O que é |
|---|---|---|
| `PASSO` (intervalo entre repinturas) | 45ms | **66ms** — é a alavanca principal; menos repinturas, menos relayouts |
| parágrafo que ainda não começou | resorteado a cada quadro | escreve a cifra **uma vez** e para |
| montagem da string | 400 sorteios + `join` de 400 | janela de 48 sorteios + três `slice` nativos |
| `ESCALONAMENTO` | 190ms | **420ms** — sendo maior que metade da duração, no máximo dois parágrafos decifram ao mesmo tempo |

O parágrafo à espera da sua vez era o pior dos quatro: além do trabalho invisível, ele custava um
relayout de texto justificado por quadro para um bloco que nem tinha começado a se decifrar. Além da
janela de 48 caracteres o texto fica na **cifra estática**, sorteada uma vez no setup — o olho só
percebe o embaralhamento na frente de onda.

O alfabeto é só ASCII técnico e Latin-1. A página inteira é IBM Plex Mono, e um glifo que a fonte não
tem vira caixa vazia — o efeito passaria de "texto cifrado" a "fonte quebrada". Katakana e blocos
foram descartados por isso.

Dois detalhes que já custaram uma iteração cada:

- **Espaços nunca são embaralhados**, e a hifenização fica **ligada** o tempo todo. Como a fonte é
  monoespaçada e o número de caracteres não muda, preservar os espaços mantém o comprimento de cada
  palavra; e como o navegador não hifeniza uma palavra cifrada — são símbolos, não letras — ela não
  troca de quebra enquanto pisca. Cada palavra que se resolve passa a poder hifenizar e acomoda a
  linha ali mesmo, então **a justificação acontece junto com a decifragem**. Desligar `hyphens`
  durante a animação, que foi a primeira tentativa, guardava todo o reajuste para o último quadro e
  o parágrafo pulava de uma vez.
- **Os textos entram por parâmetro, nunca lidos do DOM.** Numa troca de idioma o React escreve o
  texto novo e só depois o efeito antigo é desfeito: um cleanup que restaurasse "o que estava no nó"
  gravaria o idioma velho por cima do novo, e o efeito seguinte o leria como verdade. Foi assim que
  a bio parou de trocar de idioma para quem já estava na seção. Pelo mesmo motivo o cleanup só
  restaura quando a animação ficou pelo caminho.

Enquanto corre, o contêiner leva `aria-busy`: texto cifrado não é conteúdo. Com
`prefers-reduced-motion` nada disso acontece — o texto já nasce legível.
