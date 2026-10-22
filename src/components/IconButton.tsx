import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { type ButtonSize, type ButtonVariant } from './Button'
import { getIconButtonStyles } from './theme'

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode
  label: string
  size?: ButtonSize
  variant?: ButtonVariant
  loading?: boolean
  pressed?: boolean
}

export default function IconButton({
  icon,
  label,
  size = 'md',
  variant = 'primary',
  loading = false,
  pressed = false,
  disabled = false,
  type = 'button',
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
      css={getIconButtonStyles({ variant, size, disabled: isDisabled })}
    >
      {icon}
    </button>
  )
}
