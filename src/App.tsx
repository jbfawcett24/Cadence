import { useCallback, useEffect, useState } from 'react'
import type { DragEvent, FormEvent } from 'react'
import { open } from '@tauri-apps/plugin-dialog'
import { getCurrentWindow } from '@tauri-apps/api/window'
import PageHeader from './components/PageHeader'
import { createFrontendApi } from './app/frontendApi'
import LibraryList from './components/LibraryList'
import ScoreReader from './components/ScoreReader'
import IconButton from './components/IconButton'
import { ArrowBendUpLeftIcon, FilePlusIcon, FolderPlusIcon, GridFourIcon, ListBulletsIcon, XIcon } from '@phosphor-icons/react'
import Modal from './components/Modal.tsx'
import Button from './components/Button.tsx'
import ImportScoreForm from './components/ImportScoreForm'
import Toast from './components/Toast'
import FormInput from './components/FormInput'
import type { LibraryFolderNode } from './shared/types'

const cadence = createFrontendApi()

export default function App() {
  const [importScore, setImportScore] = useState(false)
  const [createFolder, setCreateFolder] = useState(false)
  const [folderName, setFolderName] = useState('')
  const [isCreatingFolder, setIsCreatingFolder] = useState(false)
  const [sourcePath, setSourcePath] = useState('')
  const [title, setTitle] = useState('')
  const [instrument, setInstrument] = useState('')
  const [tags, setTags] = useState('')
  const [isImporting, setIsImporting] = useState(false)
  const [libraryRefreshToken, setLibraryRefreshToken] = useState(0)
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null)
  const [folderPath, setFolderPath] = useState<LibraryFolderNode[]>([])
  const [instrumentOptions, setInstrumentOptions] = useState<string[]>([])
  const [tagOptions, setTagOptions] = useState<string[]>([])
  const [selectedScoreId, setSelectedScoreId] = useState<string>()
  const [successMessage, setSuccessMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [mode, setMode] = useState<'grid' | 'row'>('grid')
  const [isBackDropTarget, setIsBackDropTarget] = useState(false)

  const handleCurrentFolderChange = useCallback((folderId: string | null) => {
    setCurrentFolderId(folderId)
  }, [])

  function handleBack() {
    const nextPath = folderPath.slice(0, -1)
    setFolderPath(nextPath)
    setCurrentFolderId(nextPath.at(-1)?.folder.id ?? null)
  }

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

      const tags = [...new Set(
        scores
          .flatMap((score) => score.tags)
          .map((tag) => tag.trim())
          .filter(Boolean),
      )].sort((first, second) => first.localeCompare(second))

      setTagOptions(tags)
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

  function handleCloseCreateFolder() {
    setCreateFolder(false)
    setFolderName('')
  }

  async function handleCreateFolder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const name = folderName.trim()
    if (!name) {
      setErrorMessage('Enter a folder name before creating the folder.')
      return
    }

    setIsCreatingFolder(true)
    setErrorMessage('')

    try {
      const now = new Date().toISOString()
      await cadence.services.library.createFolder({
        id: crypto.randomUUID(),
        name,
        parentId: currentFolderId,
        createdAt: now,
        updatedAt: now,
      })
      setSuccessMessage(`Created folder "${name}" successfully.`)
      handleCloseCreateFolder()
      setLibraryRefreshToken((token) => token + 1)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'The folder could not be created.')
    } finally {
      setIsCreatingFolder(false)
    }
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

  async function handleMoveScore(scoreId: string, folderId: string | null) {
    try {
      await cadence.services.library.moveScore(scoreId, folderId)
      setSuccessMessage('Score moved successfully.')
      setLibraryRefreshToken((token) => token + 1)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'The score could not be moved.')
      throw error
    }
  }

  async function handleMoveFolder(folderId: string, parentId: string | null) {
    try {
      await cadence.services.library.moveFolder(folderId, parentId)
      setSuccessMessage('Folder moved successfully.')
      setLibraryRefreshToken((token) => token + 1)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'The folder could not be moved.')
      throw error
    }
  }

  function getDraggedItem(event: DragEvent<HTMLButtonElement>) {
    const [type, id] = event.dataTransfer.getData('text/plain').split(':')
    if ((!type || !id) || (type !== 'score' && type !== 'folder')) return undefined
    return { type, id } as const
  }

  function handleBackDragOver(event: DragEvent<HTMLButtonElement>) {
    if (folderPath.length === 0 || event.dataTransfer.types.length === 0) return
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
    setIsBackDropTarget(true)
  }

  function handleBackDragLeave() {
    setIsBackDropTarget(false)
  }

  async function handleBackDrop(event: DragEvent<HTMLButtonElement>) {
    event.preventDefault()
    setIsBackDropTarget(false)
    if (folderPath.length === 0) return

    const draggedItem = getDraggedItem(event)
    const parentId = folderPath.at(-2)?.folder.id ?? null
    if (!draggedItem) return

    if (draggedItem.type === 'score') await handleMoveScore(draggedItem.id, parentId)
    else await handleMoveFolder(draggedItem.id, parentId)
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
            {currentFolderId !== null && (
              <IconButton
                icon={ArrowBendUpLeftIcon}
                label='Back'
                variant='primary'
                onDragOver={handleBackDragOver}
                onDragLeave={handleBackDragLeave}
                onDrop={(event) => void handleBackDrop(event).catch(() => {})}
                onClick={handleBack}
                isDropTarget={isBackDropTarget}
              />
            )}
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
              icon={FolderPlusIcon}
              label="Create New Folder"
              onClick={() => setCreateFolder(true)}
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
          tagOptions={tagOptions}
          onTitleChange={setTitle}
          onInstrumentChange={setInstrument}
          onTagsChange={setTags}
          onChooseFile={() => void handleChooseFile()}
          onFileSelected={handleFileSelected}
          onSubmit={handleImport}
        />
      </Modal>
      <Modal
        open={createFolder}
        title="Create folder"
        onClose={handleCloseCreateFolder}
        actions={
          <>
            <Button
              variant="danger"
              disabled={isCreatingFolder}
              onClick={handleCloseCreateFolder}
            >
              Cancel
            </Button>
            <Button
              form="create-folder-form"
              type="submit"
              loading={isCreatingFolder}
            >
              {isCreatingFolder ? 'Creating...' : 'Create folder'}
            </Button>
          </>
        }
      >
        <form id="create-folder-form" onSubmit={handleCreateFolder}>
          <FormInput
            label="Folder name"
            value={folderName}
            onChange={(event) => setFolderName(event.target.value)}
            autoFocus
            fullWidth
          />
        </form>
      </Modal>
      <LibraryList
        refreshToken={libraryRefreshToken}
        onSelectScore={setSelectedScoreId}
        onCurrentFolderChange={handleCurrentFolderChange}
        folderPath={folderPath}
        onFolderPathChange={setFolderPath}
        onMoveScore={handleMoveScore}
        onMoveFolder={handleMoveFolder}
        onDraggingChange={(isDragging) => {
          if (!isDragging) setIsBackDropTarget(false)
        }}
        mode={mode}
      />
    </div>
  )
}
