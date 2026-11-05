import { useState } from 'react'
import { css, keyframes } from '@emotion/react'
import { theme } from './theme'

interface ToastProps {
  message?: string
  type?: 'success' | 'error' | 'info'
  duration?: number
  onDismiss?: () => void
}

const toastLifecycle = (visibleAt: number, exitAt: number) => keyframes`
  0% {
    opacity: 0;
    transform: translateX(calc(100% + ${theme.spacing.large}));
  }

  ${visibleAt}% {
    opacity: 1;
    transform: translateX(0);
  }

  ${exitAt}% {
    opacity: 1;
    transform: translateX(0);
  }

  100% {
    opacity: 0;
    transform: translateX(calc(100% + ${theme.spacing.large}));
  }
`

const typeStyles = {
  success: {
    background: theme.colors.successSoft,
    color: theme.colors.success,
  },
  error: {
    background: theme.colors.dangerSoft,
    color: theme.colors.danger,
  },
  info: {
    background: theme.colors.infoSoft,
    color: theme.colors.info,
  },
} as const

export default function Toast({ message, type = 'info', duration = 4000, onDismiss }: ToastProps) {
  const [isVisible, setIsVisible] = useState(true)

  if (!message) return null
  if (!isVisible) return null

  const colors = typeStyles[type]
  const totalDuration = Math.max(220, duration + 220)
  const visibleAt = (220 / totalDuration) * 100
  const exitAt = (duration / totalDuration) * 100

  return (
    <div
      role={type === 'error' ? 'alert' : 'status'}
      css={css`
        position: fixed;
        z-index: 60;
        top: ${theme.spacing.large};
        right: ${theme.spacing.large};
        width: min(24rem, calc(100vw - 2 * ${theme.spacing.large}));
        padding: ${theme.spacing.medium} ${theme.spacing.large};
        border-radius: ${theme.radii.medium};
        color: ${colors.color};
        background: ${colors.background};
        box-shadow: ${theme.shadows.raisedSmall};
        font-weight: 600;
        line-height: 1.4;
        animation: ${toastLifecycle(visibleAt, exitAt)} ${totalDuration}ms ease both;
      `}
      onAnimationEnd={() => {
        setIsVisible(false)
        onDismiss?.()
      }}
    >
      {message}
    </div>
  )
}
