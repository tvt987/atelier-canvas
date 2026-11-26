# ATELIER CANVAS v3.0

> Production-grade browser Vector, Photography, Multi-Screen Prototyping & Design-System Studio (**Figma Pro × Framer × Linear**) featuring real studio photography with GPU color grading, multi-artboard screen-to-screen prototype flows, interactive **3D Stack** layer depth explode view, `Alt`-hover inter-node spacing measurement, unified multi-select group drag, Vector Bezier Pen (`P`), Auto-Layout Flex containers, WCAG 2.1 AAA Contrast Auditor, local-first auto-save + `.atelier.json` project files, Framer Motion + Tailwind v4 codegen, and Yjs CRDT multiplayer.

Built by **Truong Van Tinh** ([github.com/tvt987](https://github.com/tvt987)).

## Key Capabilities in v3.0

- **Real Photography Layer Engine (`I` Tool + Local Drag-and-Drop + GPU Color Grading)**:
  - Drag and drop local PNG/JPG/WebP files directly onto the canvas, upload via the dock/Assets rail, or insert from the **Curated Studio Photography Shelf** (6 Hasselblad luxury `.webp` photographs).
  - Live non-destructive GPU filter grading (`Brightness`, `Contrast`, `Saturation`, `Grayscale`, `Photo Blur`), `Cover / Contain` object-fit switching, corner-radius masking, and Template **`05. Luxury Editorial Campaign`**.
- **True Multi-Artboard Canvas & Screen-to-Screen Prototype Flows**:
  - Default **`01. Spatial FinTech App UI`** opens with **2 connected artboards** side-by-side (`01 · Treasury Overview` → `02 · Instant Transfer Checkout`).
  - Glowing cross-artboard SVG prototype noodles link interactive triggers (`navigate_artboard` with `Slide Left`, `Dissolve`, `Spring Scale` transitions), executing live screen-to-screen navigation inside the **Fullscreen Presentation Player** (`Floating Studio`, `MacBook Pro`, `iPhone 16 Pro` bezels).
- **Precision Direct Manipulation + Isometric `3D Stack` Depth Explode View**:
  - **`Alt`-Hover / `Measure` Spacing Redlines**: Measure exact pixel gaps between any selected object and hovered sibling.
  - **Unified Multi-Select Group Drag**: Move multiple selected layers in lockstep with a single atomic Undo commit.
  - **`3D Stack` Mode**: Transform the active artboard into an interactive isometric 3D Z-index layer stack (`rotateX` / `rotateZ` pointer orbit + adjustable layer Z-spread) to inspect stacking depth live.
- **Local-First Persistence & `.atelier.json` Project Files**:
  - Automatic debounced `localStorage` persistence with live **`Saved`** indicator, **`Save .atelier.json`**, schema-validated **`Open File`**, named **Version Milestones**, and **`Reset Workspace`**.
- **Full v2 Pro Foundation Retained**: Vector Bezier Pen (`P`), Auto-Layout Flex frames, 10-Component Pro UI Assets Kit, Live WCAG 2.1 AAA Contrast Auditor & Auto-Fix, Framer Motion + Tailwind CSS v4 + Pure CSS + W3C JSON Codegen, Standalone Animated HTML / SVG / 2x-3x PNG Export, Right-Click Context Menu, Collapsible Multi-Artboard Minimap, Yjs CRDT multiplayer, `CMD+K`, `EN / VI`, and Obsidian/Light View Transitions chrome.

## Scripts & Verification

```bash
npm ci
npm test        # Vitest unit suite (18 tests across all v3.0 engines)
npm run build   # Strict TypeScript check (tsc -b) + code-split Vite 6 production build
npm run preview # Local preview at http://localhost:4173/atelier-canvas/
```
