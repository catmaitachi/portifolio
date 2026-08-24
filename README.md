# Portfólio — Terminal

Portfólio dark minimalista com interface de terminal interativo, implementado a partir do
design `Portfolio.dc.html` (Claude Design).

Duas telas: **boas-vindas** ("Quem está acessando?") e o **terminal**, onde o conteúdo do
portfólio é navegado por comandos.

Não há entrada anônima: só se entra com um nome. Quem não quiser dar o seu abre o
"Por que devo colocar meu nome?", lê o motivo e sorteia um nome da lista configurável — o
campo é preenchido com ele, ainda editável antes de prosseguir. A sessão registra se o nome
foi `informado` ou `sorteado` (visível em `whoami`).

Stack: React 18 + TypeScript + Vite. Sem dependências de runtime além do React.

---

## Começando

```bash
npm install
cp .env.example .env     # ajuste os valores
npm run dev              # http://localhost:5173
```

| Script                 | O que faz                                                  |
| ---------------------- | ---------------------------------------------------------- |
| `npm run dev`          | servidor de desenvolvimento                                 |
| `npm run build`        | typecheck + build de produção em `dist/`                    |
| `npm run preview`      | serve o build                                               |
| `npm run typecheck`    | só o `tsc --noEmit`                                         |
| `npm run smoke`        | testa registry, parser, motor e fonte de dados (sem browser) |
| `npm run render-check` | monta a árvore React em string e valida todos os blocos     |
| `npm test`             | os dois acima                                               |

---

## Arquitetura

```
src/
├─ config/           configuração: .env → objeto tipado e imutável
│  ├─ env.ts         leitura/validação de variáveis (único lugar que toca import.meta.env)
│  └─ app.config.ts  o objeto `config` consumido pelo resto do app
│
├─ data/             conteúdo do portfólio, independente da origem
│  ├─ types.ts       contrato `PortfolioContent`
│  ├─ source.ts      interface `ContentSource`
│  └─ sources/       staticSource (seed + env) · httpSource (API/DB) · resolvedor
│
├─ content/seed/     dados padrão versionados junto ao código
│
├─ terminal/         núcleo, sem React nem DOM
│  ├─ types.ts       blocos de saída, contexto e contrato de comando
│  ├─ output.ts      construtores de blocos (out.text, out.list, out.table…)
│  ├─ parse.ts       tokenizador (aspas, flags)
│  ├─ registry.ts    registro, aliases, autocompletar, "você quis dizer…"
│  ├─ engine.ts      executa uma linha e devolve blocos
│  └─ commands/      um arquivo por comando
│
├─ components/
│  ├─ blocks/        registry de renderizadores: bloco → componente
│  └─ terminal/      janela, barra de título, saída, sugestões, diálogos
│
└─ hooks/            useContent · useTerminal · useTheme
```

### A ideia central

Um comando **não devolve texto nem JSX** — devolve *blocos de saída* descritivos:

```ts
return [
  out.heading('Trabalhos selecionados', '4 projetos'),
  out.list(projetos.map(p => ({ index: p.index, title: p.name, command: `projetos ${p.id}` }))),
];
```

Quem sabe desenhar cada bloco é o registry em `src/components/blocks`. Consequências práticas:

- mudar a aparência de **todas** as tabelas = editar um componente;
- criar um tipo de saída novo não exige tocar no motor do terminal;
- o núcleo (`src/terminal/`) roda sem DOM — daí o `npm run smoke`.

---

## Customização

### Adicionar um comando

Crie `src/terminal/commands/curriculo.ts`:

```ts
import { compose, heading, links } from '../output';
import type { CommandDefinition } from '../types';

export const curriculoCommand: CommandDefinition = {
  name: 'curriculo',
  aliases: ['currículo', 'cv'],
  summaryKey: 'cmd.curriculo.summary', // a chave precisa existir nos dicionários
  category: 'portfólio',
  run() {
    return compose(
      heading('Currículo'),
      links([{ label: 'PDF', url: '/cv.pdf' }]),
    );
  },
};
```

E registre em `src/terminal/commands/index.ts`. O comando já aparece em `ajuda`, no
autocompletar (Tab) e nas sugestões de erro — nada mais precisa mudar.

O que um comando recebe em `ctx`:

| Campo      | Uso                                                              |
| ---------- | ---------------------------------------------------------------- |
| `args`     | argumentos posicionais, com aspas já resolvidas                   |
| `flags`    | `--chave=valor` e `--flag`                                       |
| `content`  | o `PortfolioContent` carregado                                    |
| `session`  | nickname, origem do nome (`typed`/`random`), início da sessão     |
| `actions`  | efeitos: `clear`, `back`, `openProject`, `setAccent`, `setThemeMode`, `setLocale`, `print`, `run` |
| `registry` | os outros comandos (usado por `ajuda`)                            |
| `history`  | linhas já impressas (usado por `historico`)                       |
| `t`        | tradutor preso ao idioma atual: `t('cmd.x.heading')`              |
| `locale`   | o idioma, para `toLocaleString` e afins                           |

