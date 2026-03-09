import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ChevronLeft, Plus, Pencil, Trash2, Target, KeyRound } from "lucide-react";
import { getGoal, getGoalChildren, deleteGoal, type Goal } from "../api/goals";
import { getOrg, type Organization } from "../api/organizations";
import { getMe } from "../api/organizations";

// ── Status badge ──────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: Goal["status"] }) {
  const styles: Record<string, { bg: string; color: string; label: string }> = {
    draft: { bg: "rgba(0,0,0,0.06)", color: "#6b7280", label: "Draft" },
    active: { bg: "rgba(0,59,99,0.12)", color: "#003b63", label: "Active" },
    archived: { bg: "rgba(0,0,0,0.06)", color: "#9ca3af", label: "Archived" },
  };
  const s = styles[status];
  return (
    <span
      className="text-xs font-semibold px-2.5 py-1 rounded-full"
      style={{ backgroundColor: s.bg, color: s.color }}
    >
      {s.label}
    </span>
  );
}

// ── KR row ────────────────────────────────────────────────────────────────

function KRRow({ kr }: { kr: Goal }) {
  return (
    <Link
      to={`/goals/${kr.id}`}
      className="flex items-center gap-3 px-4 py-3 border border-gray-200 rounded-lg bg-white hover:shadow-sm transition-all"
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#45cfcc")}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = "")}
    >
      <KeyRound className="w-4 h-4 shrink-0" style={{ color: "#45cfcc" }} />
      <span className="flex-1 text-sm font-medium" style={{ color: "#003b63" }}>
        {kr.title}
      </span>
      <StatusBadge status={kr.status} />
    </Link>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────

export default function GoalPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [goal, setGoal] = useState<Goal | null>(null);
  const [parent, setParent] = useState<Goal | null>(null);
  const [org, setOrg] = useState<Organization | null>(null);
  const [children, setChildren] = useState<Goal[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isMember, setIsMember] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!id) return;
    const goalId = Number(id);

    Promise.all([
      getGoal(goalId),
      getGoalChildren(goalId),
      getMe(),
    ])
      .then(async ([g, kids, me]) => {
        setGoal(g);
        setChildren(kids);
        setIsAdmin(me.is_admin);
        setIsMember(me.organizations.some((o) => o.id === g.organization_id));

        const [orgData] = await Promise.all([
          getOrg(g.organization_id),
          g.parent_goal_id ? getGoal(g.parent_goal_id).then(setParent) : Promise.resolve(),
        ]);
        setOrg(orgData);
      })
      .catch(() => setError("Failed to load goal."))
      .finally(() => setLoading(false));
  }, [id]);

  const canEdit = isAdmin || isMember;

  const handleDelete = async () => {
    if (!goal || !confirm(`Delete "${goal.title}"? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      await deleteGoal(goal.id);
      navigate(goal.parent_goal_id ? `/goals/${goal.parent_goal_id}` : `/programs/${goal.organization_id}`);
    } catch {
      alert("Failed to delete.");
      setDeleting(false);
    }
  };

  if (loading) return <p className="p-8 text-gray-400">Loading…</p>;
  if (error || !goal || !org)
    return <p className="p-8 text-red-500">{error ?? "Not found"}</p>;

  const isObjective = goal.goal_type === "objective";
  const typeLabel = isObjective ? "Objective" : "Key Result";
  const Icon = isObjective ? Target : KeyRound;
  const accentColor = isObjective ? "#003b63" : "#45cfcc";

  const backHref = parent ? `/goals/${parent.id}` : `/programs/${org.id}`;
  const backLabel = parent ? parent.title : org.name;

  return (
    <main className="max-w-3xl mx-auto px-6 py-10">
      {/* Back link */}
      <Link
        to={backHref}
        className="inline-flex items-center gap-1 text-sm mb-6 hover:underline"
        style={{ color: "#45cfcc" }}
      >
        <ChevronLeft className="w-4 h-4" />
        {backLabel}
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Icon className="w-5 h-5" style={{ color: accentColor }} />
            <span
              className="text-xs font-bold uppercase tracking-widest"
              style={{ color: accentColor }}
            >
              {typeLabel}
            </span>
            <StatusBadge status={goal.status} />
          </div>
          <h1 className="text-3xl font-bold" style={{ color: "#003b63" }}>
            {goal.title}
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            {org.name}
            {parent && (
              <>
                {" · "}
                <Link to={`/goals/${parent.id}`} className="hover:underline" style={{ color: "#45cfcc" }}>
                  {parent.title}
                </Link>
              </>
            )}
          </p>
          {goal.description && (
            <p className="mt-3 text-gray-600 text-sm leading-relaxed">{goal.description}</p>
          )}
          <p className="mt-2 text-xs text-gray-400">
            {goal.start_date} → {goal.end_date}
          </p>
        </div>

        {canEdit && (
          <div className="flex items-center gap-2 shrink-0">
            <Link
              to={`/goals/${goal.id}/edit`}
              className="btn-ghost py-1.5 px-3 text-xs"
            >
              <Pencil className="w-3.5 h-3.5" />
              Edit
            </Link>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-red-200 text-red-500 text-xs font-semibold hover:bg-red-50 transition-colors disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              {deleting ? "Deleting…" : "Delete"}
            </button>
          </div>
        )}
      </div>

      {/* KRs section — only on objectives */}
      {isObjective && (
        <section className="mb-10">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold" style={{ color: "#003b63" }}>
              Key Results
            </h2>
            {canEdit && (
              <Link
                to={`/goals/new?type=key_result&parent_id=${goal.id}&org_id=${goal.organization_id}`}
                className="btn-teal py-1.5 text-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                Add KR
              </Link>
            )}
          </div>

          {children.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-300 px-6 py-8 text-center text-gray-400 text-sm">
              No key results yet.{" "}
              {canEdit && (
                <Link
                  to={`/goals/new?type=key_result&parent_id=${goal.id}&org_id=${goal.organization_id}`}
                  className="hover:underline"
                  style={{ color: "#45cfcc" }}
                >
                  Add one.
                </Link>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {children.map((kr) => (
                <KRRow key={kr.id} kr={kr} />
              ))}
            </div>
          )}
        </section>
      )}

      {/* Assessments section */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold" style={{ color: "#003b63" }}>
            Assessments
          </h2>
          {canEdit && (
            <button disabled className="btn-primary py-1.5 text-xs opacity-50 cursor-not-allowed">
              <Plus className="w-3.5 h-3.5" />
              New Assessment
            </button>
          )}
        </div>
        <div className="rounded-lg border border-dashed border-gray-300 px-6 py-8 text-center text-gray-400 text-sm">
          Assessments will appear here once implemented.
        </div>
      </section>
    </main>
  );
}
