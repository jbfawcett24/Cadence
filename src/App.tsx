import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { open } from '@tauri-apps/plugin-dialog'
import { getCurrentWindow } from '@tauri-apps/api/window'
import PageHeader from './components/PageHeader'
import { createFrontendApi } from './app/frontendApi'
import LibraryList from './components/LibraryList'
import ScoreReader from './components/ScoreReader'
import IconButton from './components/IconButton'
import { FilePlusIcon, GridFourIcon, ListBulletsIcon, XIcon } from '@phosphor-icons/react'
import Modal from './components/Modal.tsx'
import Button from './components/Button.tsx'
import ImportScoreForm from './components/ImportScoreForm'
import Toast from './components/Toast'

const cadence = createFrontendApi()

export default function App() {
  const [importScore, setImportScore] = useState(false)
  const [sourcePath, setSourcePath] = useState('')
  const [title, setTitle] = useState('')
  const [instrument, setInstrument] = useState('')
  const [tags, setTags] = useState('')
  const [isImporting, setIsImporting] = useState(false)
  const [libraryRefreshToken, setLibraryRefreshToken] = useState(0)
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null)
  const [instrumentOptions, setInstrumentOptions] = useState<string[]>([])
  const [selectedScoreId, setSelectedScoreId] = useState<string>()
  const [successMessage, setSuccessMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [mode, setMode] = useState<'grid' | 'row'>('grid')

  const handleCurrentFolderChange = useCallback((folderId: string | null) => {
    setCurrentFolderId(folderId)
  }, [])

  useEffect(() => {
    let cancelled = false

    void cadence.services.library.listScores().then((scores) => {
      if (cancelled) return

      const instruments = [...new Set(
        scores
          .map((score) => score.instrument?.trim())
          .filter((instrument): instrument is string => Boolean(instrument)),
      )].sort((first, second) => first.localeCompare(second))

      setInstrumentOptions(instruments)
    })

    return () => {
      cancelled = true
    }
  }, [libraryRefreshToken])

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

  function handleFileSelected(path: string) {
    setSourcePath(path)
    setErrorMessage('')
  }

  function clearImportForm() {
    setSourcePath('')
    setTitle('')
    setInstrument('')
    setTags('')
    setSuccessMessage('')
    setErrorMessage('')
  }

  function handleCloseImport() {
    setImportScore(false)
    clearImportForm()
  }

  async function handleImport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!sourcePath) {
      setErrorMessage('Choose a score file before importing.')
      return
    }

    setIsImporting(true)
    setSuccessMessage('')
    setErrorMessage('')

    try {
      const score = await cadence.importScore(sourcePath, {
        title: title || undefined,
        instrument: instrument || undefined,
        tags: tags.split(',').map((tag) => tag.trim()).filter(Boolean),
        folderId: currentFolderId,
      })
      setSuccessMessage('Imported "' + score.title + '" successfully.')
      setImportScore(false)
      setLibraryRefreshToken((token) => token + 1)
      setSourcePath('')
      setTitle('')
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
      <Toast
        key={errorMessage || successMessage}
        message={errorMessage || successMessage}
        type={errorMessage ? 'error' : 'success'}
        onDismiss={() => {
          setErrorMessage('')
          setSuccessMessage('')
        }}
      />
      <PageHeader
        title="Library"
        actions={
          <>
            <IconButton
              icon={FilePlusIcon}
              label='Import New Score'
              variant='primary'
              onClick={() => {
                if (importScore) {
                  handleCloseImport()
                } else {
                  setImportScore(true)
                }
              }}
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

      <Modal
        open={importScore}
        title="Import score"
        onClose={handleCloseImport}
        actions={
          <>
            <Button
              variant="danger"
              disabled={isImporting}
              onClick={handleCloseImport}
            >
              Cancel
            </Button>
            <Button
              form="import-score-form"
              type="submit"
              loading={isImporting}
            >
              {isImporting ? 'Importing...' : 'Import score'}
            </Button>
          </>
        }
      >
        <ImportScoreForm
          sourcePath={sourcePath}
          title={title}
          instrument={instrument}
          instrumentOptions={instrumentOptions}
          tags={tags}
          onTitleChange={setTitle}
          onInstrumentChange={setInstrument}
          onTagsChange={setTags}
          onChooseFile={() => void handleChooseFile()}
          onFileSelected={handleFileSelected}
          onSubmit={handleImport}
        />
      </Modal>
      <LibraryList
        refreshToken={libraryRefreshToken}
        onSelectScore={setSelectedScoreId}
        onCurrentFolderChange={handleCurrentFolderChange}
        mode={mode}
      />
    </div>
  )
}
