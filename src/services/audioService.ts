import type { AudioLink, AudioLinkDraft } from '../shared/types'
import type { AudioRepository } from '../persistence/repositories'

export class AudioService {
  private readonly repository: AudioRepository

  constructor(repository: AudioRepository) {
    this.repository = repository
  }

  getLink(scoreId: string) {
    return this.repository.get(scoreId)
  }

  linkAudio(link: AudioLinkDraft) {
    return this.repository.create(link)
  }

  updateLink(link: AudioLink) {
    return this.repository.update(link)
  }

  removeLink(scoreId: string) {
    return this.repository.delete(scoreId)
  }

  checkAvailability(path: string) {
    return this.repository.checkAvailability(path)
  }
}
