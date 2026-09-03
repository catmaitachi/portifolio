# Portfólio — arquitetura e decisões

Documento vivo. **Atualizar sempre que uma camada, seção ou animação for adicionada/alterada.**

SPA em React 19 + TypeScript + Vite. Tema espacial, paleta estritamente monocromática, cinco seções
navegáveis por rolagem com snap.

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

O conteúdo vive em `.claude/contexto/`, um arquivo por tema, e é **puxado por inteiro** pelos `@` da
lista abaixo: tudo continua valendo em toda sessão, exatamente como quando era um arquivo só. Um
link markdown comum não teria esse efeito, e as regras passariam a depender de alguém abrir o
arquivo certo.

Ao mexer no projeto, atualize o arquivo do tema, não este índice. Este aqui só cresce quando nasce
um tema novo.

| Arquivo | O que guarda |
|---|---|
| `arquitetura.md` | as camadas do projeto, o que cada pasta conhece e o alias `~` |
| `direcao-visual.md` | paleta, estética, cantos chanfrados e o ícone da aba |
| `motor.md` | `src/engine/`: camadas, contrato de desempenho, constelações, câmera |
| `cena.md` | o plano de cena por seção e a Super-Nova que o visitante acende |
| `conteudo.md` | i18n e como acrescentar projeto, experiência, formação ou seção |
| `navegacao.md` | rolagem por seções, teclado e a faixa do mobile |
| `entradas.md` | o gesto de entrada de cada seção, as ondas da curva e a decifragem da bio |
| `hud.md` | anéis, mira, versão, crédito, medidor da supernova e notificações |
| `responsivo.md` | tokens por componente, o rodapé do mobile e a escala que cabe na tela |
| `tipografia.md` | seleção de texto e parágrafos justificados |
| `secoes.md` | Sobre, Projetos, Trajetória e Contato, uma a uma |
| `acessibilidade.md` | aria, foco, tabulação e `inert` |
| `react.md` | o que a revisão com React Doctor fixou, e os falsos positivos aceitos |
| `pendencias.md` | o que está em aberto no conteúdo e no código |

@.claude/contexto/arquitetura.md
@.claude/contexto/direcao-visual.md
@.claude/contexto/motor.md
@.claude/contexto/cena.md
@.claude/contexto/conteudo.md
@.claude/contexto/navegacao.md
@.claude/contexto/entradas.md
@.claude/contexto/hud.md
@.claude/contexto/responsivo.md
@.claude/contexto/tipografia.md
@.claude/contexto/secoes.md
@.claude/contexto/acessibilidade.md
@.claude/contexto/react.md
@.claude/contexto/pendencias.md
