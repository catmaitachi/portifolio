import type { Project } from '@/data/types';
import { compose, heading, list, muted } from '../output';
import type { CommandDefinition, OutputBlock } from '../types';

/** Aceita id, nome ou o número do índice ("02"). */
function findProject(projects: Project[], query: string): Project | undefined {
  const needle = query.trim().toLowerCase();
  return projects.find(
    (project) =>
      project.id === needle ||
      project.name.toLowerCase() === needle ||
      project.index === needle.padStart(2, '0'),
  );
}

export const projetosCommand: CommandDefinition = {
  name: 'projetos',
  aliases: ['projects', 'work'],
  summaryKey: 'cmd.projetos.summary',
  usage: 'projetos [nome]',
  category: 'portfólio',
  complete: ({ content }) => content.projects.map((project) => project.id),
  run({ args, content, actions, t }): OutputBlock[] {
    const query = args.join(' ').trim();

    // Com argumento, abre a aba de detalhes — mesmo caminho do clique na lista.
    if (query) {
      const project = findProject(content.projects, query);
      if (!project) {
        return [muted(t('cmd.projetos.notFound', { query }))];
      }
      actions.openProject(project.id);
      return [muted(t('cmd.projetos.opening', { name: project.name }))];
    }

    return compose(
      heading(
        t('cmd.projetos.heading'),
        t('cmd.projetos.count', { count: content.projects.length }),
      ),
      list(
        content.projects.map((project) => ({
          index: project.index,
          title: project.name,
          description: project.summary,
          meta: project.year,
          tags: project.tags,
          command: `projetos ${project.id}`,
        })),
      ),
      muted(t('cmd.projetos.hint')),
    );
  },
};
