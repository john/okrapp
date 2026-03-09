import { useEffect, useState } from "react";
import { ChevronRight, Plus, Building2, Pencil } from "lucide-react";
import { getAllOrgs, createOrg, updateOrg, type Organization } from "../../api/organizations";

function EditOrgForm({
  org,
  allOrgs,
  onSaved,
  onCancel,
}: {
  org: Organization;
  allOrgs: Organization[];
  onSaved: (updated: Organization) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(org.name);
  const [orgType, setOrgType] = useState<"program" | "initiative">(org.org_type);
  const [parentId, setParentId] = useState<number | "">(org.parent_id ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const programs = allOrgs.filter((o) => o.org_type === "program" && o.id !== org.id);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const updated = await updateOrg(org.id, {
        name,
        org_type: orgType,
        parent_id: orgType === "initiative" && parentId !== "" ? Number(parentId) : null,
      });
      onSaved(updated);
    } catch {
      setError("Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  const inputCls =
    "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#45cfcc]";

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3 px-5 py-4 bg-amber-50 border-t border-amber-100">
      <div className="flex-1 min-w-[160px]">
        <label className="block text-xs font-medium text-gray-600 mb-1">Name</label>
        <input autoFocus required value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
      </div>
      <div className="min-w-[130px]">
        <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
        <select
          value={orgType}
          onChange={(e) => {
            setOrgType(e.target.value as "program" | "initiative");
            if (e.target.value === "program") setParentId("");
          }}
          className={inputCls}
        >
          <option value="program">Program</option>
          <option value="initiative">Initiative</option>
        </select>
      </div>
      {orgType === "initiative" && (
        <div className="min-w-[160px]">
          <label className="block text-xs font-medium text-gray-600 mb-1">Parent Program</label>
          <select
            value={parentId}
            onChange={(e) => setParentId(e.target.value === "" ? "" : Number(e.target.value))}
            className={inputCls}
          >
            <option value="">— none —</option>
            {programs.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      )}
      {error && <p className="w-full text-red-500 text-xs">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? "Saving…" : "Save"}
        </button>
        <button type="button" onClick={onCancel} className="btn-ghost">
          Cancel
        </button>
      </div>
    </form>
  );
}

function OrgTree({
  programs,
  allOrgs,
  onUpdated,
}: {
  programs: Organization[];
  allOrgs: Organization[];
  onUpdated: (updated: Organization) => void;
}) {
  const [editingId, setEditingId] = useState<number | null>(null);

  return (
    <div className="flex flex-col gap-2">
      {programs.map((p) => {
        const children = allOrgs.filter((o) => o.parent_id === p.id).sort((a, b) => a.name.localeCompare(b.name));
        return (
          <div key={p.id} className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-4 bg-white">
              <Building2 className="w-5 h-5 shrink-0" style={{ color: "#45cfcc" }} />
              <span className="font-semibold" style={{ color: "#003b63" }}>{p.name}</span>
              <span className="ml-auto text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                program
              </span>
              <button
                onClick={() => setEditingId(editingId === p.id ? null : p.id)}
                className="ml-2 text-gray-400 hover:text-gray-600 transition-colors"
                title="Edit"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            </div>
            {editingId === p.id && (
              <EditOrgForm
                org={p}
                allOrgs={allOrgs}
                onSaved={(updated) => { onUpdated(updated); setEditingId(null); }}
                onCancel={() => setEditingId(null)}
              />
            )}
            {children.length > 0 && (
              <div className="border-t border-gray-100">
                {children.map((c) => (
                  <div key={c.id}>
                    <div className="flex items-center gap-3 px-8 py-3 bg-gray-50 border-b border-gray-100 last:border-b-0">
                      <ChevronRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <span className="text-sm text-gray-700">{c.name}</span>
                      <span className="ml-auto text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                        initiative
                      </span>
                      <button
                        onClick={() => setEditingId(editingId === c.id ? null : c.id)}
                        className="ml-2 text-gray-400 hover:text-gray-600 transition-colors"
                        title="Edit"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {editingId === c.id && (
                      <EditOrgForm
                        org={c}
                        allOrgs={allOrgs}
                        onSaved={(updated) => { onUpdated(updated); setEditingId(null); }}
                        onCancel={() => setEditingId(null)}
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function NewOrgForm({
  allOrgs,
  onCreated,
  onCancel,
}: {
  allOrgs: Organization[];
  onCreated: (org: Organization) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [orgType, setOrgType] = useState<"program" | "initiative">("program");
  const [parentId, setParentId] = useState<number | "">("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const programs = allOrgs.filter((o) => o.org_type === "program");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const org = await createOrg({
        name,
        org_type: orgType,
        parent_id: parentId !== "" ? Number(parentId) : null,
      });
      onCreated(org);
    } catch {
      setError("Failed to create organization.");
    } finally {
      setSaving(false);
    }
  };

  const inputCls =
    "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#45cfcc]";

  return (
    <form
      onSubmit={handleSubmit}
      className="border-2 border-[#45cfcc]/40 rounded-xl p-6 bg-white mb-6"
    >
      <h2 className="text-lg font-semibold mb-4" style={{ color: "#003b63" }}>
        New Organization
      </h2>

      {error && <p className="text-red-500 text-sm mb-3">{error}</p>}

      <div className="flex flex-col gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
          <input
            required
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputCls}
            placeholder="e.g. Climate Intelligence"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
          <select
            value={orgType}
            onChange={(e) => {
              setOrgType(e.target.value as "program" | "initiative");
              if (e.target.value === "program") setParentId("");
            }}
            className={inputCls}
          >
            <option value="program">Program</option>
            <option value="initiative">Initiative</option>
          </select>
        </div>

        {orgType === "initiative" && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Parent Program</label>
            <select
              value={parentId}
              onChange={(e) => setParentId(e.target.value === "" ? "" : Number(e.target.value))}
              className={inputCls}
            >
              <option value="">— none —</option>
              {programs.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="flex gap-3 mt-5">
        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? "Saving…" : "Create"}
        </button>
        <button type="button" onClick={onCancel} className="btn-ghost">
          Cancel
        </button>
      </div>
    </form>
  );
}

export default function AdminPrograms() {
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    getAllOrgs()
      .then(setOrgs)
      .finally(() => setLoading(false));
  }, []);

  const programs = orgs.filter((o) => o.org_type === "program").sort((a, b) => a.name.localeCompare(b.name));

  return (
    <main className="max-w-3xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold" style={{ color: "#003b63" }}>
          Programs &amp; Initiatives
        </h1>
        {!showForm && (
          <button onClick={() => setShowForm(true)} className="btn-primary">
            <Plus className="w-4 h-4" />
            New Organization
          </button>
        )}
      </div>

      {showForm && (
        <NewOrgForm
          allOrgs={orgs}
          onCreated={(org) => {
            setOrgs((prev) => [...prev, org]);
            setShowForm(false);
          }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {loading && <p className="text-gray-400">Loading…</p>}

      {!loading && programs.length === 0 && !showForm && (
        <p className="text-gray-500">No organizations yet. Create one above.</p>
      )}

      <OrgTree
        programs={programs}
        allOrgs={orgs}
        onUpdated={(updated) =>
          setOrgs((prev) => prev.map((o) => (o.id === updated.id ? updated : o)))
        }
      />
    </main>
  );
}
