/**
 * Forma do conteúdo.
 *
 * Os dicionários são JSON puro (`pt.json`, `en.json`) — editá-los não exige
 * tocar em código. Estes tipos são o contrato que o TypeScript checa contra
 * eles no `index.ts`: uma chave faltando num idioma vira erro de compilação, não
 * um `undefined` em produção.
 *
 * Texto com valor variável usa marcador `{nome}` em vez de concatenação. A ordem
 * das palavras muda entre idiomas; `format()` respeita a do próprio dicionário.
 */

export type Lang = 'pt' | 'en';

export type SectionKey =
  | 'inicio'
  | 'sobre'
  | 'formacao'
  | 'projetos'
  | 'experiencia'
  | 'musica'
  | 'jogos'
  | 'filmes'
  | 'contato';

/**
 * Os dois lados do site.
 *
 * Cada modo traz as seções que tem e os canais de contato que mostra (ver
 * `modos` em `shared.json`). O Início é comum aos dois e só troca de texto:
 * `modos.<key>` no dicionário carrega a etiqueta e a legenda dele, e o nome
 * continuando em `hero`, porque o nome não muda de lado nenhum.
 */
export type ModoKey = 'pessoal' | 'profissional';

export type EstadoFormacao = 'concluido' | 'cursando' | 'pretensao';
export type EstadoProjeto = 'ativo' | 'arquivado' | 'definir';

/** Etapas cumpridas de um total — a fração que preenche a barra de `cursando`. */
export interface ProgressoFormacao {
  feito: number;
  total: number;
}

export interface Formacao {
  /**
   * A identidade do item, que liga as duas listas no `check:i18n`, e a chave de
   * LOGOS (assets.ts) e de `logos` (shared.json). Sem logo registrado, o crachá
   * fica sem imagem.
   */
  slot: string;
  /**
   * `instituicao` e `curso` são opcionais por causa da `pretensao`, que é um
   * cartão vago: ela mostra só o nível e o selo, e a formação que ainda não
   * existe não diz onde nem o quê.
   *
   * Com logo, a instituição não é escrita no crachá: vira o nome acessível do
   * logo, que já traz o nome desenhado.
   */
  instituicao?: string;
  nivel: string;
  curso?: string;
  estado: EstadoFormacao;
  /**
   * `concluido`: quando terminou, no formato ano.mês. Fica escondida atrás da
   * barra e aparece quando o ponteiro entra no badge. Ausente = badge sem
   * detalhe, e a barra ocupa a linha inteira.
   */
  conclusao?: string;
  /**
   * `cursando`: a barra é sempre a fração `feito/total` — não um meio-termo
   * decorativo — e a própria fração aparece no hover. Ausente = 50%, que é só o
   * "em algum ponto do caminho" de antes.
   */
  progresso?: ProgressoFormacao;
}

/**
 * Um fato de identificação, sob a bio: nascimento e residência.
 *
 * O valor vai no dicionário, e não em `shared.json`, apesar de ser dado: a
 * cidade leva o país escrito no idioma de quem lê, e "MG" não diz nada a quem
 * chegou em inglês. `key` existe para o `check:i18n` ligar os dois lados da
 * lista, como faz com projetos e formações.
 */
export interface DadoPessoal {
  key: string;
  rotulo: string;
  valor: string;
}

export interface Projeto {
  key: string;
  nome: string;
  /** uma linha de resumo, sob o nome do cartão */
  linha: string;
  ano: string;
  papel: string;
  stack: string[];
  estado: EstadoProjeto;
  /** vazio = sem link "ver ao vivo" */
  url?: string;
  /**
   * Casa com uma chave de BANNERS (assets.ts) — é chave, não caminho: JSON não
   * importa arquivo, e o Vite precisa do `import` para versionar o asset.
   * Ausente = a moldura de espaço reservado.
   */
  banner?: string;
}

export interface Experiencia {
  key: string;
  cargo: string;
  org: string;
  /** formato ano.mês — é rótulo, não posição na curva */
  periodo: string;
  /** casa com uma chave de `experiencia.tipos` */
  tipo: string;
  /** até 3 são exibidos (slots fixos 01/02/03) */
  bullets: string[];
  /** até 4 são exibidos */
  stack: string[];
}

