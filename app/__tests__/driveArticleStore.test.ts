import { describe, it, expect, vi, beforeEach } from 'vitest'

const filesListMock = vi.fn()
const filesGetMock = vi.fn()
const filesExportMock = vi.fn()

vi.mock('../lib/driveStore', () => ({
  getDriveClient: () => ({ files: { list: filesListMock, get: filesGetMock, export: filesExportMock } }),
}))

vi.mock('../lib/config', () => ({
  config: { database: { googleArticlesFolder: { folderId: 'root123' } } },
}))

import { parseArticleText, toArticleItems, listArticleFolderAsync, getArticleAsync, getArticlesRootFolderId } from '../lib/driveArticleStore'

describe('parseArticleText', () => {
  it('strips the BOM, trims lines and drops blank lines', () => {
    const text = '﻿Op zoek naar schoon bier\r\n\r\n\r\n  Eerste alinea.  \r\n\r\nTweede alinea.\r\n'
    expect(parseArticleText(text)).toEqual(['Op zoek naar schoon bier', 'Eerste alinea.', 'Tweede alinea.'])
  })
})

describe('toArticleItems', () => {
  it('keeps folders, Google Docs and .txt files, folders first sorted by name', () => {
    const items = toArticleItems([
      { id: '1', name: 'video.mp4', mimeType: 'video/mp4' },
      { id: '2', name: 'Zag moeder', mimeType: 'application/vnd.google-apps.document' },
      { id: '3', name: 'vids', mimeType: 'application/vnd.google-apps.folder' },
      { id: '4', name: 'Bier', mimeType: 'application/vnd.google-apps.document' },
      { id: '5', name: 'notes.txt', mimeType: 'text/plain' },
      { id: '6', name: 'articles', mimeType: 'application/vnd.google-apps.folder' },
      { id: null, name: 'broken', mimeType: 'application/vnd.google-apps.document' },
    ])

    expect(items).toEqual([
      { id: '6', name: 'articles', kind: 'folder' },
      { id: '3', name: 'vids', kind: 'folder' },
      { id: '4', name: 'Bier', kind: 'article' },
      { id: '5', name: 'notes.txt', kind: 'article' },
      { id: '2', name: 'Zag moeder', kind: 'article' },
    ])
  })

  it('sorts articles by created time, newest first, with undated ones last', () => {
    const items = toArticleItems([
      { id: '1', name: 'Oud', mimeType: 'application/vnd.google-apps.document', createdTime: '2026-01-01T10:00:00Z' },
      { id: '2', name: 'Zonder datum', mimeType: 'application/vnd.google-apps.document' },
      { id: '3', name: 'Nieuw', mimeType: 'application/vnd.google-apps.document', createdTime: '2026-09-01T10:00:00Z' },
      { id: '4', name: 'map', mimeType: 'application/vnd.google-apps.folder', createdTime: '2026-10-01T10:00:00Z' },
    ])

    expect(items.map(i => i.id)).toEqual(['4', '3', '1', '2'])
  })
})

describe('getArticlesRootFolderId', () => {
  it('returns the configured folder id', () => {
    expect(getArticlesRootFolderId()).toBe('root123')
  })
})

describe('listArticleFolderAsync', () => {
  beforeEach(() => {
    filesListMock.mockReset()
    filesGetMock.mockReset()
  })

  it('returns the folder name and its items', async () => {
    filesListMock.mockResolvedValue({ data: { files: [{ id: 'd1', name: 'Bier', mimeType: 'application/vnd.google-apps.document' }] } })
    filesGetMock.mockResolvedValue({ data: { name: 'articles' } })

    const folder = await listArticleFolderAsync('f1')

    expect(filesListMock).toHaveBeenCalledWith(expect.objectContaining({ q: "'f1' in parents and trashed = false", fields: 'files(id, name, mimeType, createdTime)' }))
    expect(folder).toEqual({ id: 'f1', name: 'articles', items: [{ id: 'd1', name: 'Bier', kind: 'article' }] })
  })

  it('falls back to an empty name when the folder name cannot be read', async () => {
    filesListMock.mockResolvedValue({ data: { files: [] } })
    filesGetMock.mockRejectedValue(new Error('not found'))

    const folder = await listArticleFolderAsync('f1')

    expect(folder).toEqual({ id: 'f1', name: '', items: [] })
  })
})

describe('getArticleAsync', () => {
  beforeEach(() => {
    filesGetMock.mockReset()
    filesExportMock.mockReset()
  })

  it('exports a Google Doc as text and splits it into paragraphs', async () => {
    filesGetMock.mockImplementation(({ fields }: { fields: string }) =>
      Promise.resolve({ data: fields === 'name' ? { name: 'Bier' } : { mimeType: 'application/vnd.google-apps.document' } })
    )
    filesExportMock.mockResolvedValue({ data: 'Titel\r\n\r\nAlinea een.' })

    const article = await getArticleAsync('d1')

    expect(filesExportMock).toHaveBeenCalledWith({ fileId: 'd1', mimeType: 'text/plain' }, { responseType: 'text' })
    expect(article).toEqual({ id: 'd1', name: 'Bier', paragraphs: ['Titel', 'Alinea een.'] })
  })
})
