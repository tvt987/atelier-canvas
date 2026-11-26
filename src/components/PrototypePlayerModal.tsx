import { useEffect, useState } from 'react';
import {
  CheckCircle2,
  ChevronRight,
  Laptop,
  Monitor,
  Palette,
  RotateCcw,
  Smartphone,
  X,
  Zap,
} from 'lucide-react';
import type {
  CanvasNode,
  DesignTokens,
  DeviceFrameMode,
  DocumentState,
  PrototypeConfig,
  ScreenTransition,
} from '../types/canvas';
import {
  BRAND_TOKEN_THEMES,
  resolveArtboardBackground,
  resolveNodeStyle,
} from '../engines/tokens';
import { buildSvgPathData } from '../engines/bezier';
import { buildImageFilterCss } from '../engines/media';
import { getDocumentArtboards, getNodesForArtboard } from '../engines/projectStorage';

interface PrototypePlayerModalProps {
  open: boolean;
  onClose: () => void;
  doc: DocumentState;
  onUpdateTokens: (tokens: DesignTokens) => void;
  onSwitchTemplate: (templateId: string) => void;
}

function easingToCss(easing: PrototypeConfig['easing']): string {
  if (easing === 'spring') return 'cubic-bezier(0.34, 1.56, 0.64, 1)';
  if (easing === 'expo-out') return 'cubic-bezier(0.16, 1, 0.3, 1)';
  return 'ease-in-out';
}

