import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Code2,
  CornerDownLeft,
  Download,
  LayoutTemplate,
  Move,
  Palette,
  Search,
  Sparkles,
} from 'lucide-react';
import { filterCommands, type CommandItem } from '../engines/commands';
import type { StudioLabels } from '../i18n/labels';

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  onExecute: (commandId: string) => void;
  labels: StudioLabels;
}

function CategoryIcon({ category }: { category: CommandItem['category'] }) {
  const props = { size: 14, strokeWidth: 1.5 };
  switch (category) {
    case 'generate':
      return <Sparkles {...props} />;
    case 'theme':
      return <Palette {...props} />;
    case 'layout':
      return <Move {...props} />;
    case 'mode':
      return <Code2 {...props} />;
    case 'template':
      return <LayoutTemplate {...props} />;
    case 'export':
      return <Download {...props} />;
  }
}

export function CommandPalette({
  open,
  onClose,
  onExecute,
  labels,
}: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useMemo(() => filterCommands(query), [query]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  if (!open) return null;

  const runItem = (item: CommandItem) => {
    onExecute(item.id);
    onClose();
  };

  return (
    <div
      data-testid="command-palette-backdrop"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-start justify-center pt-[14vh] px-4 bg-black/60 backdrop-blur-sm"
    >
      <div
        data-testid="command-palette"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl rounded-2xl border shadow-2xl overflow-hidden"
        style={{
          backgroundColor: 'var(--studio-surface)',
          borderColor: 'var(--studio-border-strong)',
        }}
      >
        <div
          className="h-12 px-4 border-b flex items-center gap-3"
          style={{ borderColor: 'var(--studio-border)' }}
        >
          <Search size={16} strokeWidth={1.6} style={{ color: 'var(--studio-accent)' }} />
          <input
            ref={inputRef}
            data-testid="command-input"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                onClose();
              } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                setActiveIndex((i) => Math.min(results.length - 1, i + 1));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setActiveIndex((i) => Math.max(0, i - 1));
              } else if (e.key === 'Enter' && results[activeIndex]) {
                e.preventDefault();
                runItem(results[activeIndex]);
              }
            }}
            placeholder={labels.commandPlaceholder}
            className="flex-1 bg-transparent text-sm outline-none"
            style={{ color: 'var(--studio-text)' }}
          />
          <span
            className="font-mono-tech text-[10px] px-1.5 py-0.5 rounded border"
            style={{
              color: 'var(--studio-text-muted)',
              borderColor: 'var(--studio-border)',
            }}
          >
            ESC
          </span>
        </div>

        <div className="max-h-80 overflow-y-auto studio-scroll p-2 space-y-0.5">
          {results.length === 0 ? (
            <div
              className="py-8 text-center text-xs"
              style={{ color: 'var(--studio-text-muted)' }}
            >
              No matching studio actions. Try "glass pricing", "neon orb", or "Swiss Vermilion".
            </div>
          ) : (
            results.map((item, idx) => {
              const isSelected = idx === activeIndex;
              return (
                <button
                  key={item.id}
                  type="button"
                  data-testid={`cmd-item-${item.id}`}
                  onMouseEnter={() => setActiveIndex(idx)}
                  onClick={() => runItem(item)}
                  className="w-full px-3 py-2.5 rounded-xl flex items-center gap-3 text-left transition-colors cursor-pointer"
                  style={{
                    backgroundColor: isSelected
                      ? 'var(--studio-accent-soft)'
                      : 'transparent',
                  }}
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border"
                    style={{
                      backgroundColor: 'var(--studio-surface-2)',
                      borderColor: isSelected
                        ? 'var(--studio-accent)'
                        : 'var(--studio-border)',
                      color: isSelected
                        ? 'var(--studio-accent)'
                        : 'var(--studio-text-secondary)',
                    }}
                  >
                    <CategoryIcon category={item.category} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold truncate">{item.title}</div>
                    <div
                      className="text-[11px] truncate mt-0.5"
                      style={{ color: 'var(--studio-text-secondary)' }}
                    >
                      {item.subtitle}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className="font-mono-tech text-[9px] uppercase px-1.5 py-0.5 rounded"
                      style={{
                        backgroundColor: 'var(--studio-surface-2)',
                        color: 'var(--studio-text-muted)',
                      }}
                    >
                      {item.category}
                    </span>
                    {isSelected && (
                      <CornerDownLeft size={12} style={{ color: 'var(--studio-accent)' }} />
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
