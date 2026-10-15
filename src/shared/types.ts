export type ScoreFormat = 'pdf' | 'musicxml'

export interface Score {
  id: string
  title: string
  composer?: string
  instrument?: string
  tags: string[]
  format: ScoreFormat
  managedFilePath: string
  originalFilePath?: string
  createdAt: string
  updatedAt: string
}

export interface Setlist {
  id: string
  name: string
  scoreIds: string[]
  createdAt: string
  updatedAt: string
}

export type StrokeTool = 'pen' | 'highlighter'

export interface Point {
  x: number
  y: number
  pressure?: number
}

export interface Stroke {
  id: string
  tool: StrokeTool
  color: string
  width: number
  opacity: number
  points: Point[]
  createdAt: string
}

export interface AnnotationPage {
  pageNumber: number
  strokes: Stroke[]
}

export interface AnnotationDocument {
  scoreId: string
  version: 1
  pages: AnnotationPage[]
}

export type AudioFormat = 'mp3' | 'wav'

export interface AudioLinkDraft {
  scoreId: string
  path: string
  createdAt: string
  updatedAt: string
}

export interface AudioLink extends AudioLinkDraft {
  format: AudioFormat
}

export interface AppSettings {
  version: 1
  theme: 'system' | 'light' | 'dark'
  preferredOrientation: 'auto' | 'portrait' | 'landscape'
}

export interface ManagedScoreFile {
  managedPath: string
  originalPath: string
  format: ScoreFormat
}
