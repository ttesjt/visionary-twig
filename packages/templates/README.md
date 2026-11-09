# Application and library starting points

Available templates: `node-library`.

Use `pnpm template:clone --list` to inspect the catalog. Generate into a new
independent workspace with `pnpm template:clone --output ../new-project
--templates node-library --name @example/workspace`.

The generator copies the selected template and its shared dependency closure,
maps package identities, installs once and validates the generated project.
Templates, local inputs, existing applications and build output are not copied.
Use `--offline` with a populated dependency store.
