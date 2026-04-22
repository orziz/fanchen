import type { ItemData } from '../../config/items'
import type { LocationData } from '../../config/world'

import type { EditableItem } from './itemFile'
import type { EditableStoryDefinition } from './storyFile'

async function postJson<T>(url: string, payload: Record<string, unknown>) {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })
  const data = (await response.json()) as T & { ok?: boolean; error?: string }
  if (!response.ok || data.ok === false) {
    throw new Error(data.error || 'request_failed')
  }
  return data
}

export function saveWorld(locations: LocationData[]) {
  return postJson<{ ok: true; count: number }>('/__tools/save-world', { locations })
}

export function saveItems(items: EditableItem[] | ItemData[]) {
  return postJson<{ ok: true; count: number }>('/__tools/save-items', { items })
}

export function saveStories(stories: EditableStoryDefinition[]) {
  return postJson<{ ok: true; count: number }>('/__tools/save-stories', { stories })
}