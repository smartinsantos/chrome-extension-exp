import type { WebMcpToolDescriptor } from '@repo/agent-protocol';
import { cn } from '@repo/ui/lib/utils';

import { ToolHintBadges } from './tool-hint-badges';

interface ToolListProps {
  tools: readonly WebMcpToolDescriptor[];
  selectedToolName: string | undefined;
  onSelectTool: (toolName: string) => void;
}

export function ToolList({ tools, selectedToolName, onSelectTool }: ToolListProps) {
  return (
    <ul aria-label="Tools on this page" className="space-y-1.5">
      {tools.map((tool) => (
        <li key={tool.name}>
          <button
            type="button"
            aria-pressed={tool.name === selectedToolName}
            onClick={() => onSelectTool(tool.name)}
            className={cn(
              'w-full space-y-1 rounded-lg border p-2.5 text-left transition-colors hover:bg-muted/60',
              tool.name === selectedToolName && 'border-primary bg-muted/60',
            )}
          >
            <span className="flex flex-wrap items-center gap-2">
              <code className="font-medium">{tool.name}</code>
              <ToolHintBadges annotations={tool.annotations} />
            </span>
            <span className="line-clamp-2 block text-muted-foreground">{tool.description}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}
