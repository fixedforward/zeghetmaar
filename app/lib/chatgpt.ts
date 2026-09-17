export function buildChatGptExplainUrl(phrase: string): string {
  const prompt = `Explain this Dutch word or phrase and how it's used: "${phrase}"`
  return `https://chatgpt.com/?q=${encodeURIComponent(prompt)}`
}
