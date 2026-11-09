'use client';
import { Container } from '@frontend/ui/layout';
import {
  useCallback,
  useContext,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type FocusEvent,
} from 'react';
import { ScrollBoundary } from '../scroll-boundary/scroll-boundary.js';
import type { ScrollBoundaryState } from '../scroll-boundary/scroll-boundary.schema.js';
import type { ContentProps } from '../shared/component-props.js';
import { contentClassName } from '../shared/component-props.js';
import {
  contentNavigationPropsSchema,
  type ContentNavigationData,
} from './content-navigation.schema.js';
import { NavigationPresentationSession, useNavigationRegistry } from './presentation/parts.js';
import { ContentNavigationIntegrationContext } from './navigation-integration.js';
import { ContentReadingContext, createReadingStore } from './reading-store.js';
import { useReadingPosition } from './use-reading-position.js';
import { ContentNavigationHeader, ContentReadingProgress } from './navigation-surfaces.js';
function leavesRegion(event: FocusEvent<HTMLElement>): boolean {
  const Node = event.currentTarget.ownerDocument.defaultView?.Node;
  return (
    !Node ||
    !(event.relatedTarget instanceof Node) ||
    !event.currentTarget.contains(event.relatedTarget)
  );
}
export type ContentNavigationProps = ContentNavigationData &
  ContentProps & {
    readonly children?: ReactNode;
    readonly resourceKey?: string;
    readonly headerContent?: ReactNode;
    readonly progressContent?: ReactNode;
  };
export function ContentNavigation({
  items,
  label,
  title,
  progressLabel,
  presentation,
  inlineWidth,
  children,
  resourceKey,
  id,
  className,
  headerContent,
  progressContent,
}: ContentNavigationProps) {
  const data = useMemo(
    () =>
      contentNavigationPropsSchema.parse({
        items,
        label,
        title,
        progressLabel,
        presentation,
        inlineWidth,
      }),
    [items, label, title, progressLabel, presentation, inlineWidth]
  );
  const registry = useNavigationRegistry();
  const generatedId = useId();
  const identity = resourceKey ?? generatedId;
  const integration = useContext(ContentNavigationIntegrationContext);
  const body = useRef<HTMLDivElement>(null);
  const origin = useRef<HTMLDivElement>(null);
  const [boundary, setBoundary] = useState<ScrollBoundaryState>('pending');
  const [ending, setEnding] = useState<ScrollBoundaryState>('pending');
  const [focused, setFocused] = useState(false);
  const [headerFocused, setHeaderFocused] = useState(false);
  const store = useMemo(
    () => createReadingStore(data.items[0]?.href ?? ''),
    [data.items, identity]
  );
  useReadingPosition(body, origin, data.items, store, integration);
  const getOffset = useCallback(
    (element: HTMLElement) => integration?.geometry(element).boundaryOffset ?? 0,
    [integration]
  );
  const getEndOffset = useCallback(
    (element: HTMLElement) => integration?.geometry(element).releaseOffset ?? 0,
    [integration]
  );
  const docked = Boolean(
    integration && ((boundary === 'active' && ending !== 'active' && !focused) || headerFocused)
  );
  const Dock = integration?.Dock;
  const content = useMemo(
    () => (
      <ContentReadingContext value={store}>
        <NavigationPresentationSession presentation={data.presentation} registry={registry}>
          <div
            className="ui-content-navigation-docked"
            onFocusCapture={() => setHeaderFocused(true)}
            onBlurCapture={(event) => {
              if (leavesRegion(event)) setHeaderFocused(false);
            }}
          >
            {headerContent ?? <ContentNavigationHeader {...data} presentation="header" />}
          </div>
        </NavigationPresentationSession>
      </ContentReadingContext>
    ),
    [store, headerContent, data, registry]
  );
  const bottom = useMemo(
    () => (
      <ContentReadingContext value={store}>
        <NavigationPresentationSession presentation={data.presentation} registry={registry}>
          {progressContent ?? (
            <ContentReadingProgress label={data.progressLabel} navigation={data} />
          )}
        </NavigationPresentationSession>
      </ContentReadingContext>
    ),
    [store, progressContent, data, registry]
  );
  return (
    <ContentReadingContext value={store}>
      <NavigationPresentationSession presentation={data.presentation} registry={registry}>
        <div
          id={id}
          className={contentClassName('ui-content-navigation', className)}
          data-docked={docked}
        >
          <ScrollBoundary range="past-start" getOffset={getOffset} onStateChange={setBoundary}>
            <Container
              width={data.inlineWidth ?? 'content'}
              ref={origin}
              className="ui-content-navigation-origin"
              data-docked={docked}
              inert={docked}
              aria-hidden={docked ? true : undefined}
              onFocusCapture={() => setFocused(true)}
              onBlurCapture={(event) => {
                if (leavesRegion(event)) setFocused(false);
              }}
            >
              <ContentNavigationHeader {...data} presentation="inline" active={!docked} />
              <ContentReadingProgress
                label={data.progressLabel}
                navigation={data}
                placement="inline"
                active={!docked}
              />
            </Container>
            <div ref={body} className="ui-content-navigation-body">
              {children}
            </div>
            <ScrollBoundary
              className="ui-content-navigation-end"
              getOffset={getEndOffset}
              onStateChange={setEnding}
            />
          </ScrollBoundary>
          {Dock && docked && (
            <Dock key={identity} resourceKey={identity} bottom={bottom}>
              {content}
            </Dock>
          )}
        </div>
      </NavigationPresentationSession>
    </ContentReadingContext>
  );
}
