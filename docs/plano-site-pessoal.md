# Plano: de portfólio a site pessoal

**Estado:** fase 1 (navegação) implementada em 2026-09-27, no ramo `feat/site-pessoal`; o que ela
decidiu já está em `.claude/rules/navegacao.md`. Pedido novo depois dela: **uma direção visual
cinematográfica**, que troca o mundo visual inteiro e passa na frente das fases 2 e 3. Quando cada fase for implementada, o que ela decidiu passa para o
tema certo em `.claude/rules/`, e este arquivo encolhe até sumir.

Decidido na entrevista:

| Pergunta | Resposta |
|---|---|
| Rolagem | cada seção é uma tela e rola por dentro; o cabeçalho troca de seção |
| Hobbies | abas internas: Música · Jogos · Filmes, uma de cada vez |
| Preview dos projetos | captura automática do site do repositório |
| Contato | os ícones dos canais sobem para o hero; o formulário continua, no fim do Dossiê |
| Bio | as duas viram uma só, com um espaço de valores/missão |
| Campos do dossiê | eu proponho, o Lucas preenche; o que não existe fica reservado |
| Público | pessoal primeiro, profissional junto |
| Trajetória | vira a terceira seção, com abas Projetos · Profissional (a curva de hoje) |
| Crédito "feito com Claude" | sai do site |
| Nav no celular | no topo, como no desktop; a faixa de seções de baixo deixa de existir |

O produto está em `PRODUCT.md`.

---

## Parte 1: o brief de design

**Trabalho e público.** Quem chega quer saber quem é o Lucas: amigo, conhecido ou recrutador pelo
mesmo link. O site passa a ser uma pessoa em três telas, e não um currículo com dois lados. Modo
de visita: **Experience** (o conteúdo é o assunto, a interface recua), com Projetos e Trajetória
lidos em modo **Read**.

**Sequência.**

| Nav | O que tem | Rola por dentro |
|---|---|---|
| **Dossiê** | o hero de hoje (nome, etiqueta, legenda, buraco negro, anéis) com os canais embaixo, e logo abaixo o dossiê: retrato, bio, valores/missão, campos, formação e o formulário | sim, é a seção mais longa |
| **Hobbies** | abas Música · Jogos · Filmes, cada uma com o destaque e a faixa de hoje | sim, quando a aba não cabe |
| **Trajetória** | abas Projetos · Profissional. Projetos é o catálogo: cada projeto com o preview do site, o que o cartão de hoje diz e os links. Profissional é a curva e a ficha de hoje | Projetos sim; Profissional raramente |

**Direção visual: herdada, não trocada.** O mundo é o de hoje: preto profundo, monocromático, HUD,
linhas de 1px, chanfros, IBM Plex Mono. O "dossiê sci-fi" é uma composição **dentro** desse mundo:
ficha técnica, campos em versalete com o valor embaixo (a gramática dos fatos do Sobre e do pé do
crachá), marcações de classificação, cantos de mira. Não é um mundo novo. As cores dos previews de
site entram pela mesma exceção das capas e dos pôsteres.

**Duas composições estão em aberto e passam por uma rodada de conceito na fase delas**
(`impeccable` → `concept-seed --scope surface`, com referências reais da `creative-block`):

1. o dossiê: como retrato, bio, valores, campos e formação se arranjam numa ficha;
2. o catálogo: grade, lista ou coluna de "telas", e o que acontece com a órbita 3D.

O resto (a nav, as abas de Hobbies e de Trajetória, e os canais no hero) é extensão de peça que já existe e não pede
rodada.

**As abas são uma peça só.** Hobbies e Trajetória usam o mesmo componente de abas, com a aba no
endereço: duas seções vizinhas com sub-navegações diferentes leriam como descuido, que é a regra da
`Faixa`.

**Os canais no hero.** Uma linha discreta onde hoje está o crédito: ícone e identificador de cada
canal com `url`, na gramática do crédito (riscos de 1px, `--tx-apagado`, acendendo no hover). O e-mail
fica no formulário, que já o mostra grande. O crédito "feito com Claude" sai do site.

**Estados.**

- Dossiê: um campo sem valor aparece como `[ reservado ]`, apagado, e nunca com dado inventado. Os
  valores/missão ficam no mesmo estado até o texto existir.
- Hobbies: os três estados remotos de hoje (esperando, falhou, vazio) por aba; uma aba só busca
  quando é aberta.
