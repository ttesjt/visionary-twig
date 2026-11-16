const CONTACT_WINDOW_MS = 60_000;
const MAX_CONTACT_ATTEMPTS = 12;

let until = 0;
let attempts = 0;

/** A per-process cap; multi-instance hosts can also limit traffic at their perimeter. */
export function reserveContactAttempt(now = Date.now()): number | null {
  if (now >= until) {
    until = now + CONTACT_WINDOW_MS;
    attempts = 0;
  }
  if (attempts >= MAX_CONTACT_ATTEMPTS) return Math.ceil((until - now) / 1_000);
  attempts += 1;
  return null;
}
