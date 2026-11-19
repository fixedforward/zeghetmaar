import type { UsefulLink } from '../types'
import { useDriveList } from './useDriveList'

export function useUsefulLinks() {
  const { items: links, loading, saving, error, load: loadLinks, saveAsync } =
    useDriveList<UsefulLink>('/api/useful-links', 'links', '[useUsefulLinks]', 'Kon links niet laden.')

  const addLinkAsync = (title: string, url: string) => saveAsync('POST', { title, url }, 'Kon link niet opslaan.')
  const setTitleAsync = (id: string, title: string) => saveAsync('PUT', { id, title }, 'Kon naam niet opslaan.')
  const setUrlAsync = (id: string, url: string) => saveAsync('PUT', { id, url }, 'Kon link niet opslaan.')
  const deleteLinkAsync = (id: string) => saveAsync('DELETE', { id }, 'Kon link niet verwijderen.')

  return { links, loading, saving, error, loadLinks, addLinkAsync, setTitleAsync, setUrlAsync, deleteLinkAsync }
}