export function PrototypePlayerModal({
  open,
  onClose,
  doc,
  onUpdateTokens,
  onSwitchTemplate,
}: PrototypePlayerModalProps) {
  const artboards = getDocumentArtboards(doc);
  const [activeArtboardId, setActiveArtboardId] = useState(doc.artboard.id);
  const [activeTransition, setActiveTransition] =
    useState<ScreenTransition>('slide-left');
  const [device, setDevice] = useState<DeviceFrameMode>('studio');
  const [replayKey, setReplayKey] = useState(1);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [pulsingId, setPulsingId] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setActiveArtboardId(doc.artboard.id);
      setReplayKey((k) => k + 1);
      setToastMsg(null);
    }
  }, [open, doc.artboard.id]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key.toLowerCase() === 'r') setReplayKey((k) => k + 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const activeBoard =
    artboards.find((a) => a.id === activeArtboardId) ?? doc.artboard;
  const boardNodes = getNodesForArtboard(doc, activeBoard.id).filter(
    (n) => n.visible,
  );
  const artboardBg = resolveArtboardBackground(activeBoard, doc.tokens);

  const triggerToast = (msg: string) => {
    setToastMsg(msg);
    window.setTimeout(() => {
      setToastMsg((prev) => (prev === msg ? null : prev));
    }, 3200);
  };

  const navigateToScreen = (
    targetId: string,
    transition: ScreenTransition = 'slide-left',
  ) => {
    const exists = artboards.find((a) => a.id === targetId);
    if (!exists) return;
    setActiveTransition(transition);
    setActiveArtboardId(exists.id);
    setReplayKey((k) => k + 1);
    triggerToast(`Navigated -> ${exists.name} (${transition})`);
  };

  const handleNodeClick = (node: CanvasNode) => {
    const proto = node.prototype;
    if (!proto || proto.clickAction === 'none') return;

    if (proto.clickAction === 'navigate_artboard' && proto.targetArtboardId) {
      navigateToScreen(
        proto.targetArtboardId,
        proto.transition ?? 'slide-left',
      );
    } else if (proto.clickAction === 'toast') {
      triggerToast(proto.clickPayload || `${node.name} interaction executed`);
    } else if (proto.clickAction === 'pulse-target') {
      const targetId = proto.clickPayload || node.id;
      setPulsingId(targetId);
      triggerToast(`Highlighted target layer: ${targetId}`);
      window.setTimeout(() => setPulsingId(null), 1900);
    } else if (proto.clickAction === 'toggle-theme') {
      const idx = BRAND_TOKEN_THEMES.findIndex((t) => t.id === doc.tokens.id);
      const nextTheme =
        BRAND_TOKEN_THEMES[(idx + 1) % BRAND_TOKEN_THEMES.length];
      onUpdateTokens(nextTheme);
      triggerToast(`Morphed live tokens -> ${nextTheme.name}`);
    } else if (proto.clickAction === 'switch-template') {
      const targetTemplate = proto.clickPayload || 'ai-saas-hero';
      onSwitchTemplate(targetTemplate);
      setReplayKey((k) => k + 1);
      triggerToast(`Switched template -> ${targetTemplate}`);
    }
  };

  const scale =
    device === 'iphone'
      ? Math.min(340 / activeBoard.width, 600 / activeBoard.height, 0.92)
      : device === 'macbook'
        ? Math.min(820 / activeBoard.width, 500 / activeBoard.height, 0.94)
        : Math.min(920 / activeBoard.width, 600 / activeBoard.height, 1);

  const scaledW = Math.round(activeBoard.width * scale);
  const scaledH = Math.round(activeBoard.height * scale);

  const screenEntranceCss =
    activeTransition === 'slide-left'
      ? 'atelier-slide-left 360ms cubic-bezier(0.16, 1, 0.3, 1) both'
      : activeTransition === 'spring-scale'
        ? 'atelier-spring-scale 400ms cubic-bezier(0.34, 1.56, 0.64, 1) both'
        : 'atelier-fade-up 300ms ease-out both';

  const renderArtboard = () => (
    <div
      key={`${activeBoard.id}-${replayKey}`}
      data-testid={`proto-active-screen-${activeBoard.id}`}
      className="relative"
      style={{
        width: scaledW,
        height: scaledH,
        overflow: 'clip',
        borderRadius: Math.round(activeBoard.radius * scale),
        animation: screenEntranceCss,
        boxShadow:
          device === 'studio'
            ? '0 32px 110px rgba(0, 0, 0, 0.65), 0 0 0 1px rgba(255,255,255,0.1)'
            : undefined,
      }}
    >
      <div
        className="absolute top-0 left-0 overflow-hidden"
        style={{
          width: activeBoard.width,
          height: activeBoard.height,
          borderRadius: activeBoard.radius,
          background: artboardBg.cssBackground,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
        }}
      >
        {boardNodes.map((node) => {
          const style = resolveNodeStyle(node, doc.tokens);
          const proto = node.prototype;
          const hoverClass =
            proto && proto.hoverEffect !== 'none'
              ? `proto-hover-${proto.hoverEffect}`
              : '';
          const isInteractive = Boolean(proto && proto.clickAction !== 'none');
          const isPulsing = pulsingId === node.id;

          const animName =
            proto && proto.entrance !== 'none'
              ? `atelier-${proto.entrance}`
              : undefined;
          const isLooping =
            proto?.entrance === 'float-levitate' ||
            proto?.entrance === 'shimmer-glow';

          const animCss =
            animName && proto
              ? `${animName} ${proto.durationMs}ms ${easingToCss(proto.easing)} ${proto.delayMs}ms ${isLooping ? 'infinite' : 'both'}`
              : undefined;

          if (node.type === 'image') {
            const filterCss = buildImageFilterCss(node.imageFilter);
            return (
              <div
                key={node.id}
                data-testid={`proto-node-${node.id}`}
                onClick={() => handleNodeClick(node)}
                className={`absolute overflow-hidden ${hoverClass} ${isPulsing ? 'proto-pulsing' : ''}`}
                style={{
                  left: node.x - activeBoard.x,
                  top: node.y - activeBoard.y,
                  width: node.width,
                  height: node.height,
                  borderRadius: style.radius,
                  opacity: node.opacity,
                  border:
                    node.strokeWidth > 0
                      ? `${node.strokeWidth}px solid ${style.strokeColor}`
                      : undefined,
                  boxShadow:
                    style.boxShadow !== 'none' ? style.boxShadow : undefined,
                  animation: animCss,
                  cursor: isInteractive ? 'pointer' : 'default',
                }}
              >
                <img
                  src={node.imageSrc}
                  alt={node.name}
                  className="w-full h-full pointer-events-none"
                  style={{
                    objectFit: node.objectFit ?? 'cover',
                    filter: filterCss,
                  }}
                />
              </div>
            );
          }

          if (node.type === 'path' && node.pathData) {
            const d = buildSvgPathData(
              node.pathData.points,
              node.pathData.smooth !== false,
              Boolean(node.pathData.closed),
            );
            const dash =
              node.pathData.dashStyle === 'dashed'
                ? '8 6'
                : node.pathData.dashStyle === 'dotted'
                  ? '2 6'
                  : undefined;
            return (
              <svg
                key={node.id}
                className={`absolute overflow-visible ${hoverClass}`}
                style={{
                  left: node.x - activeBoard.x,
                  top: node.y - activeBoard.y,
                  width: node.width,
                  height: node.height,
                  opacity: node.opacity,
                  animation: animCss,
                  filter: node.pathData.glow
                    ? `drop-shadow(0 0 8px ${style.strokeColor})`
                    : undefined,
                }}
                viewBox={`0 0 ${node.width} ${node.height}`}
                fill="none"
              >
                <path
                  d={d}
                  stroke={style.strokeColor}
                  strokeWidth={Math.max(1.5, node.strokeWidth || 2.5)}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray={dash}
                />
              </svg>
            );
          }

          return (
            <div
              key={node.id}
              data-testid={`proto-node-${node.id}`}
              onClick={() => handleNodeClick(node)}
              className={`absolute ${hoverClass} ${isPulsing ? 'proto-pulsing' : ''}`}
              style={{
                left: node.x - activeBoard.x,
                top: node.y - activeBoard.y,
                width: node.width,
                height: node.height,
                transform:
                  node.rotation !== 0 ? `rotate(${node.rotation}deg)` : undefined,
                borderRadius: style.radius,
                opacity: node.opacity,
                background:
                  node.type === 'text' ? 'transparent' : style.cssBackground,
                border:
                  node.strokeWidth > 0
                    ? `${node.strokeWidth}px solid ${style.strokeColor}`
                    : undefined,
                backdropFilter: node.blur > 0 ? `blur(${node.blur}px)` : undefined,
                WebkitBackdropFilter:
                  node.blur > 0 ? `blur(${node.blur}px)` : undefined,
                boxShadow:
                  style.boxShadow !== 'none' ? style.boxShadow : undefined,
                mixBlendMode: node.blendMode,
                animation: animCss,
                cursor: isInteractive ? 'pointer' : 'default',
                display:
                  node.type === 'button' || node.type === 'text'
                    ? 'flex'
                    : undefined,
                alignItems: node.type === 'button' ? 'center' : 'flex-start',
                justifyContent:
                  node.type === 'button'
                    ? 'center'
                    : node.textAlign === 'center'
                      ? 'center'
                      : node.textAlign === 'right'
                        ? 'flex-end'
                        : 'flex-start',
              }}
            >
              {(node.type === 'text' || node.type === 'button') && (
                <span
                  className="w-full"
                  style={{
                    color: style.textColor,
                    fontFamily: node.fontFamily ?? 'Inter',
                    fontWeight: node.fontWeight ?? 500,
                    fontSize: node.fontSize ?? 14,
                    letterSpacing: node.letterSpacing ?? 0,
                    lineHeight: node.lineHeight ?? 1.25,
                    textAlign: node.textAlign ?? 'left',
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {node.text}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div
      data-testid="prototype-player-modal"
      className="fixed inset-0 z-50 flex flex-col bg-[#06070B]/95 backdrop-blur-xl text-slate-100 select-none"
      style={{
        backgroundImage:
          'radial-gradient(circle at 50% 0%, rgba(99,102,241,0.16), transparent 55%), radial-gradient(circle at 80% 90%, rgba(6,182,212,0.12), transparent 50%)',
      }}
    >
      {/* Top Presenter Bar with Multi-Screen Breadcrumb */}
      <header className="h-14 px-5 border-b border-white/10 flex items-center justify-between gap-4 shrink-0 bg-[#0B0D13]/85 backdrop-blur-md">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 font-mono-tech text-[10px] font-semibold shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>LIVE FLOW</span>
          </div>

          <div
            data-testid="proto-screen-breadcrumbs"
            className="flex items-center gap-1 overflow-hidden"
          >
            {artboards.map((board, idx) => {
              const isCurrent = board.id === activeBoard.id;
              return (
                <div key={board.id} className="flex items-center gap-1">
                  {idx > 0 && <ChevronRight size={12} className="text-slate-600" />}
                  <button
                    type="button"
                    data-testid={`proto-crumb-${board.id}`}
                    onClick={() => navigateToScreen(board.id, 'dissolve')}
                    className="px-2 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap"
                    style={{
                      backgroundColor: isCurrent
                        ? 'rgba(99, 102, 241, 0.22)'
                        : 'transparent',
                      color: isCurrent ? '#E0E7FF' : '#94A3B8',
                    }}
                  >
                    0{idx + 1} · {board.name}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Device Bezel Switcher */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-white/5 border border-white/10 shrink-0">
          {(
            [
              ['studio', 'Floating Studio', Monitor],
              ['macbook', 'MacBook Pro', Laptop],
              ['iphone', 'iPhone 16 Pro', Smartphone],
            ] as const
          ).map(([id, label, Icon]) => (
            <button
              key={id}
              type="button"
              data-testid={`device-frame-${id}`}
              onClick={() => setDevice(id)}
              className="h-7 px-2.5 rounded-lg text-[11px] font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
              style={{
                backgroundColor: device === id ? '#6366F1' : 'transparent',
                color: device === id ? '#FFFFFF' : '#94A3B8',
              }}
            >
              <Icon size={13} strokeWidth={1.6} />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="hidden lg:flex items-center gap-1 px-2 py-1 rounded-lg bg-white/5 border border-white/10">
            <Palette size={12} className="text-slate-400 mr-1" />
            {BRAND_TOKEN_THEMES.map((theme) => (
              <button
                key={theme.id}
                type="button"
                title={`Morph to ${theme.name}`}
                onClick={() => onUpdateTokens(theme)}
                className="w-4 h-4 rounded-full border transition-transform hover:scale-115 cursor-pointer"
                style={{
                  backgroundColor: theme.brandPrimary,
                  borderColor:
                    doc.tokens.id === theme.id
                      ? '#FFFFFF'
                      : 'rgba(255,255,255,0.2)',
                }}
              />
            ))}
          </div>

          <button
            type="button"
            data-testid="btn-proto-replay"
            onClick={() => setReplayKey((k) => k + 1)}
            className="h-8 px-3 rounded-lg bg-white/10 hover:bg-white/15 border border-white/10 text-xs font-medium flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw size={12} />
            <span>Replay (R)</span>
          </button>

          <button
            type="button"
            data-testid="btn-proto-close"
            onClick={onClose}
            className="h-8 px-3 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/40 text-rose-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
          >
            <X size={13} />
            <span>Exit</span>
          </button>
        </div>
      </header>

      {/* Center Device Showcase */}
      <div className="flex-1 flex items-center justify-center p-6 overflow-hidden">
        {device === 'macbook' ? (
          <div data-testid="bezel-macbook" className="flex flex-col items-center">
            <div className="p-3.5 pb-4 rounded-t-2xl bg-[#11131A] border-2 border-slate-700/80 shadow-2xl relative">
              <div className="w-24 h-3.5 rounded-b-lg bg-[#050608] mx-auto mb-2 flex items-center justify-center">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-700" />
              </div>
              {renderArtboard()}
            </div>
            <div className="w-[106%] h-4 rounded-b-xl bg-gradient-to-b from-slate-600 via-slate-700 to-slate-800 border-t border-slate-400/40 flex items-center justify-center shadow-2xl">
              <div className="w-20 h-1.5 rounded-full bg-slate-900/60" />
            </div>
          </div>
        ) : device === 'iphone' ? (
          <div
            data-testid="bezel-iphone"
            className="p-3 rounded-[44px] bg-[#13161E] border-[3px] border-slate-600/80 shadow-2xl flex flex-col items-center gap-3"
          >
            <div className="w-24 h-5 rounded-full bg-black flex items-center justify-end pr-2 border border-white/10">
              <span className="w-2 h-2 rounded-full bg-indigo-950 border border-indigo-500/40" />
            </div>
            <div className="rounded-[26px] overflow-hidden bg-black/40 py-6 px-2 flex items-center justify-center">
              {renderArtboard()}
            </div>
            <div className="w-28 h-1 rounded-full bg-slate-500/60" />
          </div>
        ) : (
          <div data-testid="bezel-studio">{renderArtboard()}</div>
        )}
      </div>

      {/* Bottom Toast / Interactive Hint */}
      <footer className="h-12 px-6 flex items-center justify-center relative shrink-0">
        {toastMsg ? (
          <div
            data-testid="proto-toast"
            className="px-4 py-2 rounded-full bg-[#111520] border border-cyan-400/50 text-cyan-100 font-mono-tech text-xs flex items-center gap-2 shadow-2xl"
          >
            <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
            <span>{toastMsg}</span>
          </div>
        ) : (
          <div className="font-mono-tech text-[11px] text-slate-400 flex items-center gap-2">
            <Zap size={12} className="text-emerald-400" />
            <span>
              Click Instant Transfer to navigate live to Checkout Screen · Press R to replay
            </span>
          </div>
        )}
      </footer>
    </div>
  );
}
