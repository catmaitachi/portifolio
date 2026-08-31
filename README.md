<div align="center">

<pre>
~/

█▀█ █▀█ █▀▄ ▀█▀ █▀▀ █▀█ █   █ █▀█
█▀▀ █ █ █▀▄  █  █▀▀ █ █ █   █ █ █
▀   ▀▀▀ ▀ ▀  ▀  ▀   ▀▀▀ ▀▀▀ ▀ ▀▀▀
by Catmaitachi
</pre>

![React](https://img.shields.io/badge/React-000000?style=flat-square&logo=react&logoColor=white) ![TypeScript](https://img.shields.io/badge/TypeScript-000000?style=flat-square&logo=typescript&logoColor=white) ![Vite](https://img.shields.io/badge/Vite-000000?style=flat-square&logo=vite&logoColor=white) ![Claude Code](https://img.shields.io/badge/Claude%20Code-000000?style=flat-square&logo=claude&logoColor=white)

</div>

## Ideia principal

O portifólio é uma SPA com temática espacial, ele contem sessões de informações sobre mim, meus projetos, trajetória/experiência profissional e contato.

A ideia é que o portifólio seja uma experiência visualmente rica, com animações e interações que o tornam exclusivo e estiloso mas sem perder a simplicidade e a clareza de navegação.

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
