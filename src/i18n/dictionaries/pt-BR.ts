/**
 * Dicionário pt-BR — a fonte de verdade dos textos da interface.
 *
 * As chaves deste arquivo definem o tipo `TranslationKey`: qualquer idioma
 * novo precisa preencher exatamente estas chaves, ou o TypeScript reclama.
 *
 * Variáveis usam `{nome}` e são substituídas por `t('chave', { nome })`.
 */
export const ptBR = {
  /* ── Boas-vindas ────────────────────────────────────────── */
  'welcome.badge': 'Bem-vindo(a)',
  'welcome.title.line1': 'Quem está',
  'welcome.title.line2': 'acessando?',
  'welcome.lead': 'Escolha um nickname para uma experiência personalizada. Não precisa ser o seu nome de verdade.',
  'welcome.input.placeholder': 'Seu nickname',
  'welcome.input.label': 'Seu nickname',
  'welcome.submit': 'Prosseguir',
  'welcome.why.trigger': 'Por que devo colocar meu nome?',
  'welcome.why.body': 'Não é cadastro nem rastreio — nada além do nome sai daqui. Ele personaliza o prompt do terminal durante a visita e fica guardado nos meus registros só pra saciar a minha curiosidade sobre quem passou por aqui.',
  'welcome.why.offer': 'Se preferir não dar o seu, eu sorteio um pra você:',
  'welcome.roll.first': 'Sortear um nome pra mim',
  'welcome.roll.again': 'Sortear outro nome',
  'welcome.roll.hint': 'você virou {name} — pode editar antes de prosseguir',
  'welcome.footer': '{version} — sessão local',
  'welcome.notice.degraded': 'conteúdo remoto indisponível ({error}) — exibindo dados locais.',
  'welcome.notice.unknownError': 'erro desconhecido',

  /* ── Chrome do terminal ─────────────────────────────────── */
  'boot.loading': 'carregando sessão',
  'window.close': 'Fechar',
  'window.minimize': 'Minimizar',
  'window.fullscreen.enter': 'Tela cheia',
  'window.fullscreen.exit': 'Sair da tela cheia',
  'window.menu': 'Menu',
  'window.input.label': 'Linha de comando',
  'menu.title': 'MENU',
  'menu.history': 'Histórico',
  'menu.history.hint': 'ver',
  'menu.clear': 'Limpar',
  'menu.clear.hint': 'ctrl+L',
  'menu.share': 'Compartilhar',
  'menu.soon': 'em breve',
  'suggestions.label': 'SUGESTÕES DE COMANDO',
  'dock.hint': 'clique p/ abrir',
  'dialog.exit.title': 'Encerrar a sessão?',
  'dialog.exit.text': 'Obrigado pela visita {name}, vai pelas sombras.',
  'dialog.cancel': 'Cancelar',
  'dialog.confirm': 'Encerrar',

  /* ── Aba de projeto ─────────────────────────────────────── */
  'project.back': 'voltar ao terminal',
  'project.aria': 'Detalhes do projeto {name}',
  'project.fact.role': 'papel',
  'project.fact.client': 'cliente',
  'project.fact.period': 'período',
  'project.fact.status': 'situação',
  'project.section.about': 'O projeto',
  'project.section.highlights': 'Decisões & resultados',
  'project.section.tools': 'Ferramentas',
  'project.section.links': 'Links',
  'project.link.main': 'projeto',

  /* ── Painel de opções ───────────────────────────────────── */
  'settings.open': 'Abrir opções',
  'settings.close': 'Fechar opções',
  'settings.title': 'OPÇÕES',
  'settings.accent': 'Cor principal',
  'settings.mode': 'Aparência',
  'settings.mode.dark': 'Escuro',
  'settings.mode.light': 'Claro',
  'settings.scanlines': 'Scanlines',
  'settings.on': 'Ligado',
  'settings.off': 'Desligado',
  'settings.locale': 'Idioma',
  'settings.footer': 'suas escolhas ficam neste navegador',

  /* ── Motor ──────────────────────────────────────────────── */
  'engine.unknown': 'comando não reconhecido: "{name}" — digite "ajuda".',
  'engine.unknown.suggest': 'comando não reconhecido: "{name}" — você quis dizer "{suggestion}"?',
  'engine.error': 'erro ao executar "{name}": {message}',

  /* ── Resumos dos comandos (aparecem em `ajuda`) ─────────── */
  'cmd.ajuda.summary': 'lista os comandos disponíveis',
  'cmd.sobre.summary': 'quem sou eu',
  'cmd.projetos.summary': 'trabalhos selecionados',
  'cmd.skills.summary': 'ferramentas e stack',
  'cmd.experiencia.summary': 'trajetória profissional',
  'cmd.contato.summary': 'como me encontrar',
  'cmd.tema.summary': 'troca cor, aparência e efeitos',
  'cmd.idioma.summary': 'troca o idioma da interface',
  'cmd.whoami.summary': 'dados da sessão atual',
  'cmd.historico.summary': 'comandos executados nesta sessão',
  'cmd.diag.summary': 'estado da configuração e da fonte de dados',
  'cmd.limpar.summary': 'limpa o terminal',
  'cmd.voltar.summary': 'retorna à tela inicial',
  'cmd.sair.summary': 'encerra a sessão',
  'cmd.sudo.summary': 'permissões elevadas',

  /* ── Saídas dos comandos ────────────────────────────────── */
  'cmd.ajuda.heading': 'Comandos disponíveis',
  'cmd.ajuda.col.command': 'comando',
  'cmd.ajuda.col.description': 'descrição',
  'cmd.ajuda.footer': 'Tab completa · ↑/↓ navega no histórico · "ajuda <comando>" detalha um comando.',
  'cmd.ajuda.noHelp': 'sem ajuda para "{name}" — digite "ajuda" para a lista completa.',
  'cmd.ajuda.usage': 'uso: {usage}',
  'cmd.ajuda.aliases': 'atalhos: {aliases}',

  'cmd.sobre.uptime': 'Uptime',
  'cmd.sobre.packages': '{count} projetos',
  'cmd.sobre.terminal': 'sessão de {name}',
  'cmd.sobre.contact': 'Contato',
  'cmd.sobre.status': 'Status',

  'cmd.projetos.heading': 'Trabalhos selecionados',
  'cmd.projetos.count': '{count} projetos',
  'cmd.projetos.hint': 'Clique em um item (ou digite "projetos <nome>") para abrir os detalhes.',
  'cmd.projetos.opening': 'abrindo {name} — o terminal fica minimizado enquanto isso.',
  'cmd.projetos.notFound': 'projeto "{query}" não encontrado — use "projetos" para ver a lista.',

  'cmd.skills.heading': 'Ferramentas & stack',
  'cmd.experiencia.heading': 'Trajetória',
  'cmd.experiencia.empty': 'nenhuma experiência cadastrada nesta fonte de conteúdo.',
  'cmd.contato.heading': 'Contato',
  'cmd.contato.footer': 'Respondo e-mails em até 48h úteis.',

  'cmd.tema.heading': 'Tema',
  'cmd.tema.accentLabel': 'cor de destaque',
  'cmd.tema.available': 'disponíveis',
  'cmd.tema.usage': 'uso: tema #7dd3a8 · tema 2 · tema claro · tema scanlines off',
  'cmd.tema.invalidColor': 'cor inválida: "{value}" — use um hex (#7dd3a8) ou o índice da lista.',
  'cmd.tema.accentSet': 'cor de destaque agora é {color}.',
  'cmd.tema.scanlinesOn': 'scanlines ligadas.',
  'cmd.tema.scanlinesOff': 'scanlines desligadas.',
  'cmd.tema.scanlinesToggled': 'scanlines alternadas.',
  'cmd.tema.modeSet': 'aparência agora é {mode}.',

  'cmd.idioma.heading': 'Idioma',
  'cmd.idioma.available': 'disponíveis',
  'cmd.idioma.usage': 'uso: idioma pt-BR · idioma en',
  'cmd.idioma.set': 'idioma alterado para {locale}.',
  'cmd.idioma.unknown': 'idioma "{value}" indisponível.',

  'cmd.whoami.nick': 'nick',
  'cmd.whoami.origin': 'origem',
  'cmd.whoami.origin.typed': 'informado',
  'cmd.whoami.origin.random': 'sorteado',
  'cmd.whoami.session': 'sessão',
  'cmd.whoami.commands': 'comandos',
  'cmd.whoami.footer': 'Nada disso sai do seu navegador, exceto o nick — que fica nos registros.',

  'cmd.historico.heading': 'Histórico da sessão',
  'cmd.historico.empty': 'nenhum comando executado ainda.',
  'cmd.historico.col.command': 'comando',
  'cmd.historico.col.time': 'hora',

  'cmd.diag.heading': 'Diagnóstico',
  'cmd.diag.version': 'versão',
  'cmd.diag.mode': 'modo',
  'cmd.diag.source': 'fonte',
  'cmd.diag.loaded': 'carregado',
  'cmd.diag.projects': 'projetos',
  'cmd.diag.commands': 'comandos',
  'cmd.diag.locale': 'idioma',
  'cmd.diag.envIssues': 'variáveis ignoradas:',
  'cmd.diag.envOk': 'nenhum problema de ambiente.',

  'cmd.sudo.output': '{name} não está no arquivo sudoers. Este incidente será reportado.',

  /* ── Saudação ───────────────────────────────────────────── */
  'greeting.connected': 'Conexão estabelecida ·············· OK',
  'greeting.welcome': 'Bem-vindo(a), {name}.',
  'greeting.random': '(nome sorteado — você pode voltar e escolher outro)',
  'greeting.help': 'Digite "ajuda" para ver os comandos disponíveis, ou clique nas sugestões abaixo. ({version})',
} as const;
