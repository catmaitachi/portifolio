import type { IncomingMessage, ServerResponse } from 'node:http';

/**
 * O pouco que as três funções de `api/` compartilham.
 *
 * Nada de framework: elas recebem `req`/`res` do Node e escrevem cabeçalho e
 * corpo na mão. Os atalhos da Vercel (`res.json`, `res.status`) existem no
 * runtime dela e **não** no servidor de desenvolvimento do Vite, e a mesma
 * função precisa rodar nos dois — é isso, e não purismo, que decide a escolha.
 */

/**
 * Responde JSON com cache **de borda**, não de navegador.
 *
 * `s-maxage` é a CDN; `max-age=0` mantém o navegador sempre perguntando. É a
 * divisão que interessa aqui: uma segunda visita não pode mostrar o que estava
 * tocando ontem, mas cem visitantes no mesmo minuto devem custar uma chamada só
 * ao provedor. `stale-while-revalidate` deixa a borda servir o valor velho
 * enquanto busca o novo, então ninguém espera a origem.
 */
export function json(res: ServerResponse, dados: unknown, segundos: number): void {
  res.writeHead(200, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': `public, max-age=0, s-maxage=${segundos}, stale-while-revalidate=${segundos * 10}`,
  });
  res.end(JSON.stringify(dados));
}

/**
 * Responde uma falha, e **nunca** um 200 com corpo vazio.
 *
 * Chave errada, provedor fora do ar e perfil fechado são estados diferentes de
 * "não tem nada para mostrar", e a seção precisa poder dizer qual é. Um 200 com
 * lista vazia faria a página afirmar que a pessoa não ouviu nada este mês.
 */
export function falha(res: ServerResponse, status: number, erro: string): void {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  });
  res.end(JSON.stringify({ erro }));
}

/** Só leitura: qualquer outro método é erro de quem chamou, não estado. */
export function metodoInvalido(req: IncomingMessage, res: ServerResponse): boolean {
  if (req.method === 'GET' || req.method === 'HEAD') return false;
  falha(res, 405, 'metodo');
  return true;
}

/**
 * Lê as variáveis exigidas, ou diz qual falta.
 *
 * Uma função sem segredo configurado é um erro de instalação, e ele precisa
 * aparecer como 500 com o nome da variável, não como uma seção vazia que
 * ninguém sabe por que está vazia.
 */
export function ambiente(nomes: string[]): { vars: Record<string, string> } | { falta: string } {
  const vars: Record<string, string> = {};
  for (const nome of nomes) {
    const valor = process.env[nome];
    if (!valor) return { falta: nome };
    vars[nome] = valor;
  }
  return { vars };
}
