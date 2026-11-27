import { useMemo, useState } from 'react';
import {
  Check,
  Code2,
  Copy,
  Cpu,
  Download,
  FileCode2,
  Layers,
  ShieldCheck,
  Smartphone,
  Terminal,
  X,
} from 'lucide-react';
import type { DesignTokens } from '../types/canvas';
import { FLAGSHIP_V4_THEMES, exportW3CDesignTokensJson } from '../engines/designTokens';
import {
  COMPILE_TARGET_META,
  auditDesignTokenContrast,
  compileAllDesignTokenTargets,
  type CompileTargetId,
} from '../engines/tokenCompilerEngine';
import { downloadTextFile } from '../engines/exporter';

interface TokenCompilerModalProps {
  open: boolean;
  onClose: () => void;
  tokens: DesignTokens;
  onUpdateTokens: (nextTokens: DesignTokens) => void;
}

const TARGET_ICONS: Record<CompileTargetId, typeof Code2> = {
  'tailwind-v4': Layers,
  typescript: FileCode2,
  swiftui: Smartphone,
  compose: Terminal,
};

export function TokenCompilerModal({
  open,
  onClose,
  tokens,
  onUpdateTokens,
}: TokenCompilerModalProps) {
  const [activeTarget, setActiveTarget] = useState<CompileTargetId>('tailwind-v4');
  const [copied, setCopied] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const artifacts = useMemo(
    () => (open ? compileAllDesignTokenTargets(tokens) : null),
    [open, tokens],
  );
  const wcagSummary = useMemo(
    () => (open ? auditDesignTokenContrast(tokens) : null),
    [open, tokens],
  );

  if (!open || !artifacts || !wcagSummary) return null;

  const activeArtifact = artifacts[activeTarget];

  const flashNotice = (msg: string) => {
    setNotice(msg);
    window.setTimeout(() => {
      setNotice((prev) => (prev === msg ? null : prev));
    }, 2000);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(activeArtifact.code);
    } catch {
      // Clipboard fallback in restricted headless environments
    }
    setCopied(true);
    flashNotice(`Copied ${activeArtifact.filename}`);
    window.setTimeout(() => setCopied(false), 1600);
  };

  const handleDownloadTarget = () => {
    downloadTextFile(
      activeArtifact.code,
      activeArtifact.filename,
      activeArtifact.mimeType,
    );
    flashNotice(`Downloaded ${activeArtifact.filename}`);
  };

  const handleDownloadW3CSource = () => {
    const json = exportW3CDesignTokensJson(tokens);
    downloadTextFile(
      json,
      `${tokens.id}-w3c-dtcg.json`,
      'application/json;charset=utf-8',
    );
    flashNotice(`Downloaded ${tokens.id}-w3c-dtcg.json`);
  };

  return (
    <div
      data-testid="token-compiler-backdrop"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-md overflow-y-auto"
    >
      <div
        data-testid="token-compiler-modal"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-5xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        style={{
          backgroundColor: 'var(--studio-surface)',
          borderColor: 'var(--studio-border-strong)',
        }}
      >
        {/* Header */}
        <div
          className="px-4 sm:px-5 py-3 border-b flex flex-wrap items-center justify-between gap-2 shrink-0"
          style={{ borderColor: 'var(--studio-border)' }}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className="w-8 h-8 rounded-lg border flex items-center justify-center shrink-0"
              style={{
                background:
                  'linear-gradient(135deg, rgba(99,102,241,0.22), rgba(6,182,212,0.18))',
                borderColor: 'rgba(6,182,212,0.45)',
                color: 'var(--studio-cyan)',
              }}
            >
              <Cpu size={15} strokeWidth={1.7} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="font-display font-bold text-sm truncate">
                  Multi-Platform Design Token Compiler
                </h2>
                <span
                  className="font-mono-tech text-[9.5px] font-semibold px-1.5 py-0.5 rounded border shrink-0"
                  style={{
                    color: 'var(--studio-cyan)',
                    borderColor: 'rgba(6, 182, 212, 0.4)',
                    backgroundColor: 'rgba(6, 182, 212, 0.1)',
                  }}
                >
                  W3C DTCG v5.0
                </span>
              </div>
              <p
                className="text-[11px] truncate"
                style={{ color: 'var(--studio-text-secondary)' }}
              >
                Active theme: {tokens.name} — deterministic compilation for Web, React, iOS SwiftUI & Android Compose
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {notice && (
              <span
                data-testid="token-compiler-notice"
                className="font-mono-tech text-[10.5px] text-emerald-400 flex items-center gap-1"
              >
                <Check size={12} />
                <span>{notice}</span>
              </span>
            )}
            <button
              type="button"
              data-testid="btn-compiler-close"
              onClick={onClose}
              aria-label="Close Token Compiler"
              className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10 cursor-pointer"
              style={{ color: 'var(--studio-text-secondary)' }}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Live Theme Quick-Switch Strip + Target Selector Bar */}
        <div
          className="px-4 sm:px-5 py-2.5 border-b flex flex-wrap items-center justify-between gap-2.5 shrink-0"
          style={{
            backgroundColor: 'var(--studio-surface-2)',
            borderColor: 'var(--studio-border)',
          }}
        >
          {/* 4 Compilation Target Tabs */}
          <div className="flex flex-wrap items-center gap-1.5" role="tablist">
            {COMPILE_TARGET_META.map((meta) => {
              const Icon = TARGET_ICONS[meta.id];
              const isSelected = activeTarget === meta.id;
              return (
                <button
                  key={meta.id}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  data-testid={`compiler-tab-${meta.id}`}
                  onClick={() => setActiveTarget(meta.id)}
                  className="h-8 px-2.5 sm:px-3 rounded-lg border text-[11px] font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                  style={{
                    backgroundColor: isSelected
                      ? 'var(--studio-accent)'
                      : 'var(--studio-surface)',
                    borderColor: isSelected
                      ? 'var(--studio-accent)'
                      : 'var(--studio-border)',
                    color: isSelected ? '#FFFFFF' : 'var(--studio-text-secondary)',
                  }}
                >
                  <Icon size={12} strokeWidth={1.7} />
                  <span>{meta.shortLabel}</span>
                </button>
              );
            })}
          </div>

          {/* Live Flagship Theme Switcher Pills */}
          <div className="flex items-center gap-1.5">
            <span
              className="hidden sm:inline font-mono-tech text-[9.5px] uppercase tracking-wider"
              style={{ color: 'var(--studio-text-muted)' }}
            >
              Theme:
            </span>
            {FLAGSHIP_V4_THEMES.map((theme) => {
              const isActive = tokens.id === theme.id;
              return (
                <button
                  key={theme.id}
                  type="button"
                  data-testid={`compiler-theme-${theme.id}`}
                  onClick={() => onUpdateTokens(theme)}
                  className="h-7 px-2 rounded-md border font-mono-tech text-[10px] flex items-center gap-1.5 transition-colors cursor-pointer"
                  style={{
                    backgroundColor: isActive
                      ? 'var(--studio-accent-soft)'
                      : 'var(--studio-surface)',
                    borderColor: isActive
                      ? 'var(--studio-accent)'
                      : 'var(--studio-border)',
                    color: isActive ? 'var(--studio-text)' : 'var(--studio-text-muted)',
                  }}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full border border-white/25 shrink-0"
                    style={{ backgroundColor: theme.brandPrimary }}
                  />
                  <span className="hidden md:inline">{theme.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Main Content Split: Compiled Output (Left) + WCAG & Target Telemetry (Right) */}
        <div className="flex-1 min-h-0 overflow-y-auto studio-scroll p-4 sm:p-5 grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Code Output Surface */}
          <div className="lg:col-span-8 flex flex-col min-w-0">
            <div
              className="rounded-xl border overflow-hidden flex flex-col flex-1"
              style={{
                backgroundColor: '#0A0D14',
                borderColor: 'var(--studio-border-strong)',
              }}
            >
              <div className="px-3.5 py-2 border-b border-white/10 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Code2 size={13} className="text-cyan-400 shrink-0" />
                  <span
                    data-testid="compiler-active-filename"
                    className="font-mono-tech text-[11px] font-semibold text-slate-100 truncate"
                  >
                    {activeArtifact.filename}
                  </span>
                  <span className="font-mono-tech text-[9.5px] px-1.5 py-0.5 rounded bg-white/5 text-cyan-300 shrink-0">
                    {activeArtifact.platform}
                  </span>
                  <span className="hidden sm:inline font-mono-tech text-[9.5px] text-slate-400 shrink-0">
                    {activeArtifact.lineCount} lines · {(activeArtifact.byteLength / 1024).toFixed(2)} KB
                  </span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    data-testid="btn-compiler-copy"
                    onClick={handleCopy}
                    className="h-7 px-2.5 rounded-md text-[10.5px] font-mono-tech font-medium flex items-center gap-1.5 bg-white/10 hover:bg-white/15 text-slate-100 cursor-pointer"
                  >
                    {copied ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                  <button
                    type="button"
                    data-testid="btn-compiler-download"
                    onClick={handleDownloadTarget}
                    className="h-7 px-2.5 rounded-md text-[10.5px] font-mono-tech font-semibold flex items-center gap-1.5 bg-indigo-500 hover:bg-indigo-400 text-white cursor-pointer"
                  >
                    <Download size={11} />
                    <span>Download</span>
                  </button>
                </div>
              </div>

              <pre
                data-testid="token-compiler-output"
                className="p-4 text-[11.5px] leading-relaxed font-mono-tech text-cyan-100/95 overflow-auto max-h-[430px] studio-scroll select-text whitespace-pre"
              >
                <code>{activeArtifact.code}</code>
              </pre>
            </div>
          </div>

          {/* Right Sidebar: WCAG 2.1 Token Contrast Audit + API Parity */}
          <div className="lg:col-span-4 flex flex-col gap-3 min-w-0">
            {/* WCAG 2.1 Luminance Contrast Audit */}
            <div
              data-testid="compiler-wcag-audit"
              className="rounded-xl border p-3.5 space-y-2.5"
              style={{
                backgroundColor: 'var(--studio-surface-2)',
                borderColor: 'var(--studio-border)',
              }}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck size={13} className="text-emerald-400 shrink-0" />
                  <span className="font-mono-tech text-[10px] font-semibold uppercase tracking-wider">
                    WCAG 2.1 Contrast Audit
                  </span>
                </div>
                <span className="font-mono-tech text-[10px] font-semibold text-emerald-400">
                  {wcagSummary.aaPassCount}/{wcagSummary.totalPairs} AA ({wcagSummary.passRatePercent}%)
                </span>
              </div>

              <div className="space-y-1.5">
                {wcagSummary.pairs.map((pair) => {
                  const gradeColor =
                    pair.result.grade === 'AAA'
                      ? '#34D399'
                      : pair.result.grade === 'AA'
                        ? '#22D3EE'
                        : pair.result.grade === 'AA-Large'
                          ? '#FBBF24'
                          : '#FB7185';
                  return (
                    <div
                      key={pair.id}
                      className="px-2.5 py-2 rounded-lg border flex items-center justify-between gap-2"
                      style={{
                        backgroundColor: 'var(--studio-surface)',
                        borderColor: 'var(--studio-border)',
                      }}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="flex items-center -space-x-1 shrink-0">
                          <span
                            className="w-3.5 h-3.5 rounded-full border border-white/25"
                            style={{ backgroundColor: pair.result.foregroundHex }}
                          />
                          <span
                            className="w-3.5 h-3.5 rounded-full border border-white/25"
                            style={{ backgroundColor: pair.result.backgroundHex }}
                          />
                        </div>
                        <span className="text-[11px] font-medium truncate">
                          {pair.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 font-mono-tech text-[10px]">
                        <span style={{ color: 'var(--studio-text-secondary)' }}>
                          {pair.result.ratioLabel}
                        </span>
                        <span
                          className="px-1.5 py-0.5 rounded text-[9px] font-bold"
                          style={{
                            color: gradeColor,
                            backgroundColor: 'rgba(255,255,255,0.05)',
                          }}
                        >
                          {pair.result.grade}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Target Manifest & .NET 10 Compiler API Contract */}
            <div
              className="rounded-xl border p-3.5 space-y-2.5"
              style={{
                backgroundColor: 'var(--studio-surface-2)',
                borderColor: 'var(--studio-border)',
              }}
            >
              <div
                className="font-mono-tech text-[10px] font-semibold uppercase tracking-wider"
                style={{ color: 'var(--studio-text-muted)' }}
              >
                Full-Stack Compiler Parity
              </div>
              <div className="space-y-1 font-mono-tech text-[10px]">
                <div className="flex items-center justify-between">
                  <span style={{ color: 'var(--studio-text-secondary)' }}>Tokens Compiled</span>
                  <span style={{ color: 'var(--studio-cyan)' }}>{activeArtifact.tokenCount} semantic + primitive</span>
                </div>
                <div className="flex items-center justify-between">
                  <span style={{ color: 'var(--studio-text-secondary)' }}>Output Targets</span>
                  <span style={{ color: 'var(--studio-cyan)' }}>4 platforms (CSS/TS/Swift/KT)</span>
                </div>
                <div className="flex items-center justify-between">
                  <span style={{ color: 'var(--studio-text-secondary)' }}>.NET 10 Endpoint</span>
                  <span className="text-emerald-400">POST /api/v1/tokens/compile</span>
                </div>
              </div>
              <button
                type="button"
                data-testid="btn-compiler-download-w3c"
                onClick={handleDownloadW3CSource}
                className="w-full h-8 rounded-lg border font-mono-tech text-[10.5px] font-semibold flex items-center justify-center gap-1.5 hover:bg-white/5 cursor-pointer"
                style={{
                  backgroundColor: 'var(--studio-surface)',
                  borderColor: 'var(--studio-border-strong)',
                  color: 'var(--studio-text)',
                }}
              >
                <Download size={11} style={{ color: 'var(--studio-cyan)' }} />
                <span>Download W3C DTCG Source (.json)</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TokenCompilerModal;
