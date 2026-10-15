# Cadence — AI Agent Project Specification

Status: Living specification  
Source: `CSE499_Project_Proposal.docx`  
Last updated: 2026-09-28  
Owner: James Fawcett

This document is the working contract for AI agents contributing to Cadence. It translates the project proposal into implementable requirements, a maintained task list, and a process for recording changes. The proposal remains the source for the original project intent; this file is the operational source for the repository.

## How agents must use this document

Before changing code, an agent should:

1. Read this file and inspect the relevant existing implementation.
2. Select or create a task ID in the task register.
3. Confirm that the task's dependencies and acceptance criteria are clear.
4. Make the smallest coherent change that advances the task.
5. Run the applicable checks and record the evidence in the task entry.
6. Update this file in the same change whenever task status, requirements, decisions, or assumptions change.

Agents must not silently alter product scope. If implementation reveals a requirement conflict, missing decision, or proposal assumption that is no longer valid, record it in `Open decisions` or `Specification change log` and leave the task blocked or in progress until the owner resolves it.

## Status vocabulary

Use exactly one status per task:

- `[ ] Planned` — not started.
- `[~] In progress` — actively being implemented.
- `[!] Blocked` — cannot proceed without a decision, dependency, hardware, or external input. State the blocker.
- `[x] Done` — acceptance criteria are met and evidence is recorded.
- `[-] Deferred` — intentionally moved out of the current scope. State why.

`Done` means more than code existing. A task is done only when its acceptance criteria are satisfied, relevant tests or manual checks pass, and known limitations are documented.

## Product summary

Cadence is a high-performance, standalone desktop application for reading and annotating sheet music on Windows and Linux hybrid laptops/tablets. It is designed for rehearsal and performance in offline environments, especially for instrumentalists, ensemble musicians, and music educators.

Primary architecture: Tauri/Rust desktop shell with a React/TypeScript frontend.

Core product promise: a musician can import scores, organize them, read them in portrait or landscape, navigate hands-free, annotate with an active stylus, and practice with audio without an internet connection.

### Initial architecture boundaries

The application is organized into domain-oriented frontend modules behind a small persistence boundary:

- **Score/document:** shared score model for PDF and MusicXML documents, active page or measure, viewport state, and renderer-specific data.
- **Library:** score import, metadata, search, listing, opening, and removal. The library does not render score content.
- **Setlist:** creation, naming, ordering, and performance navigation. Setlists reference scores by stable score ID rather than duplicating score records.
- **Annotations:** page-organized vector strokes for pen and highlighter tools, eraser operations, undo/redo, coordinate transforms, and annotation serialization. The annotation layer is independent of the score renderer.
- **Audio:** MusicXML synthesis and linked local audio playback, including play/pause, tempo, and playback state.
- **Persistence:** application-level interfaces for loading and saving scores, metadata, setlists, annotations, audio links, and settings. UI components do not access storage APIs directly.
- **Tauri/Rust bridge:** platform-specific filesystem access exposed through explicit domain-oriented commands such as loading or saving library data. The bridge is not a general-purpose arbitrary filesystem API.

The intended dependency direction is UI components → application services → persistence interfaces → Tauri/Rust filesystem implementation. Persistence interfaces should be designed before selecting a future storage engine, even though the initial implementation will use JSON files.

### Initial local storage strategy

Imported PDF and MusicXML files are copied into an application-managed library directory. The original files are never moved or deleted. Library metadata stores the stable score ID, managed file path, optional original path, format, and user metadata. Setlists and annotations refer to scores by stable ID.

The initial persistence implementation uses separate local JSON files for library metadata, setlists, annotations, audio links, and settings. These files are an implementation detail behind persistence interfaces so the storage engine can later be replaced with SQLite without changing UI components or domain services.

Linked MP3/WAV files initially remain at their original paths and are recorded as local links. Missing linked media must be reported safely. Managed audio copies may be considered separately later.

### Planned library candidates

The following libraries are candidates for later milestones. They are intentionally not installed until the associated task begins and the runtime/platform fit is verified:

