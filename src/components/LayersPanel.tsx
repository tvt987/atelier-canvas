import { useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Circle,
  Component,
  Copy,
  Eye,
  EyeOff,
  Frame,
  Layers,
  Lock,
  Minus,
  PenTool,
  Plus,
  RectangleHorizontal,
  Search,
  Sparkles,
  Square,
  Trash2,
  Type,
  Unlock,
  Zap,
} from 'lucide-react';
import type { Artboard, CanvasNode, LeftRailTab, NodeType } from '../types/canvas';
import { ASSET_KIT_ITEMS } from '../engines/assets';
import type { StudioLabels } from '../i18n/labels';

interface LayersPanelProps {
  artboard: Artboard;
  nodes: CanvasNode[];
  selectedIds: string[];
  leftTab: LeftRailTab;
  onSetLeftTab: (tab: LeftRailTab) => void;
  onSelectIds: (ids: string[]) => void;
  onToggleVisibility: (id: string) => void;
  onToggleLock: (id: string) => void;
  onBringForward: () => void;
  onSendBackward: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onInsertAsset: (assetId: string) => void;
  labels: StudioLabels;
}

function NodeIcon({ type }: { type: NodeType }) {
  const props = { size: 12, strokeWidth: 1.5 };
  switch (type) {
    case 'frame':
      return <Frame {...props} />;
    case 'ellipse':
      return <Circle {...props} />;
    case 'text':
      return <Type {...props} />;
    case 'button':
      return <RectangleHorizontal {...props} />;
    case 'glass':
      return <Sparkles {...props} />;
    case 'line':
      return <Minus {...props} />;
    case 'path':
      return <PenTool {...props} />;
    default:
      return <Square {...props} />;
  }
}

function AssetPreviewWireframe({ id }: { id: string }) {
  switch (id) {
    case 'kpi-sparkline':
      return (
        <svg viewBox="0 0 80 34" className="w-full h-8">
          <rect x="2" y="2" width="76" height="30" rx="6" fill="rgba(99,102,241,0.12)" stroke="rgba(99,102,241,0.45)" strokeWidth="1" />
          <path d="M10 24 C22 18, 30 22, 42 14 C54 8, 62 14, 70 8" fill="none" stroke="#06B6D4" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case 'glass-pricing':
      return (
        <svg viewBox="0 0 80 34" className="w-full h-8">
          <rect x="6" y="2" width="68" height="30" rx="6" fill="rgba(99,102,241,0.12)" stroke="rgba(99,102,241,0.5)" strokeWidth="1" />
          <rect x="14" y="8" width="24" height="5" rx="2" fill="#E2E8F0" opacity="0.85" />
          <rect x="14" y="20" width="52" height="7" rx="3" fill="#6366F1" />
        </svg>
      );
    case 'toggle-pill':
      return (
        <svg viewBox="0 0 80 34" className="w-full h-8">
          <rect x="12" y="9" width="56" height="16" rx="8" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.2)" />
          <rect x="15" y="12" width="26" height="10" rx="5" fill="#6366F1" />
        </svg>
      );
    case 'avatar-stack':
      return (
        <svg viewBox="0 0 80 34" className="w-full h-8">
          <rect x="8" y="8" width="64" height="18" rx="9" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.16)" />
          <circle cx="20" cy="17" r="5" fill="#6366F1" />
          <circle cx="28" cy="17" r="5" fill="#06B6D4" />
          <circle cx="36" cy="17" r="5" fill="#F43F5E" />
          <rect x="46" y="15" width="18" height="4" rx="2" fill="#94A3B8" />
        </svg>
      );
    case 'floating-navbar':
      return (
        <svg viewBox="0 0 80 34" className="w-full h-8">
          <rect x="2" y="9" width="76" height="16" rx="8" fill="rgba(255,255,255,0.07)" stroke="rgba(255,255,255,0.2)" />
          <rect x="8" y="15" width="14" height="4" rx="2" fill="#E2E8F0" />
          <rect x="54" y="12" width="18" height="10" rx="5" fill="#6366F1" />
        </svg>
      );
    case 'ambient-orb':
      return (
        <svg viewBox="0 0 80 34" className="w-full h-8">
          <defs>
            <linearGradient id="orbWire" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#6366F1" />
              <stop offset="100%" stopColor="#06B6D4" />
            </linearGradient>
          </defs>
          <circle cx="40" cy="17" r="12" fill="url(#orbWire)" opacity="0.85" />
        </svg>
      );
    case 'mini-bars':
      return (
        <svg viewBox="0 0 80 34" className="w-full h-8">
          <rect x="14" y="18" width="7" height="11" rx="2" fill="#334155" />
          <rect x="25" y="13" width="7" height="16" rx="2" fill="#334155" />
          <rect x="36" y="16" width="7" height="13" rx="2" fill="#334155" />
          <rect x="47" y="7" width="7" height="22" rx="2" fill="#06B6D4" />
          <rect x="58" y="14" width="7" height="15" rx="2" fill="#334155" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 80 34" className="w-full h-8">
          <rect x="6" y="5" width="68" height="24" rx="5" fill="rgba(255,255,255,0.06)" stroke="rgba(6,182,212,0.4)" />
          <rect x="14" y="12" width="36" height="3.5" rx="1.5" fill="#E2E8F0" opacity="0.8" />
          <rect x="14" y="19" width="24" height="3" rx="1.5" fill="#06B6D4" opacity="0.7" />
        </svg>
      );
  }
}

