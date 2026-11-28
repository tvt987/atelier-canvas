import { useMemo, useRef, useState } from 'react';
import {
  Check,
  Code2,
  Copy,
  Download,
  ShieldCheck,
  Sparkles,
  Wand2,
  X,
} from 'lucide-react';
import type { CanvasNode, DesignTokens } from '../types/canvas';
import {
  SANDBOX_STATES,
  compileShaderStudioCode,
  type SandboxInteractiveState,
  type ShaderCodeTarget,
  type ShaderStudioConfig,
} from '../engines/shaderStudioEngine';
import { downloadTextFile } from '../engines/exporter';
import type { ShaderRendererBackend } from './ProceduralShaderCanvas';

interface LiveCodeSandboxDrawerProps {
  sandboxOpen: boolean;
  codeDrawerOpen: boolean;
  sandboxState: SandboxInteractiveState;
  onSelectSandboxState: (state: SandboxInteractiveState) => void;
  onRepairWcagAAA: () => void;
  wcagRepairSummary: {
    repairedCount: number;
    passingAAAAfter: number;
    totalAudited: number;
    minRatioAfter: number;
  } | null;
  shaderConfig: ShaderStudioConfig;
  rendererBackend: ShaderRendererBackend;
  tokens: DesignTokens;
  selectedNode: CanvasNode | null;
  onToggleCodeDrawer: () => void;
  onCloseAll: () => void;
}

const CODE_TARGETS: Array<{ id: ShaderCodeTarget; label: string }> = [
  { id: 'glsl', label: 'GLSL ES 3.00' },
  { id: 'react-tailwind', label: 'React 19 + TW4' },
  { id: 'swiftui', label: 'SwiftUI' },
];

