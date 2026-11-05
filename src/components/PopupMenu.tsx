import { useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { css } from '@emotion/react'
import { theme } from './theme'

export interface PopupMenuProps {
  open: boolean
  onClose: () => void
  anchorRef: RefObject<HTMLElement | null>
  children: ReactNode
  width?: string
  fixed?: boolean
}

export default function PopupMenu({ open, onClose, anchorRef, children, width = '128px', fixed = false }: PopupMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)
  const [isMounted, setIsMounted] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 })

  useEffect(() => {
    if (open) {
      setIsMounted(true)
      const frame = requestAnimationFrame(() => setIsVisible(true))
      return () => cancelAnimationFrame(frame)
    }

    setIsVisible(false)
    const timeout = window.setTimeout(() => setIsMounted(false), 160)
    return () => window.clearTimeout(timeout)
  }, [open])

  useLayoutEffect(() => {
    if (!open || !isMounted) return

    function updatePosition() {
      const anchor = anchorRef.current
      const menu = menuRef.current
      if (!anchor || !menu) return

      const anchorRect = anchor.getBoundingClientRect()
      const offsetParent = menu.offsetParent
      const viewportPadding = 8
      const menuWidth = menu.offsetWidth
      const preferredLeft = anchorRect.left
      const rightAlignedLeft = anchorRect.right - menuWidth
      const left = preferredLeft + menuWidth > window.innerWidth - viewportPadding
        ? rightAlignedLeft
        : preferredLeft
      const clampedLeft = Math.max(
        viewportPadding,
        Math.min(left, window.innerWidth - menuWidth - viewportPadding),
      )

      if (fixed) {
        setMenuPosition({
          top: anchorRect.bottom,
          left: clampedLeft,
        })
        return
      }

      if (offsetParent instanceof HTMLElement) {
        const parentRect = offsetParent.getBoundingClientRect()
        setMenuPosition({
          top: anchorRect.bottom - parentRect.top,
          left: clampedLeft - parentRect.left,
        })
        return
      }

      setMenuPosition({
        top: anchorRect.bottom,
        left: clampedLeft,
      })
    }

    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)

    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [anchorRef, fixed, isMounted, open])

  useEffect(() => {
    if (!open) return

    function handlePointerDown(event: PointerEvent) {
      const target = event.target
      if (!(target instanceof Node)) return
      if (menuRef.current?.contains(target) || anchorRef.current?.contains(target)) return
      onClose()
    }

    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [anchorRef, onClose, open])

  if (!isMounted) return null

  const menu = (
    <div
      ref={menuRef}
      css={css`
        position: ${fixed ? 'fixed' : 'absolute'};
        z-index: ${fixed ? 40 : 20};
        top: ${menuPosition.top}px;
        left: ${menuPosition.left}px;
        width: ${width};
        height: auto;
        border-radius: ${theme.radii.medium};
        background: ${theme.colors.surface};
        box-shadow: ${theme.shadows.raisedSmall};
        opacity: ${isVisible ? 1 : 0};
        pointer-events: ${isVisible ? 'auto' : 'none'};
        transform: translateY(${isVisible ? 0 : '-4px'});
        transition: opacity 160ms ease, transform 160ms ease;
      `}
    >{children}</div>
  )

  return fixed ? createPortal(menu, document.body) : menu
}
