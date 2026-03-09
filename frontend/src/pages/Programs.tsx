import { useEffect, useState } from "react";
import { getAllOrgs, type Organization } from "../api/organizations";
import { getOrgGoals, type Goal } from "../api/goals";
import { ProgramCard } from "../components/ProgramCard";

export default function Programs() {
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [objectivesByOrg, setObjectivesByOrg] = useState<Record<number, Goal[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [allOpen, setAllOpen] = useState(false);

  useEffect(() => {
    getAllOrgs()
      .then(async (allOrgs) => {
        setOrgs(allOrgs);
        const programs = allOrgs.filter((o) => o.org_type === "program");
        const results = await Promise.all(
          programs.map((p) => getOrgGoals(p.id, "objective"))
        );
        const map: Record<number, Goal[]> = {};
        programs.forEach((p, i) => { map[p.id] = results[i]; });
        setObjectivesByOrg(map);
      })
      .catch(() => setError("Failed to load programs."))
      .finally(() => setLoading(false));
  }, []);

  const programs = orgs.filter((o) => o.org_type === "program").sort((a, b) => a.name.localeCompare(b.name));
  const totalObjectives = Object.values(objectivesByOrg).reduce((sum, g) => sum + g.length, 0);

  return (
    <main className="max-w-3xl mx-auto px-6 py-10">
      <div className="flex items-baseline gap-4 mb-8">
        <h1 className="text-3xl font-bold">Programs</h1>
        {!loading && totalObjectives > 0 && (
          <button
            onClick={() => setAllOpen((o) => !o)}
            className="text-sm hover:underline"
            style={{ color: "#45cfcc" }}
          >
            {allOpen ? "collapse all" : "view all objectives"}
          </button>
        )}
      </div>

      {loading && <p className="text-gray-400">Loading…</p>}
      {error && <p className="text-red-500">{error}</p>}

      {!loading && !error && programs.length === 0 && (
        <p className="text-gray-500">No programs yet.</p>
      )}

      <div className="flex flex-col gap-3">
        {programs.map((p) => (
          <ProgramCard
            key={p.id}
            program={p}
            objectives={objectivesByOrg[p.id] ?? []}
            forceOpen={allOpen}
          />
        ))}
      </div>
    </main>
  );
}
