import { css } from '@emotion/react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { theme } from './theme'

type ButtonVariant = 'primary' | 'secondary' | 'danger'
type Sizes = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  text?: string
  children?: ReactNode
  variant?: ButtonVariant
  size?: Sizes
  loading?: boolean
  pressed?: boolean
}

function getRaisedShadow(size: Sizes, variant: ButtonVariant) {
  const shadow = theme.button.shadowSizes[size]
  const outerShadow = `-${shadow.offset} -${shadow.offset} ${shadow.blur} rgb(255 255 255 / 95%), ${shadow.offset} ${shadow.offset} ${shadow.blur} rgb(80 88 100 / 45%)`

  if (variant === 'danger') {
    return `${outerShadow}, inset -${shadow.insetOffset} -${shadow.insetOffset} ${shadow.insetBlur} rgb(120 25 37 / 30%), inset ${shadow.insetOffset} ${shadow.insetOffset} ${shadow.insetBlur} rgb(255 145 155 / 70%)`
  }

  return `${outerShadow}, inset -${shadow.insetOffset} -${shadow.insetOffset} ${shadow.insetBlur} rgb(80 88 100 / 22%), inset ${shadow.insetOffset} ${shadow.insetOffset} ${shadow.insetBlur} rgb(255 255 255 / 100%)`
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
  const colors = theme.button.variants[variant]
  const height = theme.button.sizeHeights[size]
  const fontSize = theme.button.sizeFontSizes[size]
  const raisedShadow = getRaisedShadow(size, variant)
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
      css={css`
        min-height: ${height};
        padding: ${theme.spacing.medium} ${theme.spacing.large};
        border: none;
        border-radius: ${theme.radii.medium};
        color: ${colors.color};
        background: ${colors.background};
        font: inherit;
        font-size: ${fontSize};
        font-weight: 700;
        line-height: 1.2;
        cursor: ${isDisabled ? 'not-allowed' : 'pointer'};
        touch-action: manipulation;
        user-select: none;
        -webkit-touch-callout: none;
        box-shadow: ${raisedShadow};
        transition: background 150ms ease, box-shadow 150ms ease, transform 150ms ease, opacity 150ms ease;

        &:hover:not(:disabled) {
          background: ${colors.hoverBackground};
          transform: none;
        }

        &:active:not(:disabled) {
          background: ${colors.pressedBackground};
          transform: translateY(1px);
          box-shadow: ${colors.pressedShadow};
        }

        &:focus-visible {
          outline: 3px solid ${theme.colors.focus};
          outline-offset: 3px;
        }

        &[aria-pressed="true"] {
          box-shadow: ${colors.pressedShadow};
          transform: translateY(2px);
        }

        &:disabled {
          cursor: not-allowed;
          opacity: 0.55;
          box-shadow: none;
          transform: none;
        }

        &[aria-busy="true"] {
          cursor: wait;
        }
      `}
    >
      {loading && <span aria-hidden="true"></span>}
      {children ?? text}
    </button>
  )
}
