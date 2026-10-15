import type {
  AnnotationDocument,
  AppSettings,
  AudioLink,
  AudioLinkDraft,
  AudioFormat,
  ManagedScoreFile,
  Score,
  Setlist,
} from '../shared/types'

export type TauriCommand =
  | 'import_score_file'
  | 'delete_score_file'
  | 'resolve_score_file'
  | 'load_library'
  | 'save_library'
  | 'load_setlists'
  | 'save_setlists'
  | 'load_annotations'
  | 'save_annotations'
  | 'link_audio_file'
  | 'load_audio_link'
  | 'delete_audio_link'
  | 'check_audio_link'
  | 'load_settings'
  | 'save_settings'

export interface TauriCommandClient {
  importScoreFile(sourcePath: string): Promise<ManagedScoreFile>
  deleteScoreFile(scoreId: string): Promise<void>
  resolveScoreFile(scoreId: string): Promise<string>
  loadLibrary(): Promise<Score[]>
  saveLibrary(scores: Score[]): Promise<void>
  loadSetlists(): Promise<Setlist[]>
  saveSetlists(setlists: Setlist[]): Promise<void>
  loadAnnotations(scoreId: string): Promise<AnnotationDocument>
  saveAnnotations(document: AnnotationDocument): Promise<void>
  linkAudioFile(link: AudioLinkDraft): Promise<AudioLink>
  loadAudioLink(scoreId: string): Promise<AudioLink | undefined>
  deleteAudioLink(scoreId: string): Promise<void>
  checkAudioLink(path: string): Promise<AudioFormat | undefined>
  loadSettings(): Promise<AppSettings>
  saveSettings(settings: AppSettings): Promise<void>
}

export type TauriInvoke = <T>(command: TauriCommand, args?: Record<string, unknown>) => Promise<T>

export function createTauriCommandClient(invoke: TauriInvoke): TauriCommandClient {
  return {
    importScoreFile: (sourcePath) => invoke(tauriCommands.import_score_file, { sourcePath }),
    deleteScoreFile: (scoreId) => invoke(tauriCommands.delete_score_file, { scoreId }),
    resolveScoreFile: (scoreId) => invoke(tauriCommands.resolve_score_file, { scoreId }),
    loadLibrary: async () => parseJson(await invoke<string | null>(tauriCommands.load_library), []),
    saveLibrary: (scores) => invoke(tauriCommands.save_library, { contents: JSON.stringify(scores, null, 2) }),
    loadSetlists: async () => parseJson(await invoke<string | null>(tauriCommands.load_setlists), []),
    saveSetlists: (setlists) => invoke(tauriCommands.save_setlists, { contents: JSON.stringify(setlists, null, 2) }),
    loadAnnotations: async (scoreId) =>
      parseJson(await invoke<string | null>(tauriCommands.load_annotations, { scoreId }), {
        scoreId,
        version: 1,
        pages: [],
      }),
    saveAnnotations: (document) =>
      invoke(tauriCommands.save_annotations, {
        scoreId: document.scoreId,
        contents: JSON.stringify(document, null, 2),
      }),
    linkAudioFile: (link: AudioLinkDraft) =>
      invoke(tauriCommands.link_audio_file, {
        scoreId: link.scoreId,
        path: link.path,
        createdAt: link.createdAt,
        updatedAt: link.updatedAt,
      }),
    loadAudioLink: async (scoreId) =>
      parseJson(await invoke<string | null>(tauriCommands.load_audio_link, { scoreId }), undefined),
    deleteAudioLink: (scoreId) => invoke(tauriCommands.delete_audio_link, { scoreId }),
    checkAudioLink: (path) => invoke(tauriCommands.check_audio_link, { path }),
    loadSettings: async () =>
      parseJson(await invoke<string | null>(tauriCommands.load_settings), {
        version: 1,
        theme: 'system',
        preferredOrientation: 'auto',
      }),
    saveSettings: (settings) =>
      invoke(tauriCommands.save_settings, { contents: JSON.stringify(settings, null, 2) }),
  }
}

function parseJson<T>(contents: string | null, fallback: T): T {
  if (!contents) return fallback
  return JSON.parse(contents) as T
}

export const tauriCommands: Record<TauriCommand, TauriCommand> = {
  import_score_file: 'import_score_file',
  delete_score_file: 'delete_score_file',
  resolve_score_file: 'resolve_score_file',
  load_library: 'load_library',
  save_library: 'save_library',
  load_setlists: 'load_setlists',
  save_setlists: 'save_setlists',
  load_annotations: 'load_annotations',
  save_annotations: 'save_annotations',
  link_audio_file: 'link_audio_file',
  load_audio_link: 'load_audio_link',
  delete_audio_link: 'delete_audio_link',
  check_audio_link: 'check_audio_link',
  load_settings: 'load_settings',
  save_settings: 'save_settings',
}
