# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primeiro, quem quer conhecer o Lucas como pessoa: amigos, conhecidos e quem chegou por uma rede
social. Junto deles, e com o mesmo site, recrutadores e colegas de área que chegam por um link de
candidatura ou do GitHub. O tom é de página pessoal; o profissional está presente, não é a porta de
entrada.

## Product Purpose

Site pessoal do Lucas Spiazzi (luuspz.dev), desenvolvedor de software. Mostra quem ele é (um dossiê
com bio, valores, dados e formação), do que ele gosta (música, jogos e filmes, lidos ao vivo do
Spotify, da Steam e do Letterboxd), o que ele constrói (um catálogo de projetos lido do GitHub) e por
onde passou (a trajetória profissional). Sucesso é o visitante sair sabendo quem ele é e com um
caminho óbvio para falar com ele.

Deixou de ser um portfólio com dois lados (pessoal e profissional, alternados por um seletor): é um
site só, com as duas coisas.

## Positioning

É a página de uma pessoa, não um currículo: o que aparece em Hobbies e Projetos é dado real e ao vivo
(o que está tocando agora, o que jogou esta semana, o último commit), e não uma lista escrita uma vez.

## Capabilities and Constraints

- SPA em React 19 + TypeScript + Vite, estática, com funções sem servidor na Vercel em `api/` para
  Spotify, Steam, Letterboxd e GitHub (ver `.claude/rules/dados.md`).
- Bilíngue, PT (padrão) e EN, sem string literal na interface.
- Cena espacial em canvas atrás da página, com a supernova que o visitante acende; qualidade
  adaptativa por desempenho.
- Contato por `mailto:` (sem back-end de mensagens) e pelos canais: GitHub, LinkedIn, Instagram e
  TikTok (este ainda sem endereço).
- Endereço por hash (`#secao`), para links compartilháveis num site estático.

## Brand Commitments

- Paleta estritamente monocromática, estética sci-fi/HUD minimalista, IBM Plex Mono. As únicas cores
  são identidade de terceiros (capas, artes, pôsteres, previews de site).
- Nome exibido: Lucas Spiazzi. Handle: catmaitachi / luu.spz.

## Evidence on Hand

- Retrato: `src/assets/retrato.jpg`.
- Bios (profissional e pessoal, esta ainda rascunho) e fatos (aniversário, residência) em
  `src/content/pt.json` / `en.json`.
- Formações (SENAC concluído, PUC cursando, mestrado como pretensão) com logos em
  `src/assets/logos/`; `conclusao` e `progresso` ainda são espaço reservado.
- Trajetória em `experiencia.lista` (o texto da ClinPlaY é rascunho).
- Projetos escolhidos em `shared.json → projetos`.
- **Não existem ainda**: o texto de valores/missão e os campos extras do dossiê (codinome, origem,
  status etc.). Não inventar; deixar espaço reservado marcado em `.claude/rules/pendencias.md`.

## Product Principles

1. **Pessoa antes de currículo.** O site abre em quem ele é; o profissional vem na sequência, sem
   pedir licença.
2. **Dado real ou nada.** O que é ao vivo é ao vivo; o que falta aparece como falta, nunca preenchido
   com texto inventado.
3. **Falar com ele está sempre a um passo.** Os canais ficam no primeiro quadro, e a mensagem fecha o
   dossiê.
4. **A cena é fundo, o conteúdo é o assunto.** O espaço dá identidade; nada nele disputa leitura.

## Accessibility & Inclusion

Navegação completa por teclado, `prefers-reduced-motion` e `prefers-contrast: more` respeitados (ver
`.claude/rules/acessibilidade.md`). O contraste padrão fica abaixo do WCAG AA por decisão estética,
compensado pelo modo de contraste alto.
