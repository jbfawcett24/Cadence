import { useState } from 'react'
import type { FormEvent } from 'react'
import { open } from '@tauri-apps/plugin-dialog'
import { getCurrentWindow } from '@tauri-apps/api/window'
import PageHeader from './components/PageHeader'
import { createFrontendApi } from './app/frontendApi'
import LibraryList from './components/LibraryList'
import ScoreReader from './components/ScoreReader'

const cadence = createFrontendApi()

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

  return (
    <div>
      <PageHeader
        title="Library"
        actions={
          <>
            <button type="button" onClick={() => setImportScore((isOpen) => !isOpen)}>
              {importScore ? 'Close import' : 'Import score'}
            </button>
            <button type="button" onClick={() => void handleQuit()}>
              Quit
            </button>
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
      />
    </div>
  )
}
