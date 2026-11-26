import { Fragment, useEffect, useRef, useState, type DragEvent } from 'react'
import { css } from '@emotion/react'
import { createFrontendApi } from '../app/frontendApi'
import type { LibraryFolderNode, Score } from '../shared/types'
import ScoreCard from './ScoreCard'
import ScoreRow from './ScoreRow'
import DragOverlay from './DragOverlay'
import { theme } from './theme'

const cadence = createFrontendApi()

interface LibraryListProps {
  refreshToken: number
  onSelectScore: (scoreId: string) => void
  onCurrentFolderChange: (folderId: string | null) => void
  folderPath: LibraryFolderNode[]
  onFolderPathChange: (folderPath: LibraryFolderNode[]) => void
  onMoveScore: (scoreId: string, folderId: string | null) => Promise<void>
  onMoveFolder: (folderId: string, parentId: string | null) => Promise<void>
  onDraggingChange?: (isDragging: boolean) => void
  mode?: 'grid' | 'row'
}

type DraggedItem =
  | { type: 'score'; id: string; folderId: string | null }
  | { type: 'folder'; id: string; parentId: string | null }

export default function LibraryList({
  refreshToken,
  onSelectScore,
  onCurrentFolderChange,
  folderPath,
  onFolderPathChange,
  onMoveScore,
  onMoveFolder,
  onDraggingChange,
  mode = 'grid',
}: LibraryListProps) {
  const [scores, setScores] = useState<Score[]>([])
  const [folders, setFolders] = useState<LibraryFolderNode[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [draggedItem, setDraggedItem] = useState<DraggedItem | null>(null)
  const [dragLabel, setDragLabel] = useState('')
  const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 })
  const [dropTargetId, setDropTargetId] = useState<string | null>(null)
  const [isMoving, setIsMoving] = useState(false)
  const folderPathRef = useRef(folderPath)

  useEffect(() => {
    folderPathRef.current = folderPath
  }, [folderPath])

  useEffect(() => {
    let cancelled = false

    async function loadScores() {
      setIsLoading(true)
      setErrorMessage('')

      try {
        const tree = await cadence.services.library.listLibraryTree()
        if (!cancelled) {
          setScores(tree.rootScores)
          setFolders(tree.folders)
          const currentFolderId = folderPathRef.current.at(-1)?.folder.id
          const nextPath = currentFolderId ? findFolderPath(tree.folders, currentFolderId) : []
          onFolderPathChange(nextPath ?? [])
          onCurrentFolderChange(nextPath?.at(-1)?.folder.id ?? null)
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(error instanceof Error ? error.message : 'The library could not be loaded.')
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    void loadScores()

    return () => {
      cancelled = true
    }
  }, [onCurrentFolderChange, onFolderPathChange, refreshToken])

  const currentFolder = folderPath.at(-1)
  const displayedScores = currentFolder?.scores ?? scores
  const displayedFolders = currentFolder?.children ?? folders

  function handleDragStart(event: DragEvent<HTMLDivElement>, item: DraggedItem, label: string) {
    if (isMoving) return
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', `${item.type}:${item.id}`)
    setTransparentDragImage(event)
    setDraggedItem(item)
    setDragLabel(label)
    setDragPosition({ x: event.clientX, y: event.clientY })
    onDraggingChange?.(true)
  }

  function handleDragEnd() {
    setDraggedItem(null)
    setDragLabel('')
    setDropTargetId(null)
    onDraggingChange?.(false)
  }

  function canDropInto(folderId: string) {
    if (!draggedItem || draggedItem.id === folderId || isMoving) return false
    if (draggedItem.type === 'score') return draggedItem.folderId !== folderId

    const source = findFolderNode(folders, draggedItem.id)
    return draggedItem.parentId !== folderId && !source?.children.some((child) => containsFolder(child, folderId))
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>, folderId: string) {
    if (!canDropInto(folderId)) {
      if (dropTargetId === folderId) setDropTargetId(null)
      return
    }
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
    setDropTargetId(folderId)
  }

  function handleDragLeave(event: DragEvent<HTMLDivElement>, folderId: string) {
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) return
    if (dropTargetId === folderId) setDropTargetId(null)
  }

  async function handleDrop(event: DragEvent<HTMLDivElement>, folderId: string) {
    event.preventDefault()
    if (!canDropInto(folderId) || !draggedItem) return

    setIsMoving(true)
    try {
      if (draggedItem.type === 'score') await onMoveScore(draggedItem.id, folderId)
      else await onMoveFolder(draggedItem.id, folderId)
    } finally {
      setIsMoving(false)
      handleDragEnd()
    }
  }

  function renderFolder(folder: LibraryFolderNode) {
    return (mode === 'grid' ?
      <ScoreCard
        key={folder.folder.id}
        item={{ type: 'folder', folder: folder.folder }
        }
        onClick={() => {
          onFolderPathChange([...folderPath, folder])
          onCurrentFolderChange(folder.folder.id)
        }
        }
        draggable
        onDragStart={(event) => handleDragStart(event, {
          type: 'folder',
          id: folder.folder.id,
          parentId: folder.folder.parentId,
        }, folder.folder.name)}
        onDragEnd={handleDragEnd}
        onDragOver={(event) => handleDragOver(event, folder.folder.id)}
        onDragLeave={(event) => handleDragLeave(event, folder.folder.id)}
        onDrop={(event) => void handleDrop(event, folder.folder.id).catch(() => { })}
        isDropTarget={dropTargetId === folder.folder.id}
      />
      : <ScoreRow
        key={folder.folder.id}
        item={{ type: 'folder', folder: folder.folder }}
        onClick={() => {
          onFolderPathChange([...folderPath, folder])
          onCurrentFolderChange(folder.folder.id)
        }}
        draggable
        onDragStart={(event) => handleDragStart(event, {
          type: 'folder',
          id: folder.folder.id,
          parentId: folder.folder.parentId,
        }, folder.folder.name)}
        onDragEnd={handleDragEnd}
        onDragOver={(event) => handleDragOver(event, folder.folder.id)}
        onDragLeave={(event) => handleDragLeave(event, folder.folder.id)}
        onDrop={(event) => void handleDrop(event, folder.folder.id).catch(() => { })}
        isDropTarget={dropTargetId === folder.folder.id}
      />
    )
  }

  function renderScore(score: Score) {
    return (mode === 'grid' ?
      <ScoreCard
        key={score.id}
        item={{ type: 'score', score }}
        onClick={() => onSelectScore(score.id)}
        draggable
        onDragStart={(event) => handleDragStart(event, {
          type: 'score',
          id: score.id,
          folderId: score.folderId,
        }, score.title)}
        onDragEnd={handleDragEnd}
      />
      : <ScoreRow
        key={score.id}
        item={{ type: 'score', score }}
        onClick={() => onSelectScore(score.id)}
        draggable
        onDragStart={(event) => handleDragStart(event, {
          type: 'score',
          id: score.id,
          folderId: score.folderId,
        }, score.title)}
        onDragEnd={handleDragEnd}
      />
    )
  }

  return (
    <>
      {draggedItem && dragLabel && (
        <DragOverlay
          label={dragLabel}
          initialPosition={dragPosition}
        />
      )}
      <div
        css={css`
          padding-top: ${mode === 'grid' ? "" : theme.spacing.large};
        `}
      >
      {isLoading && <p>Loading library...</p>}
      {errorMessage && <p role="alert">{errorMessage}</p>}
      {!isLoading && !errorMessage && displayedScores.length === 0 && displayedFolders.length === 0 && (
        <div css={css`
          display:flex;
          min-height: 12rem;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: ${theme.spacing.small};
          color: ${theme.colors.textMuted};
          text-align: center;

          svg {
            color: ${theme.colors.secondary};
          }

          p {
            margin: ${theme.spacing.small} 0 0;
          color: ${theme.colors.secondaryHover};
          font-size: 1.125rem;
          font-weight: 700;
          }

          span {
            max - width: 28rem;
          font-size: 0.9375rem;
          }
          `}
          role="status"
        >
          <p>{folderPath.length > 0 ? 'This folder is empty.' : 'Your library is empty.'}</p>
          <span>
            {folderPath.length > 0
              ? 'Add a score or create a folder to get started.'
              : 'Import a score or create a folder to get started.'}
          </span>
        </div>
      )
      }
      {
        !isLoading && !errorMessage && (
          <div css={mode === 'grid' ? gridItemsStyles : rowItemsStyles}>
            {displayedFolders.map((folder, index) => (
              <Fragment key={folder.folder.id}>
                {renderFolder(folder)}
                {mode === 'row' && (index < displayedFolders.length - 1 || displayedScores.length > 0) && (
                  <div aria-hidden="true" css={rowDividerStyles} />
                )}
              </Fragment>
            ))}
            {displayedScores.map((score, index) => (
              <Fragment key={score.id}>
                {renderScore(score)}
                {mode === 'row' && index < displayedScores.length - 1 && (
                  <div aria-hidden="true" css={rowDividerStyles} />
                )}
              </Fragment>
            ))}
          </div>
        )
      }
      </div>
    </>
  )
}

function setTransparentDragImage(event: DragEvent<HTMLDivElement>) {
  const transparentImage = document.createElement('canvas')
  transparentImage.width = 1
  transparentImage.height = 1
  transparentImage.style.position = 'fixed'
  transparentImage.style.top = '-1000px'
  transparentImage.style.left = '-1000px'
  document.body.appendChild(transparentImage)
  event.dataTransfer.setDragImage(transparentImage, 0, 0)
  window.setTimeout(() => transparentImage.remove(), 0)
}

function findFolderNode(nodes: LibraryFolderNode[], folderId: string): LibraryFolderNode | undefined {
  for (const node of nodes) {
    if (node.folder.id === folderId) return node
    const match = findFolderNode(node.children, folderId)
    if (match) return match
  }
  return undefined
}

function containsFolder(node: LibraryFolderNode, folderId: string): boolean {
  return node.folder.id === folderId || node.children.some((child) => containsFolder(child, folderId))
}

function findFolderPath(nodes: LibraryFolderNode[], folderId: string): LibraryFolderNode[] | undefined {
  for (const node of nodes) {
    if (node.folder.id === folderId) return [node]
    const childPath = findFolderPath(node.children, folderId)
    if (childPath) return [node, ...childPath]
  }
  return undefined
}

const gridItemsStyles = css`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: ${theme.spacing.xl};
  padding: ${theme.spacing.xl} ${theme.spacing.xl} 0;
`

const rowItemsStyles = css`
  display: flex;
  width: 100%;
  flex-direction: column;
  background-color: ${theme.colors.surface};
  padding: 0;
`

const rowDividerStyles = css`
  width: 100%;
  height: 1px;
  background: ${theme.colors.divider};
`
