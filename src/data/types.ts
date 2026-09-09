/**
 * A forma dos dados remotos, do jeito que a interface os consome.
 *
 * **As seções nunca leem o JSON do provedor.** Spotify, Steam e Letterboxd
 * devolvem formas próprias, herdadas e cheias de campos que não interessam, e
 * cada um deles pode mudar a sua sem avisar. A função em `api/` normaliza, e é
 * este arquivo que as duas pontas leem: trocar de provedor, ou perder um deles,
 * fica sendo trabalho de uma função, não de uma seção inteira.
 *
 * Tudo que é opcional aqui é opcional **de verdade**: o Letterboxd tem filme sem
 * nota, a Steam tem jogo sem arte, e o Spotify não está tocando nada na maior
 * parte do tempo. Quem desenha precisa tratar o vazio, e o tipo obriga.
 */

/** Uma faixa, tocando agora ou não. */
export interface Faixa {
  id: string;
  titulo: string;
  /**
   * Quem assina a faixa, **cada um com o próprio endereço**.
   *
   * É uma lista, e não o nome já juntado, porque uma faixa de dois artistas tem
   * dois perfis: com uma string só, o nome inteiro apontaria para o primeiro
   * deles, o que é uma resposta errada disfarçada de link. Quem precisa da linha
   * junta a lista na hora de desenhar; quem precisa do link tem um por nome.
   */
  artistas: { nome: string; url: string }[];
  album: string;
  /** capa do álbum; `null` quando o provedor não mandou nenhuma */
  capa: string | null;
  url: string;
  /** só em `tocando`: para a barra de progresso */
  duracaoMs?: number;
  progressoMs?: number;
  /** só em `recentes`: ISO 8601 */
  tocadaEm?: string;
}

export interface Artista {
  id: string;
  nome: string;
  imagem: string | null;
  url: string;
}

export interface Musica {
  /** `null` quando não há nada tocando, que é o estado mais comum */
  tocando: Faixa | null;
  recentes: Faixa[];
  /** mais tocadas do último mês */
  faixas: Faixa[];
  artistas: Artista[];
}

export interface Jogo {
  id: string;
  nome: string;
  /** a arte de capa da loja; `null` para o que não tem página */
  capa: string | null;
  url: string;
  /** minutos jogados nas últimas duas semanas */
  minutosRecentes: number;
  minutosTotais: number;
}

export interface Jogos {
  /** `null` quando o perfil não está numa partida agora */
  jogando: Jogo | null;
  recentes: Jogo[];
}

export interface Filme {
  id: string;
  titulo: string;
  ano: string;
  /** de 0 a 5, com meias estrelas; `null` quando foi marcado sem nota */
  nota: number | null;
  poster: string | null;
  url: string;
  /**
   * ISO 8601 (só a data). Ausente nos favoritos: uma lista não é um diário, e
   * ali não existe a sessão que teria data.
   */
  assistidoEm?: string;
  /** revisita: já tinha visto antes. Ausente pela mesma razão. */
  revisita?: boolean;
}

export interface Filmes {
  recentes: Filme[];
  /**
   * Uma lista escolhida a dedo no Letterboxd, e não o que ele chama de
   * favoritos no perfil.
   *
   * Ela vem de um lugar diferente do resto: o feed traz o diário, e lista
   * nenhuma tem RSS. Vem vazia quando não há lista configurada, e isso é
   * estado normal, não falha — o resto da seção continua de pé sozinho.
   */
  favoritos: Filme[];
}

/** O que uma função de `api/` devolve quando não consegue responder. */
export interface Falha {
  erro: string;
}
