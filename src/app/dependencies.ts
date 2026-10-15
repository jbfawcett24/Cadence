import type { TauriInvoke } from '../bridge/tauriCommands'
import { createTauriCommandClient } from '../bridge/tauriCommands'
import { TauriAnnotationRepository, TauriAudioRepository, TauriScoreRepository, TauriSetlistRepository, TauriSettingsRepository } from '../persistence/tauriRepositories'
import { AnnotationService } from '../services/annotationService'
import { AudioService } from '../services/audioService'
import { LibraryService } from '../services/libraryService'
import { SetlistService } from '../services/setlistService'
import { SettingsService } from '../services/settingsService'

export function createApplicationServices(invoke: TauriInvoke) {
  const client = createTauriCommandClient(invoke)
  return {
    client,
    library: new LibraryService(new TauriScoreRepository(client)),
    setlists: new SetlistService(new TauriSetlistRepository(client)),
    annotations: new AnnotationService(new TauriAnnotationRepository(client)),
    audio: new AudioService(new TauriAudioRepository(client)),
    settings: new SettingsService(new TauriSettingsRepository(client)),
  }
}

export type ApplicationServices = ReturnType<typeof createApplicationServices>
