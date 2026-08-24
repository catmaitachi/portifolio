/**
 * Aba de detalhes de um projeto.
 *
 * Abre por cima da mesa enquanto o terminal fica minimizado na barra de
 * baixo — é uma janela irmã da do terminal, não um modal: fechá-la
 * devolve o terminal.
 */
import { useEffect, useRef } from 'react';
import type { Project } from '@/data/types';
import { useT } from '@/settings';

export interface ProjectWindowProps {
  project: Project;
  /** Acompanha o estado de tela cheia da mesa. */
  fullscreen: boolean;
  /** Projetos vizinhos, para a navegação do rodapé. */
  previous?: Project;
  next?: Project;
  onClose(): void;
  onToggleFullscreen(): void;
  onNavigate(projectId: string): void;
}

export function ProjectWindow({
  project,
  fullscreen,
  previous,
  next,
  onClose,
  onToggleFullscreen,
  onNavigate,
}: ProjectWindowProps) {
  const t = useT();
  const closeRef = useRef<HTMLButtonElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  /** Esc fecha a aba e devolve o terminal. */
  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  /** Trocar de projeto volta a leitura ao topo. */
  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = 0;
  }, [project.id]);

  const facts = [
    project.role ? { label: t('project.fact.role'), value: project.role } : null,
    project.client ? { label: t('project.fact.client'), value: project.client } : null,
    { label: t('project.fact.period'), value: project.period ?? project.year },
    project.status ? { label: t('project.fact.status'), value: project.status } : null,
  ].filter(Boolean) as Array<{ label: string; value: string }>;

  const allLinks = [
    ...(project.url ? [{ label: t('project.link.main'), url: project.url }] : []),
    ...(project.links ?? []),
  ];

  return (
    <section
      className={`window project-window${fullscreen ? ' window--fullscreen' : ''}`}
      aria-label={t('project.aria', { name: project.name })}
    >
      <header className="titlebar">
        <div className="titlebar__dots">
          <button
            type="button"
            ref={closeRef}
            className="titlebar__dot titlebar__dot--close"
            title={t('project.back')}
            aria-label={t('project.back')}
            onClick={onClose}
          />
          <button
            type="button"
            className="titlebar__dot titlebar__dot--max"
            title={t(fullscreen ? 'window.fullscreen.exit' : 'window.fullscreen.enter')}
            aria-label={t(fullscreen ? 'window.fullscreen.exit' : 'window.fullscreen.enter')}
            aria-pressed={fullscreen}
            onClick={onToggleFullscreen}
          />
        </div>

        <span className="titlebar__path">~/portfolio/projetos/{project.id}</span>

        <button type="button" className="project-window__back" onClick={onClose}>
          <span aria-hidden="true">↩</span>
          {t('project.back')}
        </button>
      </header>

      <div className="project-window__body" ref={bodyRef}>
        <div className="project-window__head">
          <span className="project-window__index">{project.index}</span>
          <div>
            <h2 className="project-window__title">{project.name}</h2>
            <p className="project-window__summary">{project.summary}</p>
          </div>
          <span className="project-window__year">{project.year}</span>
        </div>

        <dl className="project-window__facts">
          {facts.map((fact) => (
            <div className="project-window__fact" key={fact.label}>
              <dt>{fact.label}</dt>
              <dd>{fact.value}</dd>
            </div>
          ))}
        </dl>

        {project.caseStudy?.length ? (
          <div className="project-window__section">
            <h3 className="project-window__section-title">{t('project.section.about')}</h3>
            {project.caseStudy.map((paragraph) => (
              <p className="project-window__text" key={paragraph}>
                {paragraph}
              </p>
            ))}
          </div>
        ) : null}

        {project.highlights?.length ? (
          <div className="project-window__section">
            <h3 className="project-window__section-title">{t('project.section.highlights')}</h3>
            <ul className="project-window__bullets">
              {project.highlights.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {project.stack?.length || project.tags.length ? (
          <div className="project-window__section">
            <h3 className="project-window__section-title">{t('project.section.tools')}</h3>
            <div className="project-window__tags">
              {(project.stack?.length ? project.stack : project.tags).map((item) => (
                <span className="project-window__tag" key={item}>
                  {item}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        {allLinks.length ? (
          <div className="project-window__section">
            <h3 className="project-window__section-title">{t('project.section.links')}</h3>
            <div className="project-window__links">
              {allLinks.map((link) => (
                <a
                  className="project-window__link"
                  key={link.url}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {link.label}
                  <span aria-hidden="true">↗</span>
                </a>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <footer className="project-window__nav">
        {previous ? (
          <button type="button" className="project-window__nav-item" onClick={() => onNavigate(previous.id)}>
            <span aria-hidden="true">←</span>
            <span className="project-window__nav-label">{previous.name}</span>
          </button>
        ) : (
          <span />
        )}
        {next ? (
          <button
            type="button"
            className="project-window__nav-item project-window__nav-item--next"
            onClick={() => onNavigate(next.id)}
          >
            <span className="project-window__nav-label">{next.name}</span>
            <span aria-hidden="true">→</span>
          </button>
        ) : (
          <span />
        )}
      </footer>
    </section>
  );
}
