import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AffirmationsTab } from "@/components/compass/affirmations-tab";
import { CenterTab } from "@/components/compass/center-tab";
import { ExercisesTab } from "@/components/compass/exercises-tab";
import { MissionTab } from "@/components/compass/mission-tab";
import { Page, PageHeader } from "@/components/page";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Tab = "mission" | "affirmations" | "exercises" | "center";

export const Route = createFileRoute("/_app/compass")({
  validateSearch: (search: Record<string, unknown>): { tab?: Tab } => ({
    tab: ["mission", "affirmations", "exercises", "center"].includes(search.tab as string) ? (search.tab as Tab) : undefined,
  }),
  component: CompassPage,
});

function CompassPage() {
  const { tab = "mission" } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  return (
    <Page width="wide">
      <PageHeader
        habit={2}
        eyebrow="Begin with the end in mind"
        title="Your compass"
        description="Leadership comes before management. Know what matters (your mission, your principles, who you want to be), and every week and day can be measured against it."
      />
      <Tabs value={tab} onValueChange={(v) => navigate({ search: { tab: v as Tab } })}>
        <TabsList>
          <TabsTrigger value="mission">Mission</TabsTrigger>
          <TabsTrigger value="affirmations">Affirmations</TabsTrigger>
          <TabsTrigger value="exercises">Exercises</TabsTrigger>
          <TabsTrigger value="center">Your center</TabsTrigger>
        </TabsList>
        <TabsContent value="mission">
          <MissionTab />
        </TabsContent>
        <TabsContent value="affirmations">
          <AffirmationsTab />
        </TabsContent>
        <TabsContent value="exercises">
          <ExercisesTab />
        </TabsContent>
        <TabsContent value="center">
          <CenterTab />
        </TabsContent>
      </Tabs>
    </Page>
  );
}
