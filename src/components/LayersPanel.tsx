import {
  ArrowDown,
  ArrowUp,
  Circle,
  Copy,
  Eye,
  EyeOff,
  Frame,
  Lock,
  Minus,
  RectangleHorizontal,
  Sparkles,
  Square,
  Trash2,
  Type,
  Unlock,
} from 'lucide-react';
import type { Artboard, CanvasNode, NodeType } from '../types/canvas';
import type { StudioLabels } from '../i18n/labels';

interface LayersPanelProps {
  artboard: Artboard;
  nodes: CanvasNode[];
  selectedIds: string[];
  onSelectIds: (ids: string[]) => void;
  onToggleVisibility: (id: string) => void;
  onToggleLock: (id: string) => void;
  onBringForward: () => void;
  onSendBackward: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  labels: StudioLabels;
}

function NodeIcon({ type }: { type: NodeType }) {
  const props = { size: 13, strokeWidth: 1.5 };
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
    default:
      return <Square {...props} />;
  }
}

export function LayersPanel({
  artboard,
  nodes,
  selectedIds,
  onSelectIds,
  onToggleVisibility,
  onToggleLock,
  onBringForward,
  onSendBackward,
  onDuplicate,
  onDelete,
  labels,
}: LayersPanelProps) {
  const reversed = [...nodes].reverse();
  const hasSelection = selectedIds.length > 0;

  return (
    <aside
      className="hidden md:flex w-56 shrink-0 border-r flex-col select-none z-20"
      style={{
        backgroundColor: 'var(--studio-surface)',
        borderColor: 'var(--studio-border)',
      }}
    >
      {/* Header */}
      <div
        className="h-9 px-3 border-b flex items-center justify-between"
        style={{ borderColor: 'var(--studio-border)' }}
      >
        <span className="text-[11px] font-mono-tech uppercase tracking-wider font-semibold" style={{ color: 'var(--studio-text-secondary)' }}>
          {labels.layersTitle}
        </span>
        <span className="font-mono-tech text-[10px]" style={{ color: 'var(--studio-text-muted)' }}>
          {nodes.length}
        </span>
      </div>

      {/* Artboard Root + Layers List */}
      <div className="flex-1 overflow-y-auto studio-scroll p-1.5 space-y-0.5">
        <button
          type="button"
          onClick={() => onSelectIds([])}
          className="w-full px-2 py-1.5 rounded-md flex items-center gap-2 text-left text-xs font-semibold transition-colors cursor-pointer"
          style={{
            backgroundColor: selectedIds.length === 0 ? 'var(--studio-accent-soft)' : 'transparent',
            color: selectedIds.length === 0 ? 'var(--studio-accent)' : 'var(--studio-text)',
          }}
        >
          <Frame size={13} strokeWidth={1.6} />
          <span className="truncate flex-1">{artboard.name}</span>
          <span className="font-mono-tech text-[9px] opacity-65">
            {artboard.width}×{artboard.height}
          </span>
        </button>

        <div className="pl-2 space-y-0.5 pt-0.5">
          {reversed.map((node) => {
            const isSelected = selectedIds.includes(node.id);
            const hasTokenBinding = Boolean(
              node.tokenBinding && Object.keys(node.tokenBinding).length > 0,
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
                  backgroundColor: isSelected ? 'var(--studio-accent-soft)' : 'transparent',
                  color: isSelected
                    ? 'var(--studio-text)'
                    : node.visible
                      ? 'var(--studio-text-secondary)'
                      : 'var(--studio-text-muted)',
                  opacity: node.visible ? 1 : 0.55,
                }}
              >
                <span style={{ color: isSelected ? 'var(--studio-accent)' : 'var(--studio-text-muted)' }}>
                  <NodeIcon type={node.type} />
                </span>
                <span className="truncate flex-1 font-medium">{node.name}</span>
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
                    {node.locked ? <Lock size={11} strokeWidth={1.6} /> : <Unlock size={11} strokeWidth={1.4} />}
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
                    {node.visible ? <Eye size={11} strokeWidth={1.4} /> : <EyeOff size={11} strokeWidth={1.6} />}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer Quick Layer Ops */}
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
    </aside>
  );
}
