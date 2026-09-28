---
paths:
  - "src/navigation/**"
  - "src/App.tsx"
  - "src/main.tsx"
  - "src/hooks/useArrowKeys.ts"
  - "src/content/shared.json"
---

## Telas, seções e navegação

### Três telas, e cada uma rola por dentro

O site é **um só** (não tem mais os lados pessoal e profissional) e se divide em três **telas**, que
é o que o cabeçalho navega: **Identidade**, **Interesses** e **Trajetória** (em inglês Profile,
Hobbies e Journey), que respondem a quem eu sou, o que gosto e o que faço. Uma tela ocupa a janela
inteira, rola por dentro e **empilha** as seções dela, uma embaixo da outra, como uma página corrida:

| Tela | Seções |
|---|---|
| Identidade | Início, Sobre mim, Contato |
| Interesses | Música, Jogos, Filmes |
| Trajetória | Carreira, Projetos pessoais |

**Os nomes das telas têm todos dez letras** em português (e sete em inglês), escolha de quem escreve
a página: no cabeçalho eles ocupam a mesma largura. Eles já foram Dossiê, Hobbies e Trajetória, e a
chave no código continua a de antes (`dossie`, `hobbies`, `trajetoria`): o nome é texto de
dicionário (`telas`), não chave. Num celular de 360px os três com o espaçamento normal encostavam no
seletor de idioma, e abaixo de 400px o cabeçalho aperta letras e intervalos (`SectionNav`).

**Hobbies e Trajetória já foram abas**, uma seção de cada vez escolhida na lista do cabeçalho, e
viraram páginas corridas como a Identidade: as subseções de uma tela vivem na mesma página. Com isso o
arranjo deixou de ser dado (`arranjo` saiu do `shared.json`), e o código das abas saiu da `Tela`, do
`App` e do cabeçalho.

A divisão é **dado**: `shared.json → telas`, com `key` e `partes`. `check:i18n` confere que
cada seção mora em exatamente uma tela, porque o TypeScript não pega nem a seção repetida (montada
duas vezes) nem a esquecida (que simplesmente não aparece).

Antes disso a página era um contêiner com `scroll-snap-type: y mandatory`, uma seção por tela, e
**nenhuma seção podia rolar**: rolar era trocar de seção, e o que não cabia era encolhido por um
`zoom` medido (`useEscalaQueCabe`). Em volta disso cresceram o menu da direita, a faixa do celular
que rolava a página por fração, a trava do índice durante a rolagem programática e o laço de medida
do `zoom`, que já fez a tela tremer. Tudo isso saiu, perto de oitocentas linhas, porque existia para
contornar a rolagem que agora é permitida. O ADR está em `docs/plano-site-pessoal.md`.

### A tela (`navigation/Tela.tsx`)

As três ficam **montadas e empilhadas no mesmo lugar**. Só a ativa aparece; as outras ficam `inert`
(fora do clique, do foco e da árvore de acessibilidade) e invisíveis. Montadas, elas guardam a
rolagem de cada uma: voltar a uma tela é voltar ao ponto em que se estava.

A troca é por opacidade, e a `visibility` sai **depois** dela (atraso na transição), senão a tela que
sai sumiria num quadro.

**O `ativo` de cada seção continua sendo a prop de sempre**, e é isso que manteve as entradas
(`entradas.md`) funcionando sem mudança:

ele vem da rolagem: a seção está ativa enquanto ao menos um quarto da altura da tela a mostra. A
medida é um laço sobre os retângulos das seções num rAF por rajada de `scroll`, e não um
`IntersectionObserver`, porque a mesma medida responde também **qual seção ocupa a tela** (a que
cruza a linha a 75% da altura, `LINHA_ATUAL`), que é a que o `App` recebe e que acende o céu, o
endereço e o título. Uma seção de dado remoto só busca quando fica ativa pela primeira vez, então
Jogos e Filmes buscam quando a rolagem chega perto deles.

**A linha é a mesma medida da entrada** (`1 − VISTA`): a seção vira a atual no instante em que o
conteúdo dela começa a entrar, e o céu chega junto com ele. A linha já foi 40% da altura, e o Sobre,
mais alto que a janela, ficava inteiro à vista antes de Câncer começar a acender; a 60% ainda sobrava
atraso em toda seção. **No topo da página ela começa a 25% e desce dois pixels por pixel rolado** até
os 75%: uma primeira seção mais baixa que a linha (Música, Projetos) nunca seria a atual, e a página
abria com o céu da seguinte. Conferido nas três telas simulando a rolagem com as contas da `Tela`:
cada troca de céu cai no mesmo passo da entrada da seção.

**As seções são filhas diretas do contêiner**, sem embrulho: é o que deixa o `App` alcançar uma pelo
índice (`children[i].offsetTop`) e o filtro da supernova continuar achando a caixa de uma
`<section>`.

