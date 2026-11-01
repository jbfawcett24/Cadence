import { Fragment, useEffect, useState } from 'react'
import { css } from '@emotion/react'
import { createFrontendApi } from '../app/frontendApi'
import type { LibraryFolderNode, Score } from '../shared/types'
import ScoreCard from './ScoreCard'
import ScoreRow from './ScoreRow'
import { theme } from './theme'

const cadence = createFrontendApi()

interface LibraryListProps {
  refreshToken: number
  onSelectScore: (scoreId: string) => void
  mode?: 'grid' | 'row'
}

export default function LibraryList({ refreshToken, onSelectScore, mode = 'grid' }: LibraryListProps) {
  const [scores, setScores] = useState<Score[]>([])
  const [folders, setFolders] = useState<LibraryFolderNode[]>([])
  const [folderPath, setFolderPath] = useState<LibraryFolderNode[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

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
          setFolderPath([])
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
  }, [refreshToken])

  const currentFolder = folderPath.at(-1)
  const displayedScores = currentFolder?.scores ?? scores
  const displayedFolders = currentFolder?.children ?? folders

  function renderFolder(folder: LibraryFolderNode) {
    return (mode === 'grid' ?
      <ScoreCard
        key={folder.folder.id}
        item={{ type: 'folder', folder: folder.folder }
        }
        onClick={() => setFolderPath((path) => [...path, folder])
        }
      />
      : <ScoreRow
        key={folder.folder.id}
        item={{ type: 'folder', folder: folder.folder }}
        onClick={() => setFolderPath((path) => [...path, folder])}
      />
    )
  }

  function renderScore(score: Score) {
    return (mode === 'grid' ?
      <ScoreCard
        key={score.id}
        item={{ type: 'score', score }}
        onClick={() => onSelectScore(score.id)}
      />
      : <ScoreRow
        key={score.id}
        item={{ type: 'score', score }}
        onClick={() => onSelectScore(score.id)}
      />
    )
  }

  return (
    <div>
      {isLoading && <p>Loading library...</p>}
      {errorMessage && <p role="alert">{errorMessage}</p>}
      {!isLoading && !errorMessage && folderPath.length > 0 && (
        <button type="button" onClick={() => setFolderPath((path) => path.slice(0, -1))}>
          Back
        </button>
      )}
      {!isLoading && !errorMessage && displayedScores.length === 0 && displayedFolders.length === 0 && (
        <p>Your library is empty.</p>
      )}
      {!isLoading && !errorMessage && (
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
      )}
    </div>
  )
}

const gridItemsStyles = css`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: ${theme.spacing.xl};
  padding: ${theme.spacing.xl};
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
