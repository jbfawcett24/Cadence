import { useEffect, useRef, useState } from 'react'
import { convertFileSrc } from '@tauri-apps/api/core'
import { createFrontendApi } from '../app/frontendApi'
import type { AnnotationDocument, Point, Score, Stroke } from '../shared/types'
import type { PDFDocumentProxy } from 'pdfjs-dist/types/src/display/api'
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
  const [currentPage, setCurrentPage] = useState(1)
  const [pageCount, setPageCount] = useState(0)
  const [annotationsReady, setAnnotationsReady] = useState(false)
  const [viewportRevision, setViewportRevision] = useState(0)
  const [zoomLevel, setZoomLevel] = useState(1)
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 })
  const inputModeRef = useRef<'pen' | 'touch' | 'eraser'>('pen')
  const pagesContainerRef = useRef<HTMLDivElement>(null)
  const navigationStartRef = useRef<{ x: number; y: number } | undefined>(undefined)
  const pdfRef = useRef<PDFDocumentProxy | null>(null)
  const annotationsRef = useRef<AnnotationDocument | null>(null)
  const renderedPagesRef = useRef(new Map<number, HTMLCanvasElement>())
  const renderingPagesRef = useRef(new Map<number, Promise<HTMLCanvasElement>>())
  const renderGenerationRef = useRef(0)
  const zoomRef = useRef(1)
  const panRef = useRef({ x: 0, y: 0 })
  const activePageContentRef = useRef<HTMLDivElement | null>(null)
  const touchPointsRef = useRef(new Map<number, { x: number; y: number }>())
  const pinchStartRef = useRef<{
    distance: number
    zoom: number
    pan: { x: number; y: number }
    midpoint: { x: number; y: number }
  } | null>(null)
  const panStartRef = useRef<{ x: number; y: number; pan: { x: number; y: number } } | null>(null)
  const wasPinchingRef = useRef(false)
  const wasPanningRef = useRef(false)

  useEffect(() => {
    let cancelled = false

    async function loadScore() {
      try {
        const opened = await cadence.openScore(scoreId)
        if (!cancelled) {
          setScore(opened.score)
          setFileUrl(convertFileSrc(opened.filePath))
          setCurrentPage(1)
          setPageCount(0)
          setAnnotationsReady(false)
          setZoomLevel(1)
          panRef.current = { x: 0, y: 0 }
          setPanOffset({ x: 0, y: 0 })
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
    zoomRef.current = zoomLevel
    if (activePageContentRef.current) {
      activePageContentRef.current.style.transform =
        `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel})`
    }
  }, [panOffset, zoomLevel])

  useEffect(() => {
    if (!fileUrl || score?.format !== 'pdf') return

    let cancelled = false
    const renderedPages = renderedPagesRef.current
    const renderingPages = renderingPagesRef.current
    const loadingTask = pdfjsLib.getDocument(fileUrl)
    pdfRef.current = null
    annotationsRef.current = null
    renderedPagesRef.current.clear()
    renderingPagesRef.current.clear()

    async function loadPdf() {
      try {
        const pdf = await loadingTask.promise
        const annotations = await cadence.services.annotations.load(scoreId)
        if (cancelled) return
        pdfRef.current = pdf
        annotationsRef.current = annotations
        setPageCount(pdf.numPages)
        setAnnotationsReady(true)
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(error instanceof Error ? error.message : 'The PDF could not be opened.')
        }
      }
    }

    void loadPdf()

    return () => {
      cancelled = true
      pdfRef.current = null
      annotationsRef.current = null
      renderedPages.clear()
      renderingPages.clear()
      void loadingTask.destroy()
    }
  }, [fileUrl, score?.format, scoreId])

  useEffect(() => {
    if (!fileUrl || score?.format !== 'pdf' || !pagesContainerRef.current) return

    const pagesContainer = pagesContainerRef.current
    const observer = new ResizeObserver(() => {
      renderedPagesRef.current.clear()
      renderingPagesRef.current.clear()
      renderGenerationRef.current += 1
      setViewportRevision((revision) => revision + 1)
    })
    observer.observe(pagesContainer)

    return () => observer.disconnect()
  }, [fileUrl, score?.format])

  useEffect(() => {
    if (!annotationsReady || !pdfRef.current || !annotationsRef.current || !pagesContainerRef.current) return

    let cancelled = false
    const pdf = pdfRef.current
    const annotations = annotationsRef.current
    const pagesContainer = pagesContainerRef.current
    const renderGeneration = renderGenerationRef.current
    pagesContainer.replaceChildren()

    function renderPage(pageNumber: number) {
      const cached = renderedPagesRef.current.get(pageNumber)
      if (cached) return Promise.resolve(cached)

      const existingRender = renderingPagesRef.current.get(pageNumber)
      if (existingRender) return existingRender

      const renderPromise = pdf.getPage(pageNumber).then(async (page) => {
        const pdfCanvas = document.createElement('canvas')
        const context = pdfCanvas.getContext('2d')
        if (!context) throw new Error('Could not create a PDF canvas.')

        const baseViewport = page.getViewport({ scale: 1 })
        const fitScale = Math.min(
          pagesContainer.clientWidth / baseViewport.width,
          pagesContainer.clientHeight / baseViewport.height,
        )
        const pixelRatio = Math.min(window.devicePixelRatio || 1, 2)
        const viewport = page.getViewport({ scale: fitScale * pixelRatio })
        pdfCanvas.width = viewport.width
        pdfCanvas.height = viewport.height
        pdfCanvas.style.width = `${viewport.width / pixelRatio}px`
        pdfCanvas.style.height = `${viewport.height / pixelRatio}px`
        await page.render({ canvasContext: context, viewport }).promise
        if (renderGenerationRef.current === renderGeneration) {
          renderedPagesRef.current.set(pageNumber, pdfCanvas)
        }
        return pdfCanvas
      })
      renderingPagesRef.current.set(pageNumber, renderPromise)
      void renderPromise.then(
        () => {
          if (renderingPagesRef.current.get(pageNumber) === renderPromise) {
            renderingPagesRef.current.delete(pageNumber)
          }
        },
        () => {
          if (renderingPagesRef.current.get(pageNumber) === renderPromise) {
            renderingPagesRef.current.delete(pageNumber)
          }
        },
      )
      return renderPromise
    }

    async function showPage() {
      try {
        const cachedPdfCanvas = await renderPage(currentPage)
        if (cancelled) return

        const pdfCanvas = cloneCanvas(cachedPdfCanvas)
        const pageContainer = document.createElement('div')
        const pageContent = document.createElement('div')
        const inkCanvas = document.createElement('canvas')
        const inkCanvasContext = inkCanvas.getContext('2d')
        if (!inkCanvasContext) throw new Error('Could not create an annotation canvas.')

        inkCanvas.width = pdfCanvas.width
        inkCanvas.height = pdfCanvas.height
        inkCanvas.style.width = pdfCanvas.style.width
        inkCanvas.style.height = pdfCanvas.style.height
        inkCanvas.className = 'score-reader-ink'
        pageContent.className = 'score-reader-page-content'
        pageContent.style.width = pdfCanvas.style.width
        pageContent.style.height = pdfCanvas.style.height
        pageContent.style.transform =
          `translate(${panRef.current.x}px, ${panRef.current.y}px) scale(${zoomRef.current})`
        pageContainer.className = 'score-reader-page'
        pageContent.append(pdfCanvas, inkCanvas)
        pageContainer.append(pageContent)
        pagesContainer.append(pageContainer)
        activePageContentRef.current = pageContent

        annotations.pages.find((candidate) => candidate.pageNumber === currentPage)?.strokes.forEach(
          (stroke) => drawStroke(inkCanvasContext, inkCanvas, stroke),
        )
        enableInk(
          pageContainer,
          inkCanvas,
          inkCanvasContext,
          scoreId,
          currentPage,
          annotations,
          inputModeRef,
          () => {
            if (inputModeRef.current !== 'touch') return
            inputModeRef.current = 'pen'
            setInputMode('pen')
          },
        )

        // Keep navigation immediate after the first page by filling the cache
        // in the background, one page at a time to limit memory/CPU spikes.
        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
          if (cancelled) return
          await renderPage(pageNumber)
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(error instanceof Error ? error.message : 'The PDF could not be rendered.')
        }
      }
    }

    void showPage()

    return () => {
      cancelled = true
      activePageContentRef.current = null
      pagesContainer.replaceChildren()
    }
  }, [annotationsReady, currentPage, scoreId, viewportRevision])

  function navigatePage(direction: -1 | 1) {
    setCurrentPage((page) => Math.max(1, Math.min(pageCount, page + direction)))
  }

  function updateViewport(zoom: number, pan: { x: number; y: number }) {
    const nextPan = zoom === 1 ? { x: 0, y: 0 } : pan
    zoomRef.current = zoom
    panRef.current = nextPan
    setZoomLevel(zoom)
    setPanOffset(nextPan)
  }

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

      {errorMessage && <p className="score-reader-error" role="alert">{errorMessage}</p>}
      {score?.format === 'pdf' && (
        <div
          ref={pagesContainerRef}
          className="score-reader-pages"
          onPointerDown={(event) => {
            if (event.pointerType === 'touch') {
              // Keep the browser from starting its own page-level pinch gesture.
              // The score reader owns touch gestures so that only the score
              // content changes scale and the header remains fixed.
              event.preventDefault()
              event.currentTarget.setPointerCapture(event.pointerId)
              touchPointsRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
              if (touchPointsRef.current.size === 2) {
                const points = [...touchPointsRef.current.values()]
                const first = points[0]
                const second = points[1]
                if (first && second) {
                  const midpoint = {
                    x: (first.x + second.x) / 2,
                    y: (first.y + second.y) / 2,
                  }
                  pinchStartRef.current = {
                    distance: Math.hypot(second.x - first.x, second.y - first.y),
                    zoom: zoomRef.current,
                    pan: { ...panRef.current },
                    midpoint,
                  }
                  wasPinchingRef.current = true
                  panStartRef.current = null
                  navigationStartRef.current = undefined
                }
              } else if (zoomRef.current > 1) {
                panStartRef.current = {
                  x: event.clientX,
                  y: event.clientY,
                  pan: { ...panRef.current },
                }
              }
            }
            if (event.pointerType === 'pen' ||
              (event.pointerType === 'mouse' && inputModeRef.current !== 'touch')) return
            navigationStartRef.current = { x: event.clientX, y: event.clientY }
          }}
          onPointerMove={(event) => {
            if (event.pointerType !== 'touch') return
            event.preventDefault()
            const points = touchPointsRef.current
            if (!points.has(event.pointerId)) return
            points.set(event.pointerId, { x: event.clientX, y: event.clientY })
            if (pinchStartRef.current && points.size >= 2) {
              const currentPoints = [...points.values()]
              const first = currentPoints[0]
              const second = currentPoints[1]
              if (!first || !second) return
              const distance = Math.hypot(second.x - first.x, second.y - first.y)
              const scale = distance / pinchStartRef.current.distance
              const nextZoom = Math.max(1, Math.min(3, pinchStartRef.current.zoom * scale))
              const midpoint = {
                x: (first.x + second.x) / 2,
                y: (first.y + second.y) / 2,
              }
              const containerBounds = event.currentTarget.getBoundingClientRect()
              const containerCenter = {
                x: containerBounds.left + containerBounds.width / 2,
                y: containerBounds.top + containerBounds.height / 2,
              }
              const startAnchor = {
                x: pinchStartRef.current.midpoint.x - containerCenter.x - pinchStartRef.current.pan.x,
                y: pinchStartRef.current.midpoint.y - containerCenter.y - pinchStartRef.current.pan.y,
              }
              const nextPan = {
                x: midpoint.x - containerCenter.x - startAnchor.x * scale,
                y: midpoint.y - containerCenter.y - startAnchor.y * scale,
              }
              updateViewport(nextZoom, nextPan)
              event.preventDefault()
            } else if (panStartRef.current && points.size === 1 && zoomRef.current > 1) {
            const panStart = panStartRef.current
            const nextPan = {
              x: panStart.pan.x + event.clientX - panStart.x,
              y: panStart.pan.y + event.clientY - panStart.y,
            }
            if (Math.hypot(event.clientX - panStart.x, event.clientY - panStart.y) > 4) {
              wasPanningRef.current = true
            }
            updateViewport(zoomRef.current, nextPan)
            event.preventDefault()
            }
          }}
          onPointerUp={(event) => {
            if (event.pointerType === 'touch') {
              if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                event.currentTarget.releasePointerCapture(event.pointerId)
              }
              touchPointsRef.current.delete(event.pointerId)
              if (pinchStartRef.current) {
                pinchStartRef.current = null
                navigationStartRef.current = undefined
              }
              if (wasPinchingRef.current) {
                wasPinchingRef.current = touchPointsRef.current.size > 0
                return
              }
              if (wasPanningRef.current) {
                wasPanningRef.current = false
                panStartRef.current = null
                return
              }
            }
            const start = navigationStartRef.current
            navigationStartRef.current = undefined
            if (!start || event.pointerType === 'pen' ||
              (event.pointerType === 'mouse' && inputModeRef.current !== 'touch')) return

            const horizontalDistance = event.clientX - start.x
            const verticalDistance = event.clientY - start.y
            if (Math.abs(horizontalDistance) > 40 &&
              Math.abs(horizontalDistance) > Math.abs(verticalDistance)) {
              navigatePage(horizontalDistance < 0 ? 1 : -1)
            } else if (Math.abs(horizontalDistance) < 20 && Math.abs(verticalDistance) < 20) {
              navigatePage(event.clientX < window.innerWidth / 2 ? -1 : 1)
            }
          }}
          onPointerCancel={(event) => {
            if (event.pointerType === 'touch' && event.currentTarget.hasPointerCapture(event.pointerId)) {
              event.currentTarget.releasePointerCapture(event.pointerId)
            }
            navigationStartRef.current = undefined
            panStartRef.current = null
            wasPanningRef.current = false
            touchPointsRef.current.clear()
            pinchStartRef.current = null
            wasPinchingRef.current = false
          }}
          onWheel={(event) => {
            if (!event.ctrlKey) return
            event.preventDefault()
            const nextZoom = Math.max(1, Math.min(3, zoomRef.current - event.deltaY * 0.01))
            updateViewport(nextZoom, panRef.current)
          }}
        />
      )}
      {pageCount > 0 && <span className="score-reader-page-count">{currentPage} / {pageCount}</span>}
    </div>
  )
}

