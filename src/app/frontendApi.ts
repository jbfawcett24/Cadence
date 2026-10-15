import { invoke } from '@tauri-apps/api/core'
import type { ApplicationServices } from './dependencies'
import { createApplicationServices } from './dependencies'
import type { AppSettings, AudioFormat, AudioLink, AudioLinkDraft, Score } from '../shared/types'

export interface StartupData {
  scores: Score[]
  setlists: Awaited<ReturnType<ApplicationServices['setlists']['listSetlists']>>
  settings: AppSettings
}

export interface CadenceApi {
  services: ApplicationServices
  startup(): Promise<StartupData>
  importScore(sourcePath: string, metadata?: Partial<Pick<Score, 'title' | 'composer' | 'instrument' | 'tags'>>): Promise<Score>
  openScore(scoreId: string): Promise<{ score: Score; filePath: string }>
  removeScore(scoreId: string): Promise<void>
  linkAudio(link: AudioLinkDraft): Promise<AudioLink>
  checkAudio(path: string): Promise<AudioFormat | undefined>
}

export function createFrontendApi(): CadenceApi {
  const services = createApplicationServices(invoke)

  return {
    services,
    async startup() {
      const [scores, setlists, settings] = await Promise.all([
        services.library.listScores(),
        services.setlists.listSetlists(),
        services.settings.load(),
      ])
      return { scores, setlists, settings }
    },
    async importScore(sourcePath, metadata = {}) {
      const managed = await services.client.importScoreFile(sourcePath)
      const now = new Date().toISOString()
      const score: Score = {
        id: managed.managedPath.split(/[\\/]/).pop()?.split('.')[0] ?? crypto.randomUUID(),
        title: metadata.title ?? sourcePath.split(/[\\/]/).pop()?.replace(/\.[^.]+$/, '') ?? 'Untitled score',
        composer: metadata.composer,
        instrument: metadata.instrument,
        tags: metadata.tags ?? [],
        format: managed.format,
        managedFilePath: managed.managedPath,
        originalFilePath: managed.originalPath,
        createdAt: now,
        updatedAt: now,
      }
      await services.library.createScore(score)
      return score
    },
    async openScore(scoreId) {
      const score = await services.library.getScore(scoreId)
      if (!score) throw new Error(`Score not found: ${scoreId}`)
      const filePath = await services.library.resolveFile(scoreId)
      return { score, filePath }
    },
    removeScore: async (scoreId) => {
      await services.library.deleteManagedFile(scoreId)
      await services.library.removeScore(scoreId)
    },
    linkAudio: (link) => services.audio.linkAudio(link),
    checkAudio: (path) => services.audio.checkAvailability(path),
  }
}
