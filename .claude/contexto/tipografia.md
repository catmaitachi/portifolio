## Seleção de texto

O padrão da página é **`user-select: none`** (`reset.css`, no `body`), e o conteúdo reabre a seleção
por **elemento**, não por classe: `h1 h2 h3 p li input textarea`. Título, subtítulo e parágrafo já
são esses elementos em toda a página, então a regra vale para o que existe hoje e para o que for
escrito depois — não há uma lista de classes para manter em sincronia.

O motivo é interação, não estética: metade da página é **superfície de arraste** (órbita de Projetos,
curva da Trajetória, carrossel de formações). Arrastar um controle não pode pintar meia tela de azul,
e uma seleção acidental engole o `pointerup` que decide se houve clique ou arrasto.

`input`/`textarea` **não são opcionais** na lista de exceções: no Safari, um `user-select: none`
herdado chega a impedir a digitação no campo. Por isso também o `-webkit-user-select` duplicado — o
Safari só dispensa o prefixo a partir da 17, e a sintaxe de faixa (`width <= 640px`) já roda desde a
16.4.

As exceções moram no módulo de quem as pede, nunca no global:

| Onde | O quê | Por quê |
|---|---|---|
| `section.module.css → .indice` | `none` | é `<p>` por semântica, mas lê como marcador: ninguém copia "01" |
| `HeroSection → .etiqueta` | `none` | ornamento do nome, entre dois riscos |
| `JourneyEntry → .numero` | `none` | copiar a atividade não deve trazer a numeração junto |
| `JourneyEntry → .org` | `text` | subtítulo do cargo, e `<span>` não entra na regra global |
| `ProjectCard → .linha` | `text` | idem, resumo sob o nome do projeto |
| `ContactSection → .email` | `text` | é um `<a>`, e existe justamente para ser copiado |

---

## Parágrafos justificados

Todo `<p>` é justificado (`reset.css`), e a regra vale **por elemento**, como a da seleção de texto:
parágrafo é `<p>` em toda a página, então ela alcança o que ainda não foi escrito.

`text-align: justify` sozinho abre rios de espaço em branco, e aqui o caso é o pior possível: a
página inteira é IBM Plex Mono, **monoespaçada**, então o ajuste não pode sair da largura dos
glifos — sobra tudo para o espaço entre palavras. São as outras três declarações que tornam a
justificação aceitável, e nenhuma delas é opcional:

| Declaração | O que resolve |
|---|---|
| `hyphens: auto` | quebra a palavra no fim da linha em vez de esticá-la — é o que o LaTeX faz |
| `hyphenate-limit-chars: 6 3 3` | recusa palavra de menos de 6 letras e nunca deixa menos de 3 de cada lado do hífen. O padrão (5 2 2) pica palavras curtas e o texto vira uma escada de hífens |
| `text-wrap: pretty` | o Chrome escolhe as quebras olhando o parágrafo inteiro, não linha a linha — a ideia do algoritmo do Knuth: tira o buraco de uma linha e o distribui pelas vizinhas |

**A hifenização depende de `<html lang>`**, e é por isso que o `LanguageProvider` reflete o idioma
por `useEffect` e não nos dois callbacks de troca. Antes, um visitante detectado como `en` ficava
com o `lang="pt-BR"` do `index.html` até trocar de idioma na mão — o que não tinha consequência
visível e passou a ter: texto inglês partido por regras do português.

Onde falta suporte (o Firefox ainda não tem `hyphenate-limit-chars`) o parágrafo continua
justificado e hifenizado, só com quebras menos bem escolhidas.

Duas exceções, e são os mesmos dois `<p>` que já se excluíam da seleção de texto — pela mesma razão,
não são texto corrido:

| Onde | O quê |
|---|---|
| `section.module.css → .indice` | `text-align: left` + `hyphens: manual` — lê como marcador |
| `HeroSection → .etiqueta` | idem; uma palavra só, e não há por que parti-la ao meio |

Ficam de fora por não serem `<p>`: os títulos, os chips, os rótulos do HUD e os `<li>` das
atividades da Trajetória — frases de uma linha, onde justificar não muda nada e hifenizar só
introduziria hífen.
