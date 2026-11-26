import { useEffect, useRef, useState, type DragEvent, type FormEvent, type KeyboardEvent } from 'react'
import { css } from '@emotion/react'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { theme } from './theme'
import FormInput from './FormInput'
import PopupMenu from './PopupMenu'

interface ImportScoreFormProps {
  sourcePath: string
  title: string
  instrument: string
  instrumentOptions: string[]
  tags: string
  tagOptions: string[]
  onTitleChange: (value: string) => void
  onInstrumentChange: (value: string) => void
  onTagsChange: (value: string) => void
  onChooseFile: () => void
  onFileSelected: (path: string) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}

const dropZoneStyles = (isDragging: boolean, hasFile: boolean) => css`
  display: flex;
  min-height: 8rem;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: ${theme.spacing.small};
  width: 100%;
  padding: ${theme.spacing.large};
  border: 1px dashed ${hasFile ? isDragging ? theme.colors.primary : theme.colors.borderStrong : 'transparent'};
  border-radius: ${theme.radii.medium};
  color: ${theme.colors.textSecondary};
  background: ${isDragging ? theme.colors.primarySoft : theme.colors.surface};
  box-shadow: ${hasFile ? 'none' : `inset 2px 2px 4px rgb(163 177 198 / 55%), inset -2px -2px 4px rgb(255 255 255 / 90%)`};
  font: inherit;
  text-align: center;
  cursor: pointer;
  transition: background 150ms ease, border-color 150ms ease, box-shadow 150ms ease;

  &:hover,
  &:focus-visible {
    border-color: ${hasFile ? theme.colors.primary : 'transparent'};
    background: ${theme.colors.primarySoft};
  }

  &:focus-visible {
    outline: 3px solid ${theme.colors.focus};
    outline-offset: 3px;
  }
`

