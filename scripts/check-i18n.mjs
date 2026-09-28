#!/usr/bin/env node
/**
 * Confere se os dicionários de idioma continuam paralelos.
 *
 * O TypeScript já garante a *forma* (via `satisfies Dictionary`), mas não pega o
 * que mais acontece na prática ao editar conteúdo: adicionar um projeto num
 * idioma e esquecer do outro, ou trocar a ordem das listas — os dois lados são
 * `Projeto[]` válidos e o build passa, mas a página muda de conteúdo ao trocar
 * de idioma.
 *
 * Uso: `npm run check:i18n`
 */

import { readFileSync } from 'node:fs';

const raiz = new URL('../src/content/', import.meta.url);
const ler = (nome) => JSON.parse(readFileSync(new URL(nome, raiz), 'utf8'));

const pt = ler('pt.json');
const en = ler('en.json');
const shared = ler('shared.json');

const problemas = [];

/** Caminhos de todas as folhas do objeto, em ordem estável. */
function caminhos(obj, prefixo = '') {
  if (Array.isArray(obj)) return [`${prefixo}[]`];
  if (obj === null || typeof obj !== 'object') return [prefixo];
  return Object.keys(obj)
    .sort()
    .flatMap((k) => caminhos(obj[k], prefixo ? `${prefixo}.${k}` : k));
}

const chavesPt = new Set(caminhos(pt));
const chavesEn = new Set(caminhos(en));

for (const k of chavesPt) if (!chavesEn.has(k)) problemas.push(`falta em en.json: ${k}`);
for (const k of chavesEn) if (!chavesPt.has(k)) problemas.push(`falta em pt.json: ${k}`);

/** Listas ligadas por `key`/`slot` precisam ter os mesmos itens, na mesma ordem. */
const listas = [
  ['experiencia.lista', (d) => d.experiencia.lista, 'key'],
  ['formacoes.lista', (d) => d.formacoes.lista, 'slot'],
  ['sobre.dados', (d) => d.sobre.dados, 'key'],
  ['sobre.secoes', (d) => d.sobre.secoes, 'key'],
];

for (const [rotulo, pegar, id] of listas) {
  const a = pegar(pt).map((x) => x[id]);
  const b = pegar(en).map((x) => x[id]);
  if (a.join('|') !== b.join('|')) {
    problemas.push(`${rotulo}: ordem ou itens divergem\n    pt: ${a.join(', ')}\n    en: ${b.join(', ')}`);
    // com as listas desalinhadas, comparar campo a campo só produziria ruído
    continue;
  }
  /**
   * Dentro do item, as chaves também precisam bater.
   *
   * `caminhos()` para numa lista (`...lista[]`) — os itens não têm caminho
   * próprio, então um campo opcional acrescentado só num idioma (uma `url` de
   * projeto, a `conclusao` de uma formação) passaria por ele e pelo TypeScript,
   * e a página perderia o dado ao trocar de idioma.
   */
  const itensPt = pegar(pt);
  const itensEn = pegar(en);
  for (let i = 0; i < itensPt.length; i++) {
    const camposPt = Object.keys(itensPt[i]).sort().join(', ');
    const camposEn = Object.keys(itensEn[i]).sort().join(', ');
    if (camposPt !== camposEn) {
      problemas.push(
        `${rotulo}[${itensPt[i][id]}]: campos diferentes\n    pt: ${camposPt}\n    en: ${camposEn}`,
      );
    }
  }
}

/**
 * Os parágrafos de cada seção do dossiê não têm chave; compara-se a contagem. Uma
 * seção vazia num idioma e escrita no outro mostraria o texto de um lado e o
 * marcador de reservado do outro.
 */
for (const [i, secao] of (pt.sobre?.secoes ?? []).entries()) {
  const outra = en.sobre?.secoes?.[i];
  if (outra && secao.paragrafos.length !== outra.paragrafos.length) {
    problemas.push(
      `sobre.secoes[${secao.key}]: ${secao.paragrafos.length} parágrafo(s) em pt, ${outra.paragrafos.length} em en`,
    );
  }
}

/** Marcadores `{x}` precisam existir dos dois lados, ou a frase perde o valor. */
function marcadores(s) {
  return [...String(s).matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',');
}
for (const chave of ['assunto', 'assinatura']) {
  if (marcadores(pt.contato[chave]) !== marcadores(en.contato[chave])) {
    problemas.push(`contato.${chave}: marcadores {} diferentes entre os idiomas`);
  }
}

/**
 * Cada seção mora em **uma** tela, e só as que existem.
 *
 * O TypeScript pega uma chave que não é `SectionKey`, mas não pega a mesma seção
 * em duas telas nem uma seção esquecida fora de todas: a primeira seria montada
 * duas vezes, a segunda simplesmente não apareceria, e nenhuma das duas dá erro
 * de build ou aviso no console.
 */
const secoesConhecidas = new Set(shared.secoes.map((s) => s.key));
const ondeMora = new Map();
for (const tela of shared.telas ?? []) {
  if (!tela.partes?.length) problemas.push(`telas.${tela.key}: sem seção nenhuma`);
  if (!pt.telas?.[tela.key]) problemas.push(`telas.${tela.key}: sem nome nos dicionários`);
  for (const k of tela.partes ?? []) {
    if (!secoesConhecidas.has(k)) problemas.push(`telas.${tela.key}: "${k}" não está em secoes`);
    if (ondeMora.has(k)) problemas.push(`"${k}" está em ${ondeMora.get(k)} e em ${tela.key}`);
    ondeMora.set(k, tela.key);
  }
}
for (const k of secoesConhecidas) {
  if (!ondeMora.has(k)) problemas.push(`"${k}" não está em tela nenhuma`);
}

if (problemas.length) {
  console.error('Dicionários fora de sincronia:\n');
  for (const p of problemas) console.error(`  - ${p}`);
  console.error(`\n${problemas.length} problema(s).`);
  process.exit(1);
}

console.log('Dicionários pt/en em sincronia.');
