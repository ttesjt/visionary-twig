import type { ReactElement } from 'react';
import type { ProjectBadge as Badge } from '../contracts.js';

export function ProjectBadge({
  badge,
  imageUrl,
}: {
  readonly badge: Badge;
  readonly imageUrl?: string | undefined;
}): ReactElement | null {
  if (badge.type === 'text')
    return (
      <span className="ui-project-badge" lang={badge.locale}>
        {badge.label}
      </span>
    );
  if (!imageUrl) return null;
  return (
    <img
      className="ui-project-badge-image"
      src={imageUrl}
      alt={badge.alt}
      lang={badge.locale}
      width={24}
      height={24}
      loading="lazy"
    />
  );
}
