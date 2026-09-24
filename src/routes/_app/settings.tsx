import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Database, Download, Monitor, Moon, Sun, Upload } from "lucide-react";
import { useTheme } from "@/components/theme";
import { Fragment, useId, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { todayISO } from "@shared/dates.ts";
import type { Settings } from "@shared/settings.ts";
import { Page, PageHeader, SectionHeader } from "@/components/page";
import { DaySelect, HourSelect } from "@/components/pickers";
import { MetaSep } from "@/components/row";
import { Segmented } from "@/components/segmented";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { api, call } from "@/lib/api";
import { apiFetch } from "@/lib/api-fetch";
import { useBootstrap } from "@/lib/hooks";
import { useApiMutation } from "@/lib/mutations";
import { dataInfoQuery } from "@/lib/queries";

export const Route = createFileRoute("/_app/settings")({
  component: SettingsPage,
});

/** On a phone the control takes its own full-width line under the label. */
const selectWidth = "w-full sm:w-44";
/** Segmented controls fill that line on a phone; options share the width and keep their labels whole. */
const segmentedWidth = "max-sm:w-full";
const segmentedOption = "max-sm:flex-auto max-sm:px-2";
/** Below 360px the four urgency options only fit on one line at the smaller text step with tight padding. */
const segmentedOptionTight = "max-sm:flex-auto min-[360px]:max-sm:px-2 max-[359px]:px-1 max-[359px]:text-xs";

function SettingsPage() {
  const { settings, dev } = useBootstrap();
  const { setTheme } = useTheme();
  const save = useApiMutation((patch: Partial<Settings>) => call(api.settings.$patch({ json: patch })), { success: "Saved" });
  const [name, setName] = useState(settings.displayName);

  return (
    <Page width="narrow">
      <PageHeader title="Settings" description="The planner should be your servant, never your master. Shape it to your week." />
      <div className="space-y-10">
        <SettingsGroup title="You">
          <SettingRow label="Name" hint="Used in greetings.">
            {({ id, hintId }) => (
              <Input
                id={id}
                aria-describedby={hintId}
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={() => name !== settings.displayName && save.mutate({ displayName: name.trim() })}
                className="w-full sm:w-56"
              />
            )}
          </SettingRow>
        </SettingsGroup>

        <SettingsGroup title="Your week">
          <SettingRow label="Week starts on">
            {({ id }) => (
              <DaySelect
                id={id}
                className={selectWidth}
                value={settings.weekStartsOn}
                onChange={(v) => save.mutate({ weekStartsOn: v as Settings["weekStartsOn"] })}
              />
            )}
          </SettingRow>
          <SettingRow label="Planning day" hint="Compass nudges you on this day to plan the coming week.">
            {({ id }) => <DaySelect id={id} className={selectWidth} value={settings.planningDay} onChange={(v) => save.mutate({ planningDay: v })} />}
          </SettingRow>
          <SettingRow label="Day starts" hint="The top of your calendar, and part of your capacity.">
            {({ id }) => (
              <HourSelect id={id} className={selectWidth} value={settings.dayStartHour} min={0} max={12} onChange={(v) => save.mutate({ dayStartHour: v })} />
            )}
          </SettingRow>
          <SettingRow label="Day ends">
            {({ id }) => (
              <HourSelect
                id={id}
                className={selectWidth}
                value={settings.dayEndHour}
                min={Math.max(settings.dayStartHour + 1, 14)}
                max={24}
                onChange={(v) => save.mutate({ dayEndHour: v })}
              />
            )}
          </SettingRow>
          <SettingRow group label="Default block length" hint="When you drop a rock onto the calendar without an estimate.">
            {({ labelId, hintId }) => (
              <Segmented<"30" | "45" | "60" | "90">
                aria-labelledby={labelId}
                aria-describedby={hintId}
                className={segmentedWidth}
                value={String(settings.defaultBlockMinutes) as "60"}
                onChange={(v) => save.mutate({ defaultBlockMinutes: Number(v) })}
                options={[
                  { value: "30", label: "30m", className: segmentedOption },
                  { value: "45", label: "45m", className: segmentedOption },
                  { value: "60", label: "1h", className: segmentedOption },
                  { value: "90", label: "1½h", className: segmentedOption },
                ]}
              />
            )}
          </SettingRow>
        </SettingsGroup>

        <SettingsGroup title="Prioritizing">
          <SettingRow group label="Deadlines make things urgent" hint="A task due within this window counts as urgent, unless you say otherwise.">
            {({ labelId, hintId }) => (
              <Segmented<"0" | "1" | "2" | "3">
                aria-labelledby={labelId}
                aria-describedby={hintId}
                className={segmentedWidth}
                value={String(settings.urgentWithinDays) as "1"}
                onChange={(v) => save.mutate({ urgentWithinDays: Number(v) })}
                options={[
                  { value: "0", label: "Due today", className: segmentedOptionTight },
                  { value: "1", label: "≤ 1 day", className: segmentedOptionTight },
                  { value: "2", label: "≤ 2 days", className: segmentedOptionTight },
                  { value: "3", label: "≤ 3 days", className: segmentedOptionTight },
                ]}
              />
            )}
          </SettingRow>
          <SettingRow group label="Planning target" hint="Share of waking hours you aim to schedule. The rest is room for people and the unexpected.">
            {({ labelId, hintId }) => (
              <Segmented<"0.4" | "0.5" | "0.6" | "0.7">
                aria-labelledby={labelId}
                aria-describedby={hintId}
                className={segmentedWidth}
                value={String(settings.capacityTarget) as "0.6"}
                onChange={(v) => save.mutate({ capacityTarget: Number(v) })}
                options={[
                  { value: "0.4", label: "40%", className: segmentedOption },
                  { value: "0.5", label: "50%", className: segmentedOption },
                  { value: "0.6", label: "60%", className: segmentedOption },
                  { value: "0.7", label: "70%", className: segmentedOption },
                ]}
              />
            )}
          </SettingRow>
          <SettingRow group label="Language coach" hint="Gently flags reactive phrasing (“I have to”, “I can’t”) as you write.">
            {({ labelId, hintId }) => (
              <Segmented<Settings["languageCoach"]>
                aria-labelledby={labelId}
                aria-describedby={hintId}
                className={segmentedWidth}
                value={settings.languageCoach}
                onChange={(v) => save.mutate({ languageCoach: v })}
                options={[
                  { value: "off", label: "Off", className: segmentedOption },
                  { value: "strong", label: "Clear cases", className: segmentedOption },
                  { value: "all", label: "Everything", className: segmentedOption },
                ]}
              />
            )}
          </SettingRow>
        </SettingsGroup>

        <SettingsGroup title="Appearance">
          <SettingRow group label="Theme">
            {({ labelId }) => (
              <Segmented<Settings["theme"]>
                aria-labelledby={labelId}
                className={segmentedWidth}
                value={settings.theme}
                onChange={(v) => {
                  setTheme(v);
                  save.mutate({ theme: v });
                }}
                options={[
                  {
                    value: "light",
                    label: (
                      <>
                        <Sun aria-hidden /> Light
                      </>
                    ),
                    className: segmentedOption,
                  },
                  {
                    value: "dark",
                    label: (
                      <>
                        <Moon aria-hidden /> Dark
                      </>
                    ),
                    className: segmentedOption,
                  },
                  {
                    value: "system",
                    label: (
                      <>
                        <Monitor aria-hidden /> System
                      </>
                    ),
                    className: segmentedOption,
                  },
                ]}
              />
            )}
          </SettingRow>
        </SettingsGroup>

        <DataSection dev={dev} />
      </div>
    </Page>
  );
}

/** A settings group: a section heading on the page, then one flush card of divided rows. */
function SettingsGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <SectionHeader title={title} />
      <Card variant="flush" className="@container/settings divide-y divide-border-subtle">
        {children}
      </Card>
    </section>
  );
}

