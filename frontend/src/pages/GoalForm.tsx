import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { createGoal, updateGoal, getGoal, type Goal, type GoalStatus } from "../api/goals";
import { getOrg } from "../api/organizations";
import { Target } from "lucide-react";

const STATUS_OPTIONS: { value: GoalStatus; label: string }[] = [
  { value: "draft", label: "Draft" },
  { value: "active", label: "Active" },
  { value: "archived", label: "Archived" },
];

const inputCls =
  "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#45cfcc] text-[#003b63]";

interface Props {
  editGoalId?: number;
}

export default function GoalForm({ editGoalId }: Props) {
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const goalType = (params.get("type") ?? "objective") as "objective" | "key_result";
  const orgId = params.get("org_id") ? Number(params.get("org_id")) : null;
  const parentId = params.get("parent_id") ? Number(params.get("parent_id")) : null;

  const isKR = goalType === "key_result";
  const typeLabel = isKR ? "Key Result" : "Objective";
  const accentColor = isKR ? "#45cfcc" : "#003b63";

  const [existing, setExisting] = useState<Goal | null>(null);
  const [parentGoal, setParentGoal] = useState<Goal | null>(null);
  const [orgName, setOrgName] = useState<string>("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<GoalStatus>("draft");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (editGoalId) {
      getGoal(editGoalId).then((g) => {
        setExisting(g);
        setTitle(g.title);
        setDescription(g.description ?? "");
        setStatus(g.status);
        setStartDate(g.start_date);
        setEndDate(g.end_date);
        if (g.organization_id) {
          getOrg(g.organization_id).then((o) => setOrgName(o.name));
        }
      });
    } else {
      if (orgId) getOrg(orgId).then((o) => setOrgName(o.name));
      if (parentId) getGoal(parentId).then(setParentGoal);
    }
  }, [editGoalId, orgId, parentId]);

  const resolvedOrgId = existing?.organization_id ?? orgId ?? null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolvedOrgId) {
      setError("Organization not specified.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      let saved: Goal;
      if (editGoalId) {
        saved = await updateGoal(editGoalId, {
          title,
          description: description || undefined,
          status,
          start_date: startDate,
          end_date: endDate,
        });
      } else {
        saved = await createGoal({
          title,
          description: description || undefined,
          status,
          goal_type: goalType,
          organization_id: resolvedOrgId,
          parent_goal_id: parentId ?? undefined,
          start_date: startDate,
          end_date: endDate,
        });
      }
      navigate(`/goals/${saved.id}`);
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? "Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  const backHref = editGoalId
    ? `/goals/${editGoalId}`
    : parentId
    ? `/goals/${parentId}`
    : resolvedOrgId
    ? `/programs/${resolvedOrgId}`
    : "/programs";

  return (
    <main className="max-w-2xl mx-auto px-6 py-10">
      <Link
        to={backHref}
        className="inline-flex items-center gap-1 text-sm mb-6 hover:underline"
        style={{ color: "#45cfcc" }}
      >
        <ChevronLeft className="w-4 h-4" /> Back
      </Link>

      <h1 className="text-3xl font-bold mb-2" style={{ color: "#003b63" }}>
        {editGoalId ? `Edit ${typeLabel}` : `New ${typeLabel}`}
      </h1>

      {/* Parent objective context — shown when creating a KR */}
      {parentGoal && (
        <div
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg mb-6 text-sm"
          style={{ backgroundColor: "rgba(0,59,99,0.07)" }}
        >
          <Target className="w-4 h-4 shrink-0" style={{ color: "#003b63" }} />
          <span className="text-gray-500">Objective:</span>
          <Link
            to={`/goals/${parentGoal.id}`}
            className="font-semibold hover:underline"
            style={{ color: "#003b63" }}
          >
            {parentGoal.title}
          </Link>
        </div>
      )}

      {!parentGoal && orgName && <p className="text-sm text-gray-500 mb-8">{orgName}</p>}

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-semibold mb-1" style={{ color: "#003b63" }}>
            Title <span className="text-red-400">*</span>
          </label>
          <input
            required
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={inputCls}
            placeholder={isKR ? "e.g. Reduce Scope 1 emissions by 30%" : "e.g. Decarbonize power sector"}
          />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-1" style={{ color: "#003b63" }}>
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className={inputCls}
            placeholder="Optional context or detail"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-1" style={{ color: "#003b63" }}>
            Status
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as GoalStatus)}
            className={inputCls}
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-1" style={{ color: "#003b63" }}>
              Start Date <span className="text-red-400">*</span>
            </label>
            <input
              required
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1" style={{ color: "#003b63" }}>
              End Date <span className="text-red-400">*</span>
            </label>
            <input
              required
              type="date"
              value={endDate}
              min={startDate}
              onChange={(e) => setEndDate(e.target.value)}
              className={inputCls}
            />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? "Saving…" : editGoalId ? "Save Changes" : `Create ${typeLabel}`}
          </button>
          <Link to={backHref} className="btn-ghost">
            Cancel
          </Link>
        </div>
      </form>
    </main>
  );
}
