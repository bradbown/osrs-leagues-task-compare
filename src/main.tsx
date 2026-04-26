import { StrictMode, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { ArrowDownAZ, ArrowUpAZ, RefreshCcw } from "lucide-react";

import tasksPayload from "../tasks2.json";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import "./index.css";

const LEAGUE = "DEMONIC_PACTS_LEAGUE";
const COMPLETION_URL = "/api/completion-rates";
const WIKI_IMAGE_ROOT = "https://oldschool.runescape.wiki";

const AREA_ICONS: Record<string, string> = {
  Asgarnia: "/images/Asgarnia_Area_Badge.png?4ec29",
  Desert: "/images/Desert_Area_Badge.png?2a1e3",
  Fremennik: "/images/Fremennik_Area_Badge.png?f8338",
  General: "/images/Globe-icon.png?3344c",
  Kandarin: "/images/Kandarin_Area_Badge.png?f8338",
  Karamja: "/images/Karamja_Area_Badge.png?a771c",
  Kourend: "/images/Kourend_Area_Badge.png?1f79a",
  Morytania: "/images/Morytania_Area_Badge.png?2a1e3",
  Tirannwn: "/images/Tirannwn_Area_Badge.png?4b9ee",
  Varlamore: "/images/Varlamore_Area_Badge.png?2e60e",
  Wilderness: "/images/Wilderness_Area_Badge.png?2a1e3",
};

type Task = {
  id: number;
  name: string;
  difficulty: "Easy" | "Medium" | "Hard" | "Elite" | "Master";
  area: string;
  points: number;
  rewardsDemonicPact: boolean;
};

type CompletedResponse = {
  league_tasks: number[];
};

type SortKey = "difficulty" | "area" | "points" | "completion";
type SortDirection = "asc" | "desc";

type TaskRow = Task & {
  completion: number | null;
};

const tasks = (tasksPayload as { tasks: Task[] }).tasks;
const taskById = new Map(tasks.map((task) => [task.id, task]));
const difficultyRank: Record<Task["difficulty"], number> = {
  Easy: 1,
  Medium: 2,
  Hard: 3,
  Elite: 4,
  Master: 5,
};

function completionLabel(value: number | null) {
  return value === null ? "N/A" : `${value}%`;
}

async function fetchCompletedTasks(username: string): Promise<number[]> {
  const response = await fetch(`/api/runelite/player/${encodeURIComponent(username)}/${LEAGUE}`);
  if (!response.ok) {
    throw new Error(`${username}: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as CompletedResponse;
  return data.league_tasks ?? [];
}

async function fetchCompletionRates(): Promise<Map<number, number>> {
  const response = await fetch(COMPLETION_URL);
  if (!response.ok) {
    throw new Error(`completion rates: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as Record<string, number | string>;
  return new Map(
    Object.entries(data).flatMap(([id, rawRate]) => {
      const rate = typeof rawRate === "number" ? rawRate : Number.parseFloat(rawRate);
      return Number.isFinite(rate) ? [[Number(id), rate]] : [];
    }),
  );
}

function buildRows(sourceCompleted: number[], targetCompleted: number[], completionRates: Map<number, number>) {
  const targetSet = new Set(targetCompleted);

  return sourceCompleted.flatMap((taskId) => {
    if (targetSet.has(taskId)) {
      return [];
    }

    const task = taskById.get(taskId);
    if (!task) {
      return [];
    }

    return [
      {
        ...task,
        completion: completionRates.get(taskId) ?? null,
      },
    ];
  });
}

function sortRows(rows: TaskRow[], sortKey: SortKey, direction: SortDirection) {
  const multiplier = direction === "asc" ? 1 : -1;

  return [...rows].sort((a, b) => {
    if (sortKey === "difficulty") {
      return (difficultyRank[a.difficulty] - difficultyRank[b.difficulty]) * multiplier;
    }

    if (sortKey === "area") {
      return a.area.localeCompare(b.area) * multiplier;
    }

    if (sortKey === "points") {
      return (a.points - b.points) * multiplier;
    }

    return ((a.completion ?? -1) - (b.completion ?? -1)) * multiplier;
  });
}

function TaskTable({
  title,
  subtitle,
  rows,
  rawCount,
  completedCount,
  sortKey,
  sortDirection,
  onSort,
}: {
  title: string;
  subtitle: string;
  rows: TaskRow[];
  rawCount: number;
  completedCount: number;
  sortKey: SortKey;
  sortDirection: SortDirection;
  onSort: (key: SortKey) => void;
}) {
  const pactCount = rows.filter((row) => row.rewardsDemonicPact).length;

  return (
    <Card className="min-w-0 overflow-hidden">
      <CardHeader className="border-b">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>{title}</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{completedCount} done</Badge>
            <Badge variant="outline">{rows.length} visible</Badge>
            <Badge variant="outline">{rawCount} matched</Badge>
            <Badge variant="outline">
              {pactCount} {pactCount === 1 ? "pact" : "pacts"}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="max-h-[68vh] overflow-auto">
          <Table className="min-w-[880px]">
            <TableHeader className="sticky top-0 z-10 bg-card">
              <TableRow>
                <TableHead className="w-[38%]">Task</TableHead>
                <TableHead>
                  <SortButton active={sortKey === "difficulty"} direction={sortDirection} onClick={() => onSort("difficulty")}>
                    Difficulty
                  </SortButton>
                </TableHead>
                <TableHead>
                  <SortButton active={sortKey === "area"} direction={sortDirection} onClick={() => onSort("area")}>
                    Region
                  </SortButton>
                </TableHead>
                <TableHead className="text-right">
                  <SortButton active={sortKey === "points"} direction={sortDirection} onClick={() => onSort("points")}>
                    Points
                  </SortButton>
                </TableHead>
                <TableHead className="whitespace-nowrap">Demonic Pact</TableHead>
                <TableHead className="text-right">
                  <SortButton active={sortKey === "completion"} direction={sortDirection} onClick={() => onSort("completion")}>
                    Completed
                  </SortButton>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{row.name}</TableCell>
                  <TableCell>
                    <DifficultyBadge difficulty={row.difficulty} />
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-2">
                      <AreaIcon area={row.area} />
                      {row.area}
                    </span>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{row.points}</TableCell>
                  <TableCell>
                    <DemonicPactBadge rewardsDemonicPact={row.rewardsDemonicPact} />
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{completionLabel(row.completion)}</TableCell>
                </TableRow>
              ))}
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-28 text-center text-muted-foreground">
                    No tasks match the current region filter.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

function SortButton({
  active,
  direction,
  onClick,
  children,
}: {
  active: boolean;
  direction: SortDirection;
  onClick: () => void;
  children: React.ReactNode;
}) {
  const Icon = direction === "asc" ? ArrowDownAZ : ArrowUpAZ;

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className={cn("-ml-3 font-medium text-muted-foreground", active && "text-foreground")}
      onClick={onClick}
    >
      {children}
      {active ? <Icon className="h-4 w-4" /> : null}
    </Button>
  );
}

function DifficultyBadge({ difficulty }: { difficulty: Task["difficulty"] }) {
  const className = {
    Easy: "border-emerald-200 bg-emerald-50 text-emerald-800",
    Medium: "border-sky-200 bg-sky-50 text-sky-800",
    Hard: "border-amber-200 bg-amber-50 text-amber-900",
    Elite: "border-rose-200 bg-rose-50 text-rose-800",
    Master: "border-zinc-300 bg-zinc-100 text-zinc-900",
  }[difficulty];

  return (
    <Badge variant="outline" className={className}>
      {difficulty}
    </Badge>
  );
}

function DemonicPactBadge({ rewardsDemonicPact }: { rewardsDemonicPact: boolean }) {
  if (!rewardsDemonicPact) {
    return <span className="text-sm text-muted-foreground">No</span>;
  }

  return (
    <Badge variant="outline" className="border-accent/70 bg-accent/20 text-accent-foreground">
      Earns pact
    </Badge>
  );
}

function AreaIcon({ area }: { area: string }) {
  const src = AREA_ICONS[area];
  if (!src) {
    return null;
  }

  return <img src={`${WIKI_IMAGE_ROOT}${src}`} alt="" className="h-6 w-5 shrink-0 object-contain" loading="lazy" />;
}

function App() {
  const [user1Input, setUser1Input] = useState("shurbo");
  const [user2Input, setUser2Input] = useState("thummor");
  const [user1, setUser1] = useState("shurbo");
  const [user2, setUser2] = useState("thummor");
  const [user1Completed, setUser1Completed] = useState<number[]>([]);
  const [user2Completed, setUser2Completed] = useState<number[]>([]);
  const [completionRates, setCompletionRates] = useState<Map<number, number>>(new Map());
  const [regionFilter, setRegionFilter] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("completion");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const regions = useMemo(() => [...new Set(tasks.map((task) => task.area))].sort(), []);

  useEffect(() => {
    let ignore = false;

    async function loadData() {
      setIsLoading(true);
      setError(null);

      try {
        const [firstUserTasks, secondUserTasks, rates] = await Promise.all([
          fetchCompletedTasks(user1),
          fetchCompletedTasks(user2),
          fetchCompletionRates(),
        ]);

        if (!ignore) {
          setUser1Completed(firstUserTasks);
          setUser2Completed(secondUserTasks);
          setCompletionRates(rates);
        }
      } catch (err) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : "Unable to load league task data.");
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    void loadData();
    return () => {
      ignore = true;
    };
  }, [user1, user2]);

  const missingForUser1 = useMemo(
    () => buildRows(user2Completed, user1Completed, completionRates),
    [completionRates, user1Completed, user2Completed],
  );
  const missingForUser2 = useMemo(
    () => buildRows(user1Completed, user2Completed, completionRates),
    [completionRates, user1Completed, user2Completed],
  );

  const visibleForUser1 = useMemo(
    () => sortRows(filterRows(missingForUser1, regionFilter), sortKey, sortDirection),
    [missingForUser1, regionFilter, sortDirection, sortKey],
  );
  const visibleForUser2 = useMemo(
    () => sortRows(filterRows(missingForUser2, regionFilter), sortKey, sortDirection),
    [missingForUser2, regionFilter, sortDirection, sortKey],
  );

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setUser1(user1Input.trim() || "shurbo");
    setUser2(user2Input.trim() || "thummor");
  }

  function handleSort(nextKey: SortKey) {
    if (nextKey === sortKey) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(nextKey);
    setSortDirection(nextKey === "completion" || nextKey === "points" ? "desc" : "asc");
  }

  return (
    <main className="min-h-screen px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-[1800px] flex-col gap-5">
        <section className="rounded-lg border bg-card p-4 shadow-panel sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="flex items-center gap-3">
                <img
                  src={`${WIKI_IMAGE_ROOT}${AREA_ICONS.General}`}
                  alt=""
                  className="h-10 w-10 object-contain"
                />
                <div>
                  <h1 className="text-2xl font-semibold tracking-normal">League task compare</h1>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Tasks completed by one player and missing from the other.
                  </p>
                </div>
              </div>
            </div>

            <form className="grid gap-3 sm:grid-cols-[minmax(0,180px)_minmax(0,180px)_auto]" onSubmit={handleSubmit}>
              <label className="grid gap-1.5 text-sm font-medium">
                First player
                <Input value={user1Input} onChange={(event) => setUser1Input(event.target.value)} />
              </label>
              <label className="grid gap-1.5 text-sm font-medium">
                Second player
                <Input value={user2Input} onChange={(event) => setUser2Input(event.target.value)} />
              </label>
              <Button type="submit" className="self-end" disabled={isLoading}>
                <RefreshCcw className={cn("h-4 w-4", isLoading && "animate-spin")} />
                Load
              </Button>
            </form>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-[minmax(180px,240px)_minmax(180px,240px)_minmax(160px,200px)]">
            <label className="grid gap-1.5 text-sm font-medium">
              Region
              <Select value={regionFilter} onValueChange={setRegionFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All regions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="all">All regions</SelectItem>
                    {regions.map((region) => (
                      <SelectItem key={region} value={region}>
                        {region}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </label>

            <label className="grid gap-1.5 text-sm font-medium">
              Sort by
              <Select value={sortKey} onValueChange={(value) => setSortKey(value as SortKey)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="difficulty">Difficulty</SelectItem>
                    <SelectItem value="area">Region</SelectItem>
                    <SelectItem value="points">Points</SelectItem>
                    <SelectItem value="completion">% completed</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </label>

            <label className="grid gap-1.5 text-sm font-medium">
              Direction
              <Select value={sortDirection} onValueChange={(value) => setSortDirection(value as SortDirection)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="asc">Ascending</SelectItem>
                    <SelectItem value="desc">Descending</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </label>
          </div>

          {error ? (
            <div className="mt-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          ) : null}
        </section>

        <section className="grid gap-5 xl:grid-cols-2">
          <TaskTable
            title={`${user1} missing`}
            subtitle={`Completed by ${user2}, not completed by ${user1}.`}
            rows={visibleForUser1}
            rawCount={missingForUser1.length}
            completedCount={user1Completed.length}
            sortKey={sortKey}
            sortDirection={sortDirection}
            onSort={handleSort}
          />
          <TaskTable
            title={`${user2} missing`}
            subtitle={`Completed by ${user1}, not completed by ${user2}.`}
            rows={visibleForUser2}
            rawCount={missingForUser2.length}
            completedCount={user2Completed.length}
            sortKey={sortKey}
            sortDirection={sortDirection}
            onSort={handleSort}
          />
        </section>
      </div>
    </main>
  );
}

function filterRows(rows: TaskRow[], regionFilter: string) {
  if (regionFilter === "all") {
    return rows;
  }

  return rows.filter((row) => row.area === regionFilter);
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
