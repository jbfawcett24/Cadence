# Cadence frontend API

This is the typed frontend entry point for local score, annotation, setlist,
audio, and settings data. React components should use these services instead
of invoking Rust commands or accessing filesystem paths directly.

## Setup

~~~ts
import { createFrontendApi } from './app/frontendApi'

export const cadence = createFrontendApi()
~~~

All functions are asynchronous and return Promises. Errors are rejected
Promises, so file and persistence operations should be wrapped in try/catch.

## Top-level API

Access these functions directly on cadence.

### startup()

Loads all saved scores, setlists, folders, and application settings.

~~~ts
const { scores, folders, setlists, settings } = await cadence.startup()
~~~

### importScore(sourcePath, metadata?)

Validates and copies a PDF or MusicXML file into managed storage, creates its
library record, and returns the new Score. The original file is preserved.

~~~ts
const score = await cadence.importScore('/home/me/scores/sonata.pdf', {
  title: 'Sonata in C',
  composer: 'Mozart',
  instrument: 'Piano',
  tags: ['practice', 'classical'],
})
~~~

Metadata may include title, composer, instrument, tags, and an optional
`folderId`. Without a title, the source filename is used. Imported scores go
to the library root when no folder is supplied.

### openScore(scoreId)

Loads a saved score and resolves the path to its managed file without copying
it again.

~~~ts
const { score, filePath } = await cadence.openScore(scoreId)
~~~

### removeScore(scoreId)

Removes the managed score copy and library record. It never deletes the
original source file.

~~~ts
await cadence.removeScore(scoreId)
~~~

### linkAudio(link)

Validates and associates an existing local MP3 or WAV file with a score.

~~~ts
const audio = await cadence.linkAudio({
  scoreId,
  path: '/home/me/audio/sonata.mp3',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
})
~~~

### checkAudio(path)

Checks a local path for supported audio content. Returns mp3, wav, or
undefined when the file is missing or unsupported.

~~~ts
const format = await cadence.checkAudio(audioPath)
~~~

## Library service

Access through cadence.services.library.

| Function | Purpose |
|---|---|
| listScores() | Returns every score in the local library. |
| listLibraryTree() | Returns root scores and recursively nested folders, each containing its scores and child folders. |
| createFolder(folder) | Creates a folder with a parent folder ID or `null` for the library root. |
| updateFolder(folder) | Renames or updates a folder record. Sibling folder names must be unique. |
| removeFolder(id) | Removes an empty folder. Non-empty folders are rejected. |
| moveFolder(id, newParentId) | Moves a folder while preventing cycles and duplicate sibling names. |
| moveScore(id, folderId) | Moves a score to a folder or to the library root with `null`. |
| getScore(id) | Returns one score or undefined. |
| searchScores(query) | Case-insensitively searches title, composer, instrument, and tags. An empty query returns all scores. |
| createScore(score) | Adds a complete Score record. Prefer importScore for normal imports. |
| updateScore(score) | Replaces an existing score's metadata. |
| removeScore(id) | Removes only the library record; use top-level removeScore to also remove the managed copy. |

~~~ts
const results = await cadence.services.library.searchScores('mozart')
await cadence.services.library.updateScore({
  ...score,
  tags: [...score.tags, 'rehearsal'],
  updatedAt: new Date().toISOString(),
})
~~~

`listLibraryTree()` returns a storage-independent view:

~~~ts
const tree = await cadence.services.library.listLibraryTree()
// tree.rootScores: Score[]
// tree.folders: { folder, scores, children }[]
~~~

The library service builds this tree from flat folder and score records. UI
components should use the tree API rather than reading persistence data or
filesystem paths directly. Folder moves are expressed as operations, so the
eventual SQLite adapter can perform them transactionally without changing the
frontend API.

## Setlist service

Access through cadence.services.setlists. Setlists contain stable score IDs
in performance order.

| Function | Purpose |
|---|---|
| listSetlists() | Returns all saved setlists. |
| createSetlist(setlist) | Creates a new ordered setlist. |
| updateSetlist(setlist) | Replaces a setlist; change scoreIds to reorder pieces. |
| removeSetlist(id) | Deletes a setlist without deleting referenced scores. |

~~~ts
await cadence.services.setlists.createSetlist({
  id: 'setlist-rehearsal',
  name: 'Friday rehearsal',
  scoreIds: [firstScoreId, secondScoreId],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
})

await cadence.services.setlists.updateSetlist({
  ...setlist,
  scoreIds: [secondScoreId, firstScoreId],
  updatedAt: new Date().toISOString(),
})
~~~

## Annotation service

Access through cadence.services.annotations. Annotations are page-organized
vector strokes, independent of whether the score is PDF or MusicXML.

| Function | Purpose |
|---|---|
| load(scoreId) | Loads a score's annotation document; missing documents are empty version 1 documents. |
| replace(document) | Replaces the complete annotation document. |
| addStroke(scoreId, pageNumber, stroke) | Adds a pen or highlighter stroke to a page. |
| deleteStroke(scoreId, pageNumber, strokeId) | Removes one stroke from a page. |

~~~ts
await cadence.services.annotations.addStroke(scoreId, 1, {
  id: crypto.randomUUID(),
  tool: 'pen',
  color: '#222222',
  width: 2,
  opacity: 1,
  points: [{ x: 0.2, y: 0.3 }, { x: 0.4, y: 0.3 }],
  createdAt: new Date().toISOString(),
})

await cadence.services.annotations.deleteStroke(scoreId, 1, strokeId)
~~~

Stroke coordinates are page-relative and normally normalized from 0 to 1.

## Audio service

Access through cadence.services.audio.

| Function | Purpose |
|---|---|
| getLink(scoreId) | Loads a score's audio link or returns undefined. |
| linkAudio(link) | Creates and validates an MP3/WAV association. |
| updateLink(link) | Updates an existing audio association. |
| removeLink(scoreId) | Removes the association without deleting the external audio file. |
| checkAvailability(path) | Checks a path for supported MP3/WAV content. |

~~~ts
const link = await cadence.services.audio.getLink(scoreId)
const format = await cadence.services.audio.checkAvailability(audioPath)
await cadence.services.audio.removeLink(scoreId)
~~~

## Settings service

Access through cadence.services.settings.

| Function | Purpose |
|---|---|
| load() | Loads saved settings or defaults. |
| update(settings) | Persists theme and preferred orientation. |

~~~ts
const settings = await cadence.services.settings.load()

await cadence.services.settings.update({
  version: 1,
  theme: 'dark',
  preferredOrientation: 'landscape',
})
~~~

## Shared types

The complete definitions are in src/shared/types.ts:

- Score: library metadata, managed score file reference, and nullable folder ID.
- Folder: named self-referencing library node with a nullable parent ID.
- LibraryTree: root scores plus recursively nested folder nodes.
- Setlist: an ordered list of stable score IDs.
- AnnotationDocument: page-organized vector strokes.
- AudioLink: score ID, external local path, and detected format.
- AppSettings: theme and preferred orientation.
