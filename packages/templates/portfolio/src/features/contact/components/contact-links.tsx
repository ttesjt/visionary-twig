import Image from 'next/image';
import type { AppConfig } from '../../../site/config-schema';

export function ContactLinks({
  links,
  label,
}: {
  readonly links: NonNullable<AppConfig['contact']>['links'];
  readonly label: string;
}) {
  if (links.length === 0) return null;
  return (
    <nav aria-label={label} className="ui-portfolio-platforms">
      <h2>{label}</h2>
      <ul className="ui-portfolio-contact-links">
        {links.map(({ name, href, icon }) => (
          <li key={href}>
            <a href={href}>
              {icon && <Image src={icon} alt="" width={20} height={20} unoptimized />}
              {name}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
