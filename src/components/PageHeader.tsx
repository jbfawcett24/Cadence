import { useEffect, useRef, useState, type ReactNode } from 'react'
import { css } from '@emotion/react'
import { theme } from './theme'

interface PageHeaderProps {
  title: string,
  actions: ReactNode
}

export default function PageHeader({ title, actions }: PageHeaderProps) {
  const headerRef = useRef<HTMLElement>(null)
  const [isStuck, setIsStuck] = useState(false)

  useEffect(() => {
    function updateStickyState() {
      const header = headerRef.current
      if (!header) return

      const nextIsStuck = header.getBoundingClientRect().top <= 0
      setIsStuck((currentIsStuck) => (
        currentIsStuck === nextIsStuck ? currentIsStuck : nextIsStuck
      ))
    }

    updateStickyState()
    window.addEventListener('scroll', updateStickyState, { passive: true })
    window.addEventListener('resize', updateStickyState)

    return () => {
      window.removeEventListener('scroll', updateStickyState)
      window.removeEventListener('resize', updateStickyState)
    }
  }, [])

  return (
    <header
      ref={headerRef}
      css={css`
        position: sticky;
        z-index: 10;
        top: 0;
        display: flex;
        align-items: center;
        justify-content: space-between;
        width: ${isStuck ? '100%' : 'auto'};
        margin: ${isStuck ? 0 : `${theme.spacing.xl} ${theme.spacing.xl} 0`};
        padding: ${isStuck ? theme.spacing.small : theme.spacing.medium};
        border-radius: ${isStuck ? 0 : theme.radii.medium};
        background-color: ${theme.colors.surfaceRaised};
        box-shadow: ${isStuck ? theme.shadows.raisedSmall : theme.shadows.raised};
        transition:
          margin 220ms ease,
          padding 220ms ease,
          border-radius 220ms ease,
          box-shadow 220ms ease;
      `}
    >
      <h1
        css={css`
          color: ${theme.colors.secondaryHover};
        `}
      >{title}</h1>
      <div
        css={css`
          display: flex;
          align-items: center;
          gap: 0.75rem;
        `}
      >
        {actions}
      </div>
    </header>
  )
}
