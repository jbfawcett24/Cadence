import type { Setlist } from '../shared/types'
import type { SetlistRepository } from '../persistence/repositories'

export class SetlistService {
  private readonly repository: SetlistRepository

  constructor(repository: SetlistRepository) {
    this.repository = repository
  }

  listSetlists() {
    return this.repository.list()
  }

  createSetlist(setlist: Setlist) {
    return this.repository.create(setlist)
  }

  updateSetlist(setlist: Setlist) {
    return this.repository.update(setlist)
  }

  removeSetlist(id: string) {
    return this.repository.delete(id)
  }
}
