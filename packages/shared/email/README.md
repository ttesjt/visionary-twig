# @frontend/email

Provider-neutral, single-recipient plain-text email messages and delivery ports.
The message schema rejects unsupported fields, malformed addresses and header
injection. EmailSender accepts an AbortSignal and returns an acknowledged receipt.
Accepted delivery is not a guarantee that a message reached the final inbox.

Applications own recipients, sender identity, templates, credentials, consent and
abuse policy. Concrete implementations belong in adapters. This package imports
no framework, provider SDK, environment configuration, storage or network client.
EmailDeliveryError exposes stable codes and optional safe provider status/codes;
its cause is for server diagnostics and must never be serialized to public clients.
