import { css } from '@emotion/react'
import type { SerializedStyles } from '@emotion/react'

/**
 * Shared visual tokens for Cadence.
 *
 * Components should use semantic theme values instead of individual colors
 * and measurements so the visual system can be changed in one place.
 */
const baseTheme = {
  colors: {
    // Neumorphic surfaces
    background: '#F0F0F3',
    surface: '#F0F0F3',
    surfaceRaised: '#edf1f6',
    surfaceSubtle: '#dfe5ed',
    surfacePressed: '#d9e0e9',

    // Brand and interactive colors
    primary: '#315f9d',
    primaryHover: '#285187',
    primaryPressed: '#234777',
    primarySoft: '#d8e5f5',
    secondary: '#60748f',
    secondaryHover: '#536680',

    // Text
    textPrimary: '#24324a',
    textSecondary: '#52627a',
    textMuted: '#77869b',
    textOnPrimary: '#ffffff',
    textOnDark: '#f7f9fc',

    // Borders, dividers, and focus
    border: '#cbd5e1',
    borderStrong: '#aebdce',
    divider: '#d3dce7',
    focus: '#4c8dff',

    // Status colors
    success: '#2f8664',
    successSoft: '#d9eee5',
    warning: '#a8731d',
    warningSoft: '#f5e8c8',
    danger: '#b84c5a',
    dangerHover: '#a43f4c',
    dangerSoft: '#f3dce0',
    info: '#3d78a8',
    infoSoft: '#dceaf5',

    // Score reader colors
    readerBackground: '#202124',
    page: '#ffffff',
    ink: '#000000',
    highlighter: '#f6d85f',
  },
  shadows: {
    raised: '-9px -9px 16px rgb(255 255 255 / 60%), 9px 9px 16px rgb(163 177 198 / 75%)',
    raisedSmall: '-5px -5px 10px rgb(255 255 255 / 60%), 5px 5px 10px rgb(163 177 198 / 70%)',
    raisedConvex: '-12px -12px 10px rgb(255 255 255 / 95%), 12px 12px 10px rgb(80 88 100 / 45%), inset -10px -10px 12px rgb(80 88 100 / 22%), inset 10px 10px 12px rgb(255 255 255 / 100%)',
    pressed: 'inset -10px -10px 18px rgb(255 255 255 / 28%), inset 10px 10px 18px rgb(145 155 172 / 62%)',
    card: '0 0.75rem 2rem rgb(36 50 74 / 10%)',
    page: '0 0.25rem 1rem rgb(0 0 0 / 25%)',
  },
  radii: {
    small: '0.5rem',
    medium: '0.75rem',
    large: '1rem',
    round: '999px',
  },
  spacing: {
    xs: '0.25rem',
    small: '0.5rem',
    medium: '0.75rem',
    large: '1rem',
    xl: '1.5rem',
    xxl: '2rem',
  },
} as const

const buttonVariants = {
  primary: {
    color: baseTheme.colors.primary,
    background: baseTheme.colors.surface,
    hoverBackground: baseTheme.colors.surfaceSubtle,
    pressedBackground: baseTheme.colors.surfacePressed,
    pressedShadow: baseTheme.shadows.pressed,
  },
  secondary: {
    color: baseTheme.colors.textPrimary,
    background: baseTheme.colors.surface,
    hoverBackground: baseTheme.colors.surfaceSubtle,
    pressedBackground: baseTheme.colors.surfacePressed,
    pressedShadow: baseTheme.shadows.pressed,
  },
  danger: {
    color: baseTheme.colors.textOnPrimary,
    background: baseTheme.colors.danger,
    hoverBackground: baseTheme.colors.dangerHover,
    pressedBackground: '#943844',
    pressedShadow: 'inset -10px -10px 18px rgb(255 145 155 / 38%), inset 10px 10px 18px rgb(160 25 37 / 88%)',
  },
} as const

const buttonSizeHeights = {
  xs: '28px',
  sm: '36px',
  md: '44px',
  lg: '52px',
  xl: '60px',
  xxl: '72px',
} as const

const buttonSizeFontSizes = {
  xs: '0.75rem',
  sm: '0.875rem',
  md: '1rem',
  lg: '1.125rem',
  xl: '1.5rem',
  xxl: '2rem',
} as const

