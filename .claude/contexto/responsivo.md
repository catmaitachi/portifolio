## Responsivo por tokens

Cada componente declara seus tokens com os valores base **na própria regra**, e cada media query só
os **redefine**. Nada de duplicar padding/altura em regra nova, nada de `!important`.

| Onde | Tokens |
|---|---|
| `section.module.css` | `--pt --pb --px --gap` |
| `AboutSection` | `--retrato-col --retrato-ar --cols --corpo-gap --retrato --coluna-max --txt --pfs --plh --fatos-gap --fatos-pt --fatos-fs` |
| `EducationSection` | `--cw --ch --cgap --cpad --cinterno --clogo-h --cfs-inst --cfs-nivel --cfs-curso --cfs-selo --cfs-valor --cvolta` |
| `ProjectsSection` | `--pcw --pch --pbh --ph --pr --pperspectiva --pcard` |
| `JourneySection` | `--exph --exp-cargo --exp-per --exp-curva --exp-rail --exp-fantasma --exp-gap --exp-txt --exp-topo` |
| `MusicSection` | `--capa` |
| `GamesSection` | `--arte-w --arte-ar --faixa-item` |
| `FilmsSection` | `--faixa-item` |
| `ContactSection` | `--form-cols --enviar-just` |
| `NavMenu` | `--nav-top --nav-bottom --nav-left --nav-right --nav-tx --nav-ty --nav-dir --nav-align --nav-gap --nav-risco --nav-risco-ativo --nav-risco-w --nav-risco-esc --nav-risco-rot` |
| `LanguageToggle` | `--lang-left --lang-right --lang-tx` |
| `Version` | `--ver-bottom --ver-left --ver-right --ver-tx` |
| `ModeHeader` | `--cab-top --cab-left --cab-right --cab-tx --cab-fs --cab-item` |
| `NovaGauge` | `--nova-bottom --nova-left --nova-size` |
| `Credit` | `--credito-vis` |

Faixas: **`(width <= 640px), (orientation: portrait) and (width <= 1024px)`** (layout de celular:
coluna única, nav horizontal, seletor centrado, quatro vagas na linha do tempo) e
**`(width > 640px) and (height <= 720px) and (orientation: landscape)`** (paisagem curta: retrato
150px, texto 22vh, paddings menores).

**O tablet em pé usa o layout de celular.** O de desktop reserva 150px de cada lado para o menu
vertical, e num iPad de 820px sobravam ~520px para o conteúdo. O tablet deitado, a partir de
1024px de largura, continua no desktop. A consulta aparece idêntica em todo módulo e em
`TELA_ESTREITA` (`hooks/useMediaQuery.ts`), que é quem a leva ao JavaScript; mudar uma é mudar
todas. A paisagem curta ganhou `orientation: landscape` para as duas faixas nunca valerem juntas:
em pé com mais de 640px de largura, a altura já passa de 640.

Entre 641 e 1024px em pé, `section.module.css` sobe `--esc-max` para 1,25 e o recuo lateral para
8vw. Sem isso o layout do celular, medido para 375px, deixava a bio em 11px com linhas de mais de
cem caracteres.

**O limite de largura na segunda faixa não é enfeite.** Ela foi escrita para paisagem curta, onde o
menu é uma coluna à direita e o rodapé está livre, e por isso encolhe os respiros. Sem o limite ela
alcançava também 360×640 e 375×667, que são celulares comuns em pé: ali o menu é a faixa de baixo, o
`--pb` caía de 116px para ~70px contra os 100px que o HUD ocupa, e **o conteúdo corria por baixo da
barra de seções**. As duas faixas descrevem situações diferentes, então não podem se sobrepor.

### O topo e o rodapé são contratos

O HUD ocupa as duas pontas da tela e as seções precisam reservar as duas. Nenhuma seção conhece o
`NavMenu` nem o `ModeHeader`, então os números moram em `:root` (`reset.css`) e as duas pontas
derivam deles.

No topo, o `--pt` é `max(--pt-livre, --hud-topo + --hud-topo-respiro)`: as media queries mexem só em
`--pt-livre`, e o cabeçalho é um **piso**, não um valor somado. Com os números de hoje o piso não
alcança o respiro de tela larga nem o do mobile, então nada mudou de tamanho quando o cabeçalho
nasceu; ele só passa a mandar em paisagem curta, que é onde o respiro apertava.

### O rodapé do mobile é um contrato

Em `≤640px` o HUD ocupa a faixa de baixo: a barra de seções e, abaixo dela, a versão. As seções
precisam reservar esse espaço, e nenhuma delas conhece o `NavMenu`. O número mora uma vez em
`:root` (`reset.css`) e as duas pontas derivam dele:

