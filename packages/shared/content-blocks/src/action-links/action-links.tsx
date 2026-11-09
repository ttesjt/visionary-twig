import { useId, type ReactElement } from 'react';
import { contentClassName, type ContentProps } from '../shared/component-props.js';
import { ActionIcon } from './action-icon.js';
import {
  DEFAULT_ACTION_KIND,
  actionLinksPropsSchema,
  type ActionLinksData,
} from './action-links.schema.js';

export type ActionLinksProps = ActionLinksData & ContentProps;
export function ActionLinks({
  actions,
  label = 'Related links',
  newTabHint = '(opens in new tab)',
  newTabHintDisplay = 'visible',
  id,
  className,
}: ActionLinksProps): ReactElement {
  const descriptionId = useId();
  const parsed = actionLinksPropsSchema.parse({ actions, label, newTabHint, newTabHintDisplay });
  return (
    <ul id={id} className={contentClassName('ui-action-links', className)} aria-label={label}>
      {parsed.actions.map((action, index) => {
        const reasonId = `${descriptionId}-${index}`;
        return (
          <li key={action.id} className="ui-action-item">
            {action.availability === 'available' ? (
              <a
                className="ui-action-link"
                data-kind={action.kind ?? DEFAULT_ACTION_KIND}
                data-icon={action.icon}
                href={action.href}
                target={action.newTab ? '_blank' : undefined}
                rel={action.newTab ? 'noopener noreferrer' : undefined}
              >
                {action.icon && <ActionIcon name={action.icon} />}
                {action.label}
                {action.newTab && (
                  <span
                    className={
                      newTabHintDisplay === 'visible'
                        ? 'ui-action-hint'
                        : 'ui-action-hint ui-visually-hidden'
                    }
                  >
                    {' '}
                    {newTabHint}
                  </span>
                )}
              </a>
            ) : (
              <>
                <span
                  className="ui-action-link"
                  data-kind={action.kind ?? DEFAULT_ACTION_KIND}
                  data-icon={action.icon}
                  aria-disabled="true"
                  aria-describedby={reasonId}
                >
                  {action.icon && <ActionIcon name={action.icon} />}
                  {action.label}
                </span>
                <span className="ui-action-reason" id={reasonId}>
                  {action.reason}
                </span>
              </>
            )}
          </li>
        );
      })}
    </ul>
  );
}
