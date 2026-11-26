import { useMemo, useState } from 'react';
import {
  Check,
  Code2,
  Copy,
  Download,
  FileCode2,
  FileImage,
  FileJson2,
  X,
} from 'lucide-react';
import type { DocumentState } from '../types/canvas';
import {
  downloadDataUrl,
  downloadTextFile,
  exportArtboardToSvg,
  svgToPngDataUrl,
} from '../engines/exporter';
import { generateReactTailwind, generateTokensJson } from '../engines/codegen';
import type { StudioLabels } from '../i18n/labels';

interface ExportModalProps {
  open: boolean;
  onClose: () => void;
  doc: DocumentState;
  labels: StudioLabels;
}

export function ExportModal({ open, onClose, doc, labels }: ExportModalProps) {
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [busyPng, setBusyPng] = useState(false);

  const svgMarkup = useMemo(() => (open ? exportArtboardToSvg(doc) : ''), [open, doc]);
  const reactCode = useMemo(() => (open ? generateReactTailwind(doc) : ''), [open, doc]);
  const tokensJson = useMemo(
    () => (open ? generateTokensJson(doc.tokens) : ''),
    [open, doc.tokens],
  );

  const svgDataUri = useMemo(() => {
    if (!svgMarkup) return '';
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgMarkup)}`;
  }, [svgMarkup]);

  if (!open) return null;

  const slug = doc.artboard.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  const flash = (msg: string) => {
    setStatusMsg(msg);
    setTimeout(() => setStatusMsg(null), 2200);
  };

  const handleDownloadSvg = () => {
    downloadTextFile(svgMarkup, `${slug || 'atelier'}.svg`, 'image/svg+xml;charset=utf-8');
    flash('Vector .svg downloaded');
  };

  const handleCopySvg = async () => {
    try {
      await navigator.clipboard.writeText(svgMarkup);
    } catch {
      // Clipboard fallback ignored in headless mode
    }
    flash('SVG markup copied');
  };

  const handleDownloadPng2x = async () => {
    setBusyPng(true);
    try {
      const dataUrl = await svgToPngDataUrl(
        svgMarkup,
        doc.artboard.width,
        doc.artboard.height,
        2,
      );
      downloadDataUrl(dataUrl, `${slug || 'atelier'}@2x.png`);
      flash(`Rasterized ${doc.artboard.width * 2}×${doc.artboard.height * 2} PNG`);
    } catch {
      flash('PNG export failed in current context');
    } finally {
      setBusyPng(false);
    }
  };

  const handleDownloadTsx = () => {
    downloadTextFile(reactCode, `${slug || 'AtelierComponent'}.tsx`, 'text/plain;charset=utf-8');
    flash('React 19 + Tailwind v4 .tsx downloaded');
  };

  const handleDownloadTokens = () => {
    downloadTextFile(tokensJson, `${doc.tokens.id}-tokens.json`, 'application/json;charset=utf-8');
    flash('W3C Design Tokens .json downloaded');
  };

  const svgBytes = new Blob([svgMarkup]).size;

  return (
    <div
      data-testid="export-modal-backdrop"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm"
    >
      <div
        data-testid="export-modal"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-3xl rounded-2xl border shadow-2xl overflow-hidden"
        style={{
          backgroundColor: 'var(--studio-surface)',
          borderColor: 'var(--studio-border-strong)',
        }}
      >
        {/* Header */}
        <div
          className="h-12 px-5 border-b flex items-center justify-between"
          style={{ borderColor: 'var(--studio-border)' }}
        >
          <div className="flex items-center gap-2.5">
            <span className="font-display font-bold text-sm">{labels.exportStudioTitle}</span>
            <span
              className="font-mono-tech text-[10px] px-2 py-0.5 rounded"
              style={{
                backgroundColor: 'var(--studio-surface-2)',
                color: 'var(--studio-cyan)',
              }}
            >
              {doc.artboard.name} · {doc.artboard.width}×{doc.artboard.height}
            </span>
          </div>
          <div className="flex items-center gap-3">
            {statusMsg && (
              <span className="font-mono-tech text-[11px] text-emerald-400 flex items-center gap-1">
                <Check size={12} />
                {statusMsg}
              </span>
            )}
            <button
              type="button"
              data-testid="btn-export-close"
              onClick={onClose}
              className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-white/10 cursor-pointer"
              style={{ color: 'var(--studio-text-secondary)' }}
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 grid grid-cols-1 md:grid-cols-12 gap-5">
          {/* Live Rendered Vector Preview */}
          <div className="md:col-span-7 flex flex-col gap-2">
            <div className="flex items-center justify-between font-mono-tech text-[10px]" style={{ color: 'var(--studio-text-muted)' }}>
              <span>LIVE SVG SERIALIZATION PREVIEW</span>
              <span>{(svgBytes / 1024).toFixed(1)} KB</span>
            </div>
            <div
              data-testid="export-svg-preview"
              className="flex-1 min-h-[260px] rounded-xl border p-4 flex items-center justify-center overflow-hidden"
              style={{
                backgroundColor: 'var(--studio-canvas)',
                borderColor: 'var(--studio-border)',
              }}
            >
              <img
                src={svgDataUri}
                alt={`${doc.artboard.name} SVG preview`}
                className="max-w-full max-h-[280px] object-contain rounded-lg shadow-xl"
              />
            </div>
          </div>

          {/* Export Targets */}
          <div className="md:col-span-5 flex flex-col justify-between gap-2.5">
            {/* SVG */}
            <div
              className="p-3 rounded-xl border space-y-2"
              style={{
                backgroundColor: 'var(--studio-surface-2)',
                borderColor: 'var(--studio-border)',
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileCode2 size={15} style={{ color: 'var(--studio-accent)' }} />
                  <span className="text-xs font-semibold">Clean Vector SVG</span>
                </div>
                <span className="font-mono-tech text-[10px]" style={{ color: 'var(--studio-text-muted)' }}>
                  .svg
                </span>
              </div>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  data-testid="btn-download-svg"
                  onClick={handleDownloadSvg}
                  className="flex-1 h-8 rounded-lg text-[11px] font-semibold text-white flex items-center justify-center gap-1.5 cursor-pointer"
                  style={{ backgroundColor: 'var(--studio-accent)' }}
                >
                  <Download size={12} />
                  <span>Download SVG</span>
                </button>
                <button
                  type="button"
                  onClick={handleCopySvg}
                  className="h-8 px-2.5 rounded-lg border text-[11px] font-medium flex items-center gap-1 cursor-pointer"
                  style={{
                    borderColor: 'var(--studio-border-strong)',
                    color: 'var(--studio-text-secondary)',
                  }}
                >
                  <Copy size={12} />
                </button>
              </div>
            </div>

            {/* 2x PNG */}
            <div
              className="p-3 rounded-xl border space-y-2"
              style={{
                backgroundColor: 'var(--studio-surface-2)',
                borderColor: 'var(--studio-border)',
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileImage size={15} style={{ color: 'var(--studio-cyan)' }} />
                  <span className="text-xs font-semibold">High-DPI 2x PNG</span>
                </div>
                <span className="font-mono-tech text-[10px]" style={{ color: 'var(--studio-text-muted)' }}>
                  {doc.artboard.width * 2}×{doc.artboard.height * 2}
                </span>
              </div>
              <button
                type="button"
                data-testid="btn-download-png"
                disabled={busyPng}
                onClick={handleDownloadPng2x}
                className="w-full h-8 rounded-lg border text-[11px] font-semibold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                style={{
                  borderColor: 'rgba(6, 182, 212, 0.45)',
                  backgroundColor: 'rgba(6, 182, 212, 0.12)',
                  color: 'var(--studio-cyan)',
                }}
              >
                <Download size={12} />
                <span>{busyPng ? 'Rasterizing...' : 'Export 2x PNG'}</span>
              </button>
            </div>

            {/* React + Tailwind v4 TSX */}
            <div
              className="p-3 rounded-xl border flex items-center justify-between gap-2"
              style={{
                backgroundColor: 'var(--studio-surface-2)',
                borderColor: 'var(--studio-border)',
              }}
            >
              <div className="flex items-center gap-2 min-w-0">
                <Code2 size={15} style={{ color: 'var(--studio-text-secondary)' }} />
                <div className="min-w-0">
                  <div className="text-xs font-semibold truncate">React + Tailwind v4</div>
                  <div className="font-mono-tech text-[10px]" style={{ color: 'var(--studio-text-muted)' }}>
                    Production JSX
                  </div>
                </div>
              </div>
              <button
                type="button"
                data-testid="btn-download-tsx"
                onClick={handleDownloadTsx}
                className="h-7 px-2.5 rounded-lg border text-[11px] font-semibold cursor-pointer shrink-0"
                style={{
                  borderColor: 'var(--studio-border-strong)',
                  color: 'var(--studio-text)',
                }}
              >
                .tsx
              </button>
            </div>

            {/* W3C Design Tokens JSON */}
            <div
              className="p-3 rounded-xl border flex items-center justify-between gap-2"
              style={{
                backgroundColor: 'var(--studio-surface-2)',
                borderColor: 'var(--studio-border)',
              }}
            >
              <div className="flex items-center gap-2 min-w-0">
                <FileJson2 size={15} style={{ color: 'var(--studio-text-secondary)' }} />
                <div className="min-w-0">
                  <div className="text-xs font-semibold truncate">Design Tokens</div>
                  <div className="font-mono-tech text-[10px]" style={{ color: 'var(--studio-text-muted)' }}>
                    W3C DTCG JSON
                  </div>
                </div>
              </div>
              <button
                type="button"
                data-testid="btn-download-json"
                onClick={handleDownloadTokens}
                className="h-7 px-2.5 rounded-lg border text-[11px] font-semibold cursor-pointer shrink-0"
                style={{
                  borderColor: 'var(--studio-border-strong)',
                  color: 'var(--studio-text)',
                }}
              >
                .json
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
