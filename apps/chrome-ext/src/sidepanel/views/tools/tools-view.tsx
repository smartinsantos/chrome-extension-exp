import { Skeleton } from '@repo/ui/components/skeleton';
import { useState } from 'react';

import { useActiveTabTools } from '../../active-tab/use-active-tab-tools';
import { ActiveTabHeader } from './active-tab-header';
import { ActiveTabNotice } from './active-tab-notice';
import { RejectedToolsSummary } from './rejected-tools-summary';
import { ToolList } from './tool-list';
import { ToolRunner } from './tool-runner';

export function ToolsView() {
  const activeTabToolsQuery = useActiveTabTools();
  const [selectedToolName, setSelectedToolName] = useState<string>();
  const activeTabTools = activeTabToolsQuery.data;

  return (
    <section className="space-y-3 p-4">
      <h1 className="text-base font-semibold">Tools</h1>
      {activeTabTools === undefined ? (
        <Skeleton className="h-24" aria-busy="true" />
      ) : activeTabTools.kind !== 'ready' ? (
        <ActiveTabNotice state={activeTabTools} />
      ) : (
        <>
          <ActiveTabHeader origin={activeTabTools.origin} toolCount={activeTabTools.tools.length} />
          {activeTabTools.tools.length === 0 ? (
            <p className="text-muted-foreground">
              This page doesn&apos;t offer any tools right now. Tools can appear as you navigate.
            </p>
          ) : (
            <ToolList
              tools={activeTabTools.tools}
              selectedToolName={selectedToolName}
              onSelectTool={setSelectedToolName}
            />
          )}
          {activeTabTools.tools
            .filter((tool) => tool.name === selectedToolName)
            .map((tool) => (
              // Keyed by tab and tool so the editor resets when either changes.
              <ToolRunner
                key={`${activeTabTools.tabId}-${tool.name}`}
                tabId={activeTabTools.tabId}
                tool={tool}
              />
            ))}
          <RejectedToolsSummary rejectedTools={activeTabTools.rejectedTools} />
        </>
      )}
    </section>
  );
}