Comandos podem ser `async`: o retorno é aguardado antes de imprimir, e `actions.print()`
permite emitir saída parcial no meio do caminho.

Para desligar um comando sem apagar o arquivo: `VITE_DISABLED_COMMANDS="sudo,diag"`.

### Criar um tipo de saída próprio

```tsx
// em algum módulo de inicialização
import { registerBlockRenderer } from '@/components/blocks';

registerBlockRenderer<{ nota: number }>('avaliacao', ({ payload }) => (
  <div className="block">nota: {payload.nota}</div>
));

// no comando
return [out.custom('avaliacao', { nota: 9.4 })];
```

### A aba de detalhes do projeto

Clicar num item da lista de projetos — ou digitar `projetos aurora` — **minimiza o terminal
para a barra de baixo e abre uma aba de detalhes** por cima da mesa: papel, cliente, período,
situação, estudo de caso, decisões & resultados, ferramentas, links e navegação para o
projeto anterior/próximo.

Clique e comando passam pelo mesmo caminho: o item da lista carrega `command:
"projetos <id>"`, e é o próprio comando que chama `actions.openProject(id)`. Uma
implementação, duas portas de entrada — o bloco de lista continua genérico, sem saber o que
é um projeto.

Fechar a aba (botão vermelho, `Esc`, "voltar ao terminal" ou clique na barra de baixo)
devolve o terminal ao lugar. Se a mesa estava em tela cheia, ela permanece durante a troca.

Os campos da aba são opcionais em `Project` ([src/data/types.ts](src/data/types.ts)):
`client`, `period`, `status`, `highlights`, `stack` e `links`. O que faltar simplesmente não
é desenhado — nenhuma seção vazia aparece.

### A foto do `sobre`

O comando `sobre` desenha uma ficha no estilo `neofetch`/`fastfetch`: foto à esquerda,
`usuario@host` com o traço do mesmo tamanho, linhas `OS / Host / Kernel / Uptime / Packages`
e as amostras de cor do terminal embaixo. O conteúdo todo sai do `PortfolioContent` — os
grupos de skills viram linhas como as de CPU/GPU do original.

Para usar a sua foto, coloque o arquivo em `public/` e aponte a variável:

```bash
VITE_OWNER_AVATAR="/eu.jpg"
```

Sem isso, fica o placeholder [`public/avatar.svg`](public/avatar.svg). Se o arquivo apontado
não existir, o cartão cai para o losango da marca em vez de mostrar imagem quebrada.

### Opções globais (botão flutuante)

O botão no canto inferior direito abre o painel que vale para o site inteiro — boas-vindas,
terminal e aba de projeto:

| Opção             | Efeito                                              | Também por comando        |
| ----------------- | --------------------------------------------------- | ------------------------- |
| **Cor principal** | variável CSS `--accent`, usada em tudo               | `tema #8ab4f8` · `tema 2` |
| **Aparência**     | `data-theme` no `<html>`: claro ou escuro            | `tema claro` · `tema escuro` |
| **Scanlines**     | overlay do terminal                                  | `tema scanlines off`      |
| **Idioma**        | `pt-BR` / `en`, também no atributo `lang`            | `idioma en`               |

As quatro vivem num contexto só ([`src/settings`](src/settings/index.tsx)) e persistem no
`localStorage` do visitante. O menu da barra de título ficou só com ações do terminal
(histórico, limpar) para não haver duas fontes de verdade na interface.

### Trocar a aparência

Todos os tokens visuais estão em `:root` no topo de `src/styles/global.css`, e o tema claro
é um bloco `:root[data-theme='light']` que redefine **só os tokens** — nenhum componente sabe
que existem dois temas. Ao criar CSS novo, use os tokens (`--border`, `--hairline`,
`--hover-surface`, `--text-strong`…) em vez de cores cruas, ou o tema claro quebra.

### Idiomas

O dicionário pt-BR ([`src/i18n/dictionaries/pt-BR.ts`](src/i18n/dictionaries/pt-BR.ts)) é a
fonte de verdade: suas chaves definem o tipo `TranslationKey`, e cada idioma é um
`Record<TranslationKey, string>` — chave faltando ou com nome errado é erro de compilação.

Para adicionar um idioma: crie o dicionário, registre em `src/i18n/index.ts`, some o código
em `LOCALES` e o rótulo em `LOCALE_LABELS`. Habilite com `VITE_LOCALES`.

Escopo do que traduz: **a interface e as saídas dos comandos**. Ficam de fora, de propósito:

- **nomes de comandos** — `sobre`, `projetos`, `ajuda` são o "sistema operacional" do site e
  não mudam de nome; os aliases em inglês (`about`, `projects`, `help`, `clear`, `exit`) já
  atendem quem digita em inglês;
