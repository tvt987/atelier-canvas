import { useEffect, useRef, useState } from 'react';
import {
  Code2,
  MousePointerClick,
  Power,
  RotateCcw,
  Sliders,
  Sparkles,
} from 'lucide-react';
import {
  DEFAULT_SHADER_CONFIG,
  SHADER_PALETTES,
  SHADER_PRESETS,
  getShaderPaletteById,
  getShaderPresetById,
  type ShaderPaletteId,
  type ShaderPresetId,
  type ShaderStudioConfig,
} from '../engines/shaderStudioEngine';
import type { ShaderRendererBackend } from './ProceduralShaderCanvas';

interface ShaderStudioBarProps {
  config: ShaderStudioConfig;
  rendererBackend: ShaderRendererBackend;
  sandboxOpen: boolean;
  codeDrawerOpen: boolean;
  onChangeConfig: (patch: Partial<ShaderStudioConfig>) => void;
  onSelectPreset: (preset: ShaderPresetId) => void;
  onSelectPalette: (paletteId: ShaderPaletteId) => void;
  onToggleSandbox: () => void;
  onToggleCodeDrawer: () => void;
}

export function ShaderStudioBar({
  config,
  rendererBackend,
  sandboxOpen,
  codeDrawerOpen,
  onChangeConfig,
  onSelectPreset,
  onSelectPalette,
  onToggleSandbox,
  onToggleCodeDrawer,
}: ShaderStudioBarProps) {
  const [tunersOpen, setTunersOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!tunersOpen) return;
    const onOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setTunersOpen(false);
      }
    };
    window.addEventListener('mousedown', onOutside);
    return () => window.removeEventListener('mousedown', onOutside);
  }, [tunersOpen]);

  const activePreset = getShaderPresetById(config.preset);
  const activePalette = getShaderPaletteById(config.paletteId);

  return (
    <div
      data-testid="shader-studio-bar"
      onPointerDown={(e) => e.stopPropagation()}
      className="h-10 shrink-0 px-2 border-b flex items-center justify-between gap-1.5 select-none z-30 relative"
      style={{
        backgroundColor: 'color-mix(in srgb, var(--studio-surface) 95%, transparent)',
        borderColor: 'var(--studio-border)',
      }}
    >
      {/* Left Cluster: Shader Power + 4 Presets + 4 Palettes */}
      <div className="flex items-center gap-1.5 min-w-0">
        <button
          type="button"
          data-testid="btn-shader-toggle"
          onClick={() => onChangeConfig({ enabled: !config.enabled })}
          title={
            config.enabled
              ? `Live ${rendererBackend.toUpperCase()} Shader Active — Click to disable`
              : 'Enable Live WebGL2 Procedural Shader Fill'
          }
          className="h-7 px-2 rounded-md border font-mono-tech text-[10px] font-semibold flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
          style={{
            backgroundColor: config.enabled
              ? 'rgba(6, 182, 212, 0.16)'
              : 'var(--studio-surface-2)',
            borderColor: config.enabled
              ? 'rgba(6, 182, 212, 0.52)'
              : 'var(--studio-border)',
            color: config.enabled ? 'var(--studio-cyan)' : 'var(--studio-text-muted)',
          }}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full shrink-0 ${
              config.enabled ? 'bg-cyan-400 animate-pulse' : 'bg-slate-500'
            }`}
          />
          <span className="hidden sm:inline">SHADER</span>
          <Power size={10} className="sm:hidden" />
        </button>

        {/* Desktop 4 Preset Pills */}
        <div
          className="hidden lg:flex items-center h-7 p-0.5 rounded-md border gap-0.5 shrink-0"
          style={{
            backgroundColor: 'var(--studio-surface-2)',
            borderColor: 'var(--studio-border)',
          }}
        >
          {SHADER_PRESETS.map((preset) => {
            const isActive = config.preset === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                data-testid={`shader-preset-${preset.id}`}
                onClick={() => onSelectPreset(preset.id)}
                title={`${preset.name} — ${preset.tagline}`}
                className="h-full px-2 rounded font-mono-tech text-[10px] font-medium transition-all cursor-pointer whitespace-nowrap"
                style={{
                  backgroundColor: isActive ? 'var(--studio-accent)' : 'transparent',
                  color: isActive ? '#FFFFFF' : 'var(--studio-text-secondary)',
                }}
              >
                {preset.shortName}
              </button>
            );
          })}
        </div>

        {/* Compact Preset Selector for Mobile / Narrow Viewports */}
        <select
          aria-label="Shader Preset"
          data-testid="shader-preset-select-mobile"
          value={config.preset}
          onChange={(e) => onSelectPreset(e.target.value as ShaderPresetId)}
          className="lg:hidden h-7 max-w-[118px] px-1.5 rounded-md border font-mono-tech text-[10px] outline-none cursor-pointer"
          style={{
            backgroundColor: 'var(--studio-surface-2)',
            borderColor: 'var(--studio-border)',
            color: 'var(--studio-text)',
          }}
        >
          {SHADER_PRESETS.map((preset) => (
            <option key={preset.id} value={preset.id} className="bg-slate-900 text-white">
              {preset.shortName}
            </option>
          ))}
        </select>

        {/* 4 Curated Palette Swatches */}
        <div
          className="hidden sm:flex items-center gap-1 pl-1 border-l shrink-0"
          style={{ borderColor: 'var(--studio-border)' }}
        >
          {SHADER_PALETTES.map((pal) => {
            const isActive = config.paletteId === pal.id;
            return (
              <button
                key={pal.id}
                type="button"
                data-testid={`shader-palette-${pal.id}`}
                onClick={() => onSelectPalette(pal.id)}
                title={`Palette: ${pal.name}`}
                aria-label={`Palette: ${pal.name}`}
                className="w-5 h-5 rounded-full p-0.5 transition-transform hover:scale-110 cursor-pointer flex items-center justify-center"
                style={{
                  border: isActive
                    ? '1.5px solid #FFFFFF'
                    : '1px solid var(--studio-border-strong)',
                  boxShadow: isActive ? `0 0 10px ${pal.accentHex}88` : undefined,
                }}
              >
                <span
                  className="w-full h-full rounded-full block"
                  style={{
                    background: `linear-gradient(135deg, ${pal.colors[1]}, ${pal.colors[2]}, ${pal.colors[3]})`,
                  }}
                />
              </button>
            );
          })}
        </div>

        {/* Inline Warp Micro-Scrubber (xl+) + Full Uniforms Popover */}
        <div className="relative flex items-center gap-1.5" ref={popoverRef}>
          <div
            className="hidden xl:flex items-center gap-1.5 h-7 px-2 rounded-md border"
            style={{
              backgroundColor: 'var(--studio-surface-2)',
              borderColor: 'var(--studio-border)',
            }}
          >
            <span
              className="font-mono-tech text-[9px] uppercase tracking-wider"
              style={{ color: 'var(--studio-text-muted)' }}
            >
              Warp
            </span>
            <input
              type="range"
              data-testid="shader-warp-inline"
              aria-label="Shader Warp Turbulence"
              min={0}
              max={2}
              step={0.05}
              value={config.warp}
              onChange={(e) => onChangeConfig({ warp: Number(e.target.value) })}
              className="w-14 studio-range"
            />
            <span
              className="font-mono-tech text-[9px] w-6 text-right"
              style={{ color: 'var(--studio-cyan)' }}
            >
              {config.warp.toFixed(1)}
            </span>
          </div>

          <button
            type="button"
            data-testid="btn-shader-tuners"
            onClick={() => setTunersOpen((v) => !v)}
            title="Shader Uniforms (Speed, Warp, Grain, Scale, Intensity & Palette)"
            className="h-7 px-2 rounded-md border font-mono-tech text-[10px] font-medium flex items-center gap-1 transition-colors cursor-pointer shrink-0"
            style={{
              backgroundColor: tunersOpen
                ? 'var(--studio-accent-soft)'
                : 'var(--studio-surface-2)',
              borderColor: tunersOpen ? 'var(--studio-accent)' : 'var(--studio-border)',
              color: tunersOpen ? 'var(--studio-accent)' : 'var(--studio-text-secondary)',
            }}
          >
            <Sliders size={11} strokeWidth={1.7} />
            <span className="hidden md:inline">Uniforms</span>
          </button>

          {tunersOpen && (
            <div
              data-testid="shader-tuners-popover"
              className="absolute left-0 top-9 w-72 rounded-xl border p-3 shadow-2xl z-50 space-y-2.5"
              style={{
                backgroundColor: 'var(--studio-surface)',
                borderColor: 'var(--studio-border-strong)',
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Sparkles size={12} style={{ color: 'var(--studio-cyan)' }} />
                  <span className="font-mono-tech text-[10px] font-semibold uppercase tracking-wider">
                    {activePreset.name}
                  </span>
                </div>
                <button
                  type="button"
                  data-testid="btn-shader-reset"
                  onClick={() => onChangeConfig(DEFAULT_SHADER_CONFIG)}
                  title="Reset Shader Defaults"
                  className="p-1 rounded hover:bg-white/10 cursor-pointer"
                  style={{ color: 'var(--studio-text-muted)' }}
                >
                  <RotateCcw size={11} />
                </button>
              </div>

              <div className="text-[10px] leading-snug" style={{ color: 'var(--studio-text-muted)' }}>
                {activePreset.tagline} ·{' '}
                <span className="font-mono-tech uppercase" style={{ color: 'var(--studio-cyan)' }}>
                  {rendererBackend} 60FPS
                </span>
              </div>

              {(
                [
                  ['speed', 'Speed', 0.1, 3.0, 0.05, 'x'],
                  ['warp', 'Warp Turbulence', 0.0, 2.0, 0.05, ''],
                  ['grain', 'Film Grain', 0.0, 0.35, 0.01, ''],
                  ['scale', 'Field Scale', 0.5, 3.0, 0.05, 'x'],
                  ['intensity', 'Shader Blend', 0.15, 1.0, 0.05, '%'],
                ] as const
              ).map(([key, label, min, max, step, unit]) => {
                const value = config[key];
                const display =
                  unit === '%'
                    ? `${Math.round(value * 100)}%`
                    : `${value.toFixed(key === 'grain' ? 2 : 2)}${unit}`;
                return (
                  <div key={key} className="space-y-0.5">
                    <div className="flex justify-between font-mono-tech text-[10px]">
                      <span style={{ color: 'var(--studio-text-secondary)' }}>{label}</span>
                      <span style={{ color: 'var(--studio-cyan)' }}>{display}</span>
                    </div>
                    <input
                      type="range"
                      data-testid={`shader-slider-${key}`}
                      min={min}
                      max={max}
                      step={step}
                      value={value}
                      onChange={(e) =>
                        onChangeConfig({ [key]: Number(e.target.value) })
                      }
                      className="w-full studio-range"
                    />
                  </div>
                );
              })}

              {/* 4 Palette Color Swatches + Fine Hex Override */}
              <div
                className="pt-2 border-t space-y-1.5"
                style={{ borderColor: 'var(--studio-border)' }}
              >
                <div className="flex items-center justify-between font-mono-tech text-[9px] uppercase tracking-wider">
                  <span style={{ color: 'var(--studio-text-muted)' }}>
                    Palette · {activePalette.name}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {config.colors.map((hex, idx) => (
                    <label
                      key={`c-${idx}`}
                      className="h-7 px-1 rounded border flex items-center gap-1 cursor-pointer"
                      style={{
                        backgroundColor: 'var(--studio-surface-2)',
                        borderColor: 'var(--studio-border)',
                      }}
                    >
                      <input
                        type="color"
                        aria-label={`Shader Color ${idx + 1}`}
                        value={hex}
                        onChange={(e) => {
                          const next: [string, string, string, string] = [
                            ...config.colors,
                          ] as [string, string, string, string];
                          next[idx] = e.target.value.toUpperCase();
                          onChangeConfig({ colors: next });
                        }}
                        className="w-3.5 h-3.5 border-0 bg-transparent cursor-pointer shrink-0"
                      />
                      <span className="font-mono-tech text-[8.5px] truncate">
                        {hex.slice(1)}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right Cluster: Component Sandbox + Live GLSL/React/SwiftUI Code + Mobile 3D */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          type="button"
          data-testid="btn-sandbox-toggle"
          onClick={onToggleSandbox}
          title="Interactive Component Sandbox (Test Hover / Pressed / Focus / Disabled + 1-Click WCAG AAA Repair)"
          className="h-7 px-2 rounded-md border font-mono-tech text-[10px] font-semibold flex items-center gap-1 transition-all cursor-pointer shrink-0"
          style={{
            backgroundColor: sandboxOpen
              ? 'rgba(16, 185, 129, 0.2)'
              : 'var(--studio-surface-2)',
            borderColor: sandboxOpen
              ? 'rgba(16, 185, 129, 0.55)'
              : 'var(--studio-border)',
            color: sandboxOpen ? '#34D399' : 'var(--studio-text-secondary)',
          }}
        >
          <MousePointerClick size={11} strokeWidth={1.7} />
          <span className="hidden sm:inline">Sandbox</span>
        </button>

        <button
          type="button"
          data-testid="btn-live-code-toggle"
          onClick={onToggleCodeDrawer}
          title="Live GLSL ES 3.00 / React 19 + Tailwind v4 / SwiftUI Codegen with Mutated-Line Diff"
          className="h-7 px-2 rounded-md border font-mono-tech text-[10px] font-semibold flex items-center gap-1 transition-all cursor-pointer shrink-0"
          style={{
            backgroundColor: codeDrawerOpen
              ? 'rgba(99, 102, 241, 0.24)'
              : 'var(--studio-surface-2)',
            borderColor: codeDrawerOpen
              ? '#6366F1'
              : 'var(--studio-border)',
            color: codeDrawerOpen ? '#C7D2FE' : 'var(--studio-text-secondary)',
          }}
        >
          <Code2 size={11} strokeWidth={1.7} />
          <span>Code</span>
        </button>
      </div>
    </div>
  );
}
