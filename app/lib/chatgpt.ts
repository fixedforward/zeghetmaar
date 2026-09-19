export function buildChatGptExplainUrl(phrase: string): string {
  const prompt = `Leg dit Nederlandse woord of deze zin uit en hoe het wordt gebruikt: "${phrase}"`
  return `https://chatgpt.com/?q=${encodeURIComponent(prompt)}`
}

export function buildChatGptCheckAnswerUrl(phrase: string, situation: string, answer: string): string {
  const prompt = `Ik oefen Nederlands en ben de frase/het woord "${phrase}" aan het oefenen. De situatie was: "${situation}". Mijn antwoord was: "${answer}". Heb ik de frase goed gebruikt en klopt mijn antwoord? Wat kan beter?`
  return `https://chatgpt.com/?q=${encodeURIComponent(prompt)}`
}
