import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { css } from '@emotion/react'
import { theme } from './theme'

interface DragOverlayProps {
  label: string
  initialPosition: { x: number; y: number }
}

export default function DragOverlay({ label, initialPosition }: DragOverlayProps) {
  const [position, setPosition] = useState(initialPosition)

  useEffect(() => {
    function handleDragOver(event: globalThis.DragEvent) {
      setPosition({ x: event.clientX, y: event.clientY })
    }

    window.addEventListener('dragover', handleDragOver)
    return () => window.removeEventListener('dragover', handleDragOver)
  }, [])

  return createPortal(
    <div
      aria-hidden="true"
      css={css`
        position: fixed;
        z-index: 10000;
        top: ${position.y}px;
        left: ${position.x}px;
        max-width: 140px;
        padding: 3px 6px;
        border: none;
        border-radius: ${theme.radii.medium};
        color: ${theme.colors.textPrimary};
        background: ${theme.colors.surface};
        box-shadow: ${theme.shadows.raised};
        font: inherit;
        font-size: 11px;
        line-height: 14px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        pointer-events: none;
        transform: translate(12px, 12px);
      `}
    >
      {label}
    </div>,
    document.body,
  )
}
