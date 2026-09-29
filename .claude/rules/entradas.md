---
paths:
  - "src/sections/**"
  - "src/hooks/useDecipher.ts"
---

## Entradas das seções

Como cada seção se apresenta quando vira a ativa, e os dois efeitos que dependem disso: a órbita da
Carreira e a decifragem da bio. A navegação em si está em `navegacao.md`.

### Cada seção entra de um jeito

A moldura é comum — `.bloco[data-ativo]` chega da profundidade: de 0,86× e 8px de desfoque até o
estado natural, com a opacidade (ver `direcao-visual.md`) —, mas **o conteúdo de cada seção
entra com um gesto próprio**. `inicio` tem dois: o zoom da câmera saindo do horizonte, que é só da
abertura, e a cascata de etiqueta, nome e legenda, que se refaz a cada volta (ver *O Início se refaz
a cada volta*).

| Seção | Entrada | Onde |
|---|---|---|
| Sobre (o arquivo) | cada seção de texto chega cifrada e se decifra da esquerda para a direita, um parágrafo depois do outro | `hooks/useDecipher.ts` |
| Projetos pessoais | cada linha chega da profundidade, uma depois da outra, e os trechos das linguagens se preenchem | `Projeto.module.css` |
| Carreira | o anel da órbita chega do fundo e os corpos acendem atrás dele, um a um | `Orbita.module.css` |
| Sobre (a formação) | a onda em pé e a inversa se desenham em sentidos opostos, os nós acendem atrás delas e as linhas do medidor se preenchem uma a uma | `AboutSection.module.css` |
| Música | tudo chega da profundidade: o destaque, depois as capas uma a uma e os retratos por último | `MusicSection.module.css` |
| Jogos | as capas do deque chegam do fundo, a da frente primeiro | `GamesSection.module.css` |
| Filmes | os títulos chegam da profundidade, um depois do outro, e de novo a cada troca de aba | `FilmsSection.module.css` |
| GitHub | o número grande conta e se enche de luz, a ficha chega linha a linha, um feixe atravessa o céu do ano e o acende, e a nuvem e a lista de linguagens chegam depois | `GithubSection.module.css`, `GithubSection` |

O cartão de projeto anda **72px**, e não é exagero: ele tem 280px de altura, e um pulo de 30px nele
mal se lê. Distância de entrada acompanha o tamanho do elemento.

**As três seções de dado remoto penduram a entrada em `data-ativo`, não no mount**, e a Carreira
faz o mesmo: o atributo aparece quando a seção vira a ativa, o `animation-name`
sai de `none` e a animação recomeça do zero, sem `key` e sem remontar nada. Presas ao mount, elas
rodavam **uma vez só** — no instante em que a resposta do provedor chegava — e voltar para a seção
encontrava tudo já montado, que é justamente a diferença entre uma entrada e um efeito de
carregamento.

Nelas a ordem também é conteúdo, e não decoração:

- em **Música** o destaque entra depois das listas, porque é ele que fica no pé da seção: subir é
  entrar por onde ele está, e a seção se monta de cima para baixo;
- em **Jogos** a capa da frente, que é o destaque, chega **antes** das de trás: é ela que a seção
  existe para mostrar, e uma cascata que começa no que está aberto agora lê como ordem em vez de um
  monte de capas chegando junto;
- em **Filmes** a cascata segue a lista de cima para baixo, com teto de doze posições no atraso:
  numa lista de vinte, o último não pode esperar dois segundos para existir.

Quatro decisões valem para todas, e são o que mantém isso barato e escalável:

- **CSS onde dá, JS só onde não dá.** Três das quatro são `@keyframes` disparados por um atributo
  (`data-entrada`) — compositor da GPU, zero custo de CPU, nada de rAF. Só a decifragem precisa de
  JavaScript, porque ali o que muda é texto, não transformação.
- **A ordem sai de dado que já existe.** `--ordem` nos projetos e nas capas de Música é a posição na
  lista; nos canais, da distância ao centro da grade;
  nos nós da linha do tempo, da posição **na janela** — nunca do índice na lista, que abriria buracos
  no ritmo quando a janela desliza. Acrescentar um projeto, um canal ou um emprego não pede nada no
  CSS.
- **`backwards`, nunca `forwards`.** O estado final dessas animações já é o estado natural do
  elemento; o que precisa ser coberto é o **atraso**. Com `forwards` a animação ficaria segurando o
  elemento depois de terminar, e o `:hover` e as transições do componente parariam de responder.
- **Sem quique.** A primeira versão dos cartões passava do lugar e voltava; era gesto de desenho
  animado e brigava com a régua de 1px do resto da página. O que dá caráter é a ordem das duas
  coisas — a opacidade chega antes do movimento, então o elemento se materializa e só depois assenta.

