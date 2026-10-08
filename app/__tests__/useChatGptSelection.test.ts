import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useChatGptSelection } from '../hooks/useChatGptSelection'

const mouseUp = { clientX: 40, clientY: 100 } as React.MouseEvent

describe('useChatGptSelection', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('builds an explain prompt for the selected text with the context', () => {
    vi.spyOn(window, 'getSelection').mockReturnValue({ toString: () => ' op de hoogte ' } as Selection)
    const { result } = renderHook(() => useChatGptSelection('Ik ben op de hoogte.'))

    act(() => result.current.handleTextSelection(mouseUp))

    expect(result.current.chatGptLink).toMatchObject({ x: 40, y: 112, text: 'op de hoogte' })
    expect(result.current.chatGptLink?.prompt).toContain('"op de hoogte"')
    expect(result.current.chatGptLink?.prompt).toContain('Ik ben op de hoogte.')
  })

  it('lets a function pick the context for the current selection', () => {
    const selection = { toString: () => 'stil' } as Selection
    vi.spyOn(window, 'getSelection').mockReturnValue(selection)
    const pickContext = vi.fn().mockReturnValue('Je staat er niet bij stil.')
    const { result } = renderHook(() => useChatGptSelection(pickContext))

    act(() => result.current.handleTextSelection(mouseUp))

    expect(pickContext).toHaveBeenCalledWith(selection)
    expect(result.current.chatGptLink?.prompt).toContain('Je staat er niet bij stil.')
  })

  it('clears the link when nothing is selected', () => {
    vi.spyOn(window, 'getSelection').mockReturnValue({ toString: () => '' } as Selection)
    const { result } = renderHook(() => useChatGptSelection())

    act(() => result.current.handleTextSelection(mouseUp))

    expect(result.current.chatGptLink).toBeNull()
  })
})
