import { useMemo, useState } from 'react';
import { Cpu, Download } from 'lucide-react';
import type { DesignTokens, DocumentState } from '../types/canvas';
import {
  COLOR_TOKEN_META,
  FLAGSHIP_V4_THEMES,
  LEGACY_V3_THEMES,
} from '../engines/tokens';
import {
  exportCssCustomProperties,
  exportW3CDesignTokensJson,
  hydrateDesignTokens,
  updateTokenSpacingUnit,
} from '../engines/designTokens';
import { downloadTextFile } from '../engines/exporter';
import type { StudioLabels } from '../i18n/labels';

interface DesignTokensStudioProps {
  doc: DocumentState;
  onUpdateTokens: (nextTokens: DesignTokens) => void;
  onOpenTokenCompiler: () => void;
  labels: StudioLabels;
}

export function DesignTokensStudio({
  doc,
  onUpdateTokens,
  onOpenTokenCompiler,
  labels,
}: DesignTokensStudioProps) {
  const [tokenExportNotice, setTokenExportNotice] = useState<string | null>(null);
  const [showLegacyThemes, setShowLegacyThemes] = useState(false);

  const tokenSystem = useMemo(() => hydrateDesignTokens(doc.tokens), [doc.tokens]);

  const flashTokenNotice = (msg: string) => {
    setTokenExportNotice(msg);
    window.setTimeout(() => setTokenExportNotice(null), 1800);
  };

  return (
    <div
      data-testid="design-tokens-studio"
      className="flex-1 overflow-y-auto studio-scroll p-3 space-y-4"
    >
      {/* Multi-Platform Compiler Launch Banner */}
      <button
        type="button"
        data-testid="btn-launch-token-compiler"
        onClick={onOpenTokenCompiler}
        className="w-full p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between gap-2 hover:brightness-110"
        style={{
          background:
            'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(6,182,212,0.16))',
          borderColor: 'rgba(6, 182, 212, 0.5)',
        }}
      >
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-white">
            <Cpu size={12} className="text-cyan-300 shrink-0" />
            <span className="truncate">Multi-Platform Token Compiler</span>
          </div>
          <div className="font-mono-tech text-[9.5px] text-cyan-200/90 mt-0.5 truncate">
            Tailwind v4 · TS · SwiftUI · Compose KT
          </div>
        </div>
        <span className="font-mono-tech text-[9px] font-bold px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-200 border border-cyan-400/35 shrink-0">
          v5.0
        </span>
      </button>

      {/* 1. Instant Theme Switcher (Obsidian Pro, Swiss Editorial Light, Cyber Emerald) */}
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <span
            className="text-[10px] font-mono-tech uppercase tracking-wider font-semibold"
            style={{ color: 'var(--studio-text-muted)' }}
          >
            {labels.brandThemesTitle}
          </span>
          <span className="font-mono-tech text-[9px]" style={{ color: 'var(--studio-cyan)' }}>
            W3C DTCG v5
          </span>
        </div>

        <div className="space-y-1.5">
          {FLAGSHIP_V4_THEMES.map((theme) => {
            const isActive = doc.tokens.id === theme.id;
            return (
              <button
                key={theme.id}
                type="button"
                data-testid={`theme-morph-${theme.id}`}
                onClick={() => onUpdateTokens(theme)}
                className="w-full p-2.5 rounded-lg border text-left transition-all cursor-pointer"
                style={{
                  backgroundColor: isActive
                    ? 'var(--studio-accent-soft)'
                    : 'var(--studio-surface-2)',
                  borderColor: isActive
                    ? 'var(--studio-accent)'
                    : 'var(--studio-border)',
                }}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold">{theme.name}</span>
                  <div className="flex items-center gap-1">
                    {[
                      theme.brandPrimary,
                      theme.brandAccent,
                      theme.surfaceCard,
                      theme.textPrimary,
                    ].map((hex, idx) => (
                      <span
                        key={idx}
                        className="w-3 h-3 rounded-full border border-white/25"
                        style={{ backgroundColor: hex }}
                      />
                    ))}
                  </div>
                </div>
                <p
                  className="text-[10px] mt-1 leading-snug"
                  style={{ color: 'var(--studio-text-secondary)' }}
                >
                  {theme.tagline}
                </p>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => setShowLegacyThemes((v) => !v)}
          className="w-full h-6 rounded border font-mono-tech text-[9.5px] cursor-pointer hover:bg-white/5"
          style={{
            borderColor: 'var(--studio-border)',
            color: 'var(--studio-text-muted)',
          }}
        >
          {showLegacyThemes ? 'Hide Studio Classic Presets' : '+3 Studio Classic Presets'}
        </button>

        {showLegacyThemes && (
          <div className="space-y-1">
            {LEGACY_V3_THEMES.filter((t) => t.id !== 'obsidian-electric').map(
              (theme) => {
                const isActive = doc.tokens.id === theme.id;
                return (
                  <button
                    key={theme.id}
                    type="button"
                    data-testid={`theme-morph-${theme.id}`}
                    onClick={() => onUpdateTokens(theme)}
                    className="w-full px-2.5 py-1.5 rounded-lg border text-left flex items-center justify-between cursor-pointer"
                    style={{
                      backgroundColor: isActive
                        ? 'var(--studio-accent-soft)'
                        : 'var(--studio-surface-2)',
                      borderColor: isActive
                        ? 'var(--studio-accent)'
                        : 'var(--studio-border)',
                    }}
                  >
                    <span className="text-[11px] font-medium">{theme.name}</span>
                    <div className="flex items-center gap-1">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: theme.brandPrimary }}
                      />
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: theme.brandAccent }}
                      />
                    </div>
                  </button>
                );
              },
            )}
          </div>
        )}
      </section>

      {/* 2. Color Primitives Ramp */}
      <section className="space-y-2 pt-2 border-t" style={{ borderColor: 'var(--studio-border)' }}>
        <div
          className="text-[10px] font-mono-tech uppercase tracking-wider font-semibold"
          style={{ color: 'var(--studio-text-muted)' }}
        >
          {labels.tokenPrimitivesTitle}
        </div>
        <div className="grid grid-cols-6 gap-1">
          {(
            [
              ['brand500', tokenSystem.primitives.brand500],
              ['accent500', tokenSystem.primitives.accent500],
              ['success500', tokenSystem.primitives.success500],
              ['warning500', tokenSystem.primitives.warning500],
              ['danger500', tokenSystem.primitives.danger500],
              ['neutral900', tokenSystem.primitives.neutral900],
            ] as const
          ).map(([key, hex]) => (
            <button
              key={key}
              type="button"
              title={`${key}: ${hex}`}
              onClick={() => {
                try {
                  void navigator.clipboard.writeText(hex);
                } catch {
                  // ignore
                }
                flashTokenNotice(`Copied ${hex}`);
              }}
              className="h-7 rounded-md border border-white/15 cursor-pointer transition-transform hover:scale-105"
              style={{ backgroundColor: hex }}
            />
          ))}
        </div>
      </section>

      {/* 3. Semantic Color Variables */}
      <section className="space-y-1.5 pt-2 border-t" style={{ borderColor: 'var(--studio-border)' }}>
        <div
          className="text-[10px] font-mono-tech uppercase tracking-wider font-semibold"
          style={{ color: 'var(--studio-text-muted)' }}
        >
          {labels.semanticTokensTitle}
        </div>
        <div className="space-y-1.5">
          {COLOR_TOKEN_META.map((meta) => {
            const value = doc.tokens[meta.key];
            return (
              <div
                key={meta.key}
                className="h-7 px-2 rounded-md border flex items-center justify-between gap-2"
                style={{
                  backgroundColor: 'var(--studio-surface-2)',
                  borderColor: 'var(--studio-border)',
                }}
              >
                <div className="font-mono-tech text-[10px] truncate">{meta.cssVar}</div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span
                    className="font-mono-tech text-[10px] uppercase"
                    style={{ color: 'var(--studio-text-muted)' }}
                  >
                    {value}
                  </span>
                  <input
                    type="color"
                    aria-label={meta.label}
                    value={value}
                    onChange={(e) =>
                      onUpdateTokens({
                        ...doc.tokens,
                        [meta.key]: e.target.value,
                      })
                    }
                    className="w-4 h-4 rounded cursor-pointer border-0 bg-transparent p-0"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 4. Typography Scale */}
      <section className="space-y-2 pt-2 border-t" style={{ borderColor: 'var(--studio-border)' }}>
        <div className="flex items-center justify-between">
          <span
            className="text-[10px] font-mono-tech uppercase tracking-wider font-semibold"
            style={{ color: 'var(--studio-text-muted)' }}
          >
            {labels.tokenTypographyTitle}
          </span>
          <select
            aria-label="Display font token"
            value={doc.tokens.fontDisplay ?? tokenSystem.typographyScale.display.fontFamily}
            onChange={(e) =>
              onUpdateTokens({
                ...doc.tokens,
                fontDisplay: e.target.value,
                typographyScale: undefined,
              })
            }
            className="h-5 px-1.5 rounded border font-mono-tech text-[9px] outline-none"
            style={{
              backgroundColor: 'var(--studio-surface-2)',
              borderColor: 'var(--studio-border)',
              color: 'var(--studio-cyan)',
            }}
          >
            {['Space Grotesk', 'Cormorant Garamond', 'Inter'].map((f) => (
              <option key={f} value={f} className="bg-slate-900 text-white">
                {f}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          {(['display', 'h1', 'h2', 'body', 'mono'] as const).map((k) => {
            const spec = tokenSystem.typographyScale[k];
            return (
              <div
                key={k}
                className="px-2 py-1 rounded-md border flex items-center justify-between"
                style={{
                  backgroundColor: 'var(--studio-surface-2)',
                  borderColor: 'var(--studio-border)',
                }}
              >
                <span
                  className="text-[11px] truncate"
                  style={{
                    fontFamily: spec.fontFamily,
                    fontWeight: spec.fontWeight,
                  }}
                >
                  {k.toUpperCase()} · {spec.fontFamily}
                </span>
                <span
                  className="font-mono-tech text-[9.5px] shrink-0"
                  style={{ color: 'var(--studio-cyan)' }}
                >
                  {spec.fontSize}px / {spec.fontWeight}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* 5. Spacing Grid (4px / 8px Base Unit) */}
      <section className="space-y-2 pt-2 border-t" style={{ borderColor: 'var(--studio-border)' }}>
        <div className="flex items-center justify-between">
          <span
            className="text-[10px] font-mono-tech uppercase tracking-wider font-semibold"
            style={{ color: 'var(--studio-text-muted)' }}
          >
            {labels.tokenSpacingTitle}
          </span>
          <div className="flex gap-1">
            {([4, 8] as const).map((unit) => (
              <button
                key={unit}
                type="button"
                data-testid={`token-spacing-unit-${unit}`}
                onClick={() => onUpdateTokens(updateTokenSpacingUnit(doc.tokens, unit))}
                className="h-5 px-1.5 rounded font-mono-tech text-[9px] font-semibold cursor-pointer"
                style={{
                  backgroundColor:
                    tokenSystem.spacingGrid.unit === unit
                      ? 'var(--studio-accent)'
                      : 'var(--studio-surface-2)',
                  color:
                    tokenSystem.spacingGrid.unit === unit
                      ? '#FFFFFF'
                      : 'var(--studio-text-muted)',
                }}
              >
                {unit}px
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-1">
          {(['xs', 'sm', 'md', 'lg', 'xl', '2xl'] as const).map((spKey) => {
            const px = tokenSystem.spacingGrid[spKey];
            return (
              <div
                key={spKey}
                className="flex items-center gap-2 font-mono-tech text-[9.5px]"
              >
                <span className="w-7" style={{ color: 'var(--studio-text-muted)' }}>
                  {spKey}
                </span>
                <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.min(100, (px / 64) * 100)}%`,
                      background: `linear-gradient(90deg, ${doc.tokens.brandPrimary}, ${doc.tokens.brandAccent})`,
                    }}
                  />
                </div>
                <span className="w-8 text-right" style={{ color: 'var(--studio-cyan)' }}>
                  {px}px
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* 6. Border Radius Scale */}
      <section className="space-y-2 pt-2 border-t" style={{ borderColor: 'var(--studio-border)' }}>
        <div
          className="p-2 rounded-md border space-y-1.5"
          style={{
            backgroundColor: 'var(--studio-surface-2)',
            borderColor: 'var(--studio-border)',
          }}
        >
          <div className="flex items-center justify-between font-mono-tech text-[10px]">
            <span>--radius-base</span>
            <span style={{ color: 'var(--studio-cyan)' }}>{doc.tokens.radiusBase}px</span>
          </div>
          <input
            type="range"
            data-testid="token-radius-slider"
            min={0}
            max={32}
            value={doc.tokens.radiusBase}
            onChange={(e) =>
              onUpdateTokens({
                ...doc.tokens,
                radiusBase: Number(e.target.value),
              })
            }
            className="w-full studio-range"
          />
          <div className="grid grid-cols-4 gap-1 pt-1 font-mono-tech text-[9px] text-center">
            {(['sm', 'md', 'lg', 'xl'] as const).map((rk) => (
              <div
                key={rk}
                className="py-1 border"
                style={{
                  borderRadius: Math.min(12, tokenSystem.radii[rk]),
                  borderColor: 'var(--studio-border-strong)',
                  color: 'var(--studio-text-secondary)',
                }}
              >
                {rk} · {tokenSystem.radii[rk]}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 7. Shadow Elevations */}
      <section className="space-y-1.5 pt-2 border-t" style={{ borderColor: 'var(--studio-border)' }}>
        <div
          className="text-[10px] font-mono-tech uppercase tracking-wider font-semibold"
          style={{ color: 'var(--studio-text-muted)' }}
        >
          {labels.tokenShadowsTitle}
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {(['subtle', 'elevated', 'floating', 'neon'] as const).map((shKey) => (
            <div
              key={shKey}
              className="h-9 rounded-lg border px-2 flex items-center justify-between font-mono-tech text-[9.5px]"
              style={{
                backgroundColor: 'var(--studio-surface-2)',
                borderColor: 'var(--studio-border)',
                boxShadow: tokenSystem.shadows[shKey],
              }}
            >
              <span className="capitalize">{shKey}</span>
              <span className="w-2 h-2 rounded-full bg-indigo-400/70" />
            </div>
          ))}
        </div>
      </section>

      {/* 8. Direct Token Export Bar (W3C JSON + CSS Custom Properties) */}
      <section className="space-y-1.5 pt-2 border-t" style={{ borderColor: 'var(--studio-border)' }}>
        {tokenExportNotice && (
          <div className="font-mono-tech text-[10px] text-emerald-400 text-center">
            {tokenExportNotice}
          </div>
        )}
        <div className="grid grid-cols-2 gap-1.5">
          <button
            type="button"
            data-testid="btn-export-tokens-css"
            onClick={() => {
              const css = exportCssCustomProperties(doc.tokens);
              downloadTextFile(
                css,
                `${doc.tokens.id}-variables.css`,
                'text/css;charset=utf-8',
              );
              flashTokenNotice('Exported CSS Variables (.css)');
            }}
            className="h-7 px-2 rounded-lg border font-mono-tech text-[10px] font-semibold flex items-center justify-center gap-1 cursor-pointer hover:bg-white/5"
            style={{
              backgroundColor: 'var(--studio-surface-2)',
              borderColor: 'rgba(6, 182, 212, 0.45)',
              color: 'var(--studio-cyan)',
            }}
          >
            <Download size={10} />
            <span>CSS Vars</span>
          </button>
          <button
            type="button"
            data-testid="btn-export-tokens-json"
            onClick={() => {
              const json = exportW3CDesignTokensJson(doc.tokens);
              downloadTextFile(
                json,
                `${doc.tokens.id}-w3c-tokens.json`,
                'application/json;charset=utf-8',
              );
              flashTokenNotice('Exported W3C Tokens (.json)');
            }}
            className="h-7 px-2 rounded-lg text-[10px] font-mono-tech font-semibold text-white flex items-center justify-center gap-1 cursor-pointer"
            style={{ backgroundColor: 'var(--studio-accent)' }}
          >
            <Download size={10} />
            <span>W3C JSON</span>
          </button>
        </div>
      </section>
    </div>
  );
}

export default DesignTokensStudio;