export function LiveCodeSandboxDrawer({
  sandboxOpen,
  codeDrawerOpen,
  sandboxState,
  onSelectSandboxState,
  onRepairWcagAAA,
  wcagRepairSummary,
  shaderConfig,
  rendererBackend,
  tokens,
  selectedNode,
  onToggleCodeDrawer,
  onCloseAll,
}: LiveCodeSandboxDrawerProps) {
  const [target, setTarget] = useState<ShaderCodeTarget>('glsl');
  const [copied, setCopied] = useState(false);

  // Track previous distinct code snapshot per target so every mutation highlights exact diff lines without flickering
  const historyByTargetRef = useRef<
    Partial<Record<ShaderCodeTarget, { prevCode: string | null; lastCode: string }>>
  >({});

  const compiled = useMemo(() => {
    const base = compileShaderStudioCode({
      target,
      config: shaderConfig,
      tokens,
      sandboxState,
      selectedNode,
      wcagRepairSummary,
    });
    const entry = historyByTargetRef.current[target];
    if (!entry) {
      historyByTargetRef.current[target] = { prevCode: null, lastCode: base.code };
      return base;
    }
    if (entry.lastCode !== base.code) {
      const prevCode = entry.lastCode;
      historyByTargetRef.current[target] = { prevCode, lastCode: base.code };
      return compileShaderStudioCode({
        target,
        config: shaderConfig,
        tokens,
        sandboxState,
        selectedNode,
        wcagRepairSummary,
        previousCode: prevCode,
      });
    }
    return compileShaderStudioCode({
      target,
      config: shaderConfig,
      tokens,
      sandboxState,
      selectedNode,
      wcagRepairSummary,
      previousCode: entry.prevCode,
    });
  }, [
    target,
    shaderConfig,
    tokens,
    sandboxState,
    selectedNode,
    wcagRepairSummary,
  ]);

  const changedSet = useMemo(
    () => new Set(compiled.changedLineNumbers),
    [compiled.changedLineNumbers],
  );

  if (!sandboxOpen && !codeDrawerOpen) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(compiled.code);
    } catch {
      // Clipboard blocked in headless browser fallback
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  const handleDownload = () => {
    downloadTextFile(
      compiled.code,
      compiled.filename,
      'text/plain;charset=utf-8',
    );
  };

  return (
    <div
      data-testid="live-code-sandbox-drawer"
      onPointerDown={(e) => e.stopPropagation()}
      className="shrink-0 border-t flex flex-col select-none z-30"
      style={{
        backgroundColor: 'color-mix(in srgb, var(--studio-surface) 97%, transparent)',
        borderColor: 'var(--studio-border-strong)',
      }}
    >
      {/* Top Interactive Component Sandbox Strip */}
      <div
        className="min-h-9 px-2.5 py-1 flex flex-wrap items-center justify-between gap-1.5 border-b"
        style={{ borderColor: 'var(--studio-border)' }}
      >
        <div className="flex items-center gap-1.5 flex-wrap">
          <span
            className="font-mono-tech text-[9.5px] font-semibold uppercase tracking-wider flex items-center gap-1"
            style={{ color: '#34D399' }}
          >
            <Sparkles size={11} />
            <span>Live Sandbox</span>
          </span>

          <div
            className="flex items-center h-6 p-0.5 rounded-md border gap-0.5"
            style={{
              backgroundColor: 'var(--studio-surface-2)',
              borderColor: 'var(--studio-border)',
            }}
          >
            {SANDBOX_STATES.map((st) => {
              const active = sandboxState === st.id;
              return (
                <button
                  key={st.id}
                  type="button"
                  data-testid={`sandbox-state-${st.id}`}
                  onClick={() => onSelectSandboxState(st.id)}
                  className="h-full px-2 rounded font-mono-tech text-[9.5px] font-medium transition-all cursor-pointer"
                  style={{
                    backgroundColor: active ? 'var(--studio-accent)' : 'transparent',
                    color: active ? '#FFFFFF' : 'var(--studio-text-secondary)',
                  }}
                >
                  {st.shortLabel}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            data-testid="btn-wcag-aaa-repair"
            onClick={onRepairWcagAAA}
            title="1-Click WCAG AAA Auto-Contrast Repair across all text & interactive controls on the active artboard"
            className="h-6 px-2 rounded-md border font-mono-tech text-[9.5px] font-semibold flex items-center gap-1 transition-all cursor-pointer hover:brightness-110"
            style={{
              background:
                'linear-gradient(135deg, rgba(16,185,129,0.2), rgba(6,182,212,0.18))',
              borderColor: 'rgba(16,185,129,0.52)',
              color: '#34D399',
            }}
          >
            <Wand2 size={10} strokeWidth={1.8} />
            <span>WCAG AAA Repair</span>
          </button>

          {wcagRepairSummary && (
            <span
              data-testid="wcag-repair-badge"
              className="h-5 px-2 rounded-full border font-mono-tech text-[9px] font-semibold inline-flex items-center gap-1"
              style={{
                backgroundColor: 'rgba(16, 185, 129, 0.14)',
                borderColor: 'rgba(16, 185, 129, 0.45)',
                color: '#34D399',
              }}
            >
              <ShieldCheck size={10} />
              <span>
                AAA {wcagRepairSummary.passingAAAAfter}/{wcagRepairSummary.totalAudited} · min{' '}
                {wcagRepairSummary.minRatioAfter.toFixed(1)}:1
              </span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {!codeDrawerOpen && (
            <button
              type="button"
              onClick={onToggleCodeDrawer}
              className="h-6 px-2 rounded border font-mono-tech text-[9.5px] font-semibold flex items-center gap-1 cursor-pointer"
              style={{
                backgroundColor: 'var(--studio-accent-soft)',
                borderColor: 'var(--studio-accent)',
                color: '#C7D2FE',
              }}
            >
              <Code2 size={10} />
              <span>Open Live Code</span>
            </button>
          )}
          <button
            type="button"
            data-testid="btn-close-sandbox-drawer"
            onClick={onCloseAll}
            title="Collapse Drawer"
            className="w-6 h-6 rounded flex items-center justify-center hover:bg-white/10 cursor-pointer"
            style={{ color: 'var(--studio-text-muted)' }}
          >
            <X size={12} />
          </button>
        </div>
      </div>

      {/* Expandable Live GLSL / React 19 / SwiftUI Code Panel with Mutated-Line Diff Gutter */}
      {codeDrawerOpen && (
        <div data-testid="live-code-drawer" className="flex flex-col">
          <div
            className="h-8 px-2.5 flex items-center justify-between gap-2 border-b"
            style={{
              backgroundColor: 'var(--studio-surface-2)',
              borderColor: 'var(--studio-border)',
            }}
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <div
                className="flex items-center h-6 p-0.5 rounded-md border gap-0.5 shrink-0"
                style={{
                  backgroundColor: 'var(--studio-surface)',
                  borderColor: 'var(--studio-border)',
                }}
              >
                {CODE_TARGETS.map((item) => {
                  const active = target === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      data-testid={`code-tab-${item.id}`}
                      onClick={() => setTarget(item.id)}
                      className="h-full px-2 rounded font-mono-tech text-[9.5px] font-semibold transition-all cursor-pointer whitespace-nowrap"
                      style={{
                        backgroundColor: active ? '#0891B2' : 'transparent',
                        color: active ? '#FFFFFF' : 'var(--studio-text-secondary)',
                      }}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>

              <span
                className="hidden sm:inline font-mono-tech text-[9.5px] truncate"
                style={{ color: 'var(--studio-text-muted)' }}
              >
                {compiled.filename}
              </span>

              <span
                className="hidden lg:inline-flex items-center gap-1 px-1.5 py-0.5 rounded font-mono-tech text-[8.5px] uppercase"
                style={{
                  backgroundColor: 'rgba(6, 182, 212, 0.14)',
                  color: 'var(--studio-cyan)',
                }}
              >
                {rendererBackend} · 60FPS
              </span>

              {compiled.changedLineNumbers.length > 0 && (
                <span
                  data-testid="live-code-diff-badge"
                  className="px-1.5 py-0.5 rounded font-mono-tech text-[8.5px] font-semibold whitespace-nowrap"
                  style={{
                    backgroundColor: 'rgba(16, 185, 129, 0.2)',
                    color: '#34D399',
                  }}
                >
                  +{compiled.changedLineNumbers.length} mutated
                </span>
              )}
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                data-testid="btn-copy-live-code"
                onClick={handleCopy}
                className="h-6 px-2 rounded border font-mono-tech text-[9.5px] font-medium flex items-center gap-1 hover:bg-white/5 cursor-pointer"
                style={{
                  borderColor: 'var(--studio-border-strong)',
                  color: copied ? '#34D399' : 'var(--studio-text)',
                }}
              >
                {copied ? <Check size={10} /> : <Copy size={10} />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
              <button
                type="button"
                data-testid="btn-download-live-code"
                onClick={handleDownload}
                title={`Download ${compiled.filename}`}
                className="h-6 px-2 rounded border font-mono-tech text-[9.5px] font-medium flex items-center gap-1 hover:bg-white/5 cursor-pointer"
                style={{
                  borderColor: 'var(--studio-border-strong)',
                  color: 'var(--studio-cyan)',
                }}
              >
                <Download size={10} />
                <span className="hidden sm:inline">Save</span>
              </button>
            </div>
          </div>

          <div
            data-testid="live-code-viewport"
            className="h-44 overflow-auto studio-scroll font-mono-tech text-[10.5px] leading-[1.55] select-text py-1.5"
            style={{ backgroundColor: '#090B10' }}
          >
            {compiled.lines.map((line, idx) => {
              const lineNum = idx + 1;
              const isMutated = changedSet.has(lineNum);
              return (
                <div
                  key={`${target}-${lineNum}`}
                  data-diff-changed={isMutated ? 'true' : undefined}
                  className="flex items-start px-2.5 whitespace-pre"
                  style={{
                    backgroundColor: isMutated
                      ? 'rgba(16, 185, 129, 0.14)'
                      : 'transparent',
                    borderLeft: isMutated
                      ? '2px solid #34D399'
                      : '2px solid transparent',
                  }}
                >
                  <span
                    className="w-7 shrink-0 text-right pr-2 select-none"
                    style={{
                      color: isMutated ? '#34D399' : 'rgba(148, 163, 184, 0.45)',
                    }}
                  >
                    {lineNum}
                  </span>
                  <span
                    className="w-3.5 shrink-0 select-none font-semibold"
                    style={{ color: isMutated ? '#34D399' : 'transparent' }}
                  >
                    {isMutated ? '+' : ' '}
                  </span>
                  <span
                    style={{
                      color: line.trimStart().startsWith('//')
                        ? '#67E8F9'
                        : isMutated
                          ? '#D1FAE5'
                          : '#E2E8F0',
                    }}
                  >
                    {line || ' '}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
