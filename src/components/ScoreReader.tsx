import { useEffect, useRef, useState } from 'react'
import { convertFileSrc } from '@tauri-apps/api/core'
import { createFrontendApi } from '../app/frontendApi'
import type { AnnotationDocument, Point, Score, Stroke } from '../shared/types'
import '../App.css'
import * as pdfjsLib from 'pdfjs-dist'
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl

const cadence = createFrontendApi()

interface ScoreReaderProps {
  scoreId: string
  onBack: () => void
}

export default function ScoreReader({ scoreId, onBack }: ScoreReaderProps) {
  const [score, setScore] = useState<Score>()
  const [fileUrl, setFileUrl] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [inputMode, setInputMode] = useState<'pen' | 'touch' | 'eraser'>('pen')
  const inputModeRef = useRef<'pen' | 'touch' | 'eraser'>('pen')
  const pagesContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false

    async function loadScore() {
      try {
        const opened = await cadence.openScore(scoreId)
        if (!cancelled) {
          setScore(opened.score)
          setFileUrl(convertFileSrc(opened.filePath))
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(error instanceof Error ? error.message : 'The score could not be opened.')
        }
      }
    }

    void loadScore()

    return () => {
      cancelled = true
    }
  }, [scoreId])

  useEffect(() => {
    if (!fileUrl || score?.format !== 'pdf' || !pagesContainerRef.current) return

    let cancelled = false
    const pagesContainer = pagesContainerRef.current
    pagesContainer.replaceChildren()
    const loadingTask = pdfjsLib.getDocument(fileUrl)

    async function renderPdf() {
      try {
        const pdf = await loadingTask.promise
        const annotations = await cadence.services.annotations.load(scoreId)

        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
          if (cancelled) break

          const page = await pdf.getPage(pageNumber)
          const viewport = page.getViewport({ scale: 1.5 })
          const pageContainer = document.createElement('div')
          const pdfCanvas = document.createElement('canvas')
          const pdfCanvasContext = pdfCanvas.getContext('2d')
          const inkCanvas = document.createElement('canvas')
          const inkCanvasContext = inkCanvas.getContext('2d')

          if (!pdfCanvasContext || !inkCanvasContext) {
            throw new Error('Could not create a PDF canvas.')
          }

          pdfCanvas.width = viewport.width
          pdfCanvas.height = viewport.height
          inkCanvas.width = viewport.width
          inkCanvas.height = viewport.height
          inkCanvas.className = 'score-reader-ink'
          pageContainer.className = 'score-reader-page'
          pageContainer.append(pdfCanvas, inkCanvas)
          pagesContainer.append(pageContainer)

          await page.render({ canvasContext: pdfCanvasContext, viewport }).promise

          const pageAnnotations = annotations.pages.find(
            (candidate) => candidate.pageNumber === pageNumber,
          )
          pageAnnotations?.strokes.forEach((stroke) => {
            drawStroke(inkCanvasContext, inkCanvas, stroke)
          })
          enableInk(
            pageContainer,
            inkCanvas,
            inkCanvasContext,
            scoreId,
            pageNumber,
            annotations,
            inputModeRef,
          )
        }

        await pdf.destroy()
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(error instanceof Error ? error.message : 'The PDF could not be rendered.')
        }
      }
    }

    void renderPdf()

    return () => {
      cancelled = true
      void loadingTask.destroy()
      pagesContainer.replaceChildren()
    }
  }, [fileUrl, score?.format, scoreId])

  return (
    <div className={'score-reader score-reader-' + inputMode}>
      <header className="score-reader-header">
        <button type="button" onClick={onBack}>
          Back
        </button>
        <button
          className={inputMode === 'pen' ? 'score-reader-mode-active' : ''}
          type="button"
          onClick={() => {
            inputModeRef.current = 'pen'
            setInputMode('pen')
          }}
        >
          Pen
        </button>
        <button
          className={inputMode === 'touch' ? 'score-reader-mode-active' : ''}
          type="button"
          onClick={() => {
            inputModeRef.current = 'touch'
            setInputMode('touch')
          }}
        >
          Touch
        </button>
        <button
          className={inputMode === 'eraser' ? 'score-reader-mode-active' : ''}
          type="button"
          onClick={() => {
            inputModeRef.current = 'eraser'
            setInputMode('eraser')
          }}
        >
          Eraser
        </button>
      </header>

      {errorMessage && <p role="alert">{errorMessage}</p>}
      {score?.format === 'pdf' && <div ref={pagesContainerRef} className="score-reader-pages" />}
    </div>
  )
}

