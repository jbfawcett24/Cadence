import type { ReactNode } from 'react'
import { css } from '@emotion/react'
import { theme } from './theme'

interface PageHeaderProps {
  title: string,
  actions: ReactNode
}

export default function PageHeader({ title, actions }: PageHeaderProps) {
  return (
    <header
      css={css`
        display: flex;
        align-items: center;
        justify-content: space-between;
        box-shadow: ${theme.shadows.raised};
        border-radius: ${theme.radii.medium};
        margin: ${theme.spacing.xl};
        padding: ${theme.spacing.medium};
        background-color: ${theme.colors.surfaceRaised};
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
