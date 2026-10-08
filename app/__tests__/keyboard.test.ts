import { describe, it, expect } from 'vitest'
import { isModalOpen, isTypingTarget } from '../lib/keyboard'

describe('isTypingTarget', () => {
  it('is true for text inputs and text areas', () => {
    expect(isTypingTarget(document.createElement('input'))).toBe(true)
    expect(isTypingTarget(document.createElement('textarea'))).toBe(true)
  })

  it('is false for other elements and for no target', () => {
    expect(isTypingTarget(document.createElement('button'))).toBe(false)
    expect(isTypingTarget(null)).toBe(false)
  })
})

describe('isModalOpen', () => {
  it('is true only while an aria-modal dialog is in the page', () => {
    expect(isModalOpen()).toBe(false)

    const dialog = document.createElement('div')
    dialog.setAttribute('aria-modal', 'true')
    document.body.appendChild(dialog)
    expect(isModalOpen()).toBe(true)

    dialog.remove()
    expect(isModalOpen()).toBe(false)
  })
})
