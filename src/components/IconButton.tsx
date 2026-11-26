import type { ButtonHTMLAttributes } from 'react'
import { css } from '@emotion/react'
import type { Icon } from '@phosphor-icons/react'
import { type ButtonSize, type ButtonVariant } from './Button'
import { getIconButtonStyles, theme } from './theme'

const iconChangeStyles = css`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  animation: icon-button-change 160ms ease-out;

  @keyframes icon-button-change {
    from {
      opacity: 0;
      transform: scale(0.7);
    }

    to {
      opacity: 1;
      transform: scale(1);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`

const iconKeys = new WeakMap<object, string>()
let nextIconKey = 0

function getIconKey(icon: Icon) {
  const iconObject = icon as unknown as object
  let key = iconKeys.get(iconObject)

  if (!key) {
    key = `icon-${nextIconKey}`
    nextIconKey += 1
    iconKeys.set(iconObject, key)
  }

  return key
}

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: Icon
  label: string
  size?: ButtonSize
  variant?: ButtonVariant
  loading?: boolean
  pressed?: boolean
  isDropTarget?: boolean
  onClick: () => void
}

export default function IconButton({
  icon: IconComponent,
  label,
  size = 'md',
  variant = 'primary',
  loading = false,
  pressed = false,
  isDropTarget = false,
  disabled = false,
  type = 'button',
  onClick,
  ...buttonProps
}: IconButtonProps) {
  const isDisabled = disabled || loading

  return (
    <button
      {...buttonProps}
      type={type}
      disabled={isDisabled}
      aria-label={label}
      aria-busy={loading || undefined}
      aria-pressed={pressed || undefined}
      data-tooltip={label}
      onContextMenu={(event) => {
        event.preventDefault()
        buttonProps.onContextMenu?.(event)
      }}
      onClick={onClick}
      css={[
        getIconButtonStyles({ variant, size, disabled: isDisabled }),
        isDropTarget && css`
          outline: 3px solid ${theme.colors.focus};
          outline-offset: 3px;
        `,
      ]}
    >
      <span key={getIconKey(IconComponent)} css={iconChangeStyles} aria-hidden="true">
        <IconComponent color="currentColor" size="1.25em" weight="bold" />
      </span>
    </button>
  )
}
