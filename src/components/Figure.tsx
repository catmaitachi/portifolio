import styles from './Figure.module.css';

interface FigureProps {
  /** vazio = renderiza a moldura de espaço reservado */
  src?: string;
  alt: string;
  /** texto da moldura quando não há imagem */
  placeholder?: string;
  fit?: 'cover' | 'contain';
  className?: string;
}

/**
 * Imagem com espaço reservado.
 *
 * Substitui o `<image-slot>` do canvas de design, que pintava a própria moldura
 * dentro de um shadow DOM inalcançável de fora. Aqui a moldura é uma classe
 * comum, então o retrato e o banner de projeto podem arredondá-la, recortá-la ou
 * sobrepor um scrim como qualquer outro elemento.
 *
 * O `<img>` fica `aria-hidden` quando é decorativo (`alt` vazio) e a moldura
 * vazia não entra na árvore de acessibilidade — um espaço reservado não é
 * conteúdo.
 */
export function Figure({ src, alt, placeholder, fit = 'cover', className }: FigureProps) {
  const classe = className ? `${styles.figura} ${className}` : styles.figura;

  if (!src) {
    return (
      <span className={classe} aria-hidden="true">
        {placeholder ? <span className={styles.rotulo}>{placeholder}</span> : null}
      </span>
    );
  }

  return (
    <span className={classe}>
      <img
        className={styles.img}
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        style={{ objectFit: fit }}
      />
    </span>
  );
}
