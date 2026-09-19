import { describe, it, expect } from 'vitest'
import { buildChatGptExplainUrl, buildChatGptCheckAnswerUrl } from '../lib/chatgpt'

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

describe('buildChatGptCheckAnswerUrl', () => {
  it('starts with the chatgpt.com prefilled-prompt URL', () => {
    const url = buildChatGptCheckAnswerUrl('graag', 'Je bestelt koffie.', 'Ik wil graag een koffie.')
    expect(url.startsWith('https://chatgpt.com/?q=')).toBe(true)
  })

  it('includes the phrase, situation, and answer in the decoded prompt', () => {
    const url = buildChatGptCheckAnswerUrl('graag', 'Je bestelt koffie.', 'Ik wil graag een koffie.')
    const query = url.replace('https://chatgpt.com/?q=', '')
    const decoded = decodeURIComponent(query)
    expect(decoded).toContain('graag')
    expect(decoded).toContain('Je bestelt koffie.')
    expect(decoded).toContain('Ik wil graag een koffie.')
  })
})
