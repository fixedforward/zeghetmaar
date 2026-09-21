import { explainPhrasePrompt, checkAnswerPrompt } from './prompts'

export function buildChatGptExplainUrl(phrase: string): string {
  return `https://chatgpt.com/?q=${encodeURIComponent(explainPhrasePrompt(phrase))}`
}

export function buildChatGptCheckAnswerUrl(phrase: string, situation: string, answer: string, extraWords: string[] = []): string {
  return `https://chatgpt.com/?q=${encodeURIComponent(checkAnswerPrompt(phrase, situation, answer, extraWords))}`
}

// chatgpt.com blocks being embedded in an iframe (it sends X-Frame-Options / a
// frame-ancestors CSP), so a true in-page modal isn't possible. Opening it with
// window features instead of a bare '_blank' makes the browser render it as a
// separate popup window rather than a new tab, so the current tab is never
// replaced or backgrounded. Best effort only: some browsers still turn this into
// a tab, and window.focus() cannot reliably override which window takes focus.
export function openChatGptInBackground(url: string): void {
  const popupWidth = 480
  const popupHeight = 720

  // Place it right next to the current browser window instead of a fixed
  // screen position — screenLeft/Top is the origin window's position, and
  // outerWidth is its full frame width, so left edge of the popup lands right
  // at the current window's right edge, vertically aligned with its top.
  const originLeft = window.screenLeft ?? window.screenX ?? 0
  const originTop = window.screenTop ?? window.screenY ?? 0
  const originWidth = window.outerWidth ?? 0
  const left = originLeft + originWidth
  const top = originTop

  window.open(
    url,
    'chatgpt-popup',
    `popup=yes,noopener,noreferrer,width=${popupWidth},height=${popupHeight},left=${left},top=${top}`
  )
  window.focus()
}
