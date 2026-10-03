import type { WebMcpToolDescriptor } from '@repo/agent-protocol';
import { Button } from '@repo/ui/components/button';
import { Textarea } from '@repo/ui/components/textarea';
import { useMutation } from '@tanstack/react-query';
import { Play } from 'lucide-react';
import { useId, useState } from 'react';

import { runToolInTab } from '../../active-tab/active-tab-api';
import { buildArgumentsTemplate, parseToolArguments } from './parse-tool-arguments';

interface ToolRunnerProps {
  tabId: number;
  tool: WebMcpToolDescriptor;
}

/** Lets you call a page tool by hand, exactly as an agent would. */
export function ToolRunner({ tabId, tool }: ToolRunnerProps) {
  const argumentsFieldId = useId();
  const [argumentsText, setArgumentsText] = useState(() =>
    buildArgumentsTemplate(tool.inputSchema),
  );
  const parsedArguments = parseToolArguments(argumentsText);
  const runMutation = useMutation({
    mutationFn: (toolArguments: Record<string, unknown>) =>
      runToolInTab(tabId, tool.name, toolArguments, crypto.randomUUID()),
  });
  const response = runMutation.data;

  return (
    <section aria-label={`Run ${tool.name}`} className="space-y-3 rounded-lg border p-3">
      <p className="whitespace-pre-line text-muted-foreground">{tool.description}</p>
      <details>
        <summary className="cursor-pointer text-xs font-medium">Input schema</summary>
        <pre className="mt-2 max-h-48 overflow-auto rounded bg-muted p-2 text-xs">
          {JSON.stringify(tool.inputSchema, null, 2)}
        </pre>
      </details>
      <div className="space-y-1.5">
        <label htmlFor={argumentsFieldId} className="text-xs font-medium">
          Arguments (JSON)
        </label>
        <Textarea
          id={argumentsFieldId}
          value={argumentsText}
          rows={5}
          className="font-mono text-xs"
          spellCheck={false}
          onChange={(event) => setArgumentsText(event.target.value)}
        />
        {!parsedArguments.isValid && (
          <p className="text-xs text-destructive">{parsedArguments.problem}</p>
        )}
      </div>
      <Button
        size="sm"
        disabled={!parsedArguments.isValid || runMutation.isPending}
        onClick={() => {
          if (parsedArguments.isValid) runMutation.mutate(parsedArguments.toolArguments);
        }}
      >
        <Play aria-hidden />
        Run tool
      </Button>
      {response?.status === 'ok' && (
        <pre aria-label="Result" className="max-h-64 overflow-auto rounded bg-muted p-2 text-xs">
          {JSON.stringify(response.result, null, 2)}
        </pre>
      )}
      {response?.status === 'error' && (
        <p role="alert" className="rounded bg-destructive/10 p-2 text-xs text-destructive">
          {response.code}: {response.message}
        </p>
      )}
    </section>
  );
}
