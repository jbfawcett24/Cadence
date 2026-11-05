import { useEffect, useId, useState, type ReactNode } from 'react'
import { css, keyframes } from '@emotion/react'
import { XIcon } from '@phosphor-icons/react'
import IconButton from './IconButton'
import { theme } from './theme'

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`

const fadeOut = keyframes`
  from { opacity: 1; }
  to { opacity: 0; }
`

const slideUp = keyframes`
  from { transform: translateY(12px); }
  to { transform: translateY(0); }
`

const slideDown = keyframes`
  from { transform: translateY(0); }
  to { transform: translateY(12px); }
`

interface ModalProps {
  open: boolean
  title: string
  actions: ReactNode
  children: ReactNode
  onClose: () => void
}

export default function Modal({ open, title, actions, children, onClose }: ModalProps) {
  const titleId = useId()
  const [isMounted, setIsMounted] = useState(open)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (open) {
      setIsMounted(true)
      setIsVisible(true)
      return
    }

    setIsVisible(false)
    const timeout = window.setTimeout(() => setIsMounted(false), 180)
    return () => window.clearTimeout(timeout)
  }, [open])

  useEffect(() => {
    if (!open) return

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose, open])

  if (!isMounted) return null

  return (
    <div
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
      css={css`
        position: fixed;
        z-index: 30;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: ${theme.spacing.large};
        background: rgb(36 50 74 / 28%);
        opacity: ${isVisible ? 1 : 0};
        pointer-events: ${isVisible ? 'auto' : 'none'};
        animation: ${isVisible ? fadeIn : fadeOut} 180ms ease both;
      `}
    >
      <section
        css={css`
          width: min(100%, 38rem);
          max-height: min(44rem, calc(100vh - 2 * ${theme.spacing.large}));
          padding: ${theme.spacing.small};
          border: 1px solid rgb(255 255 255 / 90%);
          border-radius: ${theme.radii.large};
          background: ${theme.colors.surfaceRaised};
          box-shadow: 9px 9px 16px rgb(189 189 189 / 60%);
          animation: ${isVisible ? slideUp : slideDown} 180ms ease both;
        `}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          css={css`
            display: flex;
            max-height: calc(44rem - 2 * ${theme.spacing.small});
            flex-direction: column;
            overflow: hidden;
            border-radius: calc(${theme.radii.large} - ${theme.spacing.xs});
            color: ${theme.colors.textPrimary};
            background: ${theme.colors.surface};
            box-shadow:
              inset 10px 10px 15px -10px rgb(195 195 195 / 90%),
              inset -10px -10px 15px -10px rgb(255 255 255 / 100%);
          `}
        >
          <header
            css={css`
              display: flex;
              align-items: center;
              justify-content: space-between;
              gap: ${theme.spacing.medium};
              padding: ${theme.spacing.medium} ${theme.spacing.large};
            `}
          >
            <h2
              id={titleId}
              css={css`
                margin: 0;
                color: ${theme.colors.secondaryHover};
                font-size: 1.25rem;
                line-height: 1.2;
              `}
            >
              {title}
            </h2>
            <IconButton
              icon={XIcon}
              label="Close"
              size="sm"
              variant="secondary"
              onClick={onClose}
            />
          </header>

          <div
            css={css`
              min-height: 0;
              overflow-y: auto;
              padding: ${theme.spacing.large};
            `}
          >
            {children}
          </div>

          <footer
            css={css`
              display: flex;
              align-items: center;
              justify-content: flex-end;
              gap: ${theme.spacing.small};
              padding: ${theme.spacing.medium} ${theme.spacing.large};
            `}
          >
            {actions}
          </footer>
        </div>
      </section>
    </div>
  )
}
