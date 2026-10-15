import type { Score } from '../shared/types'
import type { ScoreRepository } from '../persistence/repositories'

export class LibraryService {
  private readonly repository: ScoreRepository

  constructor(repository: ScoreRepository) {
    this.repository = repository
  }

  listScores() {
    return this.repository.list()
  }

  getScore(id: string) {
    return this.repository.get(id)
  }

  resolveFile(id: string) {
    return this.repository.resolveFile(id)
  }

  deleteManagedFile(id: string) {
    return this.repository.deleteManagedFile(id)
  }

  searchScores(query: string) {
    return this.repository.search(query)
  }

  createScore(score: Score) {
    return this.repository.create(score)
  }

  updateScore(score: Score) {
    return this.repository.update(score)
  }

  removeScore(id: string) {
    return this.repository.delete(id)
  }
}
