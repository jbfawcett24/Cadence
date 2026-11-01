import type { ButtonHTMLAttributes } from 'react'
import type { Icon } from '@phosphor-icons/react'
import { type ButtonSize, type ButtonVariant } from './Button'
import { getIconButtonStyles } from './theme'

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: Icon
  label: string
  size?: ButtonSize
  variant?: ButtonVariant
  loading?: boolean
  pressed?: boolean
  onClick: () => void
}

export default function IconButton({
  icon: IconComponent,
  label,
  size = 'md',
  variant = 'primary',
  loading = false,
  pressed = false,
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
      css={getIconButtonStyles({ variant, size, disabled: isDisabled })}
    >
      <IconComponent color="currentColor" size="1.25em" weight="bold" aria-hidden="true" />
    </button>
  )
}
