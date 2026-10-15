import { useEffect, useState } from 'react'
import { createFrontendApi } from '../app/frontendApi'
import type { Score } from '../shared/types'

const cadence = createFrontendApi()

interface LibraryListProps {
  refreshToken: number
  onSelectScore: (scoreId: string) => void
}

export default function LibraryList({ refreshToken, onSelectScore }: LibraryListProps) {
  const [scores, setScores] = useState<Score[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    let cancelled = false

    async function loadScores() {
      setIsLoading(true)
      setErrorMessage('')

      try {
        const loadedScores = await cadence.services.library.listScores()
        if (!cancelled) setScores(loadedScores)
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(error instanceof Error ? error.message : 'The library could not be loaded.')
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    void loadScores()

    return () => {
      cancelled = true
    }
  }, [refreshToken])

  return (
    <div>
      {isLoading && <p>Loading library...</p>}
      {errorMessage && <p role="alert">{errorMessage}</p>}
      {!isLoading && !errorMessage && scores.length === 0 && <p>No scores imported yet.</p>}
      {scores.map((score) => (
        <button key={score.id} type="button" onClick={() => onSelectScore(score.id)}>
          {score.title}
        </button>
      ))}
    </div>
  )
}
