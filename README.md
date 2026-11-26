# ATELIER CANVAS

> Browser-based interactive vector, UI & design-system studio with Figma-style direct manipulation, smart snap alignment guides, live Design Token morphing, Dev Mode React 19 / Tailwind CSS v4 codegen, vector SVG / 2x PNG export, and Yjs CRDT multiplayer sync.

Built by **Truong Van Tinh** ([github.com/tvt987](https://github.com/tvt987)).

## Key Capabilities

- **60fps Infinite Pan & Zoom Canvas**: Pixel-accurate `screenToCanvas` / `canvasToScreen` coordinate transforms, infinite architectural dot-grid, synchronized dynamic top/left pixel rulers, `Space + Drag` / Middle-Mouse / Hand tool panning, wheel cursor-anchored zooming (`25%–300%`), and `Fit to Screen`.
- **Direct Canvas Manipulation**:
  - Single-key Figma shortcuts: `V` Select / Marquee Multi-Select, `H` Hand, `F` Frame, `R` Rectangle, `O` Ellipse, `T` Text (with inline canvas double-click editing), `B` Button, `G` Glassmorphism Blur Card, `L` Vector Line.
  - 8-point resize handles, live rotation handle (`Shift` snaps `15°`), real-time dimension pill, and glowing magenta (`#F43F5E`) **Smart Alignment Snap Guides** with exact pixel spacing callouts.
  - Immutable Undo / Redo history stack (`Ctrl+Z` / `Ctrl+Shift+Z`), Duplicate (`Ctrl+D`), Arrow-key `1px` / `Shift+Arrow` `10px` nudge, Z-order controls, Lock / Visibility toggles, and 6-way Align toolbar.
- **4 Art-Directed Curated Templates**:
  1. `01. Spatial FinTech App UI` (default opening artboard)
  2. `02. Swiss Exhibition Poster`
  3. `03. AI SaaS Hero Landing`
  4. `04. Design System Token Sheet`
- **Live Design Tokens Engine & Brand Morphing**: Bind fills, gradients, strokes, text colors, and corner radii to semantic tokens (`--brand-primary`, `--brand-accent`, `--surface-card`, `--radius-base`, etc.) and instantaneously re-theme the entire canvas across 4 brand presets (*Obsidian Electric*, *Swiss Editorial Vermilion*, *Apple Frosted Light*, *Tokyo Bauhaus*).
- **Figma-Style `DEV MODE` & Export Studio**:
  - Toggle `DESIGN` / `DEV MODE` (`Shift+D`) to display exact artboard edge redline measurements (`top`, `right`, `bottom`, `left` in `px`) and live **React 19 + Tailwind CSS v4**, **Pure CSS**, and **W3C Design Tokens JSON** code generation.
  - Export standalone vector `.svg`, rasterized `2x .png` via offscreen high-DPI `<canvas>`, production `.tsx`, and `.json` tokens.
- **Yjs CRDT Multiplayer + `CMD+K` Command Bar**:
  - Backed by `yjs` (`Y.Doc` + `BroadcastChannel('atelier-canvas-yjs-v1')`) for conflict-free multi-tab sync plus a 1-click **Simulate Co-Designer** cursor presence mode.
  - `Ctrl+K` / `Cmd+K` generative command bar, bilingual `EN / VI` interface switch, and View Transitions API chrome toggle (*Obsidian Dark* ↔ *Light Studio*).

## Architecture

```text
src/
├── types/canvas.ts           # Canonical typed schema (Nodes, Artboard, Tokens, Viewport)
├── engines/
│   ├── viewport.ts           # Screen/canvas math, cursor-anchored zoom, ruler ticks
│   ├── snap.ts               # 6px smart alignment snap & sibling spacing callouts
│   ├── history.ts            # Immutable Undo/Redo command history stack
│   ├── tokens.ts             # 4 brand theme morphs, token style resolver, W3C JSON
│   ├── templates.ts          # 4 art-directed pre-built artboard compositions
│   ├── codegen.ts            # React 19 + Tailwind v4, Pure CSS, and redline specs
│   ├── exporter.ts           # Standalone SVG serializer & 2x high-DPI PNG rasterizer
│   ├── collab.ts             # Yjs CRDT BroadcastChannel sync & co-designer cursor
│   ├── commands.ts           # CMD+K generative design command registry
│   └── __tests__/            # Vitest unit test suite
├── components/
│   ├── TopBar.tsx            # Studio header, templates, DESIGN/DEV switch, presence
│   ├── ToolDock.tsx          # Vertical 9-tool precision dock
│   ├── LayersPanel.tsx       # Hierarchical layer stack with lock/visibility/z-order
│   ├── CanvasStage.tsx       # Interactive infinite stage, rulers, handles & redlines
│   ├── InspectorPanel.tsx    # Design inspector, Tokens studio & Dev Mode codegen
│   ├── CommandPalette.tsx    # CMD+K generative action bar
│   └── ExportModal.tsx       # Live SVG preview & multi-format export studio
└── i18n/labels.ts            # Bilingual EN / VI chrome copy
```

## Development & Verification

```bash
npm ci
npm test        # Vitest unit suite
npm run build   # TypeScript strict check (tsc -b) + Vite 6 production build
npm run preview # Local preview at http://localhost:4173/atelier-canvas/
```
