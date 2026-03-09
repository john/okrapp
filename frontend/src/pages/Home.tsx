import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getMe, type CurrentUser } from "../api/organizations";
import { getOrgGoals, type Goal } from "../api/goals";
import { ProgramCard } from "../components/ProgramCard";

export default function Home() {
  const [me, setMe] = useState<CurrentUser | null>(null);
  const [objectivesByOrg, setObjectivesByOrg] = useState<Record<number, Goal[]>>({});
  const [loading, setLoading] = useState(true);
  const [allOpen, setAllOpen] = useState(false);

  useEffect(() => {
    getMe()
      .then(async (user) => {
        setMe(user);
        if (user.organizations.length > 0) {
          const results = await Promise.all(
            user.organizations.map((o) => getOrgGoals(o.id, "objective"))
          );
          const map: Record<number, Goal[]> = {};
          user.organizations.forEach((o, i) => { map[o.id] = results[i]; });
          setObjectivesByOrg(map);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const totalObjectives = Object.values(objectivesByOrg).reduce((sum, g) => sum + g.length, 0);

  return (
    <main className="max-w-3xl mx-auto px-6 py-10">
      <div className="flex items-baseline gap-4 mb-2">
        <h1 className="text-3xl font-bold">
          Welcome{me?.name ? `, ${me.name.split(" ")[0]}` : ""}
        </h1>
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
      <p className="text-gray-500 mb-10">Here are the programs and initiatives you belong to.</p>

      {loading && <p className="text-gray-400">Loading…</p>}

      {!loading && me && me.organizations.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-300 px-6 py-12 text-center">
          <p className="text-gray-400 text-sm">
            You're not assigned to any programs yet.{" "}
            {me.is_admin && (
              <Link
                to="/admin/users"
                className="hover:underline"
                style={{ color: "#45cfcc" }}
              >
                Assign yourself in Admin → Users.
              </Link>
            )}
          </p>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {me?.organizations.map((org) => (
          <ProgramCard
            key={org.id}
            program={{
              id: org.id,
              name: org.name,
              org_type: org.org_type as "program" | "initiative",
              parent_id: null,
              created_at: "",
            }}
            objectives={objectivesByOrg[org.id] ?? []}
            forceOpen={allOpen}
          />
        ))}
      </div>
    </main>
  );
}
