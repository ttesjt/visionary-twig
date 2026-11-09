'use client';
import { useContext, useState, useEffect, useRef } from 'react';
import { ChevronDown } from 'lucide-react';
import { ContentNavigationIntegrationContext } from './navigation-integration.js';
import { useContentReading, navigationPosition } from './reading-store.js';
import type { ContentNavigationData } from './content-navigation.schema.js';
import {
  DefaultNavigationTitle,
  DefaultNavigationItem,
  useNavigationPresentation,
  useNavigationSurfaceState,
  navigationPartComponent,
  type NavigationPartProps,
  type NavigationPlacement,
} from './presentation/parts.js';
import { useCompactNavigation } from './presentation/use-compact-navigation.js';
export type ContentNavigationHeaderProps = Pick<ContentNavigationData, 'title' | 'label' | 'items'>;
export function ContentNavigationHeader({
  title,
  label,
  items,
  progressLabel = label,
  presentation = 'header',
  active = true,
}: ContentNavigationHeaderProps & {
  readonly progressLabel?: string;
  readonly presentation?: 'header' | 'inline';
  readonly active?: boolean;
}) {
  const surface = useNavigationSurfaceState(active);
  const reading = useContentReading();
  const registry = useNavigationPresentation();
  const integration = useContext(ContentNavigationIntegrationContext);
  const compact = useCompactNavigation();
  const [menuOpen, setMenuOpen] = useState(false);
  const overflow = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = overflow.current;
    function toggle(event: Event) {
      if ('newState' in event) setMenuOpen(event.newState === 'open');
    }
    element?.addEventListener('toggle', toggle, true);
    return () => element?.removeEventListener('toggle', toggle, true);
  }, [presentation, integration]);
  const Menu = presentation === 'header' ? integration?.Menu : undefined;
  const navigation = { title, label, items, progressLabel };
  const position = navigationPosition(navigation, reading);
  const current = position.currentIndex;
  const shared = { navigation, reading, ...position, ...surface };
  const itemSelection = registry.parts.item;
  const Item = navigationPartComponent(
    registry.components.item,
    itemSelection.id,
    DefaultNavigationItem
  );
  const titleSelection = registry.parts.title;
  const Title = navigationPartComponent(
    registry.components.title,
    titleSelection.id,
    DefaultNavigationTitle
  );
  function links(placement: NavigationPlacement, visible: boolean) {
    return items.map((item, index) => (
      <a
        key={item.href}
        href={item.href}
        aria-label={item.label}
        inert={!(surface.interactive && visible)}
        data-active={surface.active && visible}
        data-interactive={surface.interactive && visible}
        aria-current={item.href === reading.href ? 'location' : undefined}
      >
        <Item
          {...shared}
          active={surface.active && visible}
          interactive={surface.interactive && visible}
          placement={placement}
          options={itemSelection.options}
          item={item}
          index={index}
          current={item.href === reading.href}
        />
      </a>
    ));
  }
  return (
    <nav
      className="ui-content-navigation-links"
      data-presentation={presentation}
      data-navigation-preset={registry.preset}
      data-has-menu={Boolean(Menu)}
      data-active={surface.active}
      data-interactive={surface.interactive}
      inert={!surface.interactive}
      aria-label={label}
    >
      <span className="ui-content-navigation-identity">
        <Title {...shared} placement={presentation} options={titleSelection.options} />
      </span>
      <div className="ui-content-navigation-destinations">
        {links(presentation, !(Menu && compact))}
      </div>
      {Menu && (
        <div className="ui-content-navigation-overflow" ref={overflow}>
          <Menu
            label={label}
            trigger={
              <span
                className="ui-content-navigation-trigger-label"
                role="img"
                aria-label={items[current]?.label ?? label}
              >
                <span className="ui-content-navigation-current">
                  {items[current] && (
                    <Item
                      {...shared}
                      active={surface.active && compact}
                      interactive={surface.interactive && compact}
                      placement="trigger"
                      options={itemSelection.options}
                      item={items[current]}
                      index={current}
                      current
                    />
                  )}
                </span>
                <ChevronDown aria-hidden="true" />
              </span>
            }
          >
            <div className="ui-content-navigation-menu" data-navigation-preset={registry.preset}>
              {links('menu', compact && menuOpen)}
            </div>
          </Menu>
        </div>
      )}
      <span className="ui-content-navigation-count" aria-hidden="true">
        {String(current + 1).padStart(2, '0')} / {String(items.length).padStart(2, '0')}
      </span>
    </nav>
  );
}
/** Shared semantics remain intact even when a host supplies a different visual progress part. */
export function ContentReadingProgress({
  label,
  navigation,
  placement = 'header',
  active = true,
}: {
  readonly label: string;
  readonly navigation?: ContentNavigationData;
  readonly placement?: NavigationPlacement;
  readonly active?: boolean;
}) {
  const surface = useNavigationSurfaceState(active);
  const reading = useContentReading();
  const registry = useNavigationPresentation();
  const selection = registry.parts.progress;
  // Preserve the public native progress element for the default presentation.
  if (selection.id === 'default')
    return (
      <progress
        className="ui-content-reading-progress"
        value={reading.progress}
        max={1}
        aria-label={label}
        data-active={surface.active}
        data-interactive={surface.interactive}
      />
    );
  const Progress = registry.components.progress[selection.id];
  if (!Progress) throw new Error(`Missing navigation progress renderer: ${selection.id}`);
  const props: NavigationPartProps = {
    reading,
    ...navigationPosition(navigation ?? { label, progressLabel: label, items: [] }, reading),
    placement,
    ...surface,
    options: selection.options,
    navigation: navigation ?? { label, progressLabel: label, items: [] },
  };
  return (
    <div
      className="ui-content-navigation-progress"
      data-navigation-preset={registry.preset}
      role="progressbar"
      data-active={surface.active}
      data-interactive={surface.interactive}
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={1}
      aria-valuenow={reading.progress}
    >
      <div aria-hidden="true">
        <Progress {...props} />
      </div>
    </div>
  );
}
