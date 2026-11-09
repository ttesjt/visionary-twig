# Adapter rules

- Implement neutral contracts from packages/shared; applications select and initialize providers.
- Never depend on apps, site packages or templates, including tests/devDependencies. Mixed app/domain/provider integration tests belong to app hosts.
- Keep Node development bridges separate from native Worker/runtime entries. No credentials, resource identities or content in tracked sources.
- Expose explicit connection lifecycle; no environment discovery or network access on import.
