/**
 * Catálogo de constelações — coordenadas do céu real.
 *
 * Cada estrela é `[ascensão reta (h), declinação (°), magnitude aparente]`.
 * Guardar o dado astronômico em vez de coordenadas de tela é o que mantém a
 * forma fiel em qualquer proporção: a projeção acontece no `resize` da camada,
 * comprimida por `cos(dec)`, e a normalização pela caixa vem depois.
 *
 * Magnitude menor = estrela mais brilhante (e desenhada maior).
 */

export interface ConstellationSpec {
  label: string;
  /** [RA em horas, declinação em graus, magnitude aparente] */
  stars: readonly (readonly [number, number, number])[];
  /** pares de índices em `stars` — as linhas da figura */
  links: readonly (readonly [number, number])[];
}

export const CONSTELLATIONS = {
  cancer: {
    label: 'Câncer',
    stars: [
      [8.975, 11.858, 4.26], // Acubens (α)
      [8.745, 18.154, 3.94], // Asellus Australis (δ)
      [8.722, 21.469, 4.66], // Asellus Borealis (γ)
      [8.778, 28.76, 4.02], // Iota Cancri (ι)
      [8.275, 9.186, 3.52], // Beta Cancri (β)
    ],
    links: [
      [3, 2],
      [2, 1],
      [1, 0],
      [1, 4],
    ],
  },
  ursaMajor: {
    label: 'Ursa Maior',
    stars: [
      [11.062, 61.751, 1.79], // Dubhe (α)
      [11.031, 56.382, 2.37], // Merak (β)
      [11.897, 53.695, 2.44], // Phecda (γ)
      [12.257, 57.033, 3.32], // Megrez (δ)
      [12.9, 55.96, 1.77], // Alioth (ε)
      [13.399, 54.925, 2.23], // Mizar (ζ)
      [13.792, 49.313, 1.86], // Alkaid (η)
    ],
    links: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 0],
      [3, 4],
      [4, 5],
      [5, 6],
    ],
  },
  // A RA de Algenib/Alpheratz está escrita como 24+ de propósito: sem esse
  // desdobramento a volta das 24h rasga o Grande Quadrado ao meio na projeção.
  pegasus: {
    label: 'Pégaso',
    stars: [
      [23.079, 15.205, 2.49], // Markab (α)
      [23.063, 28.083, 2.42], // Scheat (β)
      [24.22, 15.184, 2.83], // Algenib (γ)
      [24.139, 29.091, 2.06], // Alpheratz (δ/α And)
      [21.736, 9.875, 2.39], // Enif (ε)
      [22.691, 10.831, 3.4], // Homam (ζ)
      [22.717, 30.221, 2.94], // Matar (η)
      [22.169, 6.197, 3.53], // Baham (θ)
      [22.833, 24.602, 3.48], // Sadalbari (μ)
    ],
    links: [
      [0, 1],
      [1, 3],
      [3, 2],
      [2, 0], // Grande Quadrado
      [0, 5],
      [5, 7],
      [7, 4], // pescoço e cabeça até Enif
      [1, 6],
      [1, 8], // patas dianteiras
    ],
  },
  // Refeita a partir da carta celeste: duas juntas (κ e β) de onde saem os raios.
  phoenix: {
    label: 'Fênix',
    stars: [
      [0.438, -42.306, 2.38], // Ankaa (α)
      [0.436, -43.68, 3.94], // Kappa (κ) — junta superior
      [0.157, -45.747, 3.88], // Epsilon (ε)
      [1.472, -43.318, 3.41], // Gamma (γ)
      [1.101, -46.718, 3.31], // Beta (β) — junta central
      [1.869, -46.303, 4.39], // Psi (ψ)
      [1.512, -49.073, 3.93], // Delta (δ)
      [1.14, -55.245, 3.92], // Zeta (ζ)
    ],
    links: [
      [1, 0],
      [1, 2],
      [1, 3],
      [1, 4],
      [1, 7], // raios de κ
      [0, 2], // α–ε fecha o triângulo da cabeça
      [4, 3],
      [4, 5],
      [4, 6],
      [4, 7], // raios de β
      [5, 6], // ψ–δ fecha a asa
    ],
  },
  // Cruzeiro do Sul: dois eixos cruzados; ε fica solta, como no céu.
  crux: {
    label: 'Cruzeiro do Sul',
    stars: [
      [12.443, -63.099, 0.77], // Acrux (α) — pé
      [12.519, -57.113, 1.63], // Gacrux (γ) — cabeça
      [12.795, -59.689, 1.25], // Mimosa (β)
      [12.253, -58.749, 2.79], // Delta (δ)
      [12.356, -60.401, 3.59], // Intrometida (ε)
    ],
    links: [
      [1, 0],
      [2, 3],
    ],
  },
  // Segue a carta escolhida: cabeça só com Meissa (os ombros não se ligam entre
  // si, passam por ela), pernas fechadas embaixo, clava aberta no alto e escudo
  // em arco. Sem espada — a carta não tem.
  orion: {
    label: 'Órion',
    stars: [
      [5.919, 7.407, 0.5], // 0  Betelgeuse (α)
      [5.418, 6.35, 1.64], // 1  Bellatrix (γ)
      [5.586, 9.934, 3.54], // 2  Meissa (λ) — cabeça
      [5.533, -0.299, 2.23], // 3  Mintaka (δ)
      [5.604, -1.202, 1.69], // 4  Alnilam (ε)
      [5.679, -1.943, 1.88], // 5  Alnitak (ζ)
      [5.796, -9.67, 2.06], // 6  Saiph (κ)
      [5.242, -8.202, 0.18], // 7  Rigel (β)
      [6.037, 9.649, 4.12], // 8  Mu (μ) — cotovelo
      [6.198, 14.209, 4.45], // 9  Xi (ξ)
      [6.132, 14.768, 4.42], // 10 Nu (ν)
      [6.181, 20.276, 4.39], // 11 Chi 1 — clava
      [6.063, 20.138, 4.63], // 12 Chi 2
      [4.833, 10.15, 4.65], // 13 Pi 1 — escudo
      [4.844, 8.9, 4.35], // 14 Pi 2
      [4.833, 6.961, 3.19], // 15 Pi 3
      [4.855, 5.605, 3.69], // 16 Pi 4
      [4.9, 2.441, 3.72], // 17 Pi 5
      [4.973, 1.714, 4.47], // 18 Pi 6
    ],
    links: [
      [2, 0],
      [2, 1], // a cabeça liga os dois ombros
      [0, 5],
      [1, 3], // tronco
      [3, 4],
      [4, 5], // cinturão
      [5, 6],
      [3, 7],
      [6, 7], // pernas fechadas embaixo
      [0, 8],
      [8, 9], // braço erguido
      [9, 10],
      [9, 11],
      [10, 12], // clava aberta no alto
      [1, 15], // braço do escudo
      [13, 14],
      [14, 15],
      [15, 16],
      [16, 17],
      [17, 18], // arco do escudo
    ],
  },
  // W de Cassiopeia: cadeia simples de cinco estrelas brilhantes.
  cassiopeia: {
    label: 'Cassiopeia',
    stars: [
      [0.153, 59.15, 2.27], // Caph (β)
      [0.675, 56.537, 2.24], // Schedar (α)
      [0.945, 60.717, 2.47], // Gamma (γ)
      [1.43, 60.235, 2.68], // Ruchbah (δ)
      [1.907, 63.67, 3.35], // Segin (ε)
    ],
    links: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
    ],
  },
  // Cruz do Norte: eixo Deneb–Albireo e as duas asas abertas.
  cygnus: {
    label: 'Cisne',
    stars: [
      [20.69, 45.28, 1.25], // 0 Deneb (α) — cauda
      [20.37, 40.257, 2.23], // 1 Sadr (γ) — peito
      [19.512, 27.96, 3.05], // 2 Albireo (β) — cabeça
      [19.75, 45.131, 2.87], // 3 Delta (δ) — asa oeste
      [19.494, 51.73, 3.79], // 4 Iota (ι)
      [19.284, 53.368, 3.77], // 5 Kappa (κ) — ponta da asa oeste
      [20.77, 33.97, 2.48], // 6 Gienah (ε) — asa leste
      [21.215, 30.227, 3.2], // 7 Zeta (ζ) — ponta da asa leste
    ],
    links: [
      [0, 1],
      [1, 2], // eixo do corpo
      [1, 3],
      [3, 4],
      [4, 5], // asa oeste
      [1, 6],
      [6, 7], // asa leste
    ],
  },
} as const satisfies Record<string, ConstellationSpec>;

export type ConstellationKey = keyof typeof CONSTELLATIONS;
