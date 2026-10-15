import assert from 'node:assert/strict'
import test from 'node:test'

import type { TauriCommandClient } from '../src/bridge/tauriCommands.ts'
import { TauriAnnotationRepository, TauriScoreRepository, TauriSetlistRepository } from '../src/persistence/tauriRepositories.ts'
import type { AnnotationDocument, AppSettings, AudioLink, ManagedScoreFile, Score, Setlist } from '../src/shared/types.ts'

class MemoryCommandClient implements TauriCommandClient {
  private scores: Score[] = []
  private setlists: Setlist[] = []
  private annotations = new Map<string, AnnotationDocument>()
  private audio = new Map<string, AudioLink>()
  private settings: AppSettings = { version: 1, theme: 'system', preferredOrientation: 'auto' }

  async importScoreFile(): Promise<ManagedScoreFile> {
    throw new Error('not used in persistence contract test')
  }

  async deleteScoreFile(): Promise<void> {}

  async resolveScoreFile(): Promise<string> {
    throw new Error('not used in persistence contract test')
  }

  async loadLibrary() { return structuredClone(this.scores) }
  async saveLibrary(scores: Score[]) { this.scores = structuredClone(scores) }
  async loadSetlists() { return structuredClone(this.setlists) }
  async saveSetlists(setlists: Setlist[]) { this.setlists = structuredClone(setlists) }

  async loadAnnotations(scoreId: string) {
    return structuredClone(this.annotations.get(scoreId) ?? { scoreId, version: 1 as const, pages: [] })
  }

  async saveAnnotations(document: AnnotationDocument) {
    this.annotations.set(document.scoreId, structuredClone(document))
  }

  async linkAudioFile(link: Omit<AudioLink, 'format'>) {
    const completeLink = { ...link, format: 'mp3' as const }
    this.audio.set(link.scoreId, structuredClone(completeLink))
    return structuredClone(completeLink)
  }
  async loadAudioLink(scoreId: string) { return structuredClone(this.audio.get(scoreId)) }
  async deleteAudioLink(scoreId: string) { this.audio.delete(scoreId) }
  async checkAudioLink() { return 'mp3' as const }
  async loadSettings() { return structuredClone(this.settings) }
  async saveSettings(settings: AppSettings) { this.settings = structuredClone(settings) }
}

const score: Score = {
  id: 'score-1',
  title: 'Example Score',
  composer: 'Example Composer',
  tags: ['practice'],
  format: 'pdf',
  managedFilePath: '/managed/example.pdf',
  createdAt: '2026-09-28T00:00:00.000Z',
  updatedAt: '2026-09-28T00:00:00.000Z',
}

test('score repository round-trips created and updated records', async () => {
  const client = new MemoryCommandClient()
  const repository = new TauriScoreRepository(client)

  await repository.create(score)
  assert.deepEqual(await repository.get(score.id), score)
  assert.equal((await repository.search('composer'))[0]?.id, score.id)

  const updated = { ...score, title: 'Updated Score' }
  await repository.update(updated)
  assert.equal((await repository.get(score.id))?.title, 'Updated Score')
})

test('setlists preserve ordered score IDs across persistence', async () => {
  const client = new MemoryCommandClient()
  const repository = new TauriSetlistRepository(client)
  const setlist: Setlist = {
    id: 'setlist-1',
    name: 'Rehearsal',
    scoreIds: ['score-1', 'score-2'],
    createdAt: '2026-09-28T00:00:00.000Z',
    updatedAt: '2026-09-28T00:00:00.000Z',
  }

  await repository.create(setlist)
  assert.deepEqual((await repository.get(setlist.id))?.scoreIds, ['score-1', 'score-2'])
})

test('annotation repository preserves page-organized strokes', async () => {
  const client = new MemoryCommandClient()
  const repository = new TauriAnnotationRepository(client)
  const stroke = {
    id: 'stroke-1',
    tool: 'highlighter' as const,
    color: '#f5c542',
    width: 12,
    opacity: 0.5,
    points: [{ x: 0.1, y: 0.2 }],
    createdAt: '2026-09-28T00:00:00.000Z',
  }

  await repository.addStroke('score-1', 2, stroke)
  const loaded = await repository.get('score-1')
  assert.deepEqual(loaded.pages[0], { pageNumber: 2, strokes: [stroke] })

  await repository.deleteStroke('score-1', 2, stroke.id)
  assert.deepEqual((await repository.get('score-1')).pages[0]?.strokes, [])
})