const buttonShadowSizes = {
  xs: { offset: '3px', blur: '6px', insetOffset: '3px', insetBlur: '4px' },
  sm: { offset: '4px', blur: '8px', insetOffset: '4px', insetBlur: '6px' },
  md: { offset: '6px', blur: '10px', insetOffset: '5px', insetBlur: '8px' },
  lg: { offset: '8px', blur: '14px', insetOffset: '7px', insetBlur: '10px' },
  xl: { offset: '10px', blur: '17px', insetOffset: '8px', insetBlur: '11px' },
  xxl: { offset: '12px', blur: '20px', insetOffset: '10px', insetBlur: '12px' },
} as const

export type ButtonVariant = 'primary' | 'secondary' | 'danger'
export type ButtonSize = keyof typeof buttonSizeHeights

export const theme = {
  ...baseTheme,
  button: {
    variants: buttonVariants,
    sizeHeights: buttonSizeHeights,
    sizeFontSizes: buttonSizeFontSizes,
    shadowSizes: buttonShadowSizes,
  },
} as const

export function getRaisedShadow(size: ButtonSize, variant: ButtonVariant) {
  const shadow = theme.button.shadowSizes[size]
  const outerShadow = `-${shadow.offset} -${shadow.offset} ${shadow.blur} rgb(255 255 255 / 95%), ${shadow.offset} ${shadow.offset} ${shadow.blur} rgb(80 88 100 / 45%)`

  if (variant === 'danger') {
    return `${outerShadow}, inset -${shadow.insetOffset} -${shadow.insetOffset} ${shadow.insetBlur} rgb(120 25 37 / 30%), inset ${shadow.insetOffset} ${shadow.insetOffset} ${shadow.insetBlur} rgb(255 145 155 / 70%)`
  }

  return `${outerShadow}, inset -${shadow.insetOffset} -${shadow.insetOffset} ${shadow.insetBlur} rgb(80 88 100 / 22%), inset ${shadow.insetOffset} ${shadow.insetOffset} ${shadow.insetBlur} rgb(255 255 255 / 100%)`
}

interface ButtonStyleOptions {
  variant: ButtonVariant
  size: ButtonSize
  disabled: boolean
}

export function getButtonStyles({
  variant,
  size,
  disabled,
}: ButtonStyleOptions): SerializedStyles {
  const colors = theme.button.variants[variant]
  const height = theme.button.sizeHeights[size]
  const fontSize = theme.button.sizeFontSizes[size]
  const raisedShadow = getRaisedShadow(size, variant)

  return css`
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
    cursor: ${disabled ? 'not-allowed' : 'pointer'};
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
  `
}

export function getIconButtonStyles({
  variant,
  size,
  disabled,
}: ButtonStyleOptions): SerializedStyles {
  const colors = theme.button.variants[variant]
  const height = theme.button.sizeHeights[size]
  const fontSize = theme.button.sizeFontSizes[size]
  const raisedShadow = getRaisedShadow(size, variant)

  return css`
    position: relative;
    display: inline-grid;
    width: ${height};
    min-width: ${height};
    min-height: ${height};
    padding: 0;
    place-items: center;
    border: none;
    border-radius: ${theme.radii.round};
    color: ${colors.color};
    background: ${colors.background};
    font: inherit;
    font-size: ${fontSize};
    font-weight: 700;
    line-height: 1;
    cursor: ${disabled ? 'not-allowed' : 'pointer'};
    touch-action: manipulation;
    user-select: none;
    -webkit-touch-callout: none;
    box-shadow: ${raisedShadow};
    transition: background 150ms ease, box-shadow 150ms ease, transform 150ms ease, opacity 150ms ease;

    & > svg,
    & > span {
      width: 1.25em;
      height: 1.25em;
    }

    &::after {
      position: absolute;
      z-index: 10;
      top: calc(100% + ${theme.spacing.small});
      left: 50%;
      padding: ${theme.spacing.small} ${theme.spacing.medium};
      border-radius: ${theme.radii.small};
      color: ${theme.colors.textOnDark};
      background: ${theme.colors.readerBackground};
      content: attr(data-tooltip);
      font-size: 0.75rem;
      font-weight: 600;
      line-height: 1.2;
      white-space: nowrap;
      pointer-events: none;
      opacity: 0;
      transform: translate(-50%, -4px);
      transition: opacity 120ms ease, transform 120ms ease;
    }

    &:hover:not(:disabled),
    &:focus-visible {
      background: ${colors.hoverBackground};
      transform: none;
    }

    &:hover:not(:disabled)::after,
    &:focus-visible::after {
      opacity: 1;
      transform: translate(-50%, 0);
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
  `
}

export type Theme = typeof theme
