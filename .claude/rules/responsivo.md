---
paths:
  - "**/*.css"
---

## Responsivo por tokens

Cada componente declara seus tokens com os valores base **na própria regra**, e cada media query só
os **redefine**. Nada de duplicar padding/altura em regra nova, nada de `!important`.

| Onde | Tokens |
|---|---|
| `section.module.css` | `--pt --pb --px --gap` |
| `AboutSection` | `--lado --retrato --retrato-ar --colunas-gap --parte-gap --texto-fs --logo-caixa --onda-w --onda-folga` |
| `JourneySection` | `--exp-cargo --exp-gap --exp-bloco-gap --exp-txt --cracha-col --cracha-ar --fita-h` (no celular o crachá fica 4:5, menos alto) |
| `MusicSection` | `--capa --capas-cols --artistas-cols` |
| `ProjectsSection` (e `Projeto`) | `--proj-cols --proj-gap --proj-entre` |
| `GamesSection` | `--capa-w --deque-h` |
| `FilmsSection` | `--quadro-w --quadro-gap --furo-h --legenda-fs` (no celular a legenda reserva duas linhas) |
| `GithubSection` | `--gh-nuvem --gh-grande` (no celular o céu do ano rola de lado, com 680px de largura mínima, e os chips de linguagem passam de quatro para dois por linha) |
| `ContactSection` | `--carta-fs --carta-gap` (o título mede a coluna, por `cqi`, e não a tela) |
| `SectionNav` | `--cab-left --cab-tx --cab-fs --cab-px --cab-ls` |
| `Opcoes` | nenhum: fica no canto direito nas duas faixas, e o painel mede `min(264px, 100vw − 2·--hud-borda)` |
| `NovaGauge` | `--nova-bottom --nova-left --nova-size` |
| `Tela` | `--secao-pt`, `--secao-pb` e `--secao-min`, que a seção usa no lugar dos seus quando existem; toda seção depois da primeira ganha o respiro largo antes dela |

Faixas: **`(width <= 640px), (orientation: portrait) and (width <= 1024px)`** (layout de celular:
coluna única, cabeçalho à esquerda, o maço de crachás e o deque em cima do texto) e
**`(width > 640px) and (height <= 720px) and (orientation: landscape)`** (paisagem curta: retrato
150px, texto 22vh, paddings menores).

**O tablet em pé usa o layout de celular.** O de desktop reservava 150px de cada lado para o menu
vertical que existia, e num iPad de 820px sobravam ~520px para o conteúdo. O tablet deitado, a partir de
1024px de largura, continua no desktop. A consulta aparece idêntica em todo módulo; mudar uma é
mudar todas. Ela já teve uma cópia no JavaScript (`TELA_ESTREITA`, em `useMediaQuery`), para a
janela de eventos da curva da Carreira, e saiu com ela. A paisagem curta ganhou `orientation: landscape` para as duas faixas nunca valerem juntas:
em pé com mais de 640px de largura, a altura já passa de 640.

Entre 641 e 1024px em pé, `section.module.css` sobe o recuo lateral para 8vw. Sem isso o layout do
celular, medido para 375px, deixava a bio com linhas de mais de cem caracteres.

**O limite de largura na segunda faixa não é enfeite.** Ela foi escrita para paisagem curta e
encolhe os respiros. Sem o limite ela alcançava também 360×640 e 375×667, que são celulares comuns em
pé, e numa das versões isso pôs o conteúdo por baixo do HUD. As duas faixas descrevem situações
diferentes, então não podem se sobrepor.

### O topo é um contrato, e o rodapé espelha ele

O HUD ocupa as duas pontas da tela e as seções precisam reservar as duas. Nenhuma seção conhece o
cabeçalho, então os números moram em `:root` (`reset.css`) e as duas pontas derivam deles:

| Token | O quê |
|---|---|
| `--hud-topo-base` | onde o cabeçalho começa, medindo do topo; o rodapé do celular usa o mesmo número |
| `--hud-topo-linha` | a altura de uma linha do topo (cabeçalho e gatilho do menu de opções se centram nela) |
| `--hud-topo-altura` | o que o HUD ocupa no topo: uma linha, em qualquer tela |
| `--hud-topo` | a soma: acima disso é território do HUD |
| `--hud-topo-respiro` | o que separa o conteúdo do cabeçalho |
| `--hud-borda` | o recuo lateral de todas as peças do HUD; encolhe sozinho na faixa do celular |
| `--hud-fundo` | a linha de base das peças de baixo no desktop (o medidor) |

No topo, o `--pt` é `max(--pt-livre, --hud-topo + --hud-topo-respiro)`: as media queries mexem só em
`--pt-livre`, e o cabeçalho é um **piso**, não um valor somado. No celular o `--pb` é o mesmo número,
porque o medidor fica à mesma distância da borda de baixo que o cabeçalho da de cima.

Um número solto em dois lugares é o defeito que este contrato existe para evitar: foi assim, com
`bottom: 56px` na faixa de seções que existia no rodapé contra `--pb: 116px` nas seções, que o
conteúdo passou a correr por baixo do HUD sem ninguém notar. O `--hud-borda` nasceu do mesmo jeito,
de peças escrevendo cada uma o próprio recuo e ficando seis pixels fora de linha num tablet.

**Os respiros saem de `svh`**, não de `vh`: em `vh` a conta é feita sobre a viewport grande, com a
barra de endereço recolhida, e superestima o que existe enquanto a barra está visível. `svh` assume a
barra na tela, e ao contrário de `dvh` não muda durante a rolagem, então nada reflowa no meio do
gesto.

### O conteúdo não encolhe mais: a tela rola

Enquanto nenhuma seção podia rolar, o que não cabia era encolhido por `useEscalaQueCabe`, que media
a seção e escrevia um `--esc` lido por um `zoom`. Ele saiu com a navegação por telas (ver
`navegacao.md`): hoje o conteúdo alto faz a seção crescer e a tela rola. Três lições dele continuam
valendo para qualquer ajuste de tamanho:

- **antes de encolher uma caixa, ver qual eixo está apertado.** Estreitar o crachá de formação junto
  com o resto quebrou o curso em duas linhas e deixou o cartão **mais alto**; alargá-lo é que baixou a
  altura, que era a dimensão disputada;
- **escala não conserta densidade.** Reduzir tudo por igual mantém a proporção do que já estava
  apertado; a saída foi mudar conteúdo de lugar (a formação virou seção própria);
- **uma medida que se realimenta precisa de busca monótona.** Um texto que cabe em duas linhas numa
  escala e pede três na seguinte muda de altura em degrau, e duas escalas passam a se apontar uma para
  a outra: a tela tremia. O que fechou o laço foi tornar teto toda escala que não coube. O corte de
  qualidade do motor usa a mesma ideia (`motor.md`).

E um corolário que continua valendo: **texto de rótulo que troca de estado deve ser `nowrap`**,
senão a troca muda a altura da seção em degrau.

`prefers-reduced-motion: reduce` zera animações e transições no CSS; o que vive em JavaScript
(inclinação do retrato, zoom da câmera) consulta `useReducedMotion`.