function enableInk(
  eventTarget: HTMLDivElement,
  canvas: HTMLCanvasElement,
  context: CanvasRenderingContext2D,
  scoreId: string,
  pageNumber: number,
  annotations: AnnotationDocument,
  inputModeRef: { current: 'pen' | 'touch' | 'eraser' },
) {
  let points: Point[] = []

  function getPoint(event: PointerEvent): Point {
    const bounds = canvas.getBoundingClientRect()
    return {
      x: Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width)),
      y: Math.max(0, Math.min(1, (event.clientY - bounds.top) / bounds.height)),
    }
  }

  function drawCurrentStroke() {
    if (points.length < 2) return
    const previous = points[points.length - 2]
    const current = points[points.length - 1]
    if (!previous || !current) return

    context.beginPath()
    context.moveTo(previous.x * canvas.width, previous.y * canvas.height)
    context.lineTo(current.x * canvas.width, current.y * canvas.height)
    context.strokeStyle = '#000000'
    context.lineWidth = 3
    context.lineCap = 'round'
    context.lineJoin = 'round'
    context.stroke()
  }

  eventTarget.addEventListener('pointerdown', (event) => {
    const acceptsPointer = inputModeRef.current !== 'touch'
    if (!acceptsPointer) return
    event.preventDefault()
    eventTarget.setPointerCapture(event.pointerId)
    const point = getPoint(event)
    if (inputModeRef.current === 'eraser') {
      eraseAtPoint(point)
    } else {
      points = [point]
    }
  })

  eventTarget.addEventListener('pointermove', (event) => {
    if (!eventTarget.hasPointerCapture(event.pointerId)) return
    event.preventDefault()
    if (inputModeRef.current === 'eraser') {
      eraseAtPoint(getPoint(event))
      return
    }
    points.push(getPoint(event))
    drawCurrentStroke()
  })

  eventTarget.addEventListener('pointerup', (event) => {
    if (!eventTarget.hasPointerCapture(event.pointerId)) return
    eventTarget.releasePointerCapture(event.pointerId)
    if (inputModeRef.current === 'pen' && points.length > 1) {
      const stroke: Stroke = {
        id: crypto.randomUUID(),
        tool: 'pen',
        color: '#000000',
        width: 3,
        opacity: 1,
        points,
        createdAt: new Date().toISOString(),
      }
      void cadence.services.annotations.addStroke(scoreId, pageNumber, stroke).catch(() => undefined)
      const page = annotations.pages.find((candidate) => candidate.pageNumber === pageNumber)
      if (page) page.strokes.push(stroke)
      else annotations.pages.push({ pageNumber, strokes: [stroke] })
    }
    points = []
  })

  function eraseAtPoint(point: Point) {
    const page = annotations.pages.find((candidate) => candidate.pageNumber === pageNumber)
    if (!page) return

    const erasedStroke = page.strokes.find((stroke) => {
      const threshold = Math.max(0.02, stroke.width / canvas.width * 2)
      return stroke.points.some((strokePoint, index) => {
        const nextPoint = stroke.points[index + 1]
        return distanceToSegment(point, strokePoint, nextPoint ?? strokePoint) <= threshold
      })
    })

    if (!erasedStroke) return
    page.strokes = page.strokes.filter((stroke) => stroke.id !== erasedStroke.id)
    context.clearRect(0, 0, canvas.width, canvas.height)
    page.strokes.forEach((stroke) => drawStroke(context, canvas, stroke))
    void cadence.services.annotations.deleteStroke(scoreId, pageNumber, erasedStroke.id).catch(() => undefined)
  }
}

function distanceToSegment(point: Point, start: Point, end: Point) {
  const segmentX = end.x - start.x
  const segmentY = end.y - start.y
  const segmentLengthSquared = segmentX * segmentX + segmentY * segmentY
  if (segmentLengthSquared === 0) {
    return Math.hypot(point.x - start.x, point.y - start.y)
  }

  const projection = Math.max(
    0,
    Math.min(
      1,
      ((point.x - start.x) * segmentX + (point.y - start.y) * segmentY) / segmentLengthSquared,
    ),
  )
  const closestX = start.x + projection * segmentX
  const closestY = start.y + projection * segmentY
  return Math.hypot(point.x - closestX, point.y - closestY)
}

function drawStroke(
  context: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  stroke: Stroke,
) {
  if (stroke.points.length === 0) return

  context.beginPath()
  stroke.points.forEach((point, index) => {
    const x = point.x * canvas.width
    const y = point.y * canvas.height
    if (index === 0) context.moveTo(x, y)
    else context.lineTo(x, y)
  })
  context.strokeStyle = '#000000'
  context.lineWidth = stroke.width
  context.globalAlpha = stroke.opacity
  context.lineCap = 'round'
  context.lineJoin = 'round'
  context.stroke()
  context.globalAlpha = 1
}
