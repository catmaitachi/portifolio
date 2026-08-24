/**
 * Formato do conteúdo do portfólio.
 *
 * Este contrato é o mesmo para qualquer origem — arquivo de seed local,
 * API REST ou, futuramente, uma tabela de banco de dados. Trocar a origem
 * não deve exigir mudança em nenhum componente ou comando.
 */

export interface Profile {
  name: string;
  handle: string;
  role: string;
  location: string;
  status: string;
  bio: string;
  /** Parágrafos extras exibidos pelo comando `sobre`. */
  highlights: string[];
}

export interface ProjectLink {
  label: string;
  url: string;
}

export interface Project {
  id: string;
  index: string;
  name: string;
  summary: string;
  year: string;
  tags: string[];
  role?: string;
  url?: string;
  /** Corpo do estudo de caso, exibido na aba de detalhes. */
  caseStudy?: string[];
  featured?: boolean;

  /* ── Campos da aba de detalhes ───────────────────────────── */
  /** Para quem o trabalho foi feito. */
  client?: string;
  /** Janela de execução, quando mais precisa que o ano. */
  period?: string;
  /** Situação atual: "no ar", "encerrado", "em desenvolvimento"… */
  status?: string;
  /** Resultados e decisões em tópicos. */
  highlights?: string[];
  /** Ferramentas usadas — separado das `tags`, que são temáticas. */
  stack?: string[];
  /** Links extras (repositório, estudo de caso, site). */
  links?: ProjectLink[];
}

export interface SkillGroup {
  id: string;
  label: string;
  items: string[];
}

export interface ContactLink {
  id: string;
  label: string;
  value: string;
  url?: string;
}

export interface ExperienceEntry {
  id: string;
  period: string;
  company: string;
  role: string;
  description?: string;
}

export interface PortfolioContent {
  profile: Profile;
  projects: Project[];
  skills: SkillGroup[];
  contacts: ContactLink[];
  experience: ExperienceEntry[];
  /** Metadados de proveniência — úteis para depurar a origem dos dados. */
  meta: {
    source: string;
    fetchedAt: string;
    revision?: string;
  };
}
