import type { FolderRepository, ScoreRepository } from '../persistence/repositories'
import type { Folder, LibraryFolderNode, LibraryTree, Score } from '../shared/types'

export class LibraryService {
  private readonly repository: ScoreRepository
  private readonly folders: FolderRepository

  constructor(repository: ScoreRepository, folders: FolderRepository) {
    this.repository = repository
    this.folders = folders
  }

  listScores() {
    return this.repository.list()
  }

  listFolders() {
    return this.folders.list()
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

  async listLibraryTree(): Promise<LibraryTree> {
    const [scores, folders] = await Promise.all([this.repository.list(), this.folders.list()])
    const nodes = new Map<string, LibraryFolderNode>(folders.map((folder) => [folder.id, { folder, scores: [], children: [] }]))
    const rootScores: Score[] = []

    for (const score of scores) {
      const node = score.folderId ? nodes.get(score.folderId) : undefined
      if (node) node.scores.push(score)
      else rootScores.push(score)
    }

    const roots: LibraryFolderNode[] = []
    for (const node of nodes.values()) {
      const parent = node.folder.parentId ? nodes.get(node.folder.parentId) : undefined
      if (parent) parent.children.push(node)
      else roots.push(node)
    }
    return { rootScores, folders: roots }
  }

  createFolder(folder: Folder) { return this.folders.create(folder) }
  updateFolder(folder: Folder) { return this.folders.update(folder) }
  removeFolder(id: string) { return this.folders.delete(id) }
  moveFolder(id: string, newParentId: string | null) { return this.folders.move(id, newParentId) }
  moveScore(id: string, folderId: string | null) { return this.repository.moveToFolder(id, folderId) }
}
