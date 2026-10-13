import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useCloze } from '../hooks/useCloze'
import type { WordEntry } from '../types'

const makeWord = (id: string, word: string, examples: string[]): WordEntry => ({
  id,
  word,
  meanings: [{ translation: `translation-${word}`, examples }],
  updatedAt: '2024-01-01T00:00:00.000Z',
})

describe('useCloze', () => {
  it('builds and shuffles questions from eligible words on start()', () => {
    const words = [
      makeWord('1', 'hallo', ['Hallo daar!']),
      makeWord('2', 'dag', ['Dag allemaal.']),
      makeWord('3', 'leeg', []), // no examples — not eligible
    ]
    const { result } = renderHook(() => useCloze())

    act(() => { result.current.start(words) })

    expect(result.current.questions).toHaveLength(2)
    expect(result.current.questions.map(q => q.word).sort()).toEqual(['dag', 'hallo'])
    expect(result.current.currentIndex).toBe(0)
    expect(result.current.answers).toEqual([null, null])
  })

  it('checkAnswer() marks a correct answer and does not advance', () => {
    const words = [makeWord('1', 'hallo', ['Hallo daar!'])]
    const { result } = renderHook(() => useCloze())

    act(() => { result.current.start(words) })
    act(() => { result.current.setUserInput('Hallo') }) // case-insensitive match
    act(() => { result.current.checkAnswer() })

    expect(result.current.checked).toBe(true)
    expect(result.current.answers).toEqual([true])
    expect(result.current.currentIndex).toBe(0)
    expect(result.current.score).toEqual({ correct: 1, incorrect: 0 })
  })

  it('checkAnswer() marks a wrong answer', () => {
    const words = [makeWord('1', 'hallo', ['Hallo daar!'])]
    const { result } = renderHook(() => useCloze())

    act(() => { result.current.start(words) })
    act(() => { result.current.setUserInput('doei') })
    act(() => { result.current.checkAnswer() })

    expect(result.current.answers).toEqual([false])
    expect(result.current.score).toEqual({ correct: 0, incorrect: 1 })
  })

  it('nextQuestion() requeues a wrong answer 2-5 questions later instead of a new round', () => {
    const words = Array.from({ length: 10 }, (_, i) => makeWord(`${i}`, `woord${i}`, [`Dit is woord${i} in een zin.`]))
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0) // gap = 2 + floor(0 * 4) = 2

    const { result } = renderHook(() => useCloze())
    act(() => { result.current.start(words) })

    const missedQuestion = result.current.questions[0]
    act(() => { result.current.setUserInput('fout antwoord') })
    act(() => { result.current.checkAnswer() })
    act(() => { result.current.nextQuestion() })

    expect(result.current.currentIndex).toBe(1)
    expect(result.current.questions).toHaveLength(11)
    // answeredIndex(0) + 1 + gap(2) = 3
    expect(result.current.questions[3]).toEqual(missedQuestion)
    expect(result.current.answers[0]).toBe(false)
    expect(result.current.answers[3]).toBeNull()
    expect(result.current.checked).toBe(false)
    expect(result.current.userInput).toBe('')

    randomSpy.mockRestore()
  })

  it('nextQuestion() does not requeue a correct answer', () => {
    const words = [makeWord('1', 'hallo', ['Hallo daar!']), makeWord('2', 'dag', ['Dag allemaal.'])]
    const { result } = renderHook(() => useCloze())

    act(() => { result.current.start(words) })
    const firstWord = result.current.questions[0].word
    act(() => { result.current.setUserInput(firstWord) })
    act(() => { result.current.checkAnswer() })
    act(() => { result.current.nextQuestion() })

    expect(result.current.questions).toHaveLength(2)
    expect(result.current.currentIndex).toBe(1)
  })

  it('jumpTo() moves to a specific question and resets the input', () => {
    const words = [makeWord('1', 'hallo', ['Hallo daar!']), makeWord('2', 'dag', ['Dag allemaal.'])]
    const { result } = renderHook(() => useCloze())

    act(() => { result.current.start(words) })
    act(() => { result.current.setUserInput('iets') })
    act(() => { result.current.checkAnswer() })
    act(() => { result.current.jumpTo(1) })

    expect(result.current.currentIndex).toBe(1)
    expect(result.current.checked).toBe(false)
    expect(result.current.userInput).toBe('')
  })

  it('resets answers on restart() without reshuffling', () => {
    const words = [makeWord('1', 'hallo', ['Hallo daar!']), makeWord('2', 'dag', ['Dag allemaal.'])]
    const { result } = renderHook(() => useCloze())

    act(() => { result.current.start(words) })
    const questionsBeforeRestart = result.current.questions
    act(() => { result.current.setUserInput('hallo') })
    act(() => { result.current.checkAnswer() })

    act(() => { result.current.restart() })

    expect(result.current.answers).toEqual([null, null])
    expect(result.current.currentIndex).toBe(0)
    expect(result.current.score).toEqual({ correct: 0, incorrect: 0 })
    expect(result.current.questions).toEqual(questionsBeforeRestart)
  })

  it('stop() clears the session back to the picker', () => {
    const words = [makeWord('1', 'hallo', ['Hallo daar!'])]
    const { result } = renderHook(() => useCloze())

    act(() => { result.current.start(words) })
    act(() => { result.current.stop() })

    expect(result.current.questions).toEqual([])
    expect(result.current.answers).toEqual([])
    expect(result.current.currentIndex).toBe(0)
  })

  it('calls onPractice when an answer is checked', () => {
    const onPractice = vi.fn()
    const words = [makeWord('1', 'hallo', ['Hallo daar!'])]
    const { result } = renderHook(() => useCloze(onPractice))

    act(() => { result.current.start(words) })
    act(() => { result.current.setUserInput('hallo') })
    act(() => { result.current.checkAnswer() })

    expect(onPractice).toHaveBeenCalledTimes(1)
    expect(onPractice).toHaveBeenCalledWith('typen')
  })

  describe('kaarten mode', () => {
    it('combines both directions for each phrase and derives the current direction', () => {
      const { result } = renderHook(() => useCloze())
      act(() => { result.current.start([makeWord('1', 'hallo', [])], 'kaarten') })
      expect(result.current.questions).toHaveLength(2)
      expect(result.current.questions.map(q => q.reversed).sort()).toEqual([false, true])
      for (let i = 0; i < 2; i++) {
        act(() => { result.current.jumpTo(i) })
        expect(result.current.reversed).toBe(result.current.questions[i].reversed)
      }
      act(() => { result.current.start([makeWord('1', 'hallo', ['Hallo daar!'])], 'typen') })
      expect(result.current.questions).toHaveLength(1)
      expect(result.current.reversed).toBe(false)
    })

    it('start() with kaarten sets the mode', () => {
      const { result } = renderHook(() => useCloze())

      act(() => { result.current.start([makeWord('1', 'hallo', ['Hallo daar!'])], 'kaarten') })

      expect(result.current.mode).toBe('kaarten')
    })

    it('start() with kaarten builds phrase cards, including phrases without examples', () => {
      const words = [makeWord('1', 'hallo', ['Hallo daar!']), makeWord('2', 'leeg', [])]
      const { result } = renderHook(() => useCloze())

      act(() => { result.current.start(words, 'kaarten') })

      expect(result.current.questions.map(q => q.word).sort()).toEqual(['hallo', 'hallo', 'leeg', 'leeg'])
      expect(result.current.questions.find(q => q.word === 'leeg')?.translation).toBe('translation-leeg')
    })

    it('markAndNext() does nothing before the answer is revealed', () => {
      const onPractice = vi.fn()
      const { result } = renderHook(() => useCloze(onPractice))

      act(() => { result.current.start([makeWord('1', 'hallo', ['Hallo daar!'])], 'kaarten') })
      act(() => { result.current.markAndNext(true) })

      expect(result.current.currentIndex).toBe(0)
      expect(result.current.answers).toEqual([null, null])
      expect(onPractice).not.toHaveBeenCalled()
    })

    it('reveal() then markAndNext(true) marks Goed, advances and reports kaarten practice', () => {
      const onPractice = vi.fn()
      const words = [makeWord('1', 'hallo', ['Hallo daar!']), makeWord('2', 'dag', ['Dag allemaal.'])]
      const { result } = renderHook(() => useCloze(onPractice))

      act(() => { result.current.start(words, 'kaarten') })
      act(() => { result.current.reveal() })
      expect(result.current.checked).toBe(true)
      act(() => { result.current.markAndNext(true) })

      expect(result.current.answers).toEqual([true, null, null, null])
      expect(result.current.currentIndex).toBe(1)
      expect(result.current.checked).toBe(false)
      expect(result.current.questions).toHaveLength(4)
      expect(onPractice).toHaveBeenCalledWith('kaarten')
    })

    it('markAndNext(false) requeues the card 2-5 cards later', () => {
      const words = Array.from({ length: 10 }, (_, i) => makeWord(`${i}`, `woord${i}`, [`Dit is woord${i} in een zin.`]))
      const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0)
      const { result } = renderHook(() => useCloze())

      act(() => { result.current.start(words, 'kaarten') })
      const missedQuestion = result.current.questions[0]
      act(() => { result.current.reveal() })
      act(() => { result.current.markAndNext(false) })

      expect(result.current.questions).toHaveLength(21)
      expect(result.current.questions[3]).toEqual(missedQuestion)
      expect(result.current.answers[0]).toBe(false)
      expect(result.current.answers[3]).toBeNull()
      expect(result.current.score).toEqual({ correct: 0, incorrect: 1 })

      randomSpy.mockRestore()
    })
  })
})

 describe('Cloze give up and session skip', () => {
  it('gives up with empty input, records a mistake, reveals the answer and queues a retry', () => {
    const onPractice = vi.fn()
    const { result } = renderHook(() => useCloze(onPractice))
    act(() => result.current.start([makeWord('1', 'hallo', ['Hallo daar!'])]))
    act(() => result.current.giveUp())
    expect(result.current.currentIndex).toBe(1)
    expect(result.current.givenUpWord).toBe('hallo')
    expect(result.current.answers).toEqual([false, null])
    expect(result.current.score.incorrect).toBe(1)
    expect(onPractice).toHaveBeenCalledWith('typen')
    act(() => result.current.skipPhrase())
    expect(result.current.questions).toHaveLength(1)
    expect(result.current.currentIndex).toBe(result.current.questions.length)
  })

  it('skips all remaining cards for a phrase, without scoring, and restores them in a new session', () => {
    const words = [makeWord('1', 'hallo', ['Hallo daar!']), makeWord('2', 'dag', ['Dag allemaal.'])]
    const onPractice = vi.fn()
    const { result } = renderHook(() => useCloze(onPractice))
    act(() => result.current.start(words, 'kaarten'))
    const skippedId = result.current.questions[0].phraseId
    act(() => result.current.skipPhrase())
    expect(result.current.questions).toHaveLength(2)
    expect(result.current.questions.every(q => q.phraseId !== skippedId)).toBe(true)
    expect(result.current.answers).toEqual([null, null])
    expect(result.current.currentIndex).toBe(0)
    expect(onPractice).not.toHaveBeenCalled()
    act(() => result.current.start(words, 'kaarten'))
    expect(result.current.questions).toHaveLength(4)
  })
 })
