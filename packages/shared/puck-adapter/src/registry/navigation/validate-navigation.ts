import type { ContentData, PropsIssue } from '@frontend/ui-document';
import { hasDocumentContentSlot } from '../catalog.js';
import { fragmentLinks, navigationNodes } from './walk-navigation.js';

/** Run after bindings and prop validation, so variable-driven names/links are checked too. */
export function validateNavigation(data: ContentData): readonly PropsIssue[] {
  const nodes = navigationNodes(data);
  const targets = new Set<string>();
  const issues: PropsIssue[] = [];
  for (const { node, path, insideTabPanel } of nodes) {
    if (node.type !== 'Anchor' || typeof node.props.name !== 'string') continue;
    if (targets.has(node.props.name))
      issues.push({
        path: [...path, 'props', 'name'],
        message: `Duplicate anchor target: ${node.props.name}.`,
      });
    targets.add(node.props.name);
    if (insideTabPanel)
      issues.push({
        path: [...path, 'props', 'name'],
        message: 'Anchor targets must be outside tab panels. Anchor the containing Tabs instead.',
      });
  }
  const readingNavigations = nodes.filter(({ node }) => node.type === 'ContentNavigation');
  if (readingNavigations.length > 1)
    issues.push({
      path: readingNavigations[1]?.path ?? [],
      message: 'Use one ContentNavigation reading region per document.',
    });
  for (const navigation of readingNavigations) {
    const ownTargets = new Set(
      nodes
        .filter(
          (candidate) =>
            candidate.path.length > navigation.path.length &&
            navigation.path.every((part, index) => candidate.path[index] === part) &&
            candidate.node.type === 'Anchor'
        )
        .map((candidate) => candidate.node.props.name)
    );
    for (const link of fragmentLinks(navigation.node.props, [], true))
      if (!ownTargets.has(link.target))
        issues.push({
          path: [...navigation.path, 'props', ...link.path],
          message: 'ContentNavigation destinations must be declared inside its reading region.',
        });
  }
  for (const { node, path } of nodes) {
    for (const link of fragmentLinks(node.props, [], hasDocumentContentSlot(node.type))) {
      if (!targets.has(link.target))
        issues.push({
          path: [...path, 'props', ...link.path],
          message: `Unknown anchor target: ${link.target}. Declare an Anchor node in this document.`,
        });
    }
  }
  return issues;
}
