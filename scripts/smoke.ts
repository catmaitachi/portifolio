/**
 * Smoke test do núcleo do terminal — roda fora do browser.
 *
 *   npm run smoke
 *
 * Verifica registry, parser, motor e fonte de conteúdo sem precisar de DOM.
 * Útil como rede de segurança ao adicionar comandos novos.
 */
import { config } from '../src/config';
import { createTranslator } from '../src/i18n';
import { pickRandom } from '../src/lib/random';
import { commands, createRegistry, executeCommand } from '../src/terminal';
import { createStaticSource } from '../src/data/sources/staticSource';
import { parseInput } from '../src/terminal/parse';
import type { OutputBlock, TerminalActions, TerminalSession } from '../src/terminal/types';

let failures = 0;

function check(label: string, condition: boolean, detail = ''): void {
  const mark = condition ? '✓' : '✗';
  if (!condition) failures += 1;
  console.log(`  ${mark} ${label}${detail && !condition ? ` — ${detail}` : ''}`);
}

function summarize(blocks: OutputBlock[]): string {
  return blocks.map((block) => block.type).join(', ') || '(vazio)';
}

async function main(): Promise<void> {
  const registry = createRegistry(commands);
  const content = await createStaticSource().load();

  const session: TerminalSession = {
    nickname: 'smoke',
    origin: 'typed',
    prompt: 'smoke',
    startedAt: Date.now(),
  };

  const calls: string[] = [];
  const actions: TerminalActions = {
    clear: () => calls.push('clear'),
    back: () => calls.push('back'),
    requestClose: () => calls.push('requestClose'),
    setAccent: (color) => calls.push(`setAccent:${color}`),
    toggleScanlines: () => calls.push('toggleScanlines'),
    setFullscreen: () => calls.push('setFullscreen'),
    minimize: () => calls.push('minimize'),
    setThemeMode: (mode) => calls.push(`setThemeMode:${mode}`),
    setLocale: (locale) => calls.push(`setLocale:${locale}`),
    openProject: (id) => calls.push(`openProject:${id}`),
    print: () => calls.push('print'),
    openUrl: () => calls.push('openUrl'),
    run: () => calls.push('run'),
  };

  const t = createTranslator('pt-BR');
  const run = (input: string) =>
    executeCommand({ input, registry, content, session, actions, history: [], t, locale: 'pt-BR' });

  console.log('\nparser');
  const parsed = parseInput('projetos "design system" --todos --ano=2025');
  check('argumentos com aspas', parsed.args[0] === 'design system', parsed.args.join('|'));
  check('flag booleana', parsed.flags.todos === true);
  check('flag com valor', parsed.flags.ano === '2025');

  console.log('\nnomes sorteáveis');
  const pool = config.welcome.randomNicknames;
  check('lista não vazia', pool.length > 0);
  check('sorteio dentro da lista', pool.includes(pickRandom(pool) ?? ''));
  check(
    'sorteio evita repetir o anterior',
    Array.from({ length: 40 }, () => pickRandom(pool, pool[0])).every((name) => name !== pool[0]),
  );
  check('lista de um item ainda sorteia', pickRandom(['único'], 'único') === 'único');
  check('lista vazia devolve null', pickRandom([]) === null);

  console.log('\nregistry');
  check('comandos registrados', registry.all().length === commands.length);
  check('alias resolve', registry.get('help')?.name === 'ajuda');
  check('sugestão por proximidade', registry.suggest('projeto') === 'projetos', String(registry.suggest('projeto')));
  check('autocompletar', registry.completions('so').includes('sobre'));

  console.log('\nconteúdo');
  check('projetos carregados', content.projects.length > 0);
  check('contatos carregados', content.contacts.length > 0);
  check('perfil do env', content.profile.name.length > 0);

  console.log('\ncomandos');
  for (const name of ['ajuda', 'sobre', 'projetos', 'skills', 'contato', 'experiencia', 'diag', 'whoami']) {
    const result = await run(name);
    check(`${name} produz saída`, result.blocks.length > 0, summarize(result.blocks));
  }

  const sobre = await run('sobre');
  const card = sobre.blocks.find((block) => block.type === 'fetch');
  check('sobre monta o cartão neofetch', card !== undefined, summarize(sobre.blocks));
  check(
    'cartão traz foto e linhas',
    card?.type === 'fetch' && Boolean(card.avatar?.src) && card.rows.length > 4,
  );

  const first = content.projects[0];
  const detail = await run(`projetos ${first.id}`);
  check('projeto abre a aba de detalhes', calls.includes(`openProject:${first.id}`));
  check('aba avisa no terminal', detail.blocks.length === 1);
  check(
    'busca por índice também abre',
    (await run(`projetos ${first.index}`)) && calls.filter((c) => c.startsWith('openProject:')).length === 2,
  );
  const missing = await run('projetos inexistente');
  check('projeto inexistente não abre aba', missing.blocks.length === 1 && calls.filter((c) => c.startsWith('openProject:')).length === 2);

  const unknown = await run('inexistente');
  check('comando desconhecido tratado', unknown.handled && unknown.blocks.length === 1);

  const empty = await run('   ');
  check('linha vazia ignorada', !empty.handled && empty.blocks.length === 0);

  console.log('\nefeitos colaterais');
  await run('limpar');
  await run('sair');
  await run('tema #8ab4f8');
  check('clear disparado', calls.includes('clear'));
  check('requestClose disparado', calls.includes('requestClose'));
  check('setAccent disparado', calls.includes('setAccent:#8ab4f8'));
  await run('tema claro');
  await run('idioma en');
  check('aparência disparada', calls.includes('setThemeMode:light'));
  check('idioma disparado', calls.includes('setLocale:en'));

  console.log('');
  console.log('i18n');
  const en = createTranslator('en');
  check('pt-BR traduz', t('cmd.ajuda.summary') === 'lista os comandos disponíveis');
  check('en traduz', en('cmd.ajuda.summary') === 'list the available commands');
  check('interpolação', en('greeting.welcome', { name: 'ada' }) === 'Welcome, ada.');
  check(
    'todo comando tem resumo nos dois idiomas',
    registry.all().every((command) => t(command.summaryKey) && en(command.summaryKey)),
  );

  console.log(failures === 0 ? '\nOK — tudo passou.\n' : `\nFALHOU — ${failures} verificação(ões).\n`);
  process.exit(failures === 0 ? 0 : 1);
}

void main();
