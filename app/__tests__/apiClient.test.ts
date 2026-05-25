import { describe, it, expect, vi, beforeEach } from 'vitest'
import { chatRequest } from '../lib/apiClient'

describe('chatRequest', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('calls /api/chat with the correct body', async () => {
    const mockResponse = { response: 'Goed gedaan!' }
    global.fetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve(mockResponse),
    } as Response)

    const result = await chatRequest('hallo', 'explain this', 'gpt-4o-mini')

    expect(fetch).toHaveBeenCalledWith('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'hallo', prompt: 'explain this', model: 'gpt-4o-mini' }),
    })
    expect(result).toEqual(mockResponse)
  })

  it('returns the parsed JSON response', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ response: 'Test antwoord' }),
    } as Response)

    const result = await chatRequest('test', 'prompt', 'model')

    expect(result.response).toBe('Test antwoord')
  })
})
