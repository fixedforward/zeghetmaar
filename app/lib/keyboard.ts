export function isTypingTarget(target: EventTarget | null): boolean {
  const element = target as HTMLElement | null
  return !!element && (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA' || element.isContentEditable === true)
}

// While a modal dialog is open, its keys (Space on a button, typing) shouldn't drive the page behind it.
export function isModalOpen(): boolean {
  return document.querySelector('[aria-modal="true"]') !== null
}
