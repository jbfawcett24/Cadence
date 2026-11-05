import type { InputHTMLAttributes } from 'react'
import { css } from '@emotion/react'
import { theme } from './theme'

interface FormInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
}

export default function FormInput({ label, placeholder, ...inputProps }: FormInputProps) {
  return (
    <input
      {...inputProps}
      aria-label={inputProps['aria-label'] ?? label}
      placeholder={placeholder ?? label}
      css={css`
        display: block;
        width: min(350px, 100%);
        height: 40px;
        margin: 4px 0;
        padding: 0 1rem 0 25px;
        border: none;
        border-radius: 8px;
        color: ${theme.colors.textSecondary};
        background: ${theme.colors.surface};
        box-shadow:
          inset 2px 2px 4px rgb(163 177 198 / 55%),
          inset -2px -2px 4px rgb(255 255 255 / 90%);
        font: inherit;
        font-size: 0.8125rem;
        letter-spacing: 0.15px;
        outline: none;
        transition: box-shadow 250ms ease;

        &::placeholder {
          color: ${theme.colors.textSecondary};
          opacity: 1;
        }

        &:focus {
          background: ${theme.colors.surface};
          box-shadow:
            inset 4px 4px 4px rgb(163 177 198 / 65%),
            inset -4px -4px 4px rgb(255 255 255 / 95%);
        }

        &:focus-visible {
          outline: 3px solid rgb(76 141 255 / 35%);
          outline-offset: 2px;
        }

        &:disabled {
          cursor: not-allowed;
          opacity: 0.55;
        }
      `}
    />
  )
}
