import type { Icon } from '@phosphor-icons/react'
import { css, keyframes } from '@emotion/react'
import PopupMenu, { type PopupMenuProps } from './PopupMenu'
import { theme } from './theme'

export interface MenuItem {
  name: string
  danger?: boolean
  icon: Icon
  onClick: () => void
}

interface MenuOverlayProps extends Omit<PopupMenuProps, 'children'> {
  items: MenuItem[]
}

const fadeIn = keyframes`
  from {
    opacity: 0;
    transform: translateY(-4px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
`

export default function MenuOverlay({ items, ...popupMenuProps }: MenuOverlayProps) {
  return (
    <PopupMenu {...popupMenuProps}>
      {items.map((item, index) => {
        const IconComponent = item.icon

        return (
          <button
            key={item.name}
            type="button"
            onClick={item.onClick}
            data-danger={item.danger}
            css={css`
              display: flex;
              width: 100%;
              align-items: center;
              gap: ${theme.spacing.small};
              padding: ${theme.spacing.small} ${theme.spacing.medium};
              border: none;
              border-radius: ${theme.radii.small};
              color: ${item.danger ? theme.colors.danger : theme.colors.textPrimary};
              background: transparent;
              font: inherit;
              text-align: left;
              cursor: pointer;
              opacity: 0;
              animation: ${fadeIn} 160ms ease forwards;
              animation-delay: ${index * 40}ms;
              transition: background 120ms ease, color 120ms ease, transform 120ms ease;

              &:hover {
                color: ${item.danger ? theme.colors.danger : theme.colors.textPrimary};
                background: ${item.danger ? theme.colors.dangerSoft : theme.colors.surfaceSubtle};
              }

              &:active {
                background: ${item.danger ? theme.colors.dangerSoft : theme.colors.surfacePressed};
                transform: translateY(1px);
              }

              &:focus-visible {
                outline: 3px solid ${theme.colors.focus};
                outline-offset: -2px;
              }
            `}
          >
            <IconComponent size={18} />
            <span>{item.name}</span>
          </button>
        )
      })}
    </PopupMenu>
  )
}