**A seção não rola, quem rola é a tela.** `section.module.css` dá a toda seção
`min-height: var(--secao-min, 100%)` e deixa ela crescer; a centragem por margens automáticas
(`.rolavel`) a mantém no meio quando cabe. **Numa tela as seções se seguem** como partes de um
documento: a `Tela` zera `--secao-min`, e só o Início, que tem regra própria de altura, ocupa a tela
inteira. **Entre uma subseção e a seguinte o respiro é largo** (`--secao-pt` de toda seção depois da
primeira), o mesmo em todas as telas: cada subseção é outra conversa. A primeira guarda o respiro do
topo, que é o do HUD, e a última o do rodapé.

**No fim da rolagem, a seção atual é a última.** A seção atual é a que cruza a linha, e uma última
seção mais curta que a tela pode nunca chegar nela: ir ao Contato deixava a página no fim com o
Sobre ainda na linha, e o endereço voltava para `#profile/about`.

**E a última seção tem pelo menos a altura da tela** (`--secao-min: 100svh`, com o respiro de baixo
igual ao de cima, em `Tela.module.css`). Ir a uma seção leva a tela até o começo dela, e uma última
seção curta esgotava a rolagem antes: o Contato ficava encostado embaixo quando era o foco. Com a
altura da tela ela alcança o topo e o `.rolavel` centra o conteúdo (conferido: o meio do Contato cai
a 1px do meio da janela). Última seção mais alta que a tela só ganha o respiro de baixo.

Nenhuma seção pode ter rolagem vertical própria dentro de uma tela: a roda do mouse ficaria presa
nela. A bio do Sobre era a única e perdeu a dela por isso.

**O conteúdo se apaga ao passar pelo HUD.** A tela tem um `mask-image` que apaga a faixa do topo (o
cabeçalho e o idioma) e a do rodapé (a versão e o medidor da supernova), só na altura que eles ocupam.

**A tela move a câmera do céu.** A tela ativa avisa o progresso da própria rolagem (0 a 1) pela
prop `aoRolar`, e o `App` a entrega a `scene/camera.ts`, que o `SpaceCanvas` liga ao motor. Não passa
por estado: uma prop por quadro de rolagem renderizaria o `App` inteiro a cada quadro. Ela avisa
também ao abrir, porque cada tela guarda a própria rolagem.

**Trocar de tela é um salto** (ver `direcao-visual.md` e `motor.md`). O `App` dispara
`camera.saltar()` só quando a tela muda de verdade (lendo a tela em vigor por ref), e o CSS da `Tela`
faz a parte do conteúdo: a que sai acelera para a câmera (cresce, desfoca, some em 0,5s) por
transição, e a que chega vem do fundo por animação (`pousa`, 0,8s, a partir de 0,4s), porque as duas
partem de estados diferentes. A chegada só existe em `data-veio`, estado derivado durante o render:
na abertura quem chega é a câmera saindo do buraco negro, e as duas juntas brigariam.

**O foco vai para a tela quando ela abre** (`tabIndex={-1}`, `focus({ preventScroll: true })`). É o
que faz ↑/↓, PageUp/PageDown, Home/End e espaço rolarem a tela, nativamente; sem isso as teclas
morreriam no documento, que tem `overflow: hidden`. O contêiner não entra na tabulação e não mostra
contorno: seria uma moldura em volta da janela inteira a cada troca.

### O cabeçalho (`navigation/SectionNav.tsx`)

As três telas lado a lado, **sem moldura e sem fundo**, e no desktop **o nome do meio no eixo da
tela**: a lista é uma grade `1fr auto 1fr`, com as duas pontas da mesma largura. Num `flex` o
conjunto ficava centrado, mas o nome do meio caía 18px à esquerda do eixo quando as pontas tinham
tamanhos diferentes (Dossiê e Trajetória), e o cabeçalho lia torto contra o buraco negro e os canais, que estão no eixo. Os nomes: os nomes em versalete com respiro, e o risco
de 1px sob a tela em vigor, que cresce em `scaleX` para o layout não mudar enquanto ele anda. O estado
é cor: `--tx-apagado`, `--tx-hover` apontado, `--tx-titulo` na ativa, com `aria-current="page"`.
Centrado no topo no desktop e à esquerda no celular, na linha do seletor de idioma. Ele já teve uma
moldura chanfrada com fundo preto, que ficou apertada e pesada, e saiu.

**As subseções de cada tela ficam numa lista que abre embaixo do nome.** Apontar o nome abre a
lista, em pé, uma subseção por linha, **centrada sob o nome**, e clicar numa rola até ela; fora do hover não há nada embaixo
do cabeçalho. A lista marca a subseção que ocupa a tela. A Identidade lista Sobre mim e Contato: o
Início não entra, porque é o topo da própria tela.

