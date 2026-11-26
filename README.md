# ATELIER CANVAS v2.0

> Next-generation browser-based Vector, UI, Interactive Prototyping & Design-System Studio (**Figma Pro × Framer × Linear**) with 3 dedicated studio modes (`DESIGN` · `PROTOTYPE` · `DEV MODE`), Vector Bezier Pen, Auto-Layout Flex Containers, 10-Component Pro UI Assets Kit, Live WCAG 2.1 AAA Contrast Auditor, Fullscreen Device-Bezel Prototype Player, Framer Motion + Tailwind CSS v4 Codegen, Standalone Animated HTML / SVG / 3x PNG Export, and Yjs CRDT Multiplayer Sync.

Built by **Truong Van Tinh** ([github.com/tvt987](https://github.com/tvt987)).

## What's Inside v2.0

- **3 Full Pro Modes (`DESIGN` `Shift+1` · `PROTOTYPE` `Shift+2` · `DEV MODE` `Shift+3`)**:
  - **DESIGN**: 60fps infinite pan/zoom canvas with synchronized top/left pixel rulers, floating interactive **Canvas Minimap** with draggable viewport lens, 10 tools (`V`, `H`, `P` Vector Bezier Pen, `F` Auto-Layout Frame, `R`, `O`, `T`, `B`, `G`, `L`), 8-point resize + rotation handles, `6px` magenta Smart Snap Guides with distance callouts, and Right-Click Canvas Context Menu.
  - **PROTOTYPE**: Configure entrance choreography (`Fade Up`, `Spring Scale`, `Slide Left`, `Elastic Pop`, `Float Levitate`, `Shimmer Glow`), duration/delay/easing, hover springs (`Lift + Glow`, `Scale 1.03`, `Glass 3D Tilt`), and click triggers (`Interactive Toast`, `Pulse Target Layer`, `Switch Template`, `Morph Brand Theme`) with live canvas flow noodles + **Cinematic Fullscreen Presentation Player** featuring **`Floating Studio`**, **`MacBook Pro`**, and **`iPhone 16 Pro`** device bezels!
  - **DEV MODE**: Pixel-exact artboard edge redlines, **WCAG 2.1 Contrast Audit**, and automatic **React 19 + Tailwind CSS v4 + Framer Motion (`motion.div` / `motion.button`)**, **Pure CSS (`@keyframes`)**, and **W3C Design Tokens JSON** code generation.
- **Vector Bezier Pen (`P`) & Auto-Layout Flex Engine**:
  - Plot points directly on canvas (`Enter` / double-click to finish) to generate smooth Catmull-Rom Cubic Bezier SVG curves with customizable dash style, glow, and arrowheads.
  - Toggle **Auto-Layout Flex** (`Row` / `Column`, `Gap`, `Padding`, `Align`) on any Frame container to deterministically reflow contained layers.
- **Dual-Tab Left Rail (`Layers` with Instant Search + `Assets` 10-Component Pro UI Kit)**:
  - 1-click insert token-bound widgets including *KPI Sparkline Metric Card*, *Glass Pricing Tier Card*, *Interactive Toggle Pill*, *Avatar Stack & Presence Pill*, *Floating App Navbar*, *Editorial Display Hero*, *Terminal Code Card*, *Ambient Mesh Orb*, *System Alert Toast*, and *Mini Bar Analytics Widget*.
- **Live WCAG 2.1 Accessibility Auditor & Design Version Snapshots**:
  - Computes real luminance contrast ratios (`AAA` / `AA` / `FAIL`) for any text or button layer against its effective backdrop, with a 1-click **Auto-Fix AAA** (`>= 7.0:1`) button.
  - Capture and restore named **Design Version Milestones** in 1 click.
- **Export Studio v2**: Standalone Vector `.svg`, High-DPI **`2x` / `3x` `.png`**, **Standalone Animated Interactive `.html`** bundle, production `.tsx`, and W3C `.json` tokens.
- **Yjs CRDT Multiplayer + `CMD+K` Command Bar + Bilingual `EN / VI` + View Transitions Chrome Toggle**.

## Verification & Scripts

```bash
npm ci
npm test        # Vitest unit suite (17 tests across all v2.0 engines)
npm run build   # Strict TypeScript check (tsc -b) + Vite 6 production build
npm run preview # Preview at http://localhost:4173/atelier-canvas/
```
