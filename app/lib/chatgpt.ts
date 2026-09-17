export function buildChatGptExplainUrl(phrase: string): string {
  const prompt = `Leg dit Nederlandse woord of deze zin uit en hoe het wordt gebruikt: "${phrase}"`
  return `https://chatgpt.com/?q=${encodeURIComponent(prompt)}`
}
