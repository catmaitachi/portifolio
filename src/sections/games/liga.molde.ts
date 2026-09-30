import type { Liga, Partida } from '~/data/types';

/**
 * A forma do LoL enquanto `api/riot` não responde: dados de exemplo, na forma
 * exata de `Liga`, desenhados pelos mesmos componentes dentro do `EstadoRemoto`.
 * Ali eles ficam apagados, fora da árvore acessível e com o aviso por cima, e a
 * página não pula quando o dado de verdade chega, porque a forma é a mesma.
 */

const DD = 'https://ddragon.leagueoflegends.com/cdn/16.19.1/img';
const campeao = (nome: string) => `${DD}/champion/${nome}.png`;
const item = (id: number) => (id ? `${DD}/item/${id}.png` : null);
/** quando acabou: horas atrás, a partir de agora, para o "há 2 horas" ler certo */
const ha = (horas: number) => new Date(Date.now() - horas * 36e5).toISOString();

const partida = (
  id: string,
  nome: string,
  vitoria: boolean,
  [abates, mortes, assistencias]: [number, number, number],
  cs: number,
  duracao: number,
  fila: number,
  horas: number,
  itens: number[],
): Partida => ({
  id,
  campeao: nome,
  icone: campeao(nome),
  vitoria,
  abates,
  mortes,
  assistencias,
  cs,
  duracao,
  fila,
  fim: ha(horas),
  itens: itens.map(item),
});

export const LIGA_MOLDE: Liga = {
  perfil: {
    nome: 'Catmaitachi',
    regiao: 'BR',
    nivel: 287,
    icone: `${DD}/profileicon/6269.png`,
  },
  maestrias: [
    { campeao: 'Ahri', icone: campeao('Ahri'), nivel: 32, pontos: 389211 },
    { campeao: 'Jinx', icone: campeao('Jinx'), nivel: 18, pontos: 201450 },
    { campeao: 'Thresh', icone: campeao('Thresh'), nivel: 12, pontos: 142870 },
  ],
  partidas: [
    partida('1', 'Ahri', true, [9, 2, 11], 214, 1712, 420, 2, [6655, 3020, 4645, 3089, 3135, 0, 3340]),
    partida('2', 'Jinx', false, [4, 7, 6], 188, 1980, 420, 3, [3031, 3006, 3094, 3046, 0, 0, 3340]),
    partida('3', 'Thresh', true, [1, 4, 22], 34, 2104, 400, 26, [3190, 3158, 3109, 3050, 0, 0, 3364]),
    partida('4', 'Ahri', true, [12, 3, 7], 241, 1655, 420, 28, [6655, 3020, 3157, 4645, 3089, 0, 3340]),
    partida('5', 'Lux', false, [3, 6, 14], 39, 1122, 450, 50, [6655, 3020, 3135, 0, 0, 0, 0]),
    partida('6', 'Yasuo', false, [5, 9, 3], 176, 1843, 400, 52, [6672, 3006, 3031, 0, 0, 0, 3340]),
  ],
};
