export function buildChatGptExplainUrl(phrase: string): string {
  const prompt = `Leg dit Nederlandse woord of deze zin uit en hoe het wordt gebruikt: "${phrase}"`
  return `https://chatgpt.com/?q=${encodeURIComponent(prompt)}`
}

export function buildChatGptCheckAnswerUrl(phrase: string, situation: string, answer: string): string {
  const prompt = `Ik oefen Nederlands en ben de frase/het woord "${phrase}" aan het oefenen. De situatie was: "${situation}". Mijn antwoord was: "${answer}". Geef een korte uitleg waarom mijn antwoord niet klopt (als dat zo is), en geef 2-3 concrete suggesties ter verbetering.`
  return `https://chatgpt.com/?q=${encodeURIComponent(prompt)}`
}

// chatgpt.com blocks being embedded in an iframe (it sends X-Frame-Options / a
// frame-ancestors CSP), so a true in-page modal isn't possible. Opening it with
// window features instead of a bare '_blank' makes the browser render it as a
// separate popup window rather than a new tab, so the current tab is never
// replaced or backgrounded. Best effort only: some browsers still turn this into
// a tab, and window.focus() cannot reliably override which window takes focus.
export function openChatGptInBackground(url: string): void {
  window.open(
    url,
    'chatgpt-popup',
    'popup=yes,noopener,noreferrer,width=480,height=720,left=200,top=100'
  )
  window.focus()
}
