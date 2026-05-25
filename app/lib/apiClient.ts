export interface ChatResponse {
  response?: string
  error?: string
}

export async function chatRequest(
  text: string,
  prompt: string,
  model: string
): Promise<ChatResponse> {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, prompt, model }),
  })
  return res.json() as Promise<ChatResponse>
}
