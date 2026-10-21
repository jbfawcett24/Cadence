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

export const theme = {
  ...baseTheme,
  button: {
    variants: buttonVariants,
    sizeHeights: buttonSizeHeights,
    sizeFontSizes: buttonSizeFontSizes,
    shadowSizes: buttonShadowSizes,
  },
} as const

export type Theme = typeof theme