- **o conteúdo do portfólio** (bio, projetos, skills), que vem do `ContentSource`. Para
  servi-lo traduzido, a API pode usar o idioma atual como parâmetro — o contrato de dados
  não muda;
- **o histórico já impresso** — trocar o idioma no meio da sessão não reescreve o que já
  rolou na tela, igual a um terminal de verdade. As saídas seguintes já saem no novo idioma.

---

## Dados e configuração

Nada de conteúdo fica escrito nos componentes. A cadeia é:

```
.env  →  src/config  →  ContentSource  →  PortfolioContent  →  comandos  →  blocos
```

**Fonte estática** (padrão, `VITE_CONTENT_SOURCE=static`): mescla o seed tipado em
`src/content/seed/` com as sobrescritas do `.env` (identidade e contatos).

**Fonte remota** (`VITE_CONTENT_SOURCE=http`): faz `GET` em `VITE_CONTENT_API_URL` e espera
um JSON no formato de `PortfolioContent`; campos ausentes caem no seed. Se a chamada falhar,
o app entra em modo degradado com os dados locais e avisa na tela de boas-vindas.

### Caminho para um banco de dados

O contrato já está pronto para isso: `ContentSource` só precisa devolver um
`PortfolioContent`.

1. Suba uma API que leia do banco e devolva o JSON no formato de `src/data/types.ts` — as
   entidades (`projects`, `skills`, `contacts`, `experience`) já mapeiam 1:1 para tabelas,
   cada uma com `id` próprio.
2. Aponte `VITE_CONTENT_API_URL` para ela e mude `VITE_CONTENT_SOURCE` para `http`.

Para acesso direto a um SDK (Supabase, Prisma via edge function, CMS), crie
`src/data/sources/<nome>Source.ts` implementando a mesma interface, registre no resolvedor
`src/data/sources/index.ts` e adicione o nome em `CONTENT_SOURCES`. Os comandos e componentes
não mudam.

### Registro de visitantes

O nickname é gravado no `localStorage` do visitante, junto com a origem (`typed`/`random`).
Se `VITE_SESSION_LOG_ENDPOINT` estiver definido, também é enviado por `POST` — é o gancho
pronto para uma tabela `visitors`.

### Nomes sorteáveis

A lista padrão está em [`src/content/seed/nicknames.seed.ts`](src/content/seed/nicknames.seed.ts).
Para trocá-la sem tocar no código, defina `VITE_RANDOM_NICKNAMES` (separada por vírgulas):

```bash
VITE_RANDOM_NICKNAMES="sombra,corvo,neblina,espectro"
```

O sorteio nunca repete o nome anterior, então "sortear outro" sempre muda alguma coisa.

### Variáveis de ambiente

Documentadas com valores de exemplo em [`.env.example`](.env.example): identidade, aparência,
comandos sugeridos/desabilitados, fonte de conteúdo, registro de sessão e contatos.

> Tudo que começa com `VITE_` é embutido no bundle do cliente. Nunca coloque segredos aí —
> credenciais de banco ficam na API, não aqui. O comando `diag` mostra a configuração em uso
> e lista variáveis ignoradas por estarem inválidas.

---

## Comandos disponíveis

| Comando       | Atalhos                     | Descrição                              |
| ------------- | --------------------------- | -------------------------------------- |
| `ajuda`       | `help`, `?`                 | lista os comandos (`ajuda <comando>` detalha) |
| `sobre`       | `about`, `bio`, `neofetch`  | ficha estilo neofetch: foto + dados    |
| `projetos`    | `projects`, `work`          | lista; `projetos <nome>` abre a aba de detalhes |
| `skills`      | `stack`, `ferramentas`      | ferramentas por grupo                  |
| `experiencia` | `xp`, `cv`                  | trajetória profissional                |
| `contato`     | `contact`, `links`          | e-mail e redes                         |
| `tema`        | `theme`, `cor`              | cor, aparência (claro/escuro) e scanlines |
| `idioma`      | `lang`, `language`          | troca o idioma da interface            |
| `whoami`      | `eu`, `sessao`              | dados da sessão atual                  |
| `historico`   | `history`                   | comandos executados                    |
| `diag`        | `config`, `status`          | configuração e origem dos dados        |
| `limpar`      | `clear`, `cls`              | limpa a saída                          |
| `voltar`      | `back`, `reset`             | volta às boas-vindas                   |
| `sair`        | `exit`, `quit`              | encerra a sessão (com confirmação)     |

Atalhos de teclado: **Tab** completa · **↑/↓** navegam no histórico · **Ctrl+L** limpa ·
**Esc** fecha menu e diálogos.

Controles da janela: o botão vermelho encerra a sessão, o amarelo minimiza para a barra
inferior e o verde alterna **tela cheia** — usando a Fullscreen API do navegador, então
**Esc** ou **F11** também saem, e a UI acompanha. Onde a API não estiver disponível (iOS
Safari, iframe sem `allow="fullscreen"`), a janela ainda passa a ocupar toda a viewport.
