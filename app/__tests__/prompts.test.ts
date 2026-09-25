import { describe, it, expect } from 'vitest'
import { practiceScenarioPrompt, evaluateAnswerPrompt, explainPhrasePrompt, checkAnswerPrompt, translateWordPrompt, generateExamplePrompt } from '../lib/prompts'
import type { WordEntry } from '../types'

const basePhrase: WordEntry = {
  id: '1',
  word: 'hoewel',
  meanings: [{ translation: 'although', examples: [] }],
  updatedAt: '2024-01-01T00:00:00.000Z',
}

const makeExtra = (id: string, word: string, translation: string): WordEntry => ({
  id, word, meanings: [{ translation, examples: [] }], updatedAt: '2024-01-01T00:00:00.000Z',
})

describe('practiceScenarioPrompt', () => {
  it('includes the phrase and its translation', () => {
    const prompt = practiceScenarioPrompt(basePhrase)
    expect(prompt).toContain('"hoewel"')
    expect(prompt).toContain('although')
  })

  it('includes example sentences when present', () => {
    const prompt = practiceScenarioPrompt({ ...basePhrase, meanings: [{ translation: 'although', examples: ['Hoewel het regende, gingen we wandelen.'] }] })
    expect(prompt).toContain('Hoewel het regende, gingen we wandelen.')
  })

  it('omits the example-sentences block when there are none', () => {
    const prompt = practiceScenarioPrompt(basePhrase)
    expect(prompt).not.toContain('Voorbeeldzinnen')
  })

  it('tells the AI to exclude the target phrase from the generated text', () => {
    const prompt = practiceScenarioPrompt(basePhrase)
    expect(prompt).toContain('De vraag of opmerking mag de frase zelf NIET bevatten.')
  })

  it('tells the AI to exclude the two extra phrases too, not weave them in', () => {
    const extraWords: WordEntry[] = [
      makeExtra('2', 'gezellig', 'cozy'),
      makeExtra('3', 'onverwijld', 'immediately'),
    ]
    const prompt = practiceScenarioPrompt(basePhrase, extraWords)
    expect(prompt).toContain('GEEN van deze frasen zelf bevatten')
    expect(prompt).toContain('"hoewel"')
    expect(prompt).toContain('"gezellig"')
    expect(prompt).toContain('"onverwijld"')
    // The extras' translations are an answer-only requirement now — they
    // shouldn't be described as context for the generated situation.
    expect(prompt).not.toContain('cozy')
    expect(prompt).not.toContain('immediately')
  })

  it('caps the generated question at 100 characters', () => {
    const prompt = practiceScenarioPrompt(basePhrase)
    expect(prompt).toContain('100 tekens')
  })
})

describe('evaluateAnswerPrompt', () => {
  it('includes the scenario and the target word', () => {
    const prompt = evaluateAnswerPrompt('Je bestelt koffie.', 'graag')
    expect(prompt).toContain('Je bestelt koffie.')
    expect(prompt).toContain('"graag"')
  })

  it('requires all three phrases and asks to flag any missing one', () => {
    const extraWords: WordEntry[] = [
      makeExtra('2', 'gezellig', 'cozy'),
      makeExtra('3', 'onverwijld', 'immediately'),
    ]
    const prompt = evaluateAnswerPrompt('Je bestelt koffie.', 'graag', extraWords)
    expect(prompt).toContain('"graag"')
    expect(prompt).toContain('"gezellig"')
    expect(prompt).toContain('"onverwijld"')
    expect(prompt).toContain('ELKE frase')
  })
})

describe('explainPhrasePrompt', () => {
  it('includes the phrase', () => {
    expect(explainPhrasePrompt('tot ziens')).toContain('tot ziens')
  })
})

describe('checkAnswerPrompt', () => {
  it('includes the phrase, situation, and answer', () => {
    const prompt = checkAnswerPrompt('graag', 'Je bestelt koffie.', 'Ik wil graag een koffie.')
    expect(prompt).toContain('graag')
    expect(prompt).toContain('Je bestelt koffie.')
    expect(prompt).toContain('Ik wil graag een koffie.')
  })

  it('includes the other (not directly practiced) words and asks to check all of them', () => {
    const prompt = checkAnswerPrompt('graag', 'Je bestelt koffie.', 'Ik wil graag een koffie.', ['gezellig', 'onverwijld'])
    expect(prompt).toContain('"graag"')
    expect(prompt).toContain('"gezellig"')
    expect(prompt).toContain('"onverwijld"')
    expect(prompt).toContain('alle bovenstaande frasen/woorden')
  })
})

describe('translateWordPrompt', () => {
  it('includes the word', () => {
    expect(translateWordPrompt('hoewel')).toContain('hoewel')
  })
})

describe('generateExamplePrompt', () => {
  it('includes the word', () => {
    expect(generateExamplePrompt('hoewel')).toContain('hoewel')
  })
})
