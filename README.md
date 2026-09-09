<div align="center">

<pre>
~/

█▀█ █▀█ █▀▄ ▀█▀ █▀▀ █▀█ █   █ █▀█
█▀▀ █ █ █▀▄  █  █▀▀ █ █ █   █ █ █
▀   ▀▀▀ ▀ ▀  ▀  ▀   ▀▀▀ ▀▀▀ ▀ ▀▀▀
by Catmaitachi
</pre>

**[luuspz.dev](https://luuspz.dev)**

![React](https://img.shields.io/badge/React-000000?style=flat-square&logo=react&logoColor=white) ![TypeScript](https://img.shields.io/badge/TypeScript-000000?style=flat-square&logo=typescript&logoColor=white) ![Vite](https://img.shields.io/badge/Vite-000000?style=flat-square&logo=vite&logoColor=white) ![Claude Code](https://img.shields.io/badge/Claude%20Code-000000?style=flat-square&logo=claude&logoColor=white)

</div>

## Ideia principal

O portifólio é uma SPA com temática espacial, ele contem sessões de informações sobre mim, meus projetos, trajetória/experiência profissional e contato.

A ideia é que o portifólio seja uma experiência visualmente rica, com animações e interações que o tornam exclusivo e estiloso mas sem perder a simplicidade e a clareza de navegação.

## O projeto por dentro

```
portifolio/
├─ api/                 funções sem servidor (Vercel): Spotify, Steam e Letterboxd
├─ docs/                requisitos e histórias de usuário
├─ public/              o que é servido como está (o ícone da aba)
├─ scripts/             utilitários de linha de comando (i18n, token do Spotify)
└─ src/
   ├─ assets/           imagens, logos e ícones versionados pelo Vite
   ├─ components/       peças genéricas, usadas por mais de uma seção
   ├─ content/          os dicionários, os tipos do conteúdo e o registro de imagens
   ├─ data/             a forma dos dados de fora, do jeito que a interface os consome
   ├─ engine/           motor de cena em canvas 2D, uma camada por elemento visual
   ├─ hooks/            hooks transversais (movimento reduzido, setas, escala que cabe)
   ├─ hud/              anéis, mira, seletor de idioma, versão, avisos
   ├─ i18n/             idioma corrente, detecção e persistência
   ├─ navigation/       rolagem por seções, teclado, menu, endereço e título da aba
   ├─ scene/            a ponte entre o React e o motor, e a cena de cada seção
   ├─ sections/         uma pasta por seção da página
   └─ styles/           reset e os tokens que o HUD e as seções compartilham
```

A dependência aponta sempre para baixo: `sections` conhece `content` e `hooks`, `engine` não conhece
nada do projeto, e **nenhuma seção importa outra**. O detalhe de cada camada está em
[CLAUDE.md](./CLAUDE.md).

## Rodando

```bash
npm install
npm run dev
```

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Checagem de tipos + build de produção |
| `npm run preview` | Serve o build local |
| `npm run lint` | Só a checagem de tipos |
| `npm run check:i18n` | Confere se `pt.json` e `en.json` continuam paralelos |

## Editando o conteúdo

Todo o texto e os dados do portfólio vivem em [`src/content/`](./src/content/) — nenhuma edição de
conteúdo exige mexer em componente:

* [`pt.json`](./src/content/pt.json) e [`en.json`](./src/content/en.json) — todo o texto, nos dois idiomas;
* [`shared.json`](./src/content/shared.json) — o que não muda entre idiomas (ordem das seções, canais, escala dos logos);
* [`assets.ts`](./src/content/assets.ts) — registro das imagens.

O passo a passo para adicionar projeto, experiência, formação ou seção está em
[CLAUDE.md](./CLAUDE.md#editar-o-conteúdo).

## Wireframes

![Wireframes](./imgs/wireframes.jpg)

## Documentação

* [CLAUDE.md](./CLAUDE.md) — arquitetura, decisões e guia de conteúdo.
* [Requisitos](./docs/requisitos.md) — requisitos funcionais e não funcionais.
