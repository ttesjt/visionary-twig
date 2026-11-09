# Site package rules

- Site packages own domain contracts, presentation and styles, separate from neutral shared capabilities.
- Consume neutral shared ports; never import application instances or concrete adapters.
- Keep content, defaults, examples and tests fictional. Hosts supply actual content and provider configuration.
- Consumers explicitly select CSS exports. React packages can own their default CSS in `src/styles/`.
- Follow the root standards and keep site changes in responsibility-scoped commits.
