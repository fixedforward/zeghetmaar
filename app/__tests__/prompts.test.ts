import { describe, it, expect } from 'vitest'
import { practiceScenarioPrompt, evaluateAnswerPrompt, explainPhrasePrompt, comprehensionCheckPrompt, listeningComprehensionPrompt, mistakeFixCheckPrompt, checkAnswerPrompt, translateWordPrompt, generateExamplePrompt, languageIslandPrompt } from '../lib/prompts'
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

  it('leaves out the context section when no context is given', () => {
    expect(explainPhrasePrompt('tot ziens')).not.toContain('context')
  })

  it('includes the context text when given', () => {
    const prompt = explainPhrasePrompt('tot ziens', 'Hij zei tot ziens en vertrok.')
    expect(prompt).toContain('tot ziens')
    expect(prompt).toContain('Hij zei tot ziens en vertrok.')
  })
})

describe('comprehensionCheckPrompt', () => {
  it('asks for 7 questions and includes the whole article text', () => {
    const prompt = comprehensionCheckPrompt('Eerste alinea.\n\nTweede alinea.')
    expect(prompt).toContain('7 vragen')
    expect(prompt).toContain('Eerste alinea.\n\nTweede alinea.')
  })

  it('asks for the rough paragraph that holds each answer', () => {
    expect(comprehensionCheckPrompt('Tekst.')).toContain('in welke alinea het antwoord staat')
  })

  it('asks for new or difficult words from the text that I must use in my answer', () => {
    const prompt = comprehensionCheckPrompt('Tekst.')
    expect(prompt).toContain('nieuwe of moeilijke woorden of uitdrukkingen uit de tekst die ik in mijn antwoord moet gebruiken')
    expect(prompt).toContain('Controleer in je feedback of ik ze gebruikt heb')
  })
})

describe('listeningComprehensionPrompt', () => {
  it('asks for 7 questions one at a time about the transcript behind the link', () => {
    const prompt = listeningComprehensionPrompt('Les 14', 'https://drive.google.com/file/d/s1/view?usp=sharing')

    expect(prompt).toContain('"Les 14"')
    expect(prompt).toContain('https://drive.google.com/file/d/s1/view?usp=sharing')
    expect(prompt).toContain('7 vragen')
    expect(prompt).toContain('één voor één')
    expect(prompt).toContain('Kun je de link niet openen?')
    expect(prompt).toContain('op welk tijdstip in het transcript het antwoord zit')
    expect(prompt).toContain('nieuwe of moeilijke woorden of uitdrukkingen uit het transcript die ik in mijn antwoord moet gebruiken')
  })
})

describe('mistakeFixCheckPrompt', () => {
  it('includes my mistake, its type, my attempt and the possible correction, and asks if I got it right', () => {
    const prompt = mistakeFixCheckPrompt(
      { mistake: 'ik ben eens met jou', correction: 'Ik ben het eens met jou.', type: 'Grammar fix', translation: '' },
      'Ik ben het met jou eens.',
    )

    expect(prompt).toContain('Mijn fout: "ik ben eens met jou"')
    expect(prompt).toContain('Type fout: Grammar fix')
    expect(prompt).toContain('Mijn poging: "Ik ben het met jou eens."')
    expect(prompt).toContain('Een mogelijke verbetering: "Ik ben het eens met jou."')
    expect(prompt).toContain('Zeg of mijn poging goed is.')
    expect(prompt).toContain('een tabel met per fout één rij en de kolommen: Mijn tekst | Verbetering | Waarom')
    expect(prompt.indexOf('1. Mijn poging')).toBeLessThan(prompt.indexOf('2. Verbetering / herformulering'))
    expect(prompt.indexOf('2. Verbetering / herformulering')).toBeLessThan(prompt.indexOf('3. Natuurlijker:'))
    expect(prompt.indexOf('3. Natuurlijker:')).toBeLessThan(prompt.indexOf('4. Uitleg: een tabel'))
    expect(prompt).toContain('als het kan en past, een natuurlijkere herformulering')
  })

  it('asks about my translation of the English sentence when there is one', () => {
    const prompt = mistakeFixCheckPrompt(
      { mistake: 'ik ben eens met jou', correction: 'Ik ben het eens met jou.', type: 'Grammar fix', translation: 'I agree with you.' },
      'Ik ben het met je eens.',
    )

    expect(prompt).toContain('deze Engelse zin naar het Nederlands vertalen: "I agree with you."')
    expect(prompt).toContain('Mijn vertaling: "Ik ben het met je eens."')
    expect(prompt).toContain('Een mogelijke vertaling: "Ik ben het eens met jou."')
    expect(prompt).toContain('met een fout: "ik ben eens met jou"')
    expect(prompt).toContain('klinkt hij natuurlijk?')
    expect(prompt).toContain('zonder lange uitleg in zinnen')
    expect(prompt).toContain('een tabel met per fout één rij')
  })

  it('leaves out the type line when there is no type', () => {
    expect(mistakeFixCheckPrompt({ mistake: 'a', correction: 'b', type: '', translation: '' }, 'c')).not.toContain('Type fout')
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

describe('languageIslandPrompt', () => {
  it('asks for Dutch ways to say the English phrase', () => {
    const prompt = languageIslandPrompt('See you later', [])

    expect(prompt).toContain('"See you later"')
    expect(prompt).not.toContain('Deze opties heb ik al')
  })

  it('lists the options I already have and asks for other ones', () => {
    const prompt = languageIslandPrompt('See you later', ['Tot straks.', 'Tot zo.'])

    expect(prompt).toContain('Deze opties heb ik al:\n- Tot straks.\n- Tot zo.')
    expect(prompt).toContain('andere opties dan deze')
  })
})