type RowIds = { id: string; labelId: string; hintId: string | undefined };

/**
 * One setting: label and hint on the left, the control on the right. Rows query their card, so every
 * row in a group switches together: on a card narrower than 36rem (a phone, or beside the sidebar on
 * a tablet) each control sits on its own line under its label.
 * `group` is for a Segmented: the label is plain text the group points at with `aria-labelledby`
 * (a `<label>` can't name a group); otherwise it is a `<label htmlFor>` for the control.
 */
function SettingRow({
  label,
  hint,
  group = false,
  children,
}: {
  label: string;
  hint?: string;
  group?: boolean;
  children: (ids: RowIds) => ReactNode;
}) {
  const id = useId();
  const labelId = `${id}-label`;
  const hintId = hint ? `${id}-hint` : undefined;
  return (
    <div className="flex flex-col items-start gap-3 px-5 py-4 max-sm:px-4 @xl/settings:flex-row @xl/settings:items-center @xl/settings:justify-between @xl/settings:gap-6">
      <div className="min-w-0 self-stretch @xl/settings:flex-1 @xl/settings:self-auto">
        {group ? (
          <p id={labelId} className="text-sm font-medium text-foreground">
            {label}
          </p>
        ) : (
          <Label id={labelId} htmlFor={id}>
            {label}
          </Label>
        )}
        {hint && (
          <p id={hintId} className="mt-0.5 max-w-sm text-xs text-muted-foreground">
            {hint}
          </p>
        )}
      </div>
      {children({ id, labelId, hintId })}
    </div>
  );
}

