import type {
  AnnotationDocument,
  AppSettings,
  AudioLink,
  AudioLinkDraft,
  Score,
  Setlist,
  Stroke,
} from '../shared/types'

export interface ScoreRepository {
  create(score: Score): Promise<void>
  get(id: string): Promise<Score | undefined>
  update(score: Score): Promise<void>
  delete(id: string): Promise<void>
  list(): Promise<Score[]>
  search(query: string): Promise<Score[]>
  resolveFile(id: string): Promise<string>
  deleteManagedFile(id: string): Promise<void>
}

export interface SetlistRepository {
  create(setlist: Setlist): Promise<void>
  get(id: string): Promise<Setlist | undefined>
  update(setlist: Setlist): Promise<void>
  delete(id: string): Promise<void>
  list(): Promise<Setlist[]>
}

export interface AnnotationRepository {
  get(scoreId: string): Promise<AnnotationDocument>
  replace(document: AnnotationDocument): Promise<void>
  addStroke(scoreId: string, pageNumber: number, stroke: Stroke): Promise<void>
  updateStroke(scoreId: string, pageNumber: number, stroke: Stroke): Promise<void>
  deleteStroke(scoreId: string, pageNumber: number, strokeId: string): Promise<void>
}

export interface AudioRepository {
  get(scoreId: string): Promise<AudioLink | undefined>
  create(link: AudioLinkDraft): Promise<AudioLink>
  update(link: AudioLink): Promise<void>
  delete(scoreId: string): Promise<void>
  checkAvailability(path: string): Promise<AudioLink['format'] | undefined>
}

export interface SettingsRepository {
  get(): Promise<AppSettings>
  update(settings: AppSettings): Promise<void>
}