- **PDF rendering — `pdfjs-dist`:** candidate for T-003/Week 5 for multi-page PDF rendering, zoom, pan, caching, and high-DPI scaling.
- **MusicXML rendering — OpenSheetMusicDisplay or Verovio:** candidates for T-004/Week 6. Select one and record the decision under OD-005 before implementation.
- **Touch file selection — `@tauri-apps/plugin-dialog`:** candidate for T-002/T-003 when the import flow receives a real file picker.
- **Fuzzy library search — `fuse.js`:** candidate for T-010/Week 13 when title, composer, instrument, and tag search is implemented.
- **Stroke smoothing — `perfect-freehand`:** optional candidate for T-005 if the custom pointer pipeline does not meet the smoothness requirement.
- **Annotated PDF export — `pdf-lib`:** candidate for T-018 when compositing saved vector strokes into printable PDF files.
- **Audio probing/playback — Symphonia:** candidate for T-012/T-013 if browser/Tauri media playback is insufficient. It supports WAV by default and requires feature flags for MP3, so it should be evaluated when audio playback begins. [Symphonia documentation](https://docs.rs/symphonia/latest/symphonia/)

Libraries already used by the Week 3 foundation are `serde`, `serde_json`, `infer`, and `uuid`. The `infer` crate handles content-based file-type detection using magic signatures. [infer documentation](https://docs.rs/infer/latest/infer/)

### Annotation data model and service interfaces

Annotations are organized by score and page for both PDF and MusicXML. Each page contains an ordered collection of independent vector strokes. A stroke stores its tool type, color, width, opacity, and page-relative points. This preserves independent editing, undo/redo, erasing, zoom/pan alignment, and annotated-PDF export. A rendered page image may be added as a cache later, but vector strokes remain the source of truth.

Persistence interfaces use explicit operations rather than an ambiguous create-or-update `save` operation. Score and setlist repositories expose `create`, `get`, `update`, `delete`, and list/search operations as appropriate. Annotation persistence supports loading a score’s page-organized document, replacing a document, and adding, updating, or deleting individual strokes. Application services own workflows such as importing a file or creating a setlist; UI components do not call repositories directly.

The Tauri bridge covers the complete local-data lifecycle. On startup, application services load the library, setlists, settings, and required metadata through explicit load commands. Importing a score is distinct from opening one: import validates and copies a new source file into managed storage, while opening or loading an existing score resolves its managed file for the appropriate renderer without creating another copy.

The initial command boundary includes these domain operations:

- `import_score_file` — validate a PDF or MusicXML source and copy it into managed score storage.
- `load_library` and `save_library` — load or atomically persist library metadata.
- `load_setlists` and `save_setlists` — load or atomically persist setlist data.
- `resolve_score_file` — return the managed file reference for opening an existing score.
- `load_annotations` and `save_annotations` — load or atomically persist a score’s page-organized annotation document.
- `link_audio_file` — validate and associate an external local MP3/WAV path with a score without copying it initially.
- `load_audio_link` and `check_audio_link` — retrieve an audio association and report whether its local file is still available.
- `load_settings` and `save_settings` — load or atomically persist application settings.

Audio playback remains an application service concern. The bridge provides a safe local audio reference and availability status; the playback layer controls play/pause, tempo where applicable, and current playback state. Rust derives managed destinations and validates local paths rather than exposing arbitrary filesystem read/write commands.

## Hard constraints

- Offline-first and self-contained. No cloud backend, required account, or proprietary API.
- Target Windows 10/11 and Linux x86_64.
- Use local filesystem storage for imported scores, metadata, setlists, audio links, and annotations.
- Preserve user data across application launches.
- Prefer standard keyboard HID events for foot pedals: PageUp, PageDown, Left, Right, and Space.
- Keep the initial audio scope to MusicXML pitch/tempo reference playback; advanced mixing and metronome functionality are optional.
- Do not claim hardware compatibility that has not been tested. Record the OS, device, and input method for hardware evidence.
- Existing unrelated user changes in the repository must be preserved.

## Requirements

### Functional requirements

| ID | Requirement | Priority | Acceptance signal |
|---|---|---:|---|
| FR-01 | Import and open multi-page PDF scores. | Must | A sample PDF opens and every page can be viewed. |
| FR-02 | Import and open MusicXML scores using a reliable notation renderer. | Must | A sample MusicXML file renders as readable notation. |
| FR-03 | Render scores crisply with zoom, pan, page caching, and high-DPI-aware scaling. | Must | Zoom/pan remain usable without unacceptable visual degradation or page reload delays. |
| FR-04 | Adapt layout to orientation: one page in portrait and a two-page spread in landscape. | Must | Resizing or rotating the window changes layout correctly and preserves the current position. |
| FR-05 | Navigate pages with touch tap/edge zones and configurable keyboard/HID pedal keys. | Must | Forward/back navigation works through both input paths. |
| FR-06 | Provide pen, highlighter, and eraser annotation tools. | Must | A user can create, modify/remove, and distinguish these stroke types. |
| FR-07 | Use pen-versus-touch input differentiation for palm rejection. | Must | Touch/palm contact does not create ink while pen input is active; behavior is documented where hardware differs. |
| FR-08 | Smooth raw pen input into fluid vector strokes and support coordinate transforms during zoom/pan. | Must | Fast strokes remain visually continuous and stay aligned with the score after viewport changes. |
| FR-09 | Persist annotations non-destructively and associate them with pages in PDF and MusicXML scores. | Must | Closing and reopening the app restores annotations at the same score-page locations. |
| FR-10 | Provide undo/redo for annotation changes. | Should | At least the latest stroke operations can be undone and redone. |
| FR-11 | Organize scores in a local library with metadata and fuzzy search by title, composer, instrument, or tag. | Must | Search returns matching imported scores without network access. |
| FR-12 | Create, reorder, open, and navigate a setlist as an ordered program. | Must | A setlist can be performed across multiple pieces without returning to the library for each piece. |
| FR-13 | Synthesize and play MusicXML notes with play/pause and tempo control. | Must | A standard sample score produces audible notes at the selected tempo. |
| FR-14 | Link external MP3/WAV audio tracks to PDF scores for practice playback. | Should | A linked local audio file can be selected and played from its score. |
| FR-15 | Provide a clear, touchscreen-first interface suitable for rehearsal and performance. | Must | Primary controls are usable by touch and do not obstruct score reading. |
| FR-16 | Export a PDF with saved annotations composited over the score for printing. | Must | A user can export an annotated PDF, open it in a standard PDF viewer, and print it with annotations visible. |

### Non-functional requirements

- **Offline:** Core workflows work with network access disabled.
- **Responsiveness:** Page turns and input handling should feel immediate in performance use. Measure meaningful latency where feasible rather than relying only on subjective claims.
- **Reliability:** A crash or normal restart must not silently discard saved scores, setlists, or annotations.
- **Performance:** Avoid unnecessary re-rendering during pen input; batch visual updates appropriately, such as with `requestAnimationFrame`.
- **Accessibility/usability:** Controls have visible states, reasonable touch targets, keyboard alternatives where practical, and readable contrast.
- **Maintainability:** Keep rendering, input, persistence, library/setlist, and audio responsibilities separable and testable.
- **Privacy:** Store user content locally and do not transmit score, annotation, or audio data.
- **Buildability:** Development and build instructions must remain accurate for Node.js 20+, npm/pnpm, Rust/Cargo, and required Tauri system runtimes.

## Definition of done for the final demonstration

The project is demonstration-ready when a user can, entirely offline:

1. Import a multi-page PDF and a MusicXML score into the library.
2. Add the scores to a custom setlist and move through pages with touch controls and a Bluetooth pedal or keyboard-pedal equivalent.
3. Switch smoothly between portrait single-page and landscape dual-page views.
4. Draw pen and highlighter annotations, erase them, and see them persist after relaunch; palm rejection works on the tested stylus device.
5. Play back a MusicXML score with synthesized notes and basic playback controls.

Stretch goals, including a visual metronome, must not displace the definition-of-done features without an explicit scope change.

## Semester timeline and weekly lookup

The proposal allocates 126 hours across 14 weeks at approximately 9 hours per week. When the owner says, for example, “I am working on Week 5,” an agent should use the matching row below as the default scope, inspect the linked task IDs, and report any incomplete prerequisite work before implementing.

| Week | Milestone | Planned work | Hours | Task IDs |
|---:|---|---|---:|---|
| 3 | Project setup and architecture | Initialize Tauri + React + TypeScript; establish cross-platform build path and local storage architecture. | 9 | T-001 |
| 4 | Requirements and UI/UX wireframing | Finalize requirements; design touchscreen-first wireframes; implement responsive layout shell. | 9 | T-002 |
| 5 | PDF score rendering engine | Integrate PDF rendering; add page caching, zoom/pan, and high-DPI viewport scaling. | 9 | T-003 |
| 6 | MusicXML parsing and dynamic layout | Integrate MusicXML renderer; parse files; reflow notation with window dimensions. | 9 | T-004 |
| 7 | Technology prototype demonstration | Demonstrate PDF/MusicXML rendering and basic page flipping on a 2-in-1 device. | 9 | T-003, T-004, T-008 |
| 8 | Inking engine: vector stroke pipeline | Add canvas/SVG annotation layer, pointer capture, stroke smoothing, and variable pen width. | 9 | T-005 |
| 9 | Inking tools and palm rejection | Add pen, highlighter, eraser, pointer filtering, and undo/redo. | 9 | T-006 |
| 10 | Annotation serialization and persistence | Define and implement local annotation serialization for PDF and MusicXML pages. | 9 | T-007 |
| 11 | Orientation and page turning | Add automatic portrait/landscape layout, touch edge zones, and page-flip behavior. | 9 | T-008 |
| 12 | Bluetooth pedal and input integration | Add configurable HID keybindings, debouncing, and physical hardware testing. | 9 | T-009 |
| 13 | Library and setlist management | Add folder indexing, metadata extraction, fuzzy search, setlist ordering, and continuous flow. | 9 | T-010, T-011 |
| 14 | Audio synthesis and playback | Add MusicXML synthesis, play/pause, and tempo adjustment; link PDF audio where capacity permits. | 9 | T-012, T-013 |
| 15 | Polish, benchmarking, and testing | Test on three touchscreen laptops where available; optimize performance and fix edge cases. | 9 | T-014, T-015 |
| 16 | Final requirements and presentation | Complete final requirements/reflection materials and live demonstration checklist. | 9 | T-016 |

### Weekly planning protocol

For a week-specific request, an agent should:

1. Find the requested week in the timeline.
2. Read the associated task entries and their dependencies.
3. Compare their current statuses with the requested milestone.
4. Propose or perform only the work that fits that week’s milestone and available capacity.
5. Update task evidence and the change log when work is completed or the schedule changes.

If the calendar week and proposal week no longer align, preserve the original milestone labels and add a schedule change-log entry rather than silently renaming or skipping a milestone.

## Task register

Update the status, owner/date, and evidence fields when work progresses. Keep completed tasks in the register for traceability.

### Foundation and rendering

- [x] **T-001 — Repository and Tauri architecture** · Depends on: —  
  Acceptance: frontend and Rust shell build locally; storage boundary and major feature modules are documented.  
  Owner/date: Codex / 2026-09-28  
  Change: Added shared domain types, repository implementations, application services, a minimal Cadence shell, JSON persistence commands, managed-score import/resolution, external-audio linking/loading, and the typed Tauri bridge adapter. Setlists use stable score IDs; annotations remain page-organized vector strokes; repositories use explicit create/update/delete operations. Startup loading is intentionally deferred.
  Evidence: `npm run build`, `npm run lint`, `npm run test:contracts`, `cargo test --manifest-path src-tauri/Cargo.toml`, `cargo fmt --check --manifest-path src-tauri/Cargo.toml`, and `cargo check --manifest-path src-tauri/Cargo.toml` pass. `npm run tauri build` produced `src-tauri/target/release/bundle/deb/Cadence_0.1.0_amd64.deb` and `src-tauri/target/release/bundle/rpm/Cadence-0.1.0-1.x86_64.rpm`. See [Initial architecture boundaries](#initial-architecture-boundaries).
  Remaining: None for T-001. Startup loading and feature-specific workflows proceed under later tasks.
- [ ] **T-002 — Touchscreen-first application shell** · Depends on: T-001  
  Acceptance: responsive shell supports score view, library, setlist, and primary controls in portrait and landscape.  
  Evidence: _Add screenshot/manual test or test file._
- [ ] **T-003 — PDF rendering** · Depends on: T-001  
  Acceptance: multi-page PDFs render with page navigation, zoom, pan, caching, and high-DPI scaling.  
  Evidence: _Add sample and verification steps._
- [ ] **T-004 — MusicXML rendering** · Depends on: T-001  
  Acceptance: standard MusicXML imports and renders with layout reflow on viewport changes.  
  Evidence: _Add sample and verification steps._

### Annotation and navigation

- [ ] **T-005 — Vector inking pipeline** · Depends on: T-003 or T-004  
  Acceptance: pen events become smooth, score-aligned vector strokes with zoom/pan coordinate transforms.  
  Evidence: _Add performance/manual test details._
- [ ] **T-006 — Annotation tools and palm rejection** · Depends on: T-005  
  Acceptance: pen, highlighter, eraser, pointer filtering, and undo/redo work on tested hardware.  
  Evidence: _Record device, OS, and test result._
- [ ] **T-007 — Annotation persistence** · Depends on: T-005  
  Acceptance: versioned local serialization restores page-organized vector strokes for PDF and MusicXML pages after relaunch.  
  Evidence: _Add format/schema and restart test._
- [ ] **T-008 — Orientation and page-turn engine** · Depends on: T-003, T-004  
  Acceptance: portrait single-page and landscape two-page views, touch edge zones, and page-flip behavior work together.  
  Evidence: _Add viewport/device test details._
- [ ] **T-009 — Pedal and keyboard input integration** · Depends on: T-008  
  Acceptance: configurable standard HID keys navigate reliably with debouncing and documented fallback behavior.  
  Evidence: _Record pedal/keyboard, OS, mappings, and test result._

### Library, setlists, and audio

- [ ] **T-010 — Offline library and metadata search** · Depends on: T-001, T-003, T-004  
  Acceptance: imported scores are indexed locally and searchable by required metadata fields.  
  Evidence: _Add fixture and search test._
- [ ] **T-011 — Setlist management** · Depends on: T-010, T-008  
  Acceptance: users can create, reorder, save, reopen, and perform setlists across pieces.  
  Evidence: _Add workflow test._
- [ ] **T-012 — MusicXML audio playback** · Depends on: T-004  
  Acceptance: standard MusicXML notes produce synthesized playback with play/pause and tempo control.  
  Evidence: _Record sample, browser/runtime, and manual or automated test._
- [ ] **T-013 — PDF audio-track linking** · Depends on: T-010  
  Acceptance: local MP3/WAV files can be associated with and played from PDF scores.  
  Evidence: _Add fixture and playback test._
- [ ] **T-018 — Annotated PDF export** · Depends on: T-003, T-005, T-007  
  Acceptance: saved annotations can be composited over PDF pages and exported as a printable PDF without modifying the original score.  
  Evidence: _Add annotated fixture, export steps, and verification in a standard PDF viewer/printer workflow._

### Validation and delivery

- [ ] **T-014 — Offline, persistence, and failure-path validation** · Depends on: T-007, T-010, T-011, T-012  
  Acceptance: core workflows work offline; malformed files and missing media fail safely; saved data survives relaunch.  
  Evidence: _Add test matrix and results._
- [ ] **T-015 — Cross-platform and hardware testing** · Depends on: T-009, T-014  
  Acceptance: rehearsal workflow tested on available Windows/Linux touchscreen devices; limitations are recorded.  
  Evidence: _Add device/OS matrix._
- [ ] **T-016 — Performance, polish, and final demonstration** · Depends on: T-015  
  Acceptance: critical performance issues are addressed, build instructions work, and the final demo checklist passes.  
  Evidence: _Add benchmark/build/demo notes._
- [ ] **T-017 — Optional metronome stretch goal** · Depends on: T-016  
  Acceptance: visual metronome is implemented only if core requirements are complete and capacity remains.  
  Evidence: _Add scope decision and test._

## Task update template

When changing a task, preserve its ID and use this format in the task entry or change log:

```text
Status: [~] In progress
Owner/date: <agent or person> / YYYY-MM-DD
Change: <what changed>
Evidence: <tests, commands, screenshots, device/OS, or file links>
Remaining: <next step or blocker>
```

### Resolved decisions

- **OD-001 — Canonical score storage location:** resolved in favor of copying imported PDF and MusicXML files into app-managed storage. Original files are preserved, and their paths may be retained as provenance metadata.
- **OD-006 — Initial persistence engine:** resolved in favor of separate local JSON files behind persistence interfaces, with future migration to SQLite planned without changing UI or domain-service contracts.
- **OD-002 — MusicXML annotation anchor:** resolved in favor of page anchors, matching PDF behavior. Measure-level anchoring is out of scope for the initial MusicXML workflow.

## Open decisions and assumptions

Record questions that materially affect implementation. Do not hide them in code comments only.

- **OD-003 — Supported audio formats/runtime:** confirm the minimum supported MP3/WAV behavior across Tauri webviews.
- **OD-004 — Hardware test matrix:** record which Windows/Linux devices and styluses are actually available before claiming cross-platform support.
- **OD-005 — Renderer choice:** use the currently working renderer in the repository; document any change between OpenSheetMusicDisplay and Verovio with a decision entry.

Future work:

- Add native Linux tablet input support through the Wacom/libinput stack when
  reliable pen-versus-touch classification is required in the Tauri WebKitGTK
  runtime.

## Specification change log

Add newest changes at the top. Each entry should explain why the change was made and which requirements/tasks it affects.

| Date | Author/agent | Change | Reason / impact |
|---|---|---|---|
| 2026-10-14 | Codex | Connected the typed Tauri command client to the official @tauri-apps/api runtime through a frontend CadenceApi, added managed-score deletion, and validated JSON persistence payloads in Rust. | Makes the existing filesystem middleware callable from the frontend for startup loading, score import/open/remove, audio linking/checks, and all repository-backed data operations while preserving the domain-oriented filesystem boundary. npm run build, npm run lint, npm run test:contracts, cargo fmt --check, and cargo check pass. |
| 2026-09-28 | Codex | Added a planned-library candidate list for PDF rendering, MusicXML rendering, file dialogs, fuzzy search, stroke smoothing, annotated-PDF export, and audio probing. | Gives later weeks named options while keeping renderer and runtime choices open until their tasks begin. |
| 2026-09-28 | Codex | Audited project requirements and added `infer` for content-based MP3/WAV detection and `uuid` for stable score IDs. Deferred PDF, MusicXML, search, and playback libraries until their scheduled tasks. | Uses established libraries for current foundation needs without prematurely expanding later milestone scope. |
| 2026-09-28 | Codex | Fixed bridge payload compatibility with explicit camelCase Serde serialization and changed audio linking to detect MP3/WAV from file headers instead of requiring a user-supplied format. | Prevents runtime import/audio-link field mismatches and rejects unsupported or misleadingly named audio files. |
| 2026-09-28 | Codex | Fixed JSON replacement for Windows by using a same-directory backup-and-swap path when replacing existing files, with restoration on replacement failure. | Prevents subsequent library, setlist, annotation, audio, and settings updates from failing on a supported platform. |
| 2026-09-28 | Codex | Completed T-001 by wiring repositories to the Tauri adapter, adding persistence contract tests, and verifying the Tauri production build. | Confirms the Week 3 frontend/Rust foundation and local persistence boundary are buildable. |
| 2026-09-28 | Codex | Scaffolded the remaining Tauri/Rust boundary for managed score import/resolution, external audio links, JSON persistence commands, and typed TypeScript invocation adapters; intentionally deferred startup loading. | Completes the Week 3 platform boundary without expanding the scope into application lifecycle integration. |
| 2026-09-28 | Codex | Implemented Week 3 foundation scaffolding: shared domain types, explicit repository interfaces, application services, Cadence shell placeholders, and initial Rust JSON storage commands. | Advances T-001 while leaving score rendering, annotation input, and full workflows for their scheduled milestones. |
| 2026-09-28 | Codex | Expanded the Tauri boundary to cover startup loading, score import versus opening, managed-file resolution, and external audio linking/loading. | Ensures local score, metadata, annotation, settings, and audio lifecycles are represented before implementation. |
| 2026-09-28 | Codex | Resolved annotations as page-organized vector strokes for both PDF and MusicXML, resolved page anchors for MusicXML, and specified explicit repository create/update/delete operations. | Keeps annotation behavior consistent across score formats and supports editing, persistence, and printable export. |
| 2026-09-28 | Codex | Resolved initial score storage in favor of app-managed copies, selected JSON files behind persistence interfaces with future SQLite migration, and added FR-16/T-018 for printable annotated-PDF export. | Clarifies local data ownership and adds the requested printing workflow without modifying original score files. |
| 2026-09-28 | Codex | Recorded initial architecture boundaries and decisions: one shared score model, ID-based setlists, renderer-independent annotations, interface-first persistence, and explicit domain-oriented Tauri commands. | Establishes the Week 3 architecture agreed during planning; affects T-001 and future persistence/library/setlist/annotation work. |
| 2026-09-28 | Codex | Created living agent specification; converted proposal features into FR-01–FR-15 and T-001–T-017. | Establishes traceable implementation and acceptance workflow. |

## Evidence and change discipline

- Prefer tests and reproducible commands over statements such as “works.”
- For UI, input, audio, and hardware behavior that cannot be fully automated, record a short manual test with device, OS, steps, and result.
- Update requirements before implementation when scope changes; update acceptance criteria when the meaning of “done” changes.
- Keep this document concise enough to consult on every task. Put detailed design notes in code or a separate decision record and link them here.
- Never mark a task done solely because a dependency was installed, a component was created, or a happy-path demo was observed.
