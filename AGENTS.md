# Portfólio — arquitetura e decisões

Documento vivo. **Atualizar sempre que uma camada, seção ou animação for adicionada/alterada.**

SPA em React 19 + TypeScript + Vite. Site pessoal, tema espacial, paleta estritamente monocromática,
três telas (Dossiê, Hobbies, Trajetória) que rolam por dentro e se trocam pelo cabeçalho.

```
npm install
npm run dev          # servidor de desenvolvimento
npm run build        # tsc -b && vite build
npm run lint         # só a checagem de tipos
npm run check:i18n   # confere se pt.json e en.json continuam paralelos
npx react-doctor@latest --verbose   # revisão de qualidade periódica
```

---

## Como esta documentação está organizada

O conteúdo vive em `.claude/rules/` (leia o tema antes de mexer no código dele), um arquivo por tema. Cada um declara no frontmatter (`paths:`)
os arquivos do código a que se refere, e o Claude Code só o carrega quando a sessão lê um desses
arquivos. Mexer no motor puxa `motor.md` e `cena.md`, e nenhum dos outros. `arquitetura.md` não tem
`paths:`, então entra em toda sessão.

Antes eram `@` neste índice, e os quinze entravam inteiros em toda sessão (~55 mil tokens) mesmo
para mexer num JSON.

**Três regras decorrem disso:**

- ao mexer no projeto, atualize o arquivo do tema, não este índice. Tema novo = arquivo novo em
  `.claude/rules/` **com `paths:`**, senão ele volta a custar em toda sessão;
- se uma decisão vale para uma pasta que o `paths:` do tema não cobre, acrescente a pasta ao
  frontmatter. Uma regra fora do escopo é uma regra que não é lida;
- uma pergunta sobre o projeto que não passe por arquivo nenhum (o que está pendente, por que algo
  foi decidido) se responde lendo o tema pela tabela abaixo.

| Arquivo | O que guarda |
|---|---|
| `arquitetura.md` | as camadas do projeto, o que cada pasta conhece e o alias `~` (sempre carregado) |
| `direcao-visual.md` | paleta, tokens de cor, tipo e tempo, cantos chanfrados e o ícone da aba |
| `motor.md` | `src/engine/`: camadas, contrato de desempenho, constelações, câmera |
| `cena.md` | o plano de cena por seção e a Super-Nova que o visitante acende |
| `conteudo.md` | i18n e como acrescentar projeto, experiência, formação ou seção |
| `dados.md` | `api/` e `src/data/`: Spotify, Steam, Letterboxd e GitHub, e por que não dá do navegador |
| `navegacao.md` | as telas, as abas, o cabeçalho, o endereço e o teclado |
| `entradas.md` | o gesto de entrada de cada seção, as ondas da curva e a decifragem da bio |
| `hud.md` | anéis, mira, versão, o cabeçalho no HUD e o medidor da supernova |
| `responsivo.md` | tokens por componente e o contrato do topo |
| `tipografia.md` | seleção de texto e parágrafos justificados |
| `secoes.md` | Sobre, Projetos, Trajetória e Contato, uma a uma |
| `acessibilidade.md` | aria, foco, tabulação e `inert` |
| `react.md` | o que a revisão com React Doctor fixou, e os falsos positivos aceitos |
| `pendencias.md` | o que está em aberto no conteúdo e no código |
