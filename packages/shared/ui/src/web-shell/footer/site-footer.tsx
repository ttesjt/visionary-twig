import type { ReactElement } from 'react';
import { Container } from '../../layout.js';

export interface SiteFooterLink {
  readonly href: string;
  readonly label: string;
}

export interface SiteFooterProps {
  readonly brand: string;
  readonly links: readonly SiteFooterLink[];
  readonly linksLabel: string;
}

export function SiteFooter({ brand, links, linksLabel }: SiteFooterProps): ReactElement {
  return (
    <footer className="ui-site-footer">
      <Container>
        <div className="ui-site-footer-content">
          <p>{brand}</p>
          <nav aria-label={linksLabel}>
            <ul className="ui-site-footer-links">
              {links.map((link) => (
                <li key={link.href}>
                  <a href={link.href}>{link.label}</a>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </Container>
    </footer>
  );
}