export default function ImportScoreForm({
  sourcePath,
  title,
  instrument,
  instrumentOptions,
  tags,
  tagOptions,
  onTitleChange,
  onInstrumentChange,
  onTagsChange,
  onChooseFile,
  onFileSelected,
  onSubmit,
}: ImportScoreFormProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isInstrumentMenuOpen, setIsInstrumentMenuOpen] = useState(false)
  const [highlightedInstrumentIndex, setHighlightedInstrumentIndex] = useState(0)
  const [isTagMenuOpen, setIsTagMenuOpen] = useState(false)
  const [highlightedTagIndex, setHighlightedTagIndex] = useState(0)
  const instrumentAnchorRef = useRef<HTMLDivElement>(null)
  const tagAnchorRef = useRef<HTMLDivElement>(null)
  const instrumentSuggestions = instrumentOptions.filter((option) =>
    option.toLocaleLowerCase().includes(instrument.trim().toLocaleLowerCase()),
  )
  const tagInput = tags.slice(tags.lastIndexOf(',') + 1).trim()
  const committedTags = tags
    .split(',')
    .slice(0, -1)
    .map((tag) => tag.trim())
    .filter(Boolean)
  const enteredTags = tags
    .split(',')
    .map((tag) => tag.trim().toLocaleLowerCase())
    .filter(Boolean)
  const tagSuggestions = tagOptions.filter((option) =>
    !enteredTags.includes(option.toLocaleLowerCase()) &&
    option.toLocaleLowerCase().includes(tagInput.toLocaleLowerCase()),
  )

  useEffect(() => {
    let removeListener: (() => void) | undefined

    void getCurrentWindow().onDragDropEvent(({ payload }) => {
      if (payload.type === 'drop' && payload.paths.length > 0) {
        onFileSelected(payload.paths[0])
      }
    }).then((unlisten) => {
      removeListener = unlisten
    })

    return () => removeListener?.()
  }, [onFileSelected])

  function handleDrop(event: DragEvent<HTMLButtonElement>) {
    event.preventDefault()
    setIsDragging(false)

    const droppedFile = event.dataTransfer.files[0] as (File & { path?: string }) | undefined
    if (droppedFile?.path) onFileSelected(droppedFile.path)
  }

  function selectInstrument(option: string) {
    onInstrumentChange(option)
    setIsInstrumentMenuOpen(false)
    setHighlightedInstrumentIndex(0)
  }

  function handleInstrumentKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') {
      setIsInstrumentMenuOpen(false)
      return
    }

    if (!isInstrumentMenuOpen || instrumentSuggestions.length === 0) {
      if (event.key === 'ArrowDown' && instrument.trim() && instrumentSuggestions.length > 0) {
        event.preventDefault()
        setIsInstrumentMenuOpen(true)
      }
      return
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setHighlightedInstrumentIndex((index) => Math.min(index + 1, instrumentSuggestions.length - 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setHighlightedInstrumentIndex((index) => Math.max(index - 1, 0))
    } else if (event.key === 'Enter') {
      event.preventDefault()
      selectInstrument(instrumentSuggestions[highlightedInstrumentIndex])
    } else if (event.key === 'Tab') {
      selectInstrument(instrumentSuggestions[highlightedInstrumentIndex])
    }
  }

  function selectTag(option: string) {
    onTagsChange(`${[...committedTags, option].join(', ')}, `)
    setIsTagMenuOpen(false)
    setHighlightedTagIndex(0)
  }

  function addTypedTag() {
    const trimmedTag = tagInput.trim()
    if (!trimmedTag) return false

    onTagsChange(`${[...committedTags, trimmedTag].join(', ')}, `)
    setIsTagMenuOpen(false)
    setHighlightedTagIndex(0)
    return true
  }

  function removeTag(indexToRemove: number) {
    const nextTags = committedTags.filter((_, index) => index !== indexToRemove)
    onTagsChange(`${nextTags.join(', ')}${tagInput ? `${nextTags.length ? ', ' : ''}${tagInput}` : nextTags.length ? ', ' : ''}`)
  }

  function handleTagKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') {
      setIsTagMenuOpen(false)
      return
    }

    if (event.key === 'Enter' && (!isTagMenuOpen || tagSuggestions.length === 0)) {
      if (addTypedTag()) event.preventDefault()
      return
    }

    if (!isTagMenuOpen || tagSuggestions.length === 0) {
      if (event.key === 'ArrowDown' && tagInput) {
        event.preventDefault()
        setIsTagMenuOpen(true)
      }
      return
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setHighlightedTagIndex((index) => Math.min(index + 1, tagSuggestions.length - 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setHighlightedTagIndex((index) => Math.max(index - 1, 0))
    } else if (event.key === 'Enter' || event.key === 'Tab') {
      if (event.key === 'Enter') event.preventDefault()
      selectTag(tagSuggestions[highlightedTagIndex])
    }
  }

  return (
    <form id="import-score-form" onSubmit={onSubmit}>
      <button
        type="button"
        css={dropZoneStyles(isDragging, Boolean(sourcePath))}
        aria-label="Choose a score file"
        onClick={onChooseFile}
        onDragEnter={(event) => {
          event.preventDefault()
          setIsDragging(true)
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={(event) => {
          if (event.currentTarget === event.target) setIsDragging(false)
        }}
        onDrop={handleDrop}
      >
        <strong>{sourcePath ? getFileName(sourcePath) : 'Drop a score file here'}</strong>
        <span>{sourcePath ? 'Click to choose a different file' : 'or click to browse for a PDF or MusicXML file'}</span>
      </button>
      <div
        css={css`
          display: flex;
          gap: ${theme.spacing.large};
        `}
      >
        <FormInput label="Title" value={title} onChange={(event) => onTitleChange(event.target.value)} />
        <div
          ref={instrumentAnchorRef}
          css={css`
            position: relative;
            width: min(350px, 100%);
          `}
        >
          <FormInput
            label="Instrument"
            value={instrument}
            aria-controls="instrument-suggestions"
            aria-activedescendant={isInstrumentMenuOpen ? `instrument-suggestion-${highlightedInstrumentIndex}` : undefined}
            onKeyDown={handleInstrumentKeyDown}
            onFocus={() => {
              if (instrument.trim()) {
                setHighlightedInstrumentIndex(0)
                setIsInstrumentMenuOpen(true)
              }
            }}
            onChange={(event) => {
              onInstrumentChange(event.target.value)
              setHighlightedInstrumentIndex(0)
              setIsInstrumentMenuOpen(Boolean(event.target.value.trim()))
            }}
          />
          <PopupMenu
            open={isInstrumentMenuOpen && Boolean(instrument.trim()) && instrumentSuggestions.length > 0}
            onClose={() => setIsInstrumentMenuOpen(false)}
            anchorRef={instrumentAnchorRef}
            width="min(350px, calc(100vw - 16px))"
            fixed
          >
            <div
              id="instrument-suggestions"
              role="listbox"
              aria-label="Instrument suggestions"
              css={css`
                display: flex;
                flex-direction: column;
                padding: ${theme.spacing.xs};
              `}
            >
              {instrumentSuggestions.map((option, index) => (
                <button
                  key={option}
                  id={`instrument-suggestion-${index}`}
                  type="button"
                  role="option"
                  aria-selected={index === highlightedInstrumentIndex}
                  onClick={() => selectInstrument(option)}
                  css={css`
                    width: 100%;
                    padding: ${theme.spacing.small} ${theme.spacing.medium};
                    border: 0;
                    border-radius: ${theme.radii.small};
                    color: ${theme.colors.textPrimary};
                    background: transparent;
                    font: inherit;
                    text-align: left;
                    cursor: pointer;

                    &:hover,
                    &:focus-visible {
                      background: ${theme.colors.surfaceSubtle};
                      outline: none;
                    }

                    &[aria-selected="true"] {
                      background: ${theme.colors.surfaceSubtle};
                    }
                  `}
                >
                  {option}
                </button>
              ))}
            </div>
          </PopupMenu>
        </div>
      </div>
      <div
        ref={tagAnchorRef}
        css={css`
          position: relative;
          width: 100%;
        `}
      >
        <div
          css={css`
            display: flex;
            width: 100%;
            min-height: 48px;
            flex-wrap: wrap;
            align-items: center;
            gap: ${theme.spacing.xs};
            padding: ${theme.spacing.xs} ${theme.spacing.medium};
            border-radius: ${theme.radii.medium};
            background: ${theme.colors.surface};
            box-shadow: inset 2px 2px 4px rgb(163 177 198 / 55%), inset -2px -2px 4px rgb(255 255 255 / 90%);

            &:focus-within {
              outline: 3px solid rgb(76 141 255 / 35%);
              outline-offset: 2px;
            }
          `}
        >
          {committedTags.map((tag, index) => (
            <button
              key={`${tag}-${index}`}
              type="button"
              aria-label={`Remove tag ${tag}`}
              onClick={() => removeTag(index)}
              css={css`
                display: inline-flex;
                align-items: center;
                gap: ${theme.spacing.xs};
                padding: 0.25rem ${theme.spacing.small};
                border: 1px solid ${theme.colors.borderStrong};
                border-radius: ${theme.radii.small};
                color: ${theme.colors.textPrimary};
                background: ${theme.colors.surfaceSubtle};
                font: inherit;
                font-size: 0.8125rem;
                cursor: pointer;

                &:hover,
                &:focus-visible {
                  border-color: ${theme.colors.primary};
                  background: ${theme.colors.primarySoft};
                  outline: none;
                }
              `}
            >
              <span>{tag}</span>
              <span aria-hidden="true">×</span>
            </button>
          ))}
          <FormInput
            label="Tags (e.g. practice, classical)"
            value={tagInput}
            fullWidth
            hideOnFocus
            aria-controls="tag-suggestions"
            aria-activedescendant={isTagMenuOpen ? `tag-suggestion-${highlightedTagIndex}` : undefined}
            onKeyDown={handleTagKeyDown}
            onFocus={() => {
              if (tagInput) {
                setHighlightedTagIndex(0)
                setIsTagMenuOpen(true)
              }
            }}
            onChange={(event) => {
              const nextInput = event.target.value
              onTagsChange(`${committedTags.join(', ')}${committedTags.length ? ', ' : ''}${nextInput}`)
              setHighlightedTagIndex(0)
              setIsTagMenuOpen(Boolean(nextInput.trim()))
            }}
            css={css`
              flex: 1 1 12rem;
              min-width: 12rem;
              margin: 0;
              padding-left: 0;
              background: transparent;
              box-shadow: none;

              &:focus {
                background: transparent;
                box-shadow: none;
              }
            `}
          />
        </div>
        <PopupMenu
          open={isTagMenuOpen && Boolean(tagInput) && tagSuggestions.length > 0}
          onClose={() => setIsTagMenuOpen(false)}
          anchorRef={tagAnchorRef}
          width="min(350px, calc(100vw - 16px))"
          fixed
        >
          <div
            id="tag-suggestions"
            role="listbox"
            aria-label="Tag suggestions"
            css={css`
              display: flex;
              flex-direction: column;
              padding: ${theme.spacing.xs};
            `}
          >
            {tagSuggestions.map((option, index) => (
              <button
                key={option}
                id={`tag-suggestion-${index}`}
                type="button"
                role="option"
                aria-selected={index === highlightedTagIndex}
                onClick={() => selectTag(option)}
                css={css`
                  width: 100%;
                  padding: ${theme.spacing.small} ${theme.spacing.medium};
                  border: 0;
                  border-radius: ${theme.radii.small};
                  color: ${theme.colors.textPrimary};
                  background: transparent;
                  font: inherit;
                  text-align: left;
                  cursor: pointer;

                  &:hover,
                  &:focus-visible,
                  &[aria-selected="true"] {
                    background: ${theme.colors.surfaceSubtle};
                    outline: none;
                  }
                `}
              >
                {option}
              </button>
            ))}
          </div>
        </PopupMenu>
      </div>
    </form>
  )
}

function getFileName(path: string) {
  return path.split(/[\\/]/).pop() ?? path
}
