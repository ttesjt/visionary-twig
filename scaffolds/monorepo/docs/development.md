# Development server ports

Use the root `pnpm dev --app <id>` runners for applications.
Generated workspaces retain the same runner and policy, including renamed application directories.
Package-local `pnpm dev` invokes the framework CLI directly; it does not apply the workspace policy.

## Selection policy

- Without an explicit port, `workspaceApp.devPort` is preferred. If occupied, try up to ten successive ports, without exceeding 65535.
- `--port`, `APP_DEV_PORT`, and `PORT` are explicit choices and strict by default. Precedence is CLI, then APP_DEV_PORT, then PORT, then manifest.
- Add `--port-fallback` to explicitly permit fallback for an overridden port.
- Port probes do not reserve sockets. If another process claims a candidate before Next starts listening, retry only a startup EADDRINUSE for that candidate. Prepared input checks, compilation failures, unrelated addresses, and errors after readiness do not trigger fallback.
- Logs identify the app and checkout, show each selected startup URL, and explain occupied-port retries. Next reports readiness at the final URL.
- E2E remains strict: the test runner supplies one port to both server and browser. `PLAYWRIGHT_PORT` is independent of development options. Production `pnpm start` / `next start` also remains strict and does not accept workspace development fallback flags.

```sh
pnpm dev
pnpm dev --app editor --port 3301
pnpm dev --app components --port 3302 --port-fallback
APP_DEV_PORT=3300 pnpm dev
```

Hosts with a declared dev hook can use `pnpm dev --app <id> --data <mode>`.
The host owns mode validation and storage effects; generic runners have no provider
selection. See the host's documentation before using a cloud mode. No preparation
or data migration happens implicitly. [Command reference](commands.md).

The root runner builds the selected dependency closure once, then watches them while supervising the selected app. SIGINT/SIGTERM or an unrecoverable app failure stops only that launcher's own processes. Multiple worktrees have separate Next output directories; running the same app twice in one checkout can still fail on Next's development lock even when ports differ.
