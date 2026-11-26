import { useRef, useState, type DragEventHandler } from 'react'
import type { Folder, Score } from '../shared/types'
import {
  CopyIcon,
  DotsThreeOutlineVerticalIcon,
  FolderIcon,
  PencilSimpleIcon,
  ScrollIcon,
  TrashIcon,
} from '@phosphor-icons/react'
import { css } from '@emotion/react'
import { theme } from './theme'
import MenuOverlay from './MenuOverlay'

export type ScoreCardActions = {
  onRename?: () => void
  onDuplicate?: () => void
  onDelete?: () => void
}

export interface ScoreCardDragProps {
  draggable?: boolean
  onDragStart?: DragEventHandler<HTMLDivElement>
  onDragEnd?: DragEventHandler<HTMLDivElement>
  onDragOver?: DragEventHandler<HTMLDivElement>
  onDragLeave?: DragEventHandler<HTMLDivElement>
  onDrop?: DragEventHandler<HTMLDivElement>
  isDropTarget?: boolean
}

export type ScoreCardProps =
  | ScoreCardDragProps & {
    item: { type: 'score'; score: Score }
    onClick?: () => void
    onRename?: ScoreCardActions['onRename']
    onDuplicate?: ScoreCardActions['onDuplicate']
    onDelete?: ScoreCardActions['onDelete']
  }
  | ScoreCardDragProps & {
    item: { type: 'folder'; folder: Folder }
    onClick?: () => void
    onRename?: ScoreCardActions['onRename']
    onDuplicate?: ScoreCardActions['onDuplicate']
    onDelete?: ScoreCardActions['onDelete']
  }

export default function ScoreCard({
  item,
  onClick,
  onRename,
  onDuplicate,
  onDelete,
  draggable,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop,
  isDropTarget = false,
}: ScoreCardProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const menuButtonRef = useRef<HTMLButtonElement>(null)

  const menuItems = [
    {
      name: 'Rename',
      icon: PencilSimpleIcon,
      onClick: () => {
        setIsMenuOpen(false)
        onRename?.()
      },
    },
    ...(item.type === 'score'
      ? [{
        name: 'Duplicate',
        icon: CopyIcon,
        onClick: () => {
          setIsMenuOpen(false)
          onDuplicate?.()
        },
      }]
      : []),
    {
      name: 'Delete',
      danger: true,
      icon: TrashIcon,
      onClick: () => {
        setIsMenuOpen(false)
        onDelete?.()
      },
    },
  ]

  return (
    <div
      data-score-card
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      css={css`
        position: relative;
        z-index: ${isMenuOpen ? 10 : 0};
        isolation: isolate;
        display: flex;
        min-width: 180px;
        min-height: 180px;
        padding: ${theme.spacing.large};
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: ${theme.spacing.medium};
        border: none;
        border-radius: ${theme.radii.medium};
        color: ${theme.colors.textPrimary};
        background: ${theme.colors.surface};
        font: inherit;
        cursor: pointer;
        touch-action: manipulation;
        user-select: none;
        box-shadow: ${theme.shadows.raised};
        outline: ${isDropTarget ? `3px solid ${theme.colors.focus}` : 'none'};
        outline-offset: 3px;
        transition: background 150ms ease, box-shadow 150ms ease, transform 150ms ease, outline-color 150ms ease;

        &:hover {
          background: ${theme.colors.surfaceSubtle};
          transform: none;
        }

        &:has([data-card-content]:active) {
          background: ${theme.colors.surfacePressed};
          box-shadow: ${theme.shadows.pressed};
          transform: translateY(1px);

          [data-menu-trigger] {
            opacity: 0;
          }

          &::after {
            opacity: 1;
          }
        }

        &::after {
          position: absolute;
          z-index: 2;
          inset: 0;
          border-radius: inherit;
          box-shadow: ${theme.shadows.pressed};
          content: '';
          opacity: 0;
          pointer-events: none;
          transition: opacity 150ms ease;
        }
      `}
    >
      <button
        data-menu-trigger
        ref={menuButtonRef}
        type="button"
        aria-label="Open card menu"
        aria-expanded={isMenuOpen}
        css={css`
          position: absolute;
          top: 8px;
          right: 8px;
          display: flex;
          padding: 4px;
          border: none;
          border-radius: ${theme.radii.small};
          color: inherit;
          background: ${theme.colors.surfaceSubtle};
          cursor: pointer;
          opacity: 0;
          box-shadow: none;
          transition: opacity 150ms ease, background 150ms ease, box-shadow 150ms ease, transform 150ms ease;

          [data-score-card]:hover & {
            opacity: 1;
          }

          &:hover {
            background: ${theme.colors.surface};
            box-shadow: 5px 5px 10px rgb(163 177 198 / 70%);
            transform: translateY(-1px);
          }

          &:active {
            background: ${theme.colors.surfacePressed};
            box-shadow: ${theme.shadows.pressed};
            transform: translateY(1px);
          }

          &:focus-visible {
            outline: 3px solid ${theme.colors.focus};
            outline-offset: 2px;
          }
        `}
        onClick={() => setIsMenuOpen((open) => !open)}
      >
        <DotsThreeOutlineVerticalIcon />
      </button>
      <button
        data-card-content
        type="button"
        onClick={onClick}
        css={css`
          display: flex;
          width: 100%;
          height: 100%;
          padding: 0;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: ${theme.spacing.medium};
          border: none;
          color: inherit;
          background: transparent;
          font: inherit;
          cursor: pointer;

          &:active {
            transform: translateY(1px);
          }

          &:focus-visible {
            outline: 3px solid ${theme.colors.focus};
            outline-offset: 3px;
          }
        `}
      >
        <span
          aria-hidden="true"
          css={css`
          display: grid;
          width: 84px;
          height: 84px;
          place-items: center;

          svg {
            width: 100%;
            height: 100%;
          }
          `}
        >
          {item.type === 'score' ? <ScrollIcon /> : <FolderIcon />}
        </span>
        <p
          css={css`
            margin: 0;
            color: ${theme.colors.secondary};
          `}
        >
          {item.type === 'score' ? item.score.title : item.folder.name}
        </p>
      </button>
      <MenuOverlay
        open={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        anchorRef={menuButtonRef}
        items={menuItems}
      />
    </div>
  )
}