**Uma entrada não pode correr junto com a do bloco, no mesmo sentido.** O `.bloco` inteiro chega
em 0,9s (`section.module.css`), e é fácil escrever uma cascata que se some a ele em vez de vir depois
dele: foi o que aconteceu em Jogos, quando as capas subiam 22px em 0,6s sem atraso nenhum, e a seção
aparecia **sem entrada nenhuma**. Por isso as cascatas de Jogos e Filmes começam depois de o bloco
assentar (520ms e 300ms), e a órbita da Carreira acende os corpos só depois do anel (900ms).

**E a entrada de Jogos já sumiu uma vez sem ninguém ver.** Quando a grade de recentes virou uma faixa,
as regras que aplicavam o keyframe miravam a grade e saíram junto com ela. O keyframe continuou
declarado, o build passou, o console ficou quieto, e a seção passou a aparecer sem entrada nenhuma.
Um `@keyframes` que nenhuma regra usa é o sintoma a procurar depois de mexer na estrutura de uma
seção.

**Quem tem posição escrita pelo JS anima o miolo.** As capas do deque e os corpos da órbita recebem o
`transform` (ou o `left`/`top`) de um rAF, e uma animação de entrada no mesmo elemento o apagaria:
a entrada mora na `.arte` da capa e no `.ponto` do corpo.

Toda entrada usa `--ease-entrada`, e toda transição `--ease-saida` (ver `direcao-visual.md`).

**Seção fora da tela não anima.** `.bloco:not([data-ativo]) *` pausa toda animação que estiver
correndo dentro de uma seção inativa (`section.module.css`). As entradas não sentem isso, porque só
existem com `data-ativo`. Quem sente são os movimentos contínuos (o anel do corpo
escolhido da órbita, o ponto que pulsa em Música e Jogos, a linha de espera de uma busca), que seguiam rodando com
a seção fora de vista. A barra do que está tocando também para, e a busca que acontece ao voltar a
recoloca no lugar.

### O Início se refaz a cada volta

A cascata do Início (etiqueta, nome e legenda) ficava presa ao mount e rodava uma vez só, na
abertura: quem voltava ao topo encontrava o nome parado. Hoje ela pende de `data-ativo`, como as
entradas das outras seções, e recomeça a cada volta, com o brilho do nome em laço depois dela.

Ela tem **dois relógios**, e o que os separa é a seção já ter saído de cena uma vez (`data-volta`,
estado derivado durante o render, como na Trajetória):

| | etiqueta | nome | legenda | brilho |
|---|---|---|---|---|
| abertura | 1,2s | 1,35s | 1,85s | 3,3s (`--abertura-fim`) |
| volta | 0s | 0,15s | 0,65s | 1,35s, quando o nome acaba de se formar |

A volta é a mesma cascata sem a espera do HUD, com os mesmos intervalos entre as peças. O brilho
entra logo depois do nome porque não sobra nada chegando com que ele dispute atenção; na abertura ele
espera o cabeçalho e o menu de opções assentarem (ver `hud.md`). Quem abre o site pelo endereço de
outra seção já começa como volta.

Duas coisas vieram junto, e nenhuma é opcional:

- **fora de cena o Início fica apagado**, com a mesma transição de 0,9s do `.bloco`. Sem isso a
  rolagem de volta mostraria o nome inteiro, já formado, e ele sumiria no quadro em que a seção vira a
  ativa, só para se refazer;
- **a faixa do brilho descansa fora do texto.** Fora da animação o `background-position` é `-50%`, a
  mesma posição em que ela para entre uma passada e outra. Na posição inicial do navegador, que valia
  durante o atraso da abertura, a crista ficava parada sobre a última letra enquanto o nome se formava.

Pendurado em `data-ativo`, o brilho também para quando o Início sai de cena. O Início não mora num
`.bloco`, então a pausa de `section.module.css` não o alcançava, e o laço seguia rodando com a seção
fora de vista.

### A órbita da Carreira não para em cena

Ela gira uma volta por minuto enquanto a seção está ativa, e é por isso que o laço vive no JS e não
num `@keyframes`: o ponteiro sobre a órbita a segura, escolher um corpo o traz para a frente e daí ele
segue girando, e as três coisas precisam da mesma fase. **Fora de cena o rAF nem existe**, como os
pulsos SMIL da curva que ela substituiu, que precisavam ser desmontados para parar. O anel do corpo
escolhido respira em CSS e para com o resto pela regra do `.bloco:not([data-ativo])`.

A geometria e o resto do comportamento estão em `secoes.md` (*Seção "Carreira"*).

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

**E a regra se confere no `unicode-range` da fonte.** `∆` e `∑` estiveram no alfabeto e não são
Latin-1: nenhum subconjunto de IBM Plex Mono que o Google Fonts serve os cobre, e eles saíam de uma
fonte de sistema com outra largura, justamente o que a cifra não pode ter. Para conferir um glifo
novo, ler o CSS da fonte pedido por um navegador; sem user-agent de navegador o Google responde um
bloco só, sem `unicode-range`.

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
