import { Link } from 'react-router-dom';
import type { MouseEventHandler, ReactNode } from 'react';

type Props = {
  href: string;
  className?: string;
  children: ReactNode;
  onClick?: MouseEventHandler<HTMLAnchorElement>;
  'aria-label'?: string;
};

/** Hash-only anchors use `<a>`; app routes use react-router `<Link>`. */
export function SmartNavLink({
  href,
  className,
  children,
  onClick,
  'aria-label': ariaLabel,
}: Props) {
  if (href.startsWith('#')) {
    return (
      <a href={href} className={className} onClick={onClick} aria-label={ariaLabel}>
        {children}
      </a>
    );
  }
  return (
    <Link to={href} className={className} onClick={onClick} aria-label={ariaLabel}>
      {children}
    </Link>
  );
}