| Token | O quê |
|---|---|
| `--hud-nav-base` | onde a barra de seções começa, medindo do fundo |
| `--hud-nav-altura` | rótulo + risco + o respiro vertical da faixa |
| `--hud-rodape` | a soma: abaixo disso é território do HUD |
| `--hud-topo-base` | onde o cabeçalho de modo começa, medindo do topo |
| `--hud-topo-altura` | a linha dos dois modos (a prévia flutua por cima e não reserva nada) |
| `--hud-topo` | a soma: acima disso é território do HUD |
| `--hud-topo-respiro` | o que separa o conteúdo do cabeçalho, espelhando o respiro do rodapé |
| `--hud-borda` | o recuo lateral de todas as peças do HUD; encolhe sozinho na faixa do celular |
| `--hud-fundo` | a linha de base das peças de baixo no desktop (crédito, versão, medidor) |

O `--hud-borda` nasceu de um desalinhamento: cada peça escrevia o próprio `max(3.2vw, 26px)`, e o
medidor da supernova tinha 20px fixos no mobile enquanto o cabeçalho tinha `max(3.2vw, 20px)`. Num
tablet em pé os dois ficavam seis pixels fora de linha.

Ele existe porque os números estavam duplicados em valores soltos (`bottom: 56px` na faixa contra
`--pb: 116px` nas seções), e foi assim que saíram de sincronia sem ninguém notar.

### Dois mecanismos, e cada um cuida de uma coisa

**Os respiros das seções saem de `svh`** (`--pt`, `--gap`; o `--pb` é do `--hud-rodape`). `svh` e não
`vh`: em `vh` a conta é feita sobre a viewport grande, com a barra de endereço recolhida, e ela
superestima o que existe enquanto a barra está visível, que é justamente quando o conteúdo aperta.
`svh` assume a barra na tela, então o que couber cabe sempre. E ao contrário de `dvh`, ele não muda
durante a rolagem, então nada reflowa no meio do gesto.

**O conteúdo é encolhido por `useEscalaQueCabe`**, que escreve um `--esc` lido pelo `zoom` do
`.bloco`. Isso resolve o que nenhuma media query alcança: título, índice, rótulos e chips têm
tamanho de leitura e não encolhem com a tela, e num iPhone SE a soma dessas partes fixas passa da
altura útil.

O tamanho de partida vem do CSS, não do hook: `--esc-max` é **0.9 no mobile**, porque desenhado no
tamanho de desktop o conteúdo fica grande demais numa tela estreita mesmo quando cabe. O hook só
**reduz** a partir daí, nunca aumenta. E ele mira em 97% do espaço disponível, não em 100%: encostar
no limite deixa o texto colado no rodapé, e basta uma linha a mais numa tradução para voltar a
estourar.

**O Sobre é o caso que revelou o teto.** Ele tem uma válvula que as outras seções não têm: o `.texto`
rola por dentro, com `max-height: var(--txt)`. No mobile ela não existe mais, porque ali o texto
contorna a foto e uma rolagem interna impediria isso (ver `secoes.md`). Isso faz o bloco continuar cabendo por mais que o
conteúdo cresça, e o hook, medindo só o bloco, não via motivo para encolher nada — o Sobre ficava no
tamanho cheio enquanto as outras reduziam. Um teto que vale para todas resolve, porque não depende
de o bloco estar transbordando.

Mesmo com o teto ele continuou grande, e a razão é que **escala não conserta densidade**. O Sobre
empilhava três coisas (retrato, texto e formações), e o badge de formação é a peça mais densa da
página: logo, três linhas e um medidor dentro de uma moldura com padding. Reduzir tudo por igual
mantém a proporção do que já estava apertado, então os badges ganharam tokens próprios
(`--badge-pad`, `--logo-w`, `--fs-curso` e companhia).

**A conclusão disso veio depois, e foi mudar o conteúdo de lugar.** A formação virou seção própria
(ver `secoes.md`) e no Sobre ficaram duas linhas de texto no lugar dela: a seção mais densa da página
deixou de empilhar três coisas, e volta ao teto da escala sozinha num iPhone SE.

Na seção nova o badge virou um diploma, e ali o eixo apertado se inverte: ele é o único conteúdo, e
o que falta é **largura**, porque os três ficam lado a lado num carrossel. No mobile o cartão **vira
retrato**: deitado, o logo dividia 300px com a instituição, o nível e o selo, e cada peça virava
mancha. Essa é a única mudança de layout da seção que não cabe num token, e por isso mora no módulo
do cartão, que é quem tem o `flex-direction`.

