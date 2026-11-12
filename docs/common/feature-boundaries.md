# Feature boundaries

Declare recursive source capabilities with workspaceFeatures in the owning package.json. Role folders are not inferred to be features. A declaration has public entry files and optional shared entry files, all canonical paths inside its scope.

Within one feature, internal imports are allowed. Outer composition consumes child public entries; children consume only ancestor shared entries. Sibling features cannot depend on one another. Shared entries must not transitively reach specialized children. External tests use public entries. Imports, type imports, re-exports, literal dynamic imports, aliases and symlinks participate in the check.

Package exports and workspace layers remain mandatory. A feature in another workspace may consume an explicitly shared public entry as a neutral reusable capability. Merely exporting a business feature does not make it shared. Shared entries cannot reach a specialized child, so re-exports cannot bypass this boundary. Transitive checks use the same shared/public entry rule as direct imports. Each approved dependency is checked separately from its own scope, allowing neutral capability chains and cycles without exempting their implementations from checks. Unscoped common helpers follow the same cross-package entry rule; same-workspace sibling dependencies remain forbidden.

Run pnpm check:workspace --source or pnpm validate. Declaration failures and boundary violations are hard errors. Undeclared folders remain opt-in; package, environment and dependency checks still apply. Generator copies this checker and its tests to independent workspaces.
