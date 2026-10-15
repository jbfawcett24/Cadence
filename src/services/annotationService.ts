import type { AnnotationDocument, Stroke } from '../shared/types'
import type { AnnotationRepository } from '../persistence/repositories'

export class AnnotationService {
  private readonly repository: AnnotationRepository

  constructor(repository: AnnotationRepository) {
    this.repository = repository
  }

  load(scoreId: string) {
    return this.repository.get(scoreId)
  }

  replace(document: AnnotationDocument) {
    return this.repository.replace(document)
  }

  addStroke(scoreId: string, pageNumber: number, stroke: Stroke) {
    return this.repository.addStroke(scoreId, pageNumber, stroke)
  }

  deleteStroke(scoreId: string, pageNumber: number, strokeId: string) {
    return this.repository.deleteStroke(scoreId, pageNumber, strokeId)
  }
}
