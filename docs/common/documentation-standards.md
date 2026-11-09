# Documentation standards

Documentation is a maintained interface for users and contributors. It must help
a reader locate a capability, understand its limits, change the right owner and
verify the result. Public documentation uses English as its canonical language.

## Ownership and audiences

| Document                          | Responsibility                                                                    |
| --------------------------------- | --------------------------------------------------------------------------------- |
| Root README                       | Purpose, prerequisites, shortest supported start and the documentation entry      |
| Root AGENTS.md                    | Mandatory ownership, standards, verification and delivery rules for coding agents |
| Documentation index               | Task-based reading paths and links to the owning contracts                        |
| Architecture and technical guides | Current flows, integration choices, rationale and supported limits                |
| Package README                    | Public entries/APIs, defaults, failure behavior and verified examples             |
| App README                        | Taking over pages, resources, examples, configuration and operations              |
| External engineering records      | Proposals, plans, progress, experiments and review evidence                       |

Source-repository documentation serves template/framework maintainers. Generated
project documentation serves the owner of the delivered apps and packages. State
which audience a guide addresses. Paths and prerequisites must match that audience;
source-only generators, template routes and private maintainer credentials are not
universal user-project requirements.

## One detailed source per contract

Use short summaries and links instead of several complete copies. Keep exact APIs
at their owning package. Explain cross-package integration in technical guides.
Document stable ownership and rationale separately from incidental implementation
paths; update the map and its incoming links whenever code moves.

Do not require a particular documentation tree in user-owned projects. The provided
index and guides organize the template's maintained capabilities, not every feature
a user might add. Add useful guides rather than empty pages to complete a hierarchy.

## State what is true

Distinguish implemented behavior, supported limits and undecided proposals. Do not
present an intended feature as available. Detailed migration sequences, historical
commit narratives and task status belong in engineering records, not operating
instructions. A concise migration recipe needed by existing users may stay with
the affected contract.

A technical guide should identify its audience and owner, explain a verified usage
or extension path, state important constraints, and link to relevant API and
verification instructions. Include only the sections that help that topic.

## Examples and commands

Use neutral fixtures and reserved example domains. Never include personal contact
information, private local paths, records or credentials. Describe process variables
by name without copying secret values. Label actions that access live resources or
write durable data.

Check command names and arguments against manifests and CLI help. State the working
directory and prerequisites. Link to the pinned toolchain source rather than
maintaining competing version tables. Prefer app IDs/placeholders and manifest-based
port discovery over fixed names or ports that change during generation.

Generated projects have different scripts and paths from the source repository.
Update the actual delivery inputs as well as source guides. Preserve portable links
for renamed apps, bare workspaces and selected optional packages. A valid link alone
does not prove that the linked instructions or command examples are current.

## Maintenance and verification

Register new guides in the documentation index or a relevant task route. Use relative
Markdown links, verify paths and anchors, and keep useful incoming links when moving
content. Check formatting and the documented CLI operations. When changing delivery,
inspect real generated README/AGENTS/guides with renamed apps and partial selections.

Update contracts and the tests that verify their behavior in the same delivery.
Report checks actually performed and their limits. Documentation-only changes do not
require unrelated runtime edits or browser tests; changes to generation/configuration
still require the affected workspace and independent-output checks.
