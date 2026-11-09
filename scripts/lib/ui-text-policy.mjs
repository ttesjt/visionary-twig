import ts from 'typescript';

// Visible labels, including labels nested in option/navigation descriptors. IDs and URLs
// deliberately are not in this set; static analysis cannot classify business content.
const LABEL_PROPERTIES = new Set([
  'label',
  'title',
  'description',
  'placeholder',
  'alt',
  'emptyLabel',
  'allLabel',
  'viewerLabel',
  'linksLabel',
  'linksEmptyLabel',
  'nextLabel',
  'previousLabel',
  'closeLabel',
  'skipLabel',
  'openLabel',
  'loadingLabel',
  'errorLabel',
  'navigationLabel',
  'actionsLabel',
]);
const LEGACY_UI_NAMES = new Set([
  'caseCopy',
  'ThemeCopy',
  'ViewerCopy',
  'GalleryCopy',
  'ArtworkViewerCopy',
  'ProjectPreviewCopy',
  'ProjectionCopy',
  'StudioDiscardCopy',
  'ContactFormCopy',
  'viewerCopySchema',
  'artworkViewerCopySchema',
  'projectPreviewCopySchema',
  'contactFormCopySchema',
  'studioDiscardCopySchema',
  'PROJECTION_COPY_KEYS',
  'DEFAULT_VIEWER_COPY',
  'DEFAULT_GALLERY_COPY',
  'DEFAULT_STUDIO_DISCARD_COPY',
]);
const hasLetters = (value) => /[\p{L}]/u.test(value);
function literalText(node) {
  if (ts.isStringLiteralLike(node)) return hasLetters(node.text);
  if (ts.isTemplateExpression(node))
    return (
      hasLetters(node.head.text) || node.templateSpans.some((span) => hasLetters(span.literal.text))
    );
  if (ts.isParenthesizedExpression(node)) return literalText(node.expression);
  if (ts.isConditionalExpression(node))
    return literalText(node.whenTrue) || literalText(node.whenFalse);
  if (
    ts.isBinaryExpression(node) &&
    [
      ts.SyntaxKind.PlusToken,
      ts.SyntaxKind.AmpersandAmpersandToken,
      ts.SyntaxKind.BarBarToken,
      ts.SyntaxKind.QuestionQuestionToken,
    ].includes(node.operatorToken.kind)
  )
    return literalText(node.left) || literalText(node.right);
  return false;
}
function propertyName(node, source) {
  return ts.isStringLiteral(node) ? node.text : node.getText(source);
}
function labelProperty(name) {
  return (
    name === 'aria-label' ||
    name === 'aria-description' ||
    name === 'aria-roledescription' ||
    LABEL_PROPERTIES.has(name)
  );
}

/** A deliberately bounded guard, not a semantic proof. Fixtures are imported data;
 * inline UI, labels and branch strings must use the host catalog. Never skip cases/examples.
 * Enabled catalog/namespace hosts are discovered from their workspace capabilities.
 */
export function checkUiTextSource(filename, content) {
  const source = ts.createSourceFile(
    filename,
    content,
    ts.ScriptTarget.Latest,
    true,
    filename.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS
  );
  const errors = [];
  function report(node, message) {
    const line = source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;
    errors.push(`${filename}:${line}: ${message}`);
  }
  function visit(node) {
    if (ts.isIdentifier(node) && LEGACY_UI_NAMES.has(node.text))
      report(node, 'Use the canonical Text UI API; serialized copy fields are unchanged.');
    if (ts.isJsxText(node) && hasLetters(node.text))
      report(node, 'UI text must come from TextCatalog or an explicit content fixture.');
    if (
      ts.isJsxExpression(node) &&
      (ts.isJsxElement(node.parent) || ts.isJsxFragment(node.parent)) &&
      node.expression &&
      literalText(node.expression)
    )
      report(node, 'Inline UI strings and branches must use TextCatalog.');
    if (ts.isJsxAttribute(node) && labelProperty(node.name.getText(source)) && node.initializer) {
      const expression = ts.isJsxExpression(node.initializer)
        ? node.initializer.expression
        : node.initializer;
      if (expression && literalText(expression)) report(node, 'UI labels must use TextCatalog.');
    }
    if (
      filename.endsWith('.tsx') &&
      ts.isPropertyAssignment(node) &&
      labelProperty(propertyName(node.name, source)) &&
      literalText(node.initializer)
    )
      report(
        node,
        'Inline UI label descriptors must use TextCatalog or imported content fixtures.'
      );
    if (
      ts.isImportDeclaration(node) &&
      /(?:^|\/)(?:copy\.schema|media-copy\.schema|viewer-copy|preview-copy)(?:\.[jt]s)?$/.test(
        node.moduleSpecifier.text
      )
    )
      report(node, 'Import the canonical text module.');
    ts.forEachChild(node, visit);
  }
  visit(source);
  return errors;
}
