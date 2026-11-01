import { useRef, useState } from 'react'
import {
  CopyIcon,
  DotsThreeOutlineVerticalIcon,
  FolderIcon,
  PencilSimpleIcon,
  ScrollIcon,
  TrashIcon,
} from '@phosphor-icons/react'
import { css } from '@emotion/react'
import MenuOverlay from './MenuOverlay'
import type { ScoreCardProps } from './ScoreCard'
import { theme } from './theme'

export default function ScoreRow({
  item,
  onClick,
  onRename,
  onDuplicate,
  onDelete,
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
      data-score-row
      css={css`
        position: relative;
        z-index: ${isMenuOpen ? 10 : 0};
        display: flex;
        width: 98%;
        min-height: 64px;
        align-items: center;
        align-self: center;
        gap: ${theme.spacing.medium};
        padding: ${theme.spacing.small} ${theme.spacing.medium};
        border-radius: ${theme.radii.medium};
        color: ${theme.colors.textPrimary};
        background: ${theme.colors.surface};
        box-shadow: none;
        transform: translateY(0);
        transition: background 150ms ease, box-shadow 150ms ease, transform 150ms ease;

        &:hover {
          background: ${theme.colors.surfaceSubtle};
          box-shadow: ${theme.shadows.raised};
          transform: translateY(-5px);
        }

        &:has([data-row-content]:active) {
          background: ${theme.colors.surfacePressed};
          box-shadow: ${theme.shadows.pressed};
          transform: translateY(0);
        }
      `}
    >
      <span
        aria-hidden="true"
        css={css`
          display: grid;
          flex: 0 0 auto;
          width: 36px;
          height: 36px;
          place-items: center;

          svg {
            width: 100%;
            height: 100%;
          }
        `}
      >
        {item.type === 'score' ? <ScrollIcon /> : <FolderIcon />}
      </span>

      <button
        data-row-content
        type="button"
        onClick={onClick}
        css={css`
          flex: 1;
          min-width: 0;
          padding: ${theme.spacing.small} 0;
          border: none;
          color: inherit;
          background: transparent;
          font: inherit;
          text-align: left;
          cursor: pointer;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          color: ${theme.colors.secondary};

          &:focus-visible {
            outline: 3px solid ${theme.colors.focus};
            outline-offset: 3px;
          }
        `}
      >
        {item.type === 'score' ? item.score.title : item.folder.name}
      </button>

      <button
        ref={menuButtonRef}
        type="button"
        aria-label="Open row menu"
        aria-expanded={isMenuOpen}
        onClick={() => setIsMenuOpen((open) => !open)}
        css={css`
          display: flex;
          flex: 0 0 auto;
          padding: 4px;
          border: none;
          border-radius: ${theme.radii.small};
          color: inherit;
          background: transparent;
          cursor: pointer;
          transition: opacity 150ms ease, background 150ms ease, box-shadow 150ms ease, transform 150ms ease;

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
      >
        <DotsThreeOutlineVerticalIcon />
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