function DataSection({ dev }: { dev: boolean }) {
  const qc = useQueryClient();
  const { data: info, isPending: infoPending } = useQuery(dataInfoQuery());
  const fileRef = useRef<HTMLInputElement>(null);
  const [pendingImport, setPendingImport] = useState<{ name: string; data: Record<string, unknown> } | null>(null);
  const demo = useApiMutation(() => call(api.data.demo.$post()), {
    success: (r) => (r.seeded ? "Sample data loaded" : "reason" in r ? String(r.reason) : "Not loaded"),
  });
  const importData = useApiMutation(
    (data: Record<string, unknown>) => call(api.data.import.$post({ json: { confirm: "REPLACE", data } })),
    {
      invalidate: false,
      onSuccess: async () => {
        toast.success("Import complete. A copy of your previous data was downloaded first.");
        await qc.resetQueries();
      },
    },
  );

  /** Downloads everything as JSON. Returns false if the export failed. */
  const exportNow = async (): Promise<boolean> => {
    const res = await apiFetch("/api/data/export");
    if (!res.ok) {
      toast.error("Export failed. Please try again.");
      return false;
    }
    const url = URL.createObjectURL(await res.blob());
    const a = document.createElement("a");
    a.href = url;
    a.download = `compass-export-${todayISO()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    return true;
  };

  const counts = info
    ? [
        `${info.counts.roles} roles`,
        `${info.counts.goals} long-term goals`,
        `${info.counts.tasks} tasks & rocks`,
        `${info.counts.blocks} time blocks`,
        `${info.counts.journal} journal entries`,
      ]
    : null;

  return (
    <SettingsGroup title="Your data">
      <div className="px-5 py-4 max-sm:px-4">
        <p className="flex items-start gap-2 text-sm text-foreground">
          <Database aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <span>
            {dev
              ? "Development mode: data is stored in the local development database."
              : "Stored privately in your Compass account. Only you can see it. Export a copy whenever you like."}
          </span>
        </p>
        {counts ? (
          <p className="mt-1.5 flex flex-wrap items-center gap-x-1.5 pl-6 text-xs text-muted-foreground tabular-nums">
            {counts.map((c, i) => (
              <Fragment key={c}>
                {i > 0 && <MetaSep />}
                <span>{c}</span>
              </Fragment>
            ))}
          </p>
        ) : (
          infoPending && <Skeleton aria-hidden className="mt-2 ml-6 h-3.5 w-80 max-w-[calc(100%-1.5rem)]" />
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2 px-5 py-3 max-sm:px-4">
        <Button variant="outline" size="sm" onClick={() => void exportNow()}>
          <Download /> Export (JSON)
        </Button>
        <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
          <Upload /> Import…
        </Button>
        {dev && (
          <Button variant="ghost" size="sm" className="sm:ml-auto" onClick={() => demo.mutate(undefined)}>
            Load sample data (dev)
          </Button>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (!file) return;
            try {
              const data = JSON.parse(await file.text()) as Record<string, unknown>;
              setPendingImport({ name: file.name, data });
            } catch {
              toast.error("That file isn't valid JSON.");
            }
          }}
        />
      </div>
      <AlertDialog open={!!pendingImport} onOpenChange={(o) => !o && setPendingImport(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Replace everything with {pendingImport?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Your current data will be replaced by the contents of this export. A copy of your current data is downloaded first, so you can
              import it again to undo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={async () => {
                const next = pendingImport;
                setPendingImport(null);
                if (next && (await exportNow())) importData.mutate(next.data);
              }}
            >
              Replace my data
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SettingsGroup>
  );
}
