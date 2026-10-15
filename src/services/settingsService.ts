import type { AppSettings } from '../shared/types'
import type { SettingsRepository } from '../persistence/repositories'

export class SettingsService {
  private readonly repository: SettingsRepository

  constructor(repository: SettingsRepository) {
    this.repository = repository
  }

  load() {
    return this.repository.get()
  }

  update(settings: AppSettings) {
    return this.repository.update(settings)
  }
}
