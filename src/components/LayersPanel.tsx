import { useMemo, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Camera,
  Circle,
  Component,
  Copy,
  Eye,
  EyeOff,
  Frame,
  Image as ImageIcon,
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
  Upload,
  Zap,
} from 'lucide-react';
import type {
  Artboard,
  CanvasNode,
  LeftRailTab,
  NodeType,
} from '../types/canvas';
import { ASSET_KIT_ITEMS } from '../engines/assets';
import { STUDIO_PHOTOS, type StudioPhotoPreset } from '../engines/media';
import type { StudioLabels } from '../i18n/labels';

interface LayersPanelProps {
  artboards: Artboard[];
  activeArtboardId: string;
  onSelectArtboard: (artboardId: string) => void;
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
  onInsertStudioPhoto: (photo: StudioPhotoPreset) => void;
  onUploadLocalImage: (file: File) => void;
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
    case 'image':
      return <ImageIcon {...props} />;
    default:
      return <Square {...props} />;
  }
}

function AssetPreviewWireframe({ id }: { id: string }) {
  switch (id) {
    case 'kpi-sparkline':
      return (
        <svg viewBox="0 0 80 34" className="w-full h-7">
          <rect x="2" y="2" width="76" height="30" rx="6" fill="rgba(99,102,241,0.12)" stroke="rgba(99,102,241,0.45)" strokeWidth="1" />
          <path d="M10 24 C22 18, 30 22, 42 14 C54 8, 62 14, 70 8" fill="none" stroke="#06B6D4" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case 'glass-pricing':
      return (
        <svg viewBox="0 0 80 34" className="w-full h-7">
          <rect x="6" y="2" width="68" height="30" rx="6" fill="rgba(99,102,241,0.12)" stroke="rgba(99,102,241,0.5)" strokeWidth="1" />
          <rect x="14" y="8" width="24" height="5" rx="2" fill="#E2E8F0" opacity="0.85" />
          <rect x="14" y="20" width="52" height="7" rx="3" fill="#6366F1" />
        </svg>
      );
    case 'mini-bars':
      return (
        <svg viewBox="0 0 80 34" className="w-full h-7">
          <rect x="14" y="18" width="7" height="11" rx="2" fill="#334155" />
          <rect x="25" y="13" width="7" height="16" rx="2" fill="#334155" />
          <rect x="36" y="16" width="7" height="13" rx="2" fill="#334155" />
          <rect x="47" y="7" width="7" height="22" rx="2" fill="#06B6D4" />
          <rect x="58" y="14" width="7" height="15" rx="2" fill="#334155" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 80 34" className="w-full h-7">
          <rect x="6" y="5" width="68" height="24" rx="5" fill="rgba(255,255,255,0.06)" stroke="rgba(6,182,212,0.4)" />
          <rect x="14" y="12" width="36" height="3.5" rx="1.5" fill="#E2E8F0" opacity="0.8" />
          <rect x="14" y="19" width="24" height="3" rx="1.5" fill="#06B6D4" opacity="0.7" />
        </svg>
      );
  }
}

export function LayersPanel({
  artboards,
  activeArtboardId,
  onSelectArtboard,
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
  onInsertStudioPhoto,
  onUploadLocalImage,
  labels,
}: LayersPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const uploadInputRef = useRef<HTMLInputElement>(null);

  const primaryBoardId = artboards[0]?.id;

  const groupedByBoard = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return artboards.map((board) => {
      const boardNodes = nodes
        .filter((n) => (n.artboardId ?? primaryBoardId) === board.id)
        .reverse()
        .filter((n) => {
          if (!q) return true;
          return (
            n.name.toLowerCase().includes(q) ||
            n.type.toLowerCase().includes(q) ||
            (n.text ?? '').toLowerCase().includes(q)
          );
        });
      return { board, nodes: boardNodes };
    });
  }, [artboards, nodes, primaryBoardId, searchQuery]);

  const hasSelection = selectedIds.length > 0;

  return (
    <aside
      className="hidden md:flex w-56 shrink-0 border-r flex-col select-none z-20"
      style={{
        backgroundColor: 'var(--studio-surface)',
        borderColor: 'var(--studio-border)',
      }}
    >
      <input
        ref={uploadInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onUploadLocalImage(f);
          e.target.value = '';
        }}
      />

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
        /* STUDIO PHOTOGRAPHY SHELF + PRO UI COMPONENT KIT */
        <div
          data-testid="assets-kit-panel"
          className="flex-1 overflow-y-auto studio-scroll p-2 space-y-3"
        >
          {/* Curated Studio Photography Shelf */}
          <section className="space-y-1.5">
            <div className="px-0.5 flex items-center justify-between font-mono-tech text-[9px] uppercase tracking-wider" style={{ color: 'var(--studio-text-muted)' }}>
              <span className="flex items-center gap-1">
                <Camera size={10} style={{ color: 'var(--studio-cyan)' }} />
                <span>Studio Photos</span>
              </span>
              <button
                type="button"
                onClick={() => uploadInputRef.current?.click()}
                className="flex items-center gap-1 text-[9px] font-semibold cursor-pointer hover:underline"
                style={{ color: 'var(--studio-cyan)' }}
              >
                <Upload size={9} />
                <span>Upload</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              {STUDIO_PHOTOS.map((photo) => (
                <button
                  key={photo.id}
                  type="button"
                  data-testid={`studio-photo-${photo.id}`}
                  onClick={() => onInsertStudioPhoto(photo)}
                  title={`Insert ${photo.title}`}
                  className="group relative aspect-[4/3] rounded-lg overflow-hidden border cursor-pointer transition-all hover:border-cyan-400/70"
                  style={{ borderColor: 'var(--studio-border)' }}
                >
                  <img
                    src={photo.src}
                    alt={photo.title}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent p-1 text-left">
                    <div className="text-[9px] font-medium text-white leading-tight truncate">
                      {photo.title}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </section>

          {/* 10 Pro UI Kit Components */}
          <section className="space-y-1.5 pt-2 border-t" style={{ borderColor: 'var(--studio-border)' }}>
            <div className="px-0.5 flex items-center justify-between font-mono-tech text-[9px] uppercase tracking-wider" style={{ color: 'var(--studio-text-muted)' }}>
              <span>Pro UI Component Kit</span>
              <span style={{ color: 'var(--studio-cyan)' }}>{ASSET_KIT_ITEMS.length}</span>
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
                  className="rounded-md p-1 border"
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
          </section>
        </div>
      ) : (
        /* MULTI-ARTBOARD LAYERS HIERARCHY + SEARCH */
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

          <div className="flex-1 overflow-y-auto studio-scroll p-1.5 space-y-2">
            {groupedByBoard.map(({ board, nodes: boardNodes }) => {
              const isActiveBoard = activeArtboardId === board.id && selectedIds.length === 0;
              return (
                <div key={board.id} className="space-y-0.5">
                  <button
                    type="button"
                    data-testid={`layer-artboard-${board.id}`}
                    onClick={() => {
                      onSelectArtboard(board.id);
                      onSelectIds([]);
                    }}
                    className="w-full px-2 py-1.5 rounded-md flex items-center gap-1.5 text-left text-[11px] font-semibold transition-colors cursor-pointer"
                    style={{
                      backgroundColor: isActiveBoard
                        ? 'var(--studio-accent-soft)'
                        : 'transparent',
                      color: isActiveBoard
                        ? 'var(--studio-accent)'
                        : 'var(--studio-text)',
                    }}
                  >
                    <Frame size={12} strokeWidth={1.6} />
                    <span className="truncate flex-1">{board.name}</span>
                    <span className="font-mono-tech text-[9px] opacity-65">
                      {board.width}×{board.height}
                    </span>
                  </button>

                  <div className="pl-2 space-y-0.5">
                    {boardNodes.map((node) => {
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
                            onSelectArtboard(board.id);
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
              );
            })}
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
