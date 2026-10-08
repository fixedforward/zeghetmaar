import { explainPhrasePrompt, checkAnswerPrompt, comprehensionCheckPrompt, listeningComprehensionPrompt } from './prompts'
import { openPopupWindow } from './popup'

export function buildChatGptExplainUrl(phrase: string, context?: string): string {
  return `https://chatgpt.com/?q=${encodeURIComponent(explainPhrasePrompt(phrase, context))}`
}

export function buildChatGptComprehensionUrl(articleText: string): string {
  return `https://chatgpt.com/?q=${encodeURIComponent(comprehensionCheckPrompt(articleText))}`
}

// The normal "anyone with the link" share link: ChatGPT said it couldn't open the
// uc?export=download link and asked for this one instead.
export function driveShareUrl(fileId: string): string {
  return `https://drive.google.com/file/d/${encodeURIComponent(fileId)}/view?usp=sharing`
}

export function buildChatGptListeningComprehensionUrl(title: string, subtitleFileId: string): string {
  return `https://chatgpt.com/?q=${encodeURIComponent(listeningComprehensionPrompt(title, driveShareUrl(subtitleFileId)))}`
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

  openPopupWindow(url, 'chatgpt-popup', { width: popupWidth, height: popupHeight, left, top })
  window.focus()
}

// chatgpt.com still loaded a 64 KB URL but not a 125 KB one (a whole podcast transcript is
// ~120 KB encoded), so a longer prompt goes via the clipboard and ChatGPT opens empty.
const MAX_PROMPT_URL_LENGTH = 30_000

export async function openChatGptWithPromptAsync(prompt: string): Promise<'url' | 'clipboard'> {
  const url = `https://chatgpt.com/?q=${encodeURIComponent(prompt)}`
  if (url.length <= MAX_PROMPT_URL_LENGTH) {
    openChatGptInBackground(url)
    return 'url'
  }
  await navigator.clipboard.writeText(prompt)
  openChatGptInBackground('https://chatgpt.com/')
  return 'clipboard'
}
