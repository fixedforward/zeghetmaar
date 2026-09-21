export function buildChatGptExplainUrl(phrase: string): string {
  const prompt = `Leg dit Nederlandse woord of deze zin uit en hoe het wordt gebruikt: "${phrase}"`
  return `https://chatgpt.com/?q=${encodeURIComponent(prompt)}`
}

export function buildChatGptCheckAnswerUrl(phrase: string, situation: string, answer: string): string {
  const prompt = `Ik oefen Nederlands en ben de frase/het woord "${phrase}" aan het oefenen. De situatie was: "${situation}". Mijn antwoord was: "${answer}". Geef een korte uitleg waarom mijn antwoord niet klopt (als dat zo is), herhaal mijn poging, voordat je 2-3 concrete suggesties ter verbetering aan mij geven, en ook een engelse zin die de frase gebruikt.`
  return `https://chatgpt.com/?q=${encodeURIComponent(prompt)}`
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