- Projetos: repositório sem *Website* não tem preview. O cartão mostra o código de barras de commits
  no lugar, que é dado dele; nada de imagem genérica. Falha na captura cai no mesmo caso.
- Trajetória: cada aba tem os próprios estados; Projetos busca o GitHub só quando é aberta.
- Faixa de conteúdo: 2 a 12 projetos, 1 a 15 experiências, 3 formações.

**Anti-objetivos.**

- Não voltar a ter conteúdo escondido atrás de clique, nem pop-up.
- A nav não pode disputar o olho com o nome no hero.
- Nada de rolagem aninhada ambígua: dentro de uma seção a roda rola a seção, e só isso.
- Não quebrar os links antigos de candidatura (`#professional/journey` precisa chegar à Trajetória).

---

## Parte 2: ADR-001, a navegação por seções-tela

**Status:** proposto · **Decide:** Lucas

### Contexto

Hoje a página é um contêiner com `scroll-snap-type: y mandatory`, uma seção por tela, e **nenhuma
seção pode rolar**: rolar é trocar de seção. Tudo que não cabia foi resolvido encolhendo o conteúdo
(`useEscalaQueCabe`, que escreve um `zoom`). Em volta disso cresceram peças caras: o travamento de
índice durante a rolagem programática, a faixa do mobile que rola a página por fração, o gesto que
começa no toque e termina na janela, e o laço de medida do `zoom`, que já fez a tela tremer uma vez.
Por cima, os dois modos multiplicam a lista de seções, os canais e as bios.

O pedido novo é o oposto: seções que rolam, uma nav no cabeçalho e um site só.

### Decisão

1. **Seção = tela.** As três seções ficam montadas e empilhadas no mesmo lugar. Só a ativa aparece
   e recebe ponteiro; as outras ficam `inert` e invisíveis. Cada uma é o próprio contêiner de
   rolagem (`overflow-y: auto`). Trocar de seção é uma transição de opacidade, sem rolagem.
2. **O `ativo` continua sendo a prop.** As entradas de hoje penduram em `data-ativo`, e isso continua
   valendo sem mudança. Dentro do Dossiê, os blocos abaixo do hero entram quando aparecem na rolagem
   (um `IntersectionObserver`), com o mesmo `data-entrada`.
3. **A cena segue a posição, não só a seção.** O `SpaceCanvas` já recebe uma chave de céu. Ela passa
   a sair de "seção + onde se está": o hero do Dossiê é o céu `inicio` (buraco negro, HUD aceso), o
   corpo do Dossiê é o céu `sobre`, cada aba de Hobbies e de Trajetória é o céu dela (`projetos` e
   `experiencia` continuam existindo). O HUD apaga quando o hero sai de
   vista, como hoje apaga fora do Início.
4. **O endereço** é `#dossier`, `#hobbies/music`, `#journey/projects`, `#journey/work`. A aba entra por
   `replaceState`, a seção por `pushState` (trocar de seção passa a ser navegação, e o voltar deve
   desfazê-la). Os endereços antigos são traduzidos uma vez, na leitura: `#professional/journey`
   vira `#journey/work`, `#professional/projects` vira `#journey/projects`, `#personal/music` vira
   `#hobbies/music`, e Sobre, Formação e Contato viram
   `#dossier`.
5. **Teclado:** ↑/↓, PageUp/Down, Home/End e espaço rolam a seção ativa, que é nativo desde que ela
   receba o foco ao ser aberta (`tabIndex={-1}` e `focus({ preventScroll: true })`). Trocar de seção
   é pela nav. ←/→ continuam sendo de quem está na tela (o catálogo, a curva, e as abas quando o
   foco estiver nelas).

### Opções consideradas

| | Seções-tela (escolhida) | Página contínua | Snap + rolagem interna |
|---|---|---|---|
| Complexidade | baixa: apaga a maior parte da navegação atual | média: cena e HUD por posição em tudo | alta: gestos brigando |
| Céu por seção | mantido | vira troca durante a rolagem | mantido |
| Entradas por `data-ativo` | mantidas | todas viram por visibilidade | mantidas |
| Risco | foco e rolagem por seção, conhecidos | perde o "uma seção por vez" | a roda ora rola, ora troca |

### O que sai

