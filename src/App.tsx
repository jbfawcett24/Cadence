import { useState } from 'react'
import type { FormEvent } from 'react'
import { open } from '@tauri-apps/plugin-dialog'
import { getCurrentWindow } from '@tauri-apps/api/window'
import PageHeader from './components/PageHeader'
import { createFrontendApi } from './app/frontendApi'
import LibraryList from './components/LibraryList'
import ScoreReader from './components/ScoreReader'
import Button from './components/Button'
import { css } from '@emotion/react'
import IconButton from './components/IconButton'
import ScoreCard from './components/ScoreCard'
import ScoreRow from './components/ScoreRow'
import type { Folder, Score } from './shared/types'
import { theme } from './components/theme'
import { FilePlusIcon, GridFourIcon, ListBulletsIcon, X, XIcon } from '@phosphor-icons/react'

const cadence = createFrontendApi()

const dummyFolder: Folder = {
  id: 'dummy-folder',
  name: 'Practice Pieces',
  parentId: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

const dummyScore: Score = {
  id: 'dummy-score',
  title: 'Clair de Lune',
  composer: 'Claude Debussy',
  instrument: 'Piano',
  tags: ['dummy', 'practice'],
  folderId: dummyFolder.id,
  format: 'pdf',
  managedFilePath: '/dummy/clair-de-lune.pdf',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

export default function App() {
  const [importScore, setImportScore] = useState(false)
  const [sourcePath, setSourcePath] = useState('')
  const [title, setTitle] = useState('')
  const [composer, setComposer] = useState('')
  const [instrument, setInstrument] = useState('')
  const [tags, setTags] = useState('')
  const [isImporting, setIsImporting] = useState(false)
  const [libraryRefreshToken, setLibraryRefreshToken] = useState(0)
  const [selectedScoreId, setSelectedScoreId] = useState<string>()
  const [successMessage, setSuccessMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [mode, setMode] = useState<'grid' | 'row'>('grid')

  async function handleChooseFile() {
    const selected = await open({
      directory: false,
      multiple: false,
      filters: [
        {
          name: 'Score files',
          extensions: ['pdf', 'xml', 'musicxml', 'mxl'],
        },
      ],
    })

    if (typeof selected === 'string') {
      setSourcePath(selected)
      setErrorMessage('')
    }
  }

  async function handleImport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsImporting(true)
    setSuccessMessage('')
    setErrorMessage('')

    try {
      const score = await cadence.importScore(sourcePath, {
        title: title || undefined,
        composer: composer || undefined,
        instrument: instrument || undefined,
        tags: tags.split(',').map((tag) => tag.trim()).filter(Boolean),
      })
      setSuccessMessage('Imported "' + score.title + '" successfully.')
      setLibraryRefreshToken((token) => token + 1)
      setSourcePath('')
      setTitle('')
      setComposer('')
      setInstrument('')
      setTags('')
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'The score could not be imported.')
    } finally {
      setIsImporting(false)
    }
  }

  async function handleQuit() {
    try {
      await getCurrentWindow().close()
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'The application could not be closed.')
    }
  }

  if (selectedScoreId) {
    return <ScoreReader scoreId={selectedScoreId} onBack={() => setSelectedScoreId(undefined)} />
  }

  // return (
  //   <div
  //     css={css`
  //       width: 100%;
  //       height: 100vh;
  //       display: flex;
  //       justify-content: center;
  //       align-items: center;
  //       flex-direction: column;
  //       gap: 40px;
  //     `}
  //   >
  //     <div
  //       css={css`
  //         display: flex;
  //         gap: 10px;
  //         align-items: flex-end;
  //       `}
  //     >
  //       <Button text="Press Me!" size="xs" />
  //       <Button text="Press Me!" size='sm' />
  //       <Button text="Press Me!" size='md' />
  //       <Button text="Press Me!" size='lg' />
  //       <Button text="Press Me!" size='xl' />
  //       <Button text="Press Me!" size='xxl' disabled />
  //     </div>
  //     <div>
  //       <Button text="Secondary" variant='secondary' />
  //       <Button text="Danger" variant='danger' />
  //     </div>
  //     <div>
  //       <IconButton
  //         icon={<PlusIcon />}
  //         label="Add score"
  //         onClick={() => setImportScore(true)}
  //         variant='danger'
  //       />
  //     </div>
  //     <div
  //       css={css`
  //         display: flex;
  //         gap: 16px;
  //       `}
  //     >
  //       <ScoreCard
  //         item={{ type: 'score', score: dummyScore }}
  //         onClick={() => undefined}
  //       />
  //       <ScoreCard
  //         item={{ type: 'folder', folder: dummyFolder }}
  //         onClick={() => undefined}
  //       />
  //     </div>
  //     <div
  //       css={css`
  //         display: flex;
  //         width: 100%;
  //         flex-direction: column;
  //         background-color: ${theme.colors.surface};
  //       `}
  //     >
  //       <ScoreRow
  //         item={{ type: 'score', score: dummyScore }}
  //         onClick={() => undefined}
  //       />
  //       <div
  //         aria-hidden="true"
  //         css={css`
  //           width: 100%;
  //           height: 1px;
  //           background: ${theme.colors.divider};
  //         `}
  //       />
  //       <ScoreRow
  //         item={{ type: 'folder', folder: dummyFolder }}
  //         onClick={() => undefined}
  //       />
  //     </div>
  //   </div>
  // )

  return (
    <div>
      <PageHeader
        title="Library"
        actions={
          <>
            <IconButton
              icon={FilePlusIcon}
              label='Import New Score'
              variant='primary'
              onClick={() => setImportScore((isOpen) => !isOpen)}
            />
            <IconButton
              icon={mode === 'row' ? GridFourIcon : ListBulletsIcon}
              label='Change Display'
              onClick={() => {
                if (mode === 'grid') {
                  setMode('row')
                } else {
                  setMode('grid')
                }
              }}
            />
            <IconButton
              icon={XIcon}
              label='Quit Cadence'
              onClick={() => void handleQuit()}
              variant='danger'
            />
          </>
        }
      />

      {importScore && (
        <form onSubmit={handleImport}>
          <h1>Import score</h1>
          <label>
            Score file path
            <input readOnly required type="text" value={sourcePath} placeholder="Choose a score file" />
            <button type="button" onClick={handleChooseFile}>
              Choose file
            </button>
          </label>
          <label>
            Title
            <input value={title} onChange={(event) => setTitle(event.target.value)} />
          </label>
          <label>
            Composer
            <input value={composer} onChange={(event) => setComposer(event.target.value)} />
          </label>
          <label>
            Instrument
            <input value={instrument} onChange={(event) => setInstrument(event.target.value)} />
          </label>
          <label>
            Tags
            <input value={tags} onChange={(event) => setTags(event.target.value)} placeholder="practice, classical" />
          </label>
          <button disabled={isImporting} type="submit">
            {isImporting ? 'Importing...' : 'Import score'}
          </button>
          {successMessage && <p role="status">{successMessage}</p>}
          {errorMessage && <p role="alert">{errorMessage}</p>}
        </form>
      )}
      <LibraryList
        refreshToken={libraryRefreshToken}
        onSelectScore={setSelectedScoreId}
        mode={mode}
      />
    </div>
  )
}