Todas as listas ficam montadas, e a que entra desliza de lado pela diferença de índice em `TELAS`
(`--lado`, 14px por passo): passar o cursor de Hobbies para Trajetória desliza a lista para a
esquerda. A folga entre o nome e a lista é `padding` da lista, e não margem, para o cursor atravessar
sem sair do `<li>`. O foco pelo teclado abre a lista do mesmo jeito, só a aberta entra na tabulação,
o botão leva `aria-expanded` e `aria-controls`, e a subseção aberta da tela em vigor leva
`aria-current`. **No toque não há hover**: tocar no nome da tela em que se está abre e fecha a lista,
e tocar em outra tela vai até ela.

Ir a uma subseção da **mesma** tela rola suave até ela; de **outra** tela é seco, porque o salto já é
o movimento (`irParaParte`, no `App`).

Não existe faixa de seções no rodapé do celular nem menu na direita do desktop.

### O endereço

`#profile`, `#profile/contact`, `#hobbies/music`, `#journey/projects`, lido e escrito por
`navigation/useHashRoute.ts`. É hash e não caminho porque o site é estático: um caminho de verdade
exigiria o servidor devolvendo `index.html` para qualquer rota, e o `base: './'` deixaria de valer.

**Os nomes no endereço são em inglês, e as chaves do projeto continuam em português.** O endereço
é a única parte da página que alguém lê **fora** do site, num link colado numa mensagem ou numa
candidatura, e ali o inglês alcança os dois idiomas. Traduzir o slug por idioma seria pior: o mesmo
lugar teria dois endereços.

A tradução mora em `SLUG_TELA` e `SLUG_SECAO`, dois `Record` **totais**: uma tela ou uma seção nova
quebra o build até ganhar nome no endereço. **A primeira seção de uma tela não se escreve**
(`#profile`, e não `#profile/home`; `#journey`, e não `#journey/career`): é o endereço que se
compartilha.

- **tela entra por `pushState`, seção por `replaceState`.** Trocar de tela é navegação e o voltar
  deve desfazê-la; rolar uma tela não pode encher o histórico;
- **nada é escrito quando o hash já diz o que se quer escrever**, e isso resolve sem sinalizador o
  caso de chegar por `popstate`;
- **a posição é seca.** Abrir `#profile/contact` posiciona a tela (`scrollTop` direto), sem desfilar
  por tudo que vem antes;
- **o posicionamento acontece na navegação, não num efeito.** Ir de `#profile/contact` para
  `#profile` pela barra não muda estado nenhum quando a rolagem ainda não informou a seção nova, e um
  efeito nunca rodaria. Um efeito de layout só cobre a abertura, quando as telas ainda não existiam;
- **a página assume a restauração de rolagem** (`history.scrollRestoration = 'manual'`, no `main`),
  porque quem decide onde a página abre é o hash.

**Os endereços antigos continuam valendo**, porque circularam em candidaturas. São duas gerações:

- **do site de dois lados**: `#professional/journey` vira `#journey`, `#professional/projects` vira
  `#journey/projects`, `#personal/music` vira `#hobbies/music`, e Sobre e Contato viram a Identidade
  na seção deles. `#professional/education` vira `#profile/about`, porque a Formação virou um bloco
  do Sobre. O primeiro pedaço antigo (`personal`, `professional`) é ignorado e a seção leva à tela em
  que ela mora hoje;
- **de antes da renomeação**: `#dossier` vira `#profile` (`TELA_ANTIGA`), e `#journey/work` vira
  `#journey`, porque a Carreira passou a abrir a Trajetória.

Os slugs de seção que mudaram de sentido ou deixaram de existir (`journey`, `work`, `education`)
têm tradução explícita em `SLUG_ANTIGO`.

O `localStorage` do lado (`portfolio.modo`) não é mais lido nem escrito.

### O título da aba segue o endereço

`navigation/useDocumentTitle.ts`, com `documento` do dicionário (`{nome} - {parte}`). **No Início a
parte é o nome da tela**: "Início" não diz nada a quem olha a aba, "Identidade" diz onde se está. O
`<title>` do `index.html` existe só até o React assumir.

### As setas horizontais são de quem está na tela

↑/↓ são da rolagem da tela; **←/→ são da seção aberta**, sem exigir foco: `useArrowKeys(ativo,
andar)` (`src/hooks/`) registra o listener na janela **enquanto a seção está ativa**. Duas seções
nunca disputam a tecla, porque fora da seção o listener não existe. Hoje quem as reivindica são
a Carreira (a órbita) e Jogos (o deque), cada uma na sua tela, e os componentes de dentro não
duplicam o listener. Projetos pessoais já reivindicou as setas para girar uma órbita, que saiu.

A exceção mora no hook: `editandoTexto()`, porque num campo de texto a seta é do cursor.

Fora da seção `inicio` o HUD cai para opacidade .16. Os anéis **não** encolhem com o buraco negro:
eles ficaram menos chamativos quando ele sai de cena, e isso basta.