export function LayersPanel({
  artboard,
  nodes,
  selectedIds,
  leftTab,
  onSetLeftTab,
  onSelectIds,
  onToggleVisibility,
  onToggleLock,
  onBringForward,
  onSendBackward,
  onDuplicate,
  onDelete,
  onInsertAsset,
  labels,
}: LayersPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredReversed = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const rev = [...nodes].reverse();
    if (!q) return rev;
    return rev.filter(
      (n) =>
        n.name.toLowerCase().includes(q) ||
        n.type.toLowerCase().includes(q) ||
        (n.text ?? '').toLowerCase().includes(q),
    );
  }, [nodes, searchQuery]);

  const hasSelection = selectedIds.length > 0;

  return (
    <aside
      className="hidden md:flex w-56 shrink-0 border-r flex-col select-none z-20"
      style={{
        backgroundColor: 'var(--studio-surface)',
        borderColor: 'var(--studio-border)',
      }}
    >
      {/* Dual-Tab Header: Layers | Assets */}
      <div
        className="h-9 px-1.5 border-b grid grid-cols-2 gap-1 items-center"
        style={{ borderColor: 'var(--studio-border)' }}
      >
        <button
          type="button"
          data-testid="left-tab-layers"
          onClick={() => onSetLeftTab('layers')}
          className="h-7 rounded-md text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          style={{
            backgroundColor:
              leftTab === 'layers' ? 'var(--studio-accent-soft)' : 'transparent',
            color:
              leftTab === 'layers'
                ? 'var(--studio-accent)'
                : 'var(--studio-text-secondary)',
          }}
        >
          <Layers size={12} strokeWidth={1.6} />
          <span>{labels.layersTitle}</span>
          <span className="font-mono-tech text-[9px] opacity-70">{nodes.length}</span>
        </button>
        <button
          type="button"
          data-testid="left-tab-assets"
          onClick={() => onSetLeftTab('assets')}
          className="h-7 rounded-md text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          style={{
            backgroundColor:
              leftTab === 'assets' ? 'var(--studio-accent-soft)' : 'transparent',
            color:
              leftTab === 'assets'
                ? 'var(--studio-accent)'
                : 'var(--studio-text-secondary)',
          }}
        >
          <Component size={12} strokeWidth={1.6} />
          <span>{labels.assetsTitle}</span>
        </button>
      </div>

      {leftTab === 'assets' ? (
        /* PRO UI COMPONENT KIT ASSETS TAB */
        <div
          data-testid="assets-kit-panel"
          className="flex-1 overflow-y-auto studio-scroll p-2 space-y-2"
        >
          <div className="px-1 flex items-center justify-between font-mono-tech text-[9px] uppercase tracking-wider" style={{ color: 'var(--studio-text-muted)' }}>
            <span>Pro UI Component Kit</span>
            <span style={{ color: 'var(--studio-cyan)' }}>{ASSET_KIT_ITEMS.length} items</span>
          </div>
          {ASSET_KIT_ITEMS.map((asset) => (
            <div
              key={asset.id}
              data-testid={`asset-card-${asset.id}`}
              className="p-2 rounded-lg border transition-all hover:border-indigo-500/50 space-y-1.5"
              style={{
                backgroundColor: 'var(--studio-surface-2)',
                borderColor: 'var(--studio-border)',
              }}
            >
              <div
                className="rounded-md p-1.5 border"
                style={{
                  backgroundColor: 'var(--studio-canvas)',
                  borderColor: 'var(--studio-border)',
                }}
              >
                <AssetPreviewWireframe id={asset.id} />
              </div>
              <div className="flex items-start justify-between gap-1.5">
                <div className="min-w-0">
                  <div className="text-[11px] font-semibold leading-tight truncate">
                    {asset.name}
                  </div>
                  <div
                    className="font-mono-tech text-[9px] mt-0.5"
                    style={{ color: 'var(--studio-text-muted)' }}
                  >
                    {asset.category} · {asset.dimensions}
                  </div>
                </div>
                <button
                  type="button"
                  data-testid={`btn-insert-asset-${asset.id}`}
                  onClick={() => onInsertAsset(asset.id)}
                  title={`Insert ${asset.name}`}
                  className="h-6 px-2 rounded-md text-[10px] font-semibold text-white flex items-center gap-0.5 shrink-0 cursor-pointer transition-opacity hover:opacity-90"
                  style={{ backgroundColor: 'var(--studio-accent)' }}
                >
                  <Plus size={10} />
                  <span>Add</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* LAYERS HIERARCHY TAB + INSTANT SEARCH */
        <>
          <div className="p-1.5 border-b" style={{ borderColor: 'var(--studio-border)' }}>
            <label
              className="h-7 px-2 rounded-md border flex items-center gap-1.5"
              style={{
                backgroundColor: 'var(--studio-surface-2)',
                borderColor: 'var(--studio-border)',
              }}
            >
              <Search size={11} style={{ color: 'var(--studio-text-muted)' }} />
              <input
                type="text"
                data-testid="layer-search-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={labels.searchLayersPlaceholder}
                className="w-full bg-transparent text-[11px] outline-none"
                style={{ color: 'var(--studio-text)' }}
              />
            </label>
          </div>

          <div className="flex-1 overflow-y-auto studio-scroll p-1.5 space-y-0.5">
            <button
              type="button"
              onClick={() => onSelectIds([])}
              className="w-full px-2 py-1.5 rounded-md flex items-center gap-2 text-left text-xs font-semibold transition-colors cursor-pointer"
              style={{
                backgroundColor:
                  selectedIds.length === 0 ? 'var(--studio-accent-soft)' : 'transparent',
                color:
                  selectedIds.length === 0 ? 'var(--studio-accent)' : 'var(--studio-text)',
              }}
            >
              <Frame size={13} strokeWidth={1.6} />
              <span className="truncate flex-1">{artboard.name}</span>
              <span className="font-mono-tech text-[9px] opacity-65">
                {artboard.width}×{artboard.height}
              </span>
            </button>

            <div className="pl-2 space-y-0.5 pt-0.5">
              {filteredReversed.map((node) => {
                const isSelected = selectedIds.includes(node.id);
                const hasTokenBinding = Boolean(
                  node.tokenBinding && Object.keys(node.tokenBinding).length > 0,
                );
                const hasProto = Boolean(
                  node.prototype &&
                    (node.prototype.entrance !== 'none' ||
                      node.prototype.hoverEffect !== 'none' ||
                      node.prototype.clickAction !== 'none'),
                );

                return (
                  <div
                    key={node.id}
                    data-testid={`layer-item-${node.id}`}
                    onClick={(e) => {
                      if (e.shiftKey) {
                        onSelectIds(
                          isSelected
                            ? selectedIds.filter((id) => id !== node.id)
                            : [...selectedIds, node.id],
                        );
                      } else {
                        onSelectIds([node.id]);
                      }
                    }}
                    className="group h-7 px-2 rounded-md flex items-center gap-1.5 text-[11px] transition-colors cursor-pointer"
                    style={{
                      backgroundColor: isSelected
                        ? 'var(--studio-accent-soft)'
                        : 'transparent',
                      color: isSelected
                        ? 'var(--studio-text)'
                        : node.visible
                          ? 'var(--studio-text-secondary)'
                          : 'var(--studio-text-muted)',
                      opacity: node.visible ? 1 : 0.55,
                    }}
                  >
                    <span
                      style={{
                        color: isSelected
                          ? 'var(--studio-accent)'
                          : 'var(--studio-text-muted)',
                      }}
                    >
                      <NodeIcon type={node.type} />
                    </span>
                    <span className="truncate flex-1 font-medium">{node.name}</span>
                    {hasProto && (
                      <span title="Prototype interaction configured" className="text-emerald-400 shrink-0">
                        <Zap size={10} strokeWidth={2} />
                      </span>
                    )}
                    {hasTokenBinding && (
                      <span
                        title="Bound to live design token"
                        className="w-1.5 h-1.5 rounded-full shrink-0"
                        style={{ backgroundColor: 'var(--studio-cyan)' }}
                      />
                    )}
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleLock(node.id);
                        }}
                        title={node.locked ? 'Unlock' : 'Lock'}
                        className="w-5 h-5 rounded flex items-center justify-center hover:bg-white/10 cursor-pointer"
                      >
                        {node.locked ? (
                          <Lock size={10} strokeWidth={1.6} />
                        ) : (
                          <Unlock size={10} strokeWidth={1.4} />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleVisibility(node.id);
                        }}
                        title={node.visible ? 'Hide' : 'Show'}
                        className="w-5 h-5 rounded flex items-center justify-center hover:bg-white/10 cursor-pointer"
                      >
                        {node.visible ? (
                          <Eye size={10} strokeWidth={1.4} />
                        ) : (
                          <EyeOff size={10} strokeWidth={1.6} />
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div
            className="h-9 px-2 border-t flex items-center justify-between"
            style={{ borderColor: 'var(--studio-border)' }}
          >
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                disabled={!hasSelection}
                onClick={onBringForward}
                title="Bring Forward"
                className="w-7 h-7 rounded flex items-center justify-center disabled:opacity-30 hover:bg-white/5 cursor-pointer disabled:cursor-not-allowed"
                style={{ color: 'var(--studio-text-secondary)' }}
              >
                <ArrowUp size={13} strokeWidth={1.5} />
              </button>
              <button
                type="button"
                disabled={!hasSelection}
                onClick={onSendBackward}
                title="Send Backward"
                className="w-7 h-7 rounded flex items-center justify-center disabled:opacity-30 hover:bg-white/5 cursor-pointer disabled:cursor-not-allowed"
                style={{ color: 'var(--studio-text-secondary)' }}
              >
                <ArrowDown size={13} strokeWidth={1.5} />
              </button>
              <button
                type="button"
                disabled={!hasSelection}
                onClick={onDuplicate}
                title="Duplicate (Ctrl+D)"
                className="w-7 h-7 rounded flex items-center justify-center disabled:opacity-30 hover:bg-white/5 cursor-pointer disabled:cursor-not-allowed"
                style={{ color: 'var(--studio-text-secondary)' }}
              >
                <Copy size={13} strokeWidth={1.5} />
              </button>
            </div>
            <button
              type="button"
              disabled={!hasSelection}
              onClick={onDelete}
              title="Delete (Del)"
              className="w-7 h-7 rounded flex items-center justify-center disabled:opacity-30 hover:bg-rose-500/15 hover:text-rose-400 cursor-pointer disabled:cursor-not-allowed"
              style={{ color: 'var(--studio-text-secondary)' }}
            >
              <Trash2 size={13} strokeWidth={1.5} />
            </button>
          </div>
        </>
      )}
    </aside>
  );
}
