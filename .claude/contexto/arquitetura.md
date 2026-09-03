## Como o projeto se divide

| Pasta | Papel | Conhece |
|---|---|---|
| `src/engine/` | Motor de cena em canvas 2D. Uma camada por elemento visual. | nada do projeto |
| `src/content/` | Dicionários JSON, tipos e registro de imagens. | nada |
| `src/i18n/` | Idioma corrente, detecção e persistência. | `content` |
| `src/scene/` | Ponte React ↔ motor e a cena de cada seção. | `engine`, `content` |
| `src/navigation/` | Rolagem por seções, teclado e menu. | `content`, `i18n` |
| `src/hud/` | Anéis, mira, seletor de idioma, crédito, versão, notificações. | `i18n` |
| `src/sections/` | Uma pasta por seção. | `content`, `i18n`, componentes |
| `src/components/` | Peças genéricas (`Figure`). | nada |
| `src/hooks/` | Hooks transversais (`useReducedMotion`, `useArrowKeys`, `useDecipher`, `useMediaQuery`, `useEscalaQueCabe`). | nada |

A dependência só aponta para baixo nessa tabela. **Nenhuma seção importa outra**, e nenhuma sabe o
próprio índice — recebe apenas `ativo: boolean`. Quem conhece a lista de seções é o `App`.

O alias `~` aponta para `src/`: mover um arquivo de pasta não quebra os imports dos vizinhos.
