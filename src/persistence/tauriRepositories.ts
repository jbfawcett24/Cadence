import type {
  AnnotationRepository,
  AudioRepository,
  ScoreRepository,
  SetlistRepository,
  SettingsRepository,
} from './repositories'
import type { TauriCommandClient } from '../bridge/tauriCommands'
import type { AnnotationDocument, AppSettings, AudioLink, Score, Setlist, Stroke } from '../shared/types'

export class TauriScoreRepository implements ScoreRepository {
  private readonly client: TauriCommandClient

  constructor(client: TauriCommandClient) {
    this.client = client
  }

  async create(score: Score) {
    const scores = await this.client.loadLibrary()
    if (scores.some((existing) => existing.id === score.id)) throw new Error(`Score already exists: ${score.id}`)
    await this.client.saveLibrary([...scores, score])
  }

  async get(id: string) {
    return (await this.client.loadLibrary()).find((score) => score.id === id)
  }

  async update(score: Score) {
    const scores = await this.client.loadLibrary()
    if (!scores.some((existing) => existing.id === score.id)) throw new Error(`Score not found: ${score.id}`)
    await this.client.saveLibrary(scores.map((existing) => (existing.id === score.id ? score : existing)))
  }

  async delete(id: string) {
    await this.client.saveLibrary((await this.client.loadLibrary()).filter((score) => score.id !== id))
  }

  list() {
    return this.client.loadLibrary()
  }

  resolveFile(id: string) {
    return this.client.resolveScoreFile(id)
  }

  deleteManagedFile(id: string) {
    return this.client.deleteScoreFile(id)
  }

  async search(query: string) {
    const normalizedQuery = query.trim().toLocaleLowerCase()
    if (!normalizedQuery) return this.client.loadLibrary()
    return (await this.client.loadLibrary()).filter((score) =>
      [score.title, score.composer, score.instrument, ...score.tags]
        .filter(Boolean)
        .some((field) => field!.toLocaleLowerCase().includes(normalizedQuery)),
    )
  }
}

export class TauriSetlistRepository implements SetlistRepository {
  private readonly client: TauriCommandClient

  constructor(client: TauriCommandClient) {
    this.client = client
  }

  async create(setlist: Setlist) {
    const setlists = await this.client.loadSetlists()
    if (setlists.some((existing) => existing.id === setlist.id)) throw new Error(`Setlist already exists: ${setlist.id}`)
    await this.client.saveSetlists([...setlists, setlist])
  }

  async get(id: string) {
    return (await this.client.loadSetlists()).find((setlist) => setlist.id === id)
  }

  async update(setlist: Setlist) {
    const setlists = await this.client.loadSetlists()
    if (!setlists.some((existing) => existing.id === setlist.id)) throw new Error(`Setlist not found: ${setlist.id}`)
    await this.client.saveSetlists(setlists.map((existing) => (existing.id === setlist.id ? setlist : existing)))
  }

  async delete(id: string) {
    await this.client.saveSetlists((await this.client.loadSetlists()).filter((setlist) => setlist.id !== id))
  }

  list() {
    return this.client.loadSetlists()
  }
}

export class TauriAnnotationRepository implements AnnotationRepository {
  private readonly client: TauriCommandClient

  constructor(client: TauriCommandClient) {
    this.client = client
  }

  get(scoreId: string) {
    return this.client.loadAnnotations(scoreId)
  }

  replace(document: AnnotationDocument) {
    return this.client.saveAnnotations(document)
  }

  async addStroke(scoreId: string, pageNumber: number, stroke: Stroke) {
    const document = await this.get(scoreId)
    const page = document.pages.find((candidate) => candidate.pageNumber === pageNumber)
    if (page) page.strokes.push(stroke)
    else document.pages.push({ pageNumber, strokes: [stroke] })
    await this.replace(document)
  }

  async updateStroke(scoreId: string, pageNumber: number, stroke: Stroke) {
    const document = await this.get(scoreId)
    const page = document.pages.find((candidate) => candidate.pageNumber === pageNumber)
    const index = page?.strokes.findIndex((candidate) => candidate.id === stroke.id) ?? -1
    if (!page || index < 0) throw new Error(`Stroke not found: ${stroke.id}`)
    page.strokes[index] = stroke
    await this.replace(document)
  }

  async deleteStroke(scoreId: string, pageNumber: number, strokeId: string) {
    const document = await this.get(scoreId)
    const page = document.pages.find((candidate) => candidate.pageNumber === pageNumber)
    if (!page) return
    page.strokes = page.strokes.filter((stroke) => stroke.id !== strokeId)
    await this.replace(document)
  }
}

export class TauriAudioRepository implements AudioRepository {
  private readonly client: TauriCommandClient

  constructor(client: TauriCommandClient) {
    this.client = client
  }

  get(scoreId: string) {
    return this.client.loadAudioLink(scoreId)
  }

  create(link: Omit<AudioLink, 'format'>) {
    return this.client.linkAudioFile(link)
  }

  async update(link: AudioLink) {
    await this.client.linkAudioFile(link)
  }

  delete(scoreId: string) {
    return this.client.deleteAudioLink(scoreId)
  }

  checkAvailability(path: string) {
    return this.client.checkAudioLink(path)
  }
}

export class TauriSettingsRepository implements SettingsRepository {
  private readonly client: TauriCommandClient

  constructor(client: TauriCommandClient) {
    this.client = client
  }

  get() {
    return this.client.loadSettings()
  }

  update(settings: AppSettings) {
    return this.client.saveSettings(settings)
  }
}
