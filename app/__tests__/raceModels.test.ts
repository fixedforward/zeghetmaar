import { describe, it, expect, vi, beforeEach } from 'vitest'
import { raceModels, fetchModel } from '../lib/raceModels'

const FAKE_API_KEY = 'test-key'
const MESSAGES = [{ role: 'user', content: 'hello' }]

function mockFetchSuccess(model: string, response = 'ok') {
  return vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ choices: [{ message: { content: response } }] }),
    text: () => Promise.resolve(''),
  } as Response)
}

function mockFetchFailure(status = 500) {
  return vi.fn().mockResolvedValue({
    ok: false,
    status,
    text: () => Promise.resolve('error'),
  } as unknown as Response)
}

beforeEach(() => {
  vi.resetAllMocks()
})

describe('fetchModel', () => {
  it('returns response and model name on success', async () => {
    global.fetch = mockFetchSuccess('my-model', 'hello world')
    const controller = new AbortController()
    const result = await fetchModel('my-model', MESSAGES, FAKE_API_KEY, controller.signal)
    expect(result).toEqual({ response: 'hello world', model: 'my-model' })
  })

  it('throws on non-ok response', async () => {
    global.fetch = mockFetchFailure(429)
    const controller = new AbortController()
    await expect(fetchModel('my-model', MESSAGES, FAKE_API_KEY, controller.signal))
      .rejects.toThrow('my-model returned HTTP 429')
  })
})

describe('raceModels', () => {
  it('returns the first successful model in a batch', async () => {
    global.fetch = mockFetchSuccess('fast-model', 'winner response')
    const result = await raceModels('fast-model', MESSAGES, FAKE_API_KEY, {
      models: ['fast-model', 'slow-model'],
      batchSize: 5,
      timeoutMs: 1000,
    })
    expect(result.response).toBe('winner response')
    expect(result.model).toBe('fast-model')
  })

  it('falls through to next batch when first batch all fail', async () => {
    let callCount = 0
    global.fetch = vi.fn().mockImplementation(() => {
      callCount++
      // First 2 calls (batch 1) fail, 3rd call (batch 2) succeeds
      if (callCount <= 2) {
        return Promise.resolve({
          ok: false,
          status: 500,
          text: () => Promise.resolve('error'),
        } as unknown as Response)
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ choices: [{ message: { content: 'fallback response' } }] }),
        text: () => Promise.resolve(''),
      } as Response)
    })

    const result = await raceModels('model-a', MESSAGES, FAKE_API_KEY, {
      models: ['model-a', 'model-b', 'model-c'],
      batchSize: 2,
      timeoutMs: 1000,
    })

    expect(result.response).toBe('fallback response')
  })

  it('throws when all batches are exhausted', async () => {
    global.fetch = mockFetchFailure(503)

    await expect(
      raceModels('model-a', MESSAGES, FAKE_API_KEY, {
        models: ['model-a', 'model-b'],
        batchSize: 5,
        timeoutMs: 1000,
      })
    ).rejects.toThrow('All model batches exhausted')
  })

  it('aborts losing requests after a winner is found', async () => {
    const abortSpy = vi.spyOn(AbortController.prototype, 'abort')

    global.fetch = mockFetchSuccess('winner', 'fast answer')

    await raceModels('winner', MESSAGES, FAKE_API_KEY, {
      models: ['winner', 'loser'],
      batchSize: 5,
      timeoutMs: 1000,
    })

    expect(abortSpy).toHaveBeenCalled()
  })
})
