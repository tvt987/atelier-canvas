import { useRef } from 'react';
import {
  Circle,
  Frame,
  Hand,
  Image as ImageIcon,
  Layers,
  Minus,
  MousePointer2,
  PenTool,
  RectangleHorizontal,
  Sparkles,
  Square,
  Type,
  Upload,
} from 'lucide-react';
import type { ToolType } from '../types/canvas';

interface ToolDockProps {
  activeTool: ToolType;
  onSelectTool: (tool: ToolType) => void;
  onUploadLocalImage: (file: File) => void;
  layersOpen: boolean;
  onToggleLayers: () => void;
}

const TOOLS: Array<{
  id: ToolType;
  label: string;
  shortcut: string;
  icon: typeof MousePointer2;
}> = [
  { id: 'select', label: 'Select / Marquee', shortcut: 'V', icon: MousePointer2 },
  { id: 'hand', label: 'Hand Pan', shortcut: 'H', icon: Hand },
  { id: 'pen', label: 'Vector Bezier Pen', shortcut: 'P', icon: PenTool },
  { id: 'image', label: 'Studio Photo Layer', shortcut: 'I', icon: ImageIcon },
  { id: 'frame', label: 'Auto-Layout Frame', shortcut: 'F', icon: Frame },
  { id: 'rect', label: 'Rectangle / Card', shortcut: 'R', icon: Square },
  { id: 'ellipse', label: 'Ellipse / Orb', shortcut: 'O', icon: Circle },
  { id: 'text', label: 'Typography Text', shortcut: 'T', icon: Type },
  { id: 'button', label: 'UI Button', shortcut: 'B', icon: RectangleHorizontal },
  { id: 'glass', label: 'Glass Blur Card', shortcut: 'G', icon: Sparkles },
  { id: 'line', label: 'Vector Line', shortcut: 'L', icon: Minus },
];

export function ToolDock({
  activeTool,
  onSelectTool,
  onUploadLocalImage,
  layersOpen,
  onToggleLayers,
}: ToolDockProps) {
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <aside
      className="w-12 shrink-0 border-r flex flex-col items-center justify-between py-2 select-none z-30"
      style={{
        backgroundColor: 'var(--studio-surface)',
        borderColor: 'var(--studio-border)',
      }}
    >
      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onUploadLocalImage(f);
          e.target.value = '';
        }}
      />

      <div className="flex flex-col items-center gap-0.5">
        {TOOLS.map((tool) => {
          const Icon = tool.icon;
          const isActive = activeTool === tool.id;
          return (
            <button
              key={tool.id}
              type="button"
              data-testid={`tool-${tool.id}`}
              onClick={() => onSelectTool(tool.id)}
              title={`${tool.label} (${tool.shortcut})`}
              className="group relative w-9 h-8 rounded-lg flex items-center justify-center transition-all cursor-pointer"
              style={{
                backgroundColor: isActive ? 'var(--studio-accent)' : 'transparent',
                color: isActive ? '#FFFFFF' : 'var(--studio-text-secondary)',
              }}
            >
              <Icon size={15} strokeWidth={1.5} />
              <span
                className="absolute right-0.5 bottom-0.5 font-mono-tech text-[8px] font-semibold leading-none opacity-65"
                style={{ color: isActive ? '#E0E7FF' : 'var(--studio-text-muted)' }}
              >
                {tool.shortcut}
              </span>
            </button>
          );
        })}

        <div className="w-6 h-px my-1" style={{ backgroundColor: 'var(--studio-border)' }} />

        <button
          type="button"
          data-testid="btn-upload-photo"
          onClick={() => fileRef.current?.click()}
          title="Upload Local Photo (PNG / JPG / WebP)"
          className="w-9 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-white/10 cursor-pointer"
          style={{ color: 'var(--studio-cyan)' }}
        >
          <Upload size={14} strokeWidth={1.6} />
        </button>
      </div>

      <button
        type="button"
        onClick={onToggleLayers}
        title="Toggle Layers & Assets Rail"
        className="w-9 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer"
        style={{
          backgroundColor: layersOpen ? 'var(--studio-accent-soft)' : 'transparent',
          color: layersOpen ? 'var(--studio-accent)' : 'var(--studio-text-muted)',
        }}
      >
        <Layers size={15} strokeWidth={1.5} />
      </button>
    </aside>
  );
}