A largura dele é `min(560px, 62%)` no desktop e 78% no mobile, e a fração não é enfeite: ela é o que
deixa sobrar palco dos dois lados para o vizinho aparecer. Escrita só em px, uma janela média punha o
da frente ocupando a largura inteira, e o carrossel voltava a parecer um cartão só.

**E no badge a compensação é horizontal.** Estreitá-lo junto com o resto saiu pela culatra: em 208px
sobravam 132px para o texto, e "Tecnologia da Informação" pede 138px mesmo a 9px de fonte. O curso
quebrava em duas linhas e o cartão ficava **mais alto** do que era antes de encolher. No mobile os
badges não cabem lado a lado de qualquer jeito, viram carrossel e rolam, então largura ali não custa
nada: alargar para 258px devolve o curso a uma linha só, e é isso que baixa a altura, que é a
dimensão realmente disputada. As fontes voltaram para perto do tamanho de desktop pela mesma razão.

A lição para o resto da página: **antes de encolher uma caixa, ver qual eixo está apertado.** Com o
retrato e a coluna de texto menores também, a folga na tela do iPhone SE passou de 6px para 76px.

Três decisões aqui não são intercambiáveis:

- **`zoom`, não `transform: scale()`.** O transform desenha menor mas o elemento continua ocupando o
  tamanho original no layout, então a seção seguiria rolando e sobrando por baixo do rodapé, agora
  com a diferença de estar desenhada torta. `zoom` encolhe a caixa de verdade.
- **A escala é medida, não estimada.** Degraus por faixa de altura foram a primeira tentativa e
  saem de uma conta de quanto o conteúdo *deveria* ocupar; essa conta erra a cada texto novo, troca
  de idioma ou projeto acrescentado, e foi errando que ela deixou o iPhone SE estourando. A razão
  vem do DOM, então o ajuste continua certo sem recalibragem.
- **A escala vive no `.bloco`, não na `.secao`.** O padding fica de fora porque o espaço do HUD no
  rodapé não se negocia com a altura da tela; encolher junto traria o conteúdo de volta para
  debaixo da barra de seções.

**A medida é da seção inteira, não de um filho.** Medir só o `.bloco` deixava de fora tudo que fosse
irmão dele, e no Sobre o carrossel de formações é exatamente isso: filho direto da seção. Ele nem
entrava na conta nem recebia a escala, então a seção parecia caber enquanto os badges transbordavam
por baixo. Por isso o `--esc` é escrito na seção e o `zoom` mora em `.rolavel > *`, alcançando todos
os filhos.

`scrollHeight` também não serve para isso: quando o conteúdo cabe ele empata com `clientHeight`, e
não há como saber quanto sobrava. A altura vem da **soma dos filhos mais os `gap` entre eles**, que é
o número real dos dois lados.

A medição é iterativa de propósito: `getBoundingClientRect` já devolve a altura com o `zoom`
aplicado, então a altura natural sai dividindo pela escala em vigor. Aplicar a escala nova acorda o
`ResizeObserver`, e na segunda passagem a diferença cai abaixo do epsilon e para.

**O epsilon sozinho não fecha o laço, e essa premissa custou uma tela tremendo.** Ele fecha enquanto
a altura do conteúdo for proporcional à escala, e ela não é: um texto que cabe em duas linhas numa
escala e pede três na seguinte muda de altura em **degrau**. Aí existem duas escalas que se apontam
uma para a outra — na menor sobra espaço e o hook cresce, na maior falta e ele encolhe — e a medição
vai e volta para sempre. No desktop sobra altura e isso nunca aparece; no mobile, com a seção justa,
a tela treme.

O que fecha o laço é uma **busca monótona**: encolher prova que a escala em vigor não cabia, então
ela vira teto e nunca mais é proposta. Cada passo baixa o teto em pelo menos um epsilon, então o pior
caso são algumas dezenas de passos. O teto medido é descartado quando a **seção** muda de tamanho,
porque aí tudo que se sabia sobre o que cabe deixa de valer.

Corolário para quem escreve seção nova: **texto de rótulo que troca de estado deve ser `nowrap`.** O
rótulo do destaque de Música alterna entre "tocando agora" e "nada tocando agora", e o mais longo dos
dois quebrava em duas linhas num celular estreito — exatamente o degrau descrito acima. O observador olha
a seção **e cada filho dela**, porque a seção muda com a tela e os filhos mudam com o conteúdo: uma
troca de idioma reescreve o texto inteiro sem a seção mexer um pixel.

`prefers-reduced-motion: reduce` zera animações e transições no CSS; o que vive em JavaScript
(deriva do carrossel, inclinação do retrato, zoom da câmera) consulta `useReducedMotion`.