export interface Dictionary {
  nav: Record<SectionKey, string>;
  /**
   * Rótulo de cada modo no cabeçalho, mais a etiqueta e a legenda que ele dá ao
   * Início. `Record` total: um modo novo quebra o build nos dois dicionários.
   */
  modos: Record<
    ModoKey,
    {
      /** o nome no cabeçalho */
      rotulo: string;
      /** uma linha sobre o que tem daquele lado, revelada ao apontar o nome */
      descricao: string;
      etiqueta: string;
      legenda: string;
    }
  >;
  hero: { nome: string };
  /**
   * O título da aba, com `{nome}` e `{parte}`.
   *
   * A parte é o nome da seção, ou a etiqueta do modo quando o visitante está no
   * Início — que é onde não existe seção para nomear.
   */
  documento: string;
  /**
   * A bio muda de lado, e os dois fatos embaixo dela não.
   *
   * `paragrafos` é `Record` **total** por modo: um lado novo do site quebra o
   * build até ter o próprio texto, porque um Sobre que não fala do lado em que o
   * visitante está é pior que um Sobre curto. `dados` são os fatos que ficaram
   * no lugar do carrossel de formação, que virou seção (ver `secoes.md`).
   */
  sobre: {
    titulo: string;
    paragrafos: Record<ModoKey, string[]>;
    dados: DadoPessoal[];
  };
  formacoes: {
    titulo: string;
    intro: string;
    estados: Record<EstadoFormacao, string>;
    /**
     * Os rótulos do dado que cada estado produz, no pé do diploma: a data de
     * `concluido` e os períodos de `cursando`. O **valor** deles continua fora
     * do dicionário, como a versão no rodapé — "2022.12" e "4/8" são dados.
     */
    rotulos: { conclusao: string; periodos: string };
    lista: Formacao[];
  };
  projetos: {
    titulo: string;
    intro: string;
    banner: string;
    aoVivo: string;
    estados: Record<EstadoProjeto, string>;
    lista: Projeto[];
  };
  /**
   * As três seções que leem dado remoto (`src/data/`).
   *
   * Elas não trazem lista nenhuma: o conteúdo vem do Spotify, da Steam e do
   * Letterboxd em tempo de execução. O que mora aqui são os **rótulos** e os
   * estados que a interface precisa nomear, que é justamente o que não pode ser
   * literal no componente.
   */
  musica: {
    titulo: string;
    intro: string;
    tocando: string;
    /** o estado mais comum: não há nada tocando */
    silencio: string;
    faixas: string;
    artistas: string;
    recentes: string;
  };
  jogos: {
    titulo: string;
    intro: string;
    jogando: string;
    ultimo: string;
    recentes: string;
    /** sufixo de hora, colado no número */
    horas: string;
    duasSemanas: string;
    total: string;
  };
  filmes: {
    titulo: string;
    intro: string;
    /** o rótulo da lista escolhida a dedo; sem lista configurada, o bloco some */
    favoritos: string;
    recentes: string;
    /**
     * A posição na lista de favoritos, com `{n}`.
     *
     * O número aparece desenhado num selo, e é só um número: quem usa leitor de
     * tela precisa da frase em volta dele para saber que "03" é um lugar numa
     * lista, e não um ano ou uma nota.
     */
    posicao: string;
    semNota: string;
    revisita: string;
  };
  /**
   * Os três estados de qualquer busca remota, num lugar só.
   *
   * Eles não são de nenhuma das seções em particular, e repeti-los em três
   * blocos seria três lugares para traduzir a mesma frase.
   */
  remoto: {
    carregando: string;
    erro: string;
    vazio: string;
  };
  experiencia: {
    titulo: string;
    intro: string;
    tipos: Record<string, string>;
    janela: { anterior: string; posterior: string };
    lista: Experiencia[];
  };
  contato: {
    titulo: string;
    intro: string;
    email: string;
    ou: string;
    enviar: string;
    enviando: string;
    erro: string;
    emBreve: string;
    /** aceita `{nome}` */
    assunto: string;
    assuntoSemNome: string;
    /** aceita `{nome}` */
    assinatura: string;
    campos: {
      nome: { rotulo: string; dica: string };
      mensagem: { rotulo: string; dica: string };
    };
  };
  credito: string;
  a11y: {
    secoes: string;
    modos: string;
    modosAbrir: string;
    idioma: string;
    projetos: string;
    experiencia: string;
    canais: string;
    retrato: string;
    /**
     * Os dois botões de rolagem das faixas, e o `{lista}` deles é o título da
     * faixa em que estão: "anterior" sozinho não diz anterior do quê numa seção
     * com duas faixas, e é justamente ali que a pergunta aparece.
     */
    faixaAntes: string;
    faixaDepois: string;
    /** aceita `{rede}` — o nome do serviço vem de `perfis`, não do dicionário */
    perfil: string;
  };
}

/**
 * O perfil de onde vem o dado de uma seção.
 *
 * O nome do serviço é **marca**, não texto: fica em `shared.json` e não nos
 * dicionários, como o `rotulo` dos canais de contato. Quem traduz é a frase em
 * volta dele (`a11y.perfil`).
 */
export interface Perfil {
  /** casa com uma chave de ICONES (assets.ts) */
  icone: string;
  rotulo: string;
  url: string;
}

export interface Canal {
  key: string;
  /** casa com uma chave de ICONES (assets.ts) */
  icone: string;
  rotulo: string;
  identificador: string;
  /** vazio = cartão tracejado, apagado e fora da navegação */
  url: string;
}

export interface Secao {
  key: SectionKey;
}

/**
 * Um modo: as seções que ele tem, na ordem em que rolam, e os canais que a
 * seção Contato mostra nele.
 *
 * `secoes` é a ordem de rolagem **em vigor**, e `Shared.secoes` passa a ser só a
 * ordem canônica, contra a qual estas listas são conferidas por `check:i18n`.
 * Os canais são chaves de `canais`, não os objetos: o cartão de um canal é o
 * mesmo dos dois lados, muda só quem aparece.
 */
export interface Modo {
  key: ModoKey;
  secoes: SectionKey[];
  canais: string[];
}

export interface Shared {
  secoes: Secao[];
  modos: Modo[];
  /** só as seções que leem dado de fora têm perfil; as outras não têm de onde */
  perfis: Partial<Record<SectionKey, Perfil>>;
  canais: Canal[];
  logos: Record<string, { escala: number }>;
}
