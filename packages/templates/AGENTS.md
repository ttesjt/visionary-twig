# Template workspace rules

- The app starters are live development workspaces with unique template-* package names and ports. node-library remains an inactive scaffold.
- Source configs must resolve at their real packages/templates/<id> location. src imports use internal paths or public workspace exports; tests resolve package resources through public exports too.
- Declare shared and site packages in the template manifest. Do not depend on current application content, credentials, databases or existing dist.
- Each app owns template.config.mjs and template/initialize.mjs. Hooks modify their target directory using the provided file helpers and mapping. Return root requirements; never edit root files or install dependencies in a hook.
- scripts/templates owns recipe discovery, dependency planning, source assembly and relocation helpers; scripts/generation owns public commands, target qualification and Git publication. Do not duplicate these responsibilities in hooks.
- README.md describes source maintenance; template/README.md is delivered to users. Check public command flags, renamed app paths, actual port selection and links in both. Follow ../../docs/common/documentation-standards.md.
- The public root generator and CI use the same pipeline. Keep both in-place and generated-project validation passing. Preserve provenance in catalog.json.
