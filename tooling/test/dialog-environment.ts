/** jsdom has no native modal methods. Model visibility only; real focus/inertness/top-layer behavior belongs to browser tests. */
export function installDialogEnvironment(): void {
  if (typeof HTMLDialogElement === 'undefined') return;
  const prototype = HTMLDialogElement.prototype;
  if (typeof prototype.showModal !== 'function')
    Object.defineProperty(prototype, 'showModal', {
      configurable: true,
      writable: true,
      value(this: HTMLDialogElement) {
        this.setAttribute('open', '');
      },
    });
  if (typeof prototype.close !== 'function')
    Object.defineProperty(prototype, 'close', {
      configurable: true,
      writable: true,
      value(this: HTMLDialogElement) {
        this.removeAttribute('open');
      },
    });
}
