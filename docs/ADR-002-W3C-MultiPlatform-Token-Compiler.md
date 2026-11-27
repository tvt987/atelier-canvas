# ADR-002: W3C DTCG Multi-Platform Design Token Compiler & WCAG 2.1 Parity Architecture

- **Status**: Accepted
- **Date**: 2026-11-28
- **Author**: Truong Van Tinh (Principal Solution Architect)
- **Scope**: `src/engines/tokenCompilerEngine.ts`, `src/components/TokenCompilerModal.tsx`, `backend/src/AtelierCanvas.Domain/Services/W3CTokenValidator.cs`, `backend/src/AtelierCanvas.Domain/Services/MultiPlatformTokenCompiler.cs`, `backend/src/AtelierCanvas.Domain/Services/WcagContrastAuditor.cs`

## 1. Context

Enterprise product organizations maintain a single brand design system across **Web (Tailwind CSS v4)**, **TypeScript/React**, **iOS (SwiftUI)**, and **Android (Jetpack Compose)**. Manually translating hex palettes, spacing grids, radius scales, and typography specs across 4 codebases causes drift, broken dark/light mode mappings, and silent WCAG 2.1 accessibility regressions.

Atelier Canvas v5.0 requires:
1. Instant browser-side compilation inside a lazy-loaded **Multi-Platform Token Compiler Modal** so designers see all 4 outputs recompile live as themes morph (`Obsidian Pro`, `Swiss Editorial Light`, `Cyber Emerald`).
2. Authoritative CI/CD-ready compilation via **`POST /api/v1/tokens/compile`** in `.NET 10` so build pipelines can validate W3C DTCG JSON payloads, reject malformed hex/dimension inputs (`400 Bad Request`), and enforce WCAG 2.1 contrast thresholds automatically.

## 2. Decision

We implement a **Dual-Parity Deterministic Compiler** sharing an identical W3C DTCG normalization model across TypeScript (browser interactive studio) and C# / `.NET 10` (headless API & CI pipeline):

### Input Normalization (`W3CTokenValidator` / `hydrateDesignTokens`)
- Accepts both hierarchical W3C Design Tokens Community Group (DTCG) `$value`/`$type` JSON documents and flat semantic token presets.
- Normalizes shorthand 3-digit (`#F0A`) and lowercase hex strings into canonical uppercase 6-digit sRGB (`#FF00AA`), rejecting invalid hex values or out-of-range pixel dimensions with structured error arrays.
- Automatically classifies theme polarity (`dark` vs `light`) using WCAG 2.1 relative luminance (`L(surfaceCanvas) > 0.42`).

### Four Production Compilation Targets
| Target ID | Filename | Platform Idioms Enforced |
| :--- | :--- | :--- |
| `css` (`tailwind-v4`) | `<slug>.theme.css` | `@import "tailwindcss";` + `@theme { --color-*, --font-*, --spacing-*, --radius-*, --shadow-* }` |
| `typescript` | `<slug>.tokens.ts` | Deeply immutable `as const` literal object + derived `keyof` union types (zero `any`) |
| `swiftui` | `<Pascal>Theme.swift` | `import SwiftUI`, `Color(atelierHex: 0xRRGGBB)` sRGB initializer, `CGFloat` spacing/radii extensions, `AtelierTypography` |
| `compose` | `Theme.kt` | Material 3 `darkColorScheme` / `lightColorScheme` auto-selected by surface luminance, `Color(0xFFRRGGBB)`, `.dp`, `.sp`, `@Composable fun AtelierTheme` |

### Integrated WCAG 2.1 Luminance Contrast Auditor
- Both TypeScript (`src/engines/wcag.ts`) and `.NET 10` (`WcagContrastAuditor.cs`) implement the exact W3C sRGB linearization formula (`s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055)^2.4`) and relative luminance weights (`0.2126 R + 0.7152 G + 0.0722 B`).
- Every compilation returns a 5-pair contrast audit (`Primary Text / Canvas`, `Primary Text / Card`, `Muted Text / Card`, `White Ink / Brand Primary`, `Brand Accent / Canvas`) graded into `AAA` (`>= 7.0`), `AA` (`>= 4.5`), `AA-Large` (`>= 3.0`), or `FAIL`, alongside `aaPassCount` and `passRatePercent`.

## 3. Consequences

### Positive
- **Zero drift between design tool and CI/CD**: The exact tokens previewed in the browser modal compile to identical semantic primitives in `.NET 10`.
- **Lazy-loaded performance**: `TokenCompilerModal` (`10.66 kB` raw / `2.86 kB` gzip) and `DesignTokensStudio` (`11.75 kB` raw / `2.81 kB` gzip) are code-split via `React.lazy`, adding `0 kB` to initial startup JS.
- **Strict accessibility visibility**: Designers and CI gates immediately see exact contrast ratios (e.g., `18.6:1 AAA` for Obsidian Pro primary text on canvas) before shipping tokens to iOS, Android, and Web.

### Trade-offs & Mitigations
- **Maintaining TS + C# emitter parity**: Keeping two emitters requires discipline when adding new token categories. This is mitigated by mirrored unit test suites (12 Vitest compiler tests + 12 xUnit API/WCAG tests) asserting identical hex formatting, polarity detection, and luminance math on both sides.