| Peça | Por quê |
|---|---|
| `shared.json → modos`, `secoesDoModo`, `canaisDoModo`, `ModoKey`, `SLUG_MODO`, `portfolio.modo` | um site só |
| `sobre.paragrafos` por modo, `modos` nos dicionários | uma bio, um Início |
| `hud/ModeHeader` | vira a nav de seções (`navigation/SectionNav`), no mesmo lugar |
| `navigation/NavMenu` (menu da direita e a faixa do mobile) | a nav do cabeçalho substitui os dois, no topo também no celular |
| `hud/Credit` e `credito` nos dicionários | o crédito sai do site |
| `navigation/useSectionScroll` | não há mais rolagem entre seções |
| `hooks/useEscalaQueCabe` e `--esc`/`--esc-max` | o conteúdo que não cabe agora rola |
| seções `formacao` e `contato` como telas | viram blocos do Dossiê |
| `projetos` e `experiencia` como telas | viram as abas de Trajetória |
| `musica`, `jogos` e `filmes` como telas | viram as abas de Hobbies |
| `ChannelCard` como cartão grande | os canais viram uma linha no hero |

Isso apaga perto de 800 linhas de TypeScript de navegação (`NavMenu`, `useSectionScroll`,
`useEscalaQueCabe` e `ModeHeader`, sem contar o CSS deles, mais o `Credit`) que existiam para contornar a rolagem que agora é
permitida. O que se perde é a navegação por roda entre seções: quem rolava para descobrir o que vinha
depois passa a ter a nav à vista o tempo todo.

### Consequências

- **Mais fácil:** seção nova com conteúdo alto não precisa caber; a escala nunca mais treme; o mobile
  perde o gesto mais frágil do projeto.
- **Mais difícil:** a cena e o HUD passam a depender da posição dentro do Dossiê; cada seção precisa
  cuidar do foco ao abrir.
- **Revisitar:** o `data-ativo` pausa a animação das seções inativas (`section.module.css`), e isso
  continua valendo; conferir que os `<animateMotion>` da Trajetória continuam desmontados fora dela.

---

## Parte 3: o catálogo e o preview

**`api/preview.ts`**, uma função nova, e não um campo a mais em `api/github`:

- recebe `?repo=dono/nome` e **só aceita** repositório listado em `shared.json → projetos`. Sem isso
  ela seria um proxy de screenshot aberto para qualquer URL;
- descobre o *Website* do repositório, pede a captura a um serviço (Microlink, por padrão; o plano
  gratuito dá 50 capturas por dia) e **devolve a imagem**, não a URL do serviço;
- cache de borda longo (`s-maxage` de um dia, `stale-while-revalidate` de uma semana). Com três
  projetos isso dá poucas chamadas por dia ao serviço, qualquer que seja o tráfego;
- sem *Website* ou com falha na captura responde 404, e o cartão cai no código de barras.

Separada de `api/github` porque os ritmos são diferentes: a lista de repositórios vence em uma hora,
uma captura vale um dia.

---

## Parte 4: as fases

Cada fase é um conjunto de commits num ramo `feat/site-pessoal`, e a página funciona ao fim de cada
uma.

1. **Navegação** (ADR-001): um site só, seções-tela, `SectionNav` no cabeçalho, endereços novos com a
   tradução dos antigos, foco e teclado. Dossiê provisório = Início + Sobre + Formação + Contato
   empilhados como estão; Hobbies e Trajetória com as abas, sobre as seções de hoje. Sai tudo da tabela *O que sai*.
2. **Dossiê**: rodada de conceito da ficha, depois a construção. A bio unida (rascunho nos dois
   idiomas), o espaço de valores/missão, os campos propostos com os reservados em `pendencias.md`, a
   formação dentro, os canais no hero no lugar do crédito.
3. **Projetos** (aba de Trajetória): `api/preview.ts`, rodada de conceito do catálogo, construção.
4. **Acabamento**: céus e constelações da nova lista (sem repetir `placement`), entradas por
   visibilidade no Dossiê, `impeccable detect`, React Doctor, acessibilidade, e a documentação:
   `navegacao.md` reescrito, `secoes.md`, `hud.md`, `conteudo.md`, `cena.md`, `responsivo.md`,
   `entradas.md`, `acessibilidade.md`, `docs/requisitos.md`, `docs/historias.md`, e a frase "cinco
   seções navegáveis por rolagem com snap" no `CLAUDE.md`.

### Em aberto, para a fase de cada um


- os campos exatos do dossiê (a proposta vai na rodada de conceito);
- o conceito do dossiê e o do catálogo.
