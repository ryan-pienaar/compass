import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Database, Download, Upload } from "lucide-react";
import { useTheme } from "@/components/theme";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { todayISO } from "@shared/dates.ts";
import { WEEKDAY_NAMES, type Settings } from "@shared/settings.ts";
import { Page, PageHeader } from "@/components/page";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api, call } from "@/lib/api";
import { apiFetch } from "@/lib/api-fetch";
import { useBootstrap } from "@/lib/hooks";
import { useApiMutation } from "@/lib/mutations";
import { dataInfoQuery } from "@/lib/queries";

export const Route = createFileRoute("/_app/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const { settings, dev } = useBootstrap();
  const { setTheme } = useTheme();
  const save = useApiMutation((patch: Partial<Settings>) => call(api.settings.$patch({ json: patch })), { success: "Saved" });
  const [name, setName] = useState(settings.displayName);

  return (
    <Page width="narrow">
      <PageHeader title="Settings" description="The planner should be your servant, never your master. Shape it to your week." />
      <div className="space-y-6">
        <Section title="You">
          <Row label="Name" hint="Used in greetings.">
            <Input value={name} onChange={(e) => setName(e.target.value)} onBlur={() => name !== settings.displayName && save.mutate({ displayName: name.trim() })} className="w-56" />
          </Row>
        </Section>

        <Section title="Your week">
          <Row label="Week starts on">
            <DaySelect value={settings.weekStartsOn} onChange={(v) => save.mutate({ weekStartsOn: v as Settings["weekStartsOn"] })} />
          </Row>
          <Row label="Planning day" hint="Compass nudges you on this day to plan the coming week.">
            <DaySelect value={settings.planningDay} onChange={(v) => save.mutate({ planningDay: v })} />
          </Row>
          <Row label="Day starts" hint="The top of your calendar, and part of your capacity.">
            <HourSelect value={settings.dayStartHour} min={0} max={12} onChange={(v) => save.mutate({ dayStartHour: v })} />
          </Row>
          <Row label="Day ends">
            <HourSelect value={settings.dayEndHour} min={Math.max(settings.dayStartHour + 1, 14)} max={24} onChange={(v) => save.mutate({ dayEndHour: v })} />
          </Row>
          <Row label="Default block length" hint="When you drop a rock onto the calendar without an estimate.">
            <Segmented<"30" | "45" | "60" | "90">
              size="sm"
              value={String(settings.defaultBlockMinutes) as "60"}
              onChange={(v) => save.mutate({ defaultBlockMinutes: Number(v) })}
              options={[
                { value: "30", label: "30m" },
                { value: "45", label: "45m" },
                { value: "60", label: "1h" },
                { value: "90", label: "1½h" },
              ]}
            />
          </Row>
        </Section>

        <Section title="Prioritizing">
          <Row label="Deadlines make things urgent" hint="A task due within this window counts as urgent, unless you say otherwise.">
            <Segmented<"0" | "1" | "2" | "3">
              size="sm"
              value={String(settings.urgentWithinDays) as "1"}
              onChange={(v) => save.mutate({ urgentWithinDays: Number(v) })}
              options={[
                { value: "0", label: "Due today" },
                { value: "1", label: "≤ 1 day" },
                { value: "2", label: "≤ 2 days" },
                { value: "3", label: "≤ 3 days" },
              ]}
            />
          </Row>
          <Row label="Planning target" hint="Share of waking hours you aim to schedule. The rest is room for people and the unexpected.">
            <Segmented<"0.4" | "0.5" | "0.6" | "0.7">
              size="sm"
              value={String(settings.capacityTarget) as "0.6"}
              onChange={(v) => save.mutate({ capacityTarget: Number(v) })}
              options={[
                { value: "0.4", label: "40%" },
                { value: "0.5", label: "50%" },
                { value: "0.6", label: "60%" },
                { value: "0.7", label: "70%" },
              ]}
            />
          </Row>
          <Row label="Language coach" hint="Gently flags reactive phrasing (“I have to”, “I can’t”) as you write.">
            <Segmented<Settings["languageCoach"]>
              size="sm"
              value={settings.languageCoach}
              onChange={(v) => save.mutate({ languageCoach: v })}
              options={[
                { value: "off", label: "Off" },
                { value: "strong", label: "Clear cases" },
                { value: "all", label: "Everything" },
              ]}
            />
          </Row>
        </Section>

        <Section title="Appearance">
          <Row label="Theme">
            <Segmented<Settings["theme"]>
              size="sm"
              value={settings.theme}
              onChange={(v) => {
                setTheme(v);
                save.mutate({ theme: v });
              }}
              options={[
                { value: "light", label: "Light" },
                { value: "dark", label: "Dark" },
                { value: "system", label: "System" },
              ]}
            />
          </Row>
        </Section>

        <DataSection dev={dev} />
      </div>
    </Page>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border bg-card">
      <h2 className="border-b px-4 py-2.5 text-sm font-semibold">{title}</h2>
      <div className="divide-y">{children}</div>
    </section>
  );
}

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
      <div className="min-w-0">
        <Label>{label}</Label>
        {hint && <p className="max-w-sm text-xs text-muted-foreground">{hint}</p>}
      </div>
      {children}
    </div>
  );
}

function DaySelect({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const items = WEEKDAY_NAMES.map((d, i) => ({ value: String(i), label: d }));
  return (
    <Select items={items} value={String(value)} onValueChange={(v) => onChange(Number(v))}>
      <SelectTrigger size="sm" className="w-40">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {items.map((d) => (
          <SelectItem key={d.value} value={d.value}>
            {d.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function HourSelect({ value, min, max, onChange }: { value: number; min: number; max: number; onChange: (v: number) => void }) {
  const items = Array.from({ length: max - min + 1 }, (_, i) => min + i).map((h) => ({ value: String(h), label: `${String(h).padStart(2, "0")}:00` }));
  return (
    <Select items={items} value={String(value)} onValueChange={(v) => onChange(Number(v))}>
      <SelectTrigger size="sm" className="w-28">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {items.map((h) => (
          <SelectItem key={h.value} value={h.value}>
            {h.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function DataSection({ dev }: { dev: boolean }) {
  const qc = useQueryClient();
  const { data: info } = useQuery(dataInfoQuery());
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

  return (
    <Section title="Your data">
      <div className="space-y-2 px-4 py-3 text-sm">
        <p className="flex items-start gap-2 text-muted-foreground">
          <Database className="mt-0.5 size-4 shrink-0" />
          <span>
            {dev
              ? "Development mode: data is stored in the local development database."
              : "Stored privately in your Compass account. Only you can see it. Export a copy whenever you like."}
          </span>
        </p>
        {info && (
          <p className="text-xs text-muted-foreground">
            {info.counts.roles} roles · {info.counts.goals} long-term goals · {info.counts.tasks} tasks & rocks · {info.counts.blocks} time blocks · {info.counts.journal} journal entries
          </p>
        )}
      </div>
      <div className="flex flex-wrap gap-2 px-4 py-3">
        <Button variant="outline" size="sm" onClick={() => void exportNow()}>
          <Download /> Export (JSON)
        </Button>
        <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
          <Upload /> Import…
        </Button>
        {dev && (
          <Button variant="ghost" size="sm" onClick={() => demo.mutate(undefined)}>
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
    </Section>
  );
}
