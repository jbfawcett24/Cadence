import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { IconContext } from '@phosphor-icons/react'
import { theme } from './components/theme.ts'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <IconContext.Provider
      value={{
        color: theme.colors.secondary,
        size: 24,
        weight: 'thin'
      }}
    >
      <App />
    </IconContext.Provider>
  </StrictMode>,
)
