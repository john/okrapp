import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ChevronLeft, Plus, Target, KeyRound, Building2 } from "lucide-react";
import { getOrg, getAllOrgs, getMe, type Organization } from "../api/organizations";
import { getOrgGoals, type Goal } from "../api/goals";

function StatusBadge({ status }: { status: Goal["status"] }) {
  const styles: Record<string, { bg: string; color: string }> = {
    draft: { bg: "rgba(0,0,0,0.06)", color: "#9ca3af" },
    active: { bg: "rgba(0,59,99,0.12)", color: "#003b63" },
    archived: { bg: "rgba(0,0,0,0.06)", color: "#d1d5db" },
  };
  const s = styles[status];
  return (
    <span
      className="text-xs font-semibold px-2 py-0.5 rounded-full capitalize"
      style={{ backgroundColor: s.bg, color: s.color }}
    >
      {status}
    </span>
  );
}

function ObjectiveCard({
  objective,
  keyResults,
  canEdit,
}: {
  objective: Goal;
  keyResults: Goal[];
  canEdit: boolean;
}) {
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
      {/* Objective header */}
      <div className="px-5 py-4 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <Target className="w-5 h-5 mt-0.5 shrink-0" style={{ color: "#003b63" }} />
          <div className="min-w-0">
            <Link
              to={`/goals/${objective.id}`}
              className="font-semibold hover:underline leading-snug"
              style={{ color: "#003b63" }}
            >
              {objective.title}
            </Link>
            {objective.description && (
              <p className="text-xs text-gray-400 mt-0.5 truncate">{objective.description}</p>
            )}
            <p className="text-xs text-gray-400 mt-1">
              {objective.start_date} → {objective.end_date}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <StatusBadge status={objective.status} />
          {canEdit && (
            <Link
              to={`/goals/new?type=key_result&parent_id=${objective.id}&org_id=${objective.organization_id}`}
              className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-semibold transition-colors"
              style={{ backgroundColor: "rgba(69,207,204,0.15)", color: "#45cfcc" }}
            >
              <Plus className="w-3 h-3" />
              Add KR
            </Link>
          )}
        </div>
      </div>

      {/* Key results */}
      {keyResults.length > 0 && (
        <div className="border-t border-gray-100">
          {keyResults.map((kr) => (
            <Link
              key={kr.id}
              to={`/goals/${kr.id}`}
              className="flex items-center gap-3 px-5 py-3 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 transition-colors"
            >
              <KeyRound className="w-4 h-4 shrink-0 ml-5" style={{ color: "#45cfcc" }} />
              <span className="flex-1 text-sm" style={{ color: "#003b63" }}>
                {kr.title}
              </span>
              <StatusBadge status={kr.status} />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ProgramDetail() {
  const { id } = useParams<{ id: string }>();
  const [org, setOrg] = useState<Organization | null>(null);
  const [parent, setParent] = useState<Organization | null>(null);
  const [children, setChildren] = useState<Organization[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [initiativeGoals, setInitiativeGoals] = useState<Record<number, Goal[]>>({});
  const [canEdit, setCanEdit] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const orgId = Number(id);

    Promise.all([getOrg(orgId), getAllOrgs(), getOrgGoals(orgId), getMe()])
      .then(async ([thisOrg, allOrgs, orgGoals, me]) => {
        setOrg(thisOrg);
        setGoals(orgGoals);
        setCanEdit(me.is_admin || me.organizations.some((o) => o.id === orgId));

        if (thisOrg.parent_id) {
          setParent(allOrgs.find((o) => o.id === thisOrg.parent_id) ?? null);
        }
        const kids = allOrgs.filter((o) => o.parent_id === thisOrg.id);
        setChildren(kids);

        // Fetch objectives for each initiative in parallel
        if (kids.length > 0) {
          const results = await Promise.all(
            kids.map((k) => getOrgGoals(k.id, "objective"))
          );
          const map: Record<number, Goal[]> = {};
          kids.forEach((k, i) => { map[k.id] = results[i]; });
          setInitiativeGoals(map);
        }
      })
      .catch(() => setError("Failed to load."))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <p className="p-8 text-gray-400">Loading…</p>;
  if (error || !org) return <p className="p-8 text-red-500">{error ?? "Not found"}</p>;

  const objectives = goals.filter((g) => g.goal_type === "objective");
  const keyResults = goals.filter((g) => g.goal_type === "key_result");

  return (
    <main className="max-w-3xl mx-auto px-6 py-10">
      <Link
        to="/programs"
        className="inline-flex items-center gap-1 text-sm mb-6 hover:underline"
        style={{ color: "#45cfcc" }}
      >
        <ChevronLeft className="w-4 h-4" /> All Programs
      </Link>

      {/* Org header */}
      <div className="flex items-center gap-3 mb-1">
        <Building2 className="w-6 h-6" style={{ color: "#45cfcc" }} />
        <span className="text-xs font-semibold uppercase tracking-widest text-gray-400">
          {org.org_type === "program" ? "Program" : "Initiative"}
        </span>
      </div>
      <h1 className="text-3xl font-bold mb-1" style={{ color: "#003b63" }}>
        {org.name}
      </h1>
      {parent && (
        <p className="text-sm text-gray-500 mb-8">
          Part of{" "}
          <Link to={`/programs/${parent.id}`} className="hover:underline" style={{ color: "#45cfcc" }}>
            {parent.name}
          </Link>
        </p>
      )}

      {/* Objectives */}
      <section className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold" style={{ color: "#003b63" }}>
            Objectives
          </h2>
          {canEdit && (
            <Link
              to={`/goals/new?type=objective&org_id=${org.id}`}
              className="btn-primary py-1.5 text-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              New Objective
            </Link>
          )}
        </div>

        {objectives.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 px-6 py-10 text-center text-gray-400 text-sm">
            No objectives yet.{" "}
            {canEdit && (
              <Link
                to={`/goals/new?type=objective&org_id=${org.id}`}
                className="hover:underline"
                style={{ color: "#45cfcc" }}
              >
                Create the first one.
              </Link>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {objectives.map((obj) => (
              <ObjectiveCard
                key={obj.id}
                objective={obj}
                keyResults={keyResults.filter((kr) => kr.parent_goal_id === obj.id)}
                canEdit={canEdit}
              />
            ))}
          </div>
        )}
      </section>

      {/* Initiatives */}
      {children.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-3" style={{ color: "#003b63" }}>
            Initiatives
          </h2>
          <div className="flex flex-col gap-2">
            {children.map((c) => {
              const initObjectives = initiativeGoals[c.id] ?? [];
              return (
                <Link
                  key={c.id}
                  to={`/programs/${c.id}`}
                  className="px-4 py-3 border border-gray-200 rounded-lg bg-white transition-colors hover:shadow-sm"
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#45cfcc")}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = "")}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: "#45cfcc" }} />
                    <span className="text-sm font-medium" style={{ color: "#003b63" }}>{c.name}</span>
                  </div>
                  {initObjectives.length > 0 && (
                    <ul className="mt-1.5 ml-5 flex flex-col gap-0.5">
                      {initObjectives.map((obj) => (
                        <li key={obj.id} className="text-xs text-gray-400 truncate">
                          · {obj.title}
                        </li>
                      ))}
                    </ul>
                  )}
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </main>
  );
}
