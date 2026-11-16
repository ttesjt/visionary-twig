# Contact

Reusable contact form and plain-text email submission for a website.

- `@frontend/contact/contracts` exposes `contactValuesSchema`,
  `validateContact`, and the public submission result schema. The name is
  optional. Email and message are required. An invalid result identifies fields
  so the site can display its own translations.
- `@frontend/contact/ui` exposes the client `ContactForm`. Pass labels, status
  messages, and a `submit(values, signal)` callback. That callback can call the
  site's contact endpoint and decode its response with `contactSubmitResultSchema`.
  The form prevents concurrent submissions. It signals cancellation on request
  or unmount, preserves fields on failure or cancellation and clears them after
  acceptance. A transport may have already handed a canceled request to its
  sender, so the form leaves retries to the user.
- `@frontend/contact/server` exposes `submitContact(input, options, signal)`.
  The service validates unknown input, builds a plain-text message, then validates
  it with `@frontend/email` before calling the injected `EmailSender`.
- `@frontend/contact/default.css` exposes optional styles that use the site's
  shared theme tokens.

The site supplies the sender and recipient addresses, notification text and delivery
implementation in server code. The visitor's address is used for `Reply-To`.
An invalid form returns field identifiers without sending mail. A successful
submission means the sender acknowledged it. An `EmailDeliveryError` retains its
diagnostic code and cause for the calling server. Map delivery failures to public
result codes at the site's endpoint and keep provider diagnostics there.

The host also owns transport, request limits, verification, rate limiting and
credentials. Its server entry may use a test implementation of `EmailSender`
in local development and inject a concrete mail adapter when deployed.
