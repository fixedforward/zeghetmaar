import type { WordEntry } from '../types'

export function practiceScenarioPrompt(phrase: WordEntry, extraWords: WordEntry[] = []): string {
  // Ground the generated situation in the phrase's own translation/examples,
  // not just the bare Dutch text — some phrases are idiomatic or ambiguous,
  // and without this the AI can guess a different (often literal) meaning
  // than the one the user actually saved.
  const context = [
    `Bedoelde betekenis (vertaling): "${phrase.translation}"`,
    phrase.examples.length > 0
      ? `Voorbeeldzinnen die de bedoelde betekenis/context tonen:\n${phrase.examples.map(e => `- ${e}`).join('\n')}`
      : null,
  ].filter(Boolean).join('\n')

  // The two extra phrases are only a requirement on the student's ANSWER
  // (see evaluateAnswerPrompt + the "Gebruik ook" UI hint) — they must stay
  // out of the generated situation text itself, same as the target phrase.
  const excludedWords = [phrase.word, ...extraWords.map(w => w.word)]
  const exclusionNote = excludedWords.length > 1
    ? `De vraag of opmerking mag GEEN van deze frasen zelf bevatten: ${excludedWords.map(w => `"${w}"`).join(', ')}.`
    : `De vraag of opmerking mag de frase zelf NIET bevatten.`

  return [
    `Je helpt een gebruiker om Nederlandse frasen te leren.`,
    `Genereer één korte, alledaagse vraag of opmerking in het Nederlands,`,
    `waardoor het antwoord heel natuurlijk de volgende frase zou bevatten: "${phrase.word}".`,
    context,
    `Gebruik de vertaling en voorbeelden hierboven om de JUISTE bedoelde betekenis van de frase te bepalen,`,
    `en zorg dat de situatie daar specifiek bij past — niet bij een andere (bijv. letterlijke) betekenis.`,
    exclusionNote,
    `Houd de vraag of opmerking onder de 100 tekens.`,
    `Geef alleen de vraag of opmerking terug, zonder uitleg of aanhalingstekens.`,
  ].filter(Boolean).join('\n')
}

export function evaluateAnswerPrompt(scenario: string, word: string, extraWords: WordEntry[] = []): string {
  const requiredWords = [word, ...extraWords.map(w => w.word)]
  const requirement = requiredWords.length > 1
    ? `De frasen die de student moest gebruiken: ${requiredWords.map(w => `"${w}"`).join(', ')}.\nControleer of ELKE frase daadwerkelijk in het antwoord voorkomt, en benoem het expliciet als er een ontbreekt.`
    : `De frase die de student moest gebruiken: "${word}"`

  return `Je evalueert een Nederlands antwoord van een taalstudent.
Het scenario was: "${scenario}"
${requirement}
Evalueer en corrigeer mijn antwoord met dit exacte formaat:
Evaluatie: ...
Suggestie: ...`
}

export function explainPhrasePrompt(phrase: string): string {
  return `Leg dit Nederlandse woord of deze zin uit en hoe het wordt gebruikt: "${phrase}"`
}

export function checkAnswerPrompt(phrase: string, situation: string, answer: string, extraWords: string[] = []): string {
  const requiredWords = [phrase, ...extraWords]
  const wordsList = requiredWords.map(w => `"${w}"`).join(', ')
  const intro = requiredWords.length > 1
    ? `Ik oefen Nederlands en ben de frasen/woorden ${wordsList} aan het oefenen.`
    : `Ik oefen Nederlands en ben de frase/het woord ${wordsList} aan het oefenen.`
  const checkInstruction = requiredWords.length > 1
    ? `Controleer of ik alle bovenstaande frasen/woorden daadwerkelijk en correct heb gebruikt, en benoem het expliciet als er een ontbreekt.`
    : null

  return [
    `${intro} De situatie was: "${situation}". Mijn antwoord was: "${answer}".`,
    checkInstruction,
    `Geef een korte uitleg waarom mijn antwoord niet klopt (als dat zo is), herhaal mijn poging, voordat je 2-3 concrete suggesties ter verbetering aan mij geven, en ook een engelse zin die de frase gebruikt.`,
  ].filter(Boolean).join(' ')
}

export function translateWordPrompt(word: string): string {
  return `Translate the following Dutch word or phrase into English. Return ONLY the English translation, nothing else: "${word}"`
}

export function generateExamplePrompt(word: string): string {
  return `Generate a natural Dutch example sentence using the phrase "${word}". Provide the Dutch sentence followed by " — " and the English translation.`
}

export const REWRITE_DUTCH_SENTENCE_PROMPT = `When the user types a Dutch sentence or sentences:
1. Try to guess what it is trying to say in English and respond with: "Seems you are trying to say: [translation]"
2. Explain what was wrong or not optimal (if anything), max 2 short sentences
3. Suggest an alternative Dutch sentence, if applicable`

export const TRANSLATE_TO_DUTCH_PROMPT = 'Give 2 or 3 different natural ways to say the following English sentence in Dutch. Number each option and briefly note any difference in tone or formality if relevant.'

export const EXPLAIN_SELECTION_PROMPT = 'The user is learning Dutch. They highlighted the following word or phrase and want to know what it means. Give a short, clear explanation in English: what it means, and (if it is Dutch) how it is typically used. Keep it to 2-3 sentences max.'
