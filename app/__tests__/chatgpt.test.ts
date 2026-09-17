import { describe, it, expect } from 'vitest'
import { buildChatGptExplainUrl } from '../lib/chatgpt'

describe('buildChatGptExplainUrl', () => {
  it('starts with the chatgpt.com prefilled-prompt URL', () => {
    const url = buildChatGptExplainUrl('goedemorgen')
    expect(url.startsWith('https://chatgpt.com/?q=')).toBe(true)
  })

  it('includes the phrase in the decoded prompt', () => {
    const url = buildChatGptExplainUrl('tot ziens')
    const query = url.replace('https://chatgpt.com/?q=', '')
    expect(decodeURIComponent(query)).toContain('tot ziens')
  })
})
