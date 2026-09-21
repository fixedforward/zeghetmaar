import { describe, it, expect, vi, afterEach } from 'vitest'
import { buildChatGptExplainUrl, buildChatGptCheckAnswerUrl, openChatGptInBackground } from '../lib/chatgpt'

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

describe('openChatGptInBackground', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('opens the url as a popup window positioned right next to the current browser window, and tries to refocus it', () => {
    vi.stubGlobal('screenLeft', 150)
    vi.stubGlobal('screenTop', 80)
    vi.stubGlobal('outerWidth', 1000)
    const openSpy = vi.spyOn(window, 'open').mockReturnValue(null)
    const focusSpy = vi.spyOn(window, 'focus').mockImplementation(() => {})

    openChatGptInBackground('https://chatgpt.com/?q=test')

    expect(openSpy).toHaveBeenCalledWith(
      'https://chatgpt.com/?q=test',
      'chatgpt-popup',
      // left = origin window's left (150) + its width (1000); top = origin window's top (80)
      'popup=yes,noopener,noreferrer,width=480,height=720,left=1150,top=80'
    )
    expect(focusSpy).toHaveBeenCalled()
  })

  it('falls back to 0,0 when the browser exposes no window position/size', () => {
    vi.stubGlobal('screenLeft', undefined)
    vi.stubGlobal('screenTop', undefined)
    vi.stubGlobal('screenX', undefined)
    vi.stubGlobal('screenY', undefined)
    vi.stubGlobal('outerWidth', undefined)
    const openSpy = vi.spyOn(window, 'open').mockReturnValue(null)
    vi.spyOn(window, 'focus').mockImplementation(() => {})

    openChatGptInBackground('https://chatgpt.com/?q=test')

    expect(openSpy).toHaveBeenCalledWith(
      'https://chatgpt.com/?q=test',
      'chatgpt-popup',
      'popup=yes,noopener,noreferrer,width=480,height=720,left=0,top=0'
    )
  })
})
