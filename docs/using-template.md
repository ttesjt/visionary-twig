# Using the template

Copy source into a new directory, excluding .git, node_modules, dist, .next, coverage, *.tsbuildinfo, and browser-test outputs. Keep pnpm-lock.yaml, initialize the new project's own history, and run pnpm install --frozen-lockfile.

The private @frontend scope can remain in unrelated repositories. To rename it, update root/workspace names, dependency keys, and imports together, then refresh the lockfile with pnpm install. The checker derives its scope from the root name. Generic ui-* hooks can remain stable.

Run pnpm clean followed by pnpm validate to verify the copied baseline. Add a runnable host under apps/ for the selected framework. Retain public package exports, required scripts, and environment-specific configuration.
