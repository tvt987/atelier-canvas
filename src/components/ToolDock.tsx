import {
  Circle,
  Frame,
  Hand,
  Layers,
  Minus,
  MousePointer2,
  RectangleHorizontal,
  Sparkles,
  Square,
  Type,
} from 'lucide-react';
import type { ToolType } from '../types/canvas';

interface ToolDockProps {
  activeTool: ToolType;
  onSelectTool: (tool: ToolType) => void;
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
  { id: 'frame', label: 'Frame / Artboard', shortcut: 'F', icon: Frame },
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
  layersOpen,
  onToggleLayers,
}: ToolDockProps) {
  return (
    <aside
      className="w-12 shrink-0 border-r flex flex-col items-center justify-between py-2.5 select-none z-30"
      style={{
        backgroundColor: 'var(--studio-surface)',
        borderColor: 'var(--studio-border)',
      }}
    >
      <div className="flex flex-col items-center gap-1">
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
              className="group relative w-9 h-9 rounded-lg flex items-center justify-center transition-all cursor-pointer"
              style={{
                backgroundColor: isActive ? 'var(--studio-accent)' : 'transparent',
                color: isActive ? '#FFFFFF' : 'var(--studio-text-secondary)',
              }}
            >
              <Icon size={16} strokeWidth={1.5} />
              <span
                className="absolute right-0.5 bottom-0.5 font-mono-tech text-[8px] font-semibold leading-none opacity-65"
                style={{ color: isActive ? '#E0E7FF' : 'var(--studio-text-muted)' }}
              >
                {tool.shortcut}
              </span>
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={onToggleLayers}
        title="Toggle Layers Rail"
        className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors cursor-pointer"
        style={{
          backgroundColor: layersOpen ? 'var(--studio-accent-soft)' : 'transparent',
          color: layersOpen ? 'var(--studio-accent)' : 'var(--studio-text-muted)',
        }}
      >
        <Layers size={16} strokeWidth={1.5} />
      </button>
    </aside>
  );
}
