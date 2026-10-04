import { Button } from '@repo/ui/components/button';
import { Skeleton } from '@repo/ui/components/skeleton';
import { Switch } from '@repo/ui/components/switch';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';

import { useExtensionSettings } from '../../../settings/use-extension-settings';
import { useActiveTabTools } from '../../active-tab/use-active-tab-tools';
import { AgentBackendUrlForm } from './agent-backend-url-form';

export function SettingsView() {
  const { settings, updateSettings, setOriginTrust } = useExtensionSettings();

  return (
    <section className="space-y-5 p-4">
      <h1 className="text-base font-semibold">Settings</h1>
      {settings === undefined ? (
        <Skeleton className="h-40" aria-busy="true" />
      ) : (
        <>
          <SettingsSection title="Agent">
            {/* Keyed by the saved value so the field resets when the setting changes elsewhere. */}
            <AgentBackendUrlForm
              key={settings.bffUrl}
              savedUrl={settings.bffUrl}
              onSave={(bffUrl) => updateSettings({ bffUrl })}
            />
            <div className="flex items-start gap-2">
              <Switch
                checked={settings.autoRunReadOnlyOnTrustedOrigins}
                onCheckedChange={(isOn) =>
                  updateSettings({ autoRunReadOnlyOnTrustedOrigins: isOn })
                }
                aria-label="Run read-only tools on trusted sites without asking"
              />
              <span aria-hidden className="text-muted-foreground">
                Run read-only tools on trusted sites without asking. Everything else always asks
                first.
              </span>
            </div>
          </SettingsSection>

          <SettingsSection title="Trusted sites">
            <p className="text-muted-foreground">
              On these sites, the agent believes the tools&apos; own &quot;read-only&quot; labels.
            </p>
            <ul aria-label="Trusted sites" className="divide-y rounded-lg border">
              {settings.trustedOrigins.map((origin) => (
                <li key={origin} className="flex items-center justify-between gap-2 px-3 py-1.5">
                  <span className="truncate">{origin}</span>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    aria-label={`Stop trusting ${origin}`}
                    onClick={() => setOriginTrust({ origin, isTrusted: false })}
                  >
                    <X aria-hidden />
                  </Button>
                </li>
              ))}
              {settings.trustedOrigins.length === 0 && (
                <li className="px-3 py-2 text-muted-foreground">No trusted sites.</li>
              )}
            </ul>
          </SettingsSection>

          <SettingsSection title="Diagnostics">
            <DiagnosticsList />
          </SettingsSection>
        </>
      )}
    </section>
  );
}

function SettingsSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        {title}
      </h2>
      {children}
    </section>
  );
}

function DiagnosticsList() {
  const activeTabToolsQuery = useActiveTabTools();
  const activeTabKind = activeTabToolsQuery.data?.kind;
  const webMcpStatus =
    activeTabKind === 'ready'
      ? 'Available on the active tab'
      : activeTabKind === 'webmcp-unavailable'
        ? 'Not available on the active tab'
        : 'Unknown (open a website)';
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
      <dt className="text-muted-foreground">Browser</dt>
      <dd>{describeBrowser()}</dd>
      <dt className="text-muted-foreground">WebMCP</dt>
      <dd>{webMcpStatus}</dd>
    </dl>
  );
}

function describeBrowser(): string {
  const chromeVersion = /Chrome\/([\d.]+)/.exec(navigator.userAgent)?.[1];
  return chromeVersion === undefined ? 'Not Chrome' : `Chrome ${chromeVersion}`;
}