function cloneCanvas(source: HTMLCanvasElement) {
  const clone = document.createElement('canvas')
  const context = clone.getContext('2d')
  if (!context) throw new Error('Could not create a PDF canvas.')

  clone.width = source.width
  clone.height = source.height
  clone.style.width = source.style.width
  clone.style.height = source.style.height
  context.drawImage(source, 0, 0)
  return clone
}

function enableInk(
  eventTarget: HTMLDivElement,
  canvas: HTMLCanvasElement,
  context: CanvasRenderingContext2D,
  scoreId: string,
  pageNumber: number,
  annotations: AnnotationDocument,
  inputModeRef: { current: 'pen' | 'touch' | 'eraser' },
  onPenDetected: () => void,
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
    // Pointer Events identify active styluses as `pen` and fingers as `touch`.
    // Never treat a touch contact as ink, even when Pen or Eraser is selected;
    // this is what provides the palm/finger rejection behavior.
    if (event.pointerType === 'touch') return

    if (event.pointerType === 'pen') {
      onPenDetected()
    } else if (event.pointerType !== 'mouse' || inputModeRef.current === 'touch') {
      // Mouse input remains useful for desktop testing when a drawing mode is
      // selected. Unknown pointer types are ignored rather than risking ink.
      return
    }

    event.preventDefault()
    eventTarget.setPointerCapture(event.pointerId)
    const point = getPoint(event)
    if (inputModeRef.current === 'eraser') {
      eraseAtPoint(point)
    } else {
      points = [point]
    }
  })

  eventTarget.addEventListener('pointercancel', (event) => {
    if (!eventTarget.hasPointerCapture(event.pointerId)) return
    eventTarget.releasePointerCapture(event.pointerId)
    points = []
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
