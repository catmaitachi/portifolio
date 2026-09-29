## Como o projeto se divide

| Pasta | Papel | Conhece |
|---|---|---|
| `api/` | Funções sem servidor (Vercel). O único código que roda fora do navegador. | `src/data/` (só o tipo) |
| `src/data/` | A forma dos dados de fora, do jeito que a interface os consome. | nada |
| `src/engine/` | Motor de cena em canvas 2D. Uma camada por elemento visual. | nada do projeto |
| `src/content/` | Dicionários JSON, tipos e registro de imagens. | nada |
| `src/i18n/` | Idioma corrente, detecção e persistência. | `content` |
| `src/scene/` | Ponte React ↔ motor e a cena de cada seção. | `engine`, `content` |
| `src/navigation/` | As telas (`Tela`), o cabeçalho (`SectionNav`), o endereço e o título da aba. | `content`, `i18n`, `sections/types` |
| `src/hud/` | Anéis, mira, menu de opções (idioma, qualidade, versão), ícones dos canais, o medidor da supernova e o painel de `?pisos`. | `i18n`, `content`, `scene/qualidade` (o canal da régua) |
| `src/sections/` | Uma pasta por seção, mais o `SectionProps` e as peças que mais de uma usa (`EstadoRemoto`, `PerfilExterno`) e o botão de passo (`.passo`, em `section.module.css`). | `content`, `i18n`, componentes |
| `src/components/` | Peças genéricas (`Figure`). | nada |
| `src/hooks/` | Hooks transversais (`useReducedMotion`, `useArrowKeys`, `useDecipher`, `useInclinacao`, `useRemoto`). | nada |

A dependência só aponta para baixo nessa tabela. **Nenhuma seção importa outra**, e nenhuma sabe qual
é a sua vizinha nem em que tela mora. Recebe duas coisas (`ativo` e `indice`), e o número vem por
prop porque é a posição dela na tela, não um texto. Quem sabe em que tela e em que seção o visitante
está é o `App`; quem arranja as seções de uma tela é a `Tela` (ver `navegacao.md`).

O alias `~` aponta para `src/`: mover um arquivo de pasta não quebra os imports dos vizinhos.

## Projetos servidos em subcaminho

`luuspz.dev/kittens/` é a landing page do [kittens](https://github.com/catmaitachi/kittens), que
continua publicada no GitHub Pages pelo repositório dela. O `vercel.json` só repassa o caminho
(rewrite, a URL não muda), então um deploy lá aparece aqui sem tocar neste repositório.

- **O redirect de `/kittens` para `/kittens/` não é enfeite.** A página usa caminhos relativos
  (`./assets/...`); sem a barra final eles resolvem na raiz do portfólio e nada carrega.
- Não há conflito com a navegação: o endereço das seções é hash (`#personal/music`), nunca caminho.
- Outro projeto no mesmo esquema é mais um par redirect + rewrite com o nome dele.
