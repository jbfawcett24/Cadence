import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { getButtonStyles, type ButtonSize, type ButtonVariant } from './theme'

export type { ButtonSize, ButtonVariant } from './theme'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  text?: string
  children?: ReactNode
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  pressed?: boolean
}

export default function Button({
  text,
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  pressed = false,
  disabled = false,
  type = 'button',
  ...buttonProps
}: ButtonProps) {
  const isDisabled = disabled || loading

  return (
    <button
      {...buttonProps}
      type={type}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      aria-pressed={pressed || undefined}
      onContextMenu={(event) => {
        event.preventDefault()
        buttonProps.onContextMenu?.(event)
      }}
      css={getButtonStyles({ variant, size, disabled: isDisabled })}
    >
      {loading && <span aria-hidden="true"></span>}
      {children ?? text}
    </button>
  )
}
