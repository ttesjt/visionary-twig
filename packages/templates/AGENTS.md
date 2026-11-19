# Template workspace rules

- The app starters are live development workspaces with unique template-* package names and ports. node-library remains an inactive scaffold.
- Source configs must resolve at their real packages/templates/<id> location. src imports use internal paths or public workspace exports; tests resolve package resources through public exports too.
- Declare shared and site packages in the template manifest. Do not depend on current application content, credentials, databases or existing dist.
- Each app owns template.config.mjs and template/initialize.mjs. Hooks modify their target directory using the provided file helpers and mapping. Return root requirements; never edit root files or install dependencies in a hook.
- scripts/templates owns recipe discovery, dependency planning, source assembly and relocation helpers; scripts/generation owns public commands, target qualification and Git publication. Do not duplicate these responsibilities in hooks.
- README.md describes source maintenance; template/README.md is delivered to users. Check public command flags, renamed app paths, actual port selection and links in both. Follow ../../docs/common/documentation-standards.md.
- The public root generator and CI use the same pipeline. Keep both in-place and generated-project validation passing. Preserve provenance in catalog.json.

- Maintained Next templates share `src/infra` byte for byte with plain-next, including paths and executable mode. Run `pnpm check:templates`; upgrade plain-next first and align all maintained Next templates in the same change. Keep template identity and business configuration out of infra. This is source-template maintenance policy only: do not deliver/activate it in independent generated projects.
- Keep common site entry contracts aligned. Site owns schemas, resource declarations, policy and thin host composition; small functions, adapter selection factories and permission hooks are valid here. Feature implementations belong with their feature, and portable mechanics belong in existing shared capabilities. Site values and domain declarations are intentionally different. Generated users may customize both site and infrastructure; preserving recognizable boundaries is upgrade guidance, not an enforced template format.

- Appearance switching is an optional, removable demo. Keep its bootstrap, state, storage, picker and tests in src/demo/appearance; root layout may mount only its public components. Infra/site/resource readiness and business component mounting must not read preview state. Use semantic style hooks, explicit static CSS imports and generic UI slots. No preset registry, JS or HTML attribute is required for static styles. Light/dark/system remains independent.
