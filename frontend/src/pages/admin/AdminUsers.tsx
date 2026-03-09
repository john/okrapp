import { useEffect, useState } from "react";
import { X } from "lucide-react";
import {
  listUsers,
  getAllOrgs,
  getMe,
  addUserToOrg,
  removeUserFromOrg,
  type User,
  type Organization,
} from "../../api/organizations";

function UserRow({
  user,
  allOrgs,
  currentUserId,
  onOrgAdded,
  onOrgRemoved,
}: {
  user: User;
  allOrgs: Organization[];
  currentUserId: number;
  onOrgAdded: (userId: number, org: Organization) => void;
  onOrgRemoved: (userId: number, orgId: number) => void;
}) {
  const [selectedOrgId, setSelectedOrgId] = useState<number | "">("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const memberOrgIds = new Set(user.organizations.map((o) => o.id));
  const available = allOrgs.filter((o) => !memberOrgIds.has(o.id));

  const handleAdd = async () => {
    if (selectedOrgId === "") return;
    setAdding(true);
    setError(null);
    try {
      await addUserToOrg(user.id, Number(selectedOrgId));
      const org = allOrgs.find((o) => o.id === Number(selectedOrgId))!;
      onOrgAdded(user.id, org);
      setSelectedOrgId("");
    } catch {
      setError("Failed to add.");
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (orgId: number) => {
    try {
      await removeUserFromOrg(user.id, orgId);
      onOrgRemoved(user.id, orgId);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="border border-gray-200 rounded-xl p-5 bg-white">
      <div className="mb-3">
        <p className="font-semibold" style={{ color: "#003b63" }}>{user.name ?? "—"}</p>
        <p className="text-sm text-gray-500">{user.email ?? "—"}</p>
      </div>

      {/* Current memberships */}
      {user.organizations.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {user.organizations.map((org) => (
            <span
              key={org.id}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium"
              style={{ backgroundColor: "rgba(0,59,99,0.1)", color: "#003b63" }}
            >
              {org.name}
              {user.id !== currentUserId && (
                <button
                  onClick={() => handleRemove(org.id)}
                  className="hover:text-red-500 transition-colors"
                  title="Remove from org"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </span>
          ))}
        </div>
      )}

      {error && <p className="text-red-500 text-xs mb-2">{error}</p>}

      {/* Add to org — only shows orgs the user isn't already in */}
      <div className="flex items-center gap-2">
        <select
          value={selectedOrgId}
          onChange={(e) =>
            setSelectedOrgId(e.target.value === "" ? "" : Number(e.target.value))
          }
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#45cfcc]"
        >
          <option value="">Add to organization…</option>
          {available.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name} ({o.org_type})
            </option>
          ))}
        </select>
        <button
          onClick={handleAdd}
          disabled={selectedOrgId === "" || adding}
          className="btn-primary whitespace-nowrap"
        >
          {adding ? "Adding…" : "Add"}
        </button>
      </div>
    </div>
  );
}

export default function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [allOrgs, setAllOrgs] = useState<Organization[]>([]);
  const [currentUserId, setCurrentUserId] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([listUsers(), getAllOrgs(), getMe()])
      .then(([rawUsers, orgs, me]) => {
        setAllOrgs(orgs);
        setCurrentUserId(me.id);
        setUsers(rawUsers);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleOrgAdded = (userId: number, org: Organization) => {
    setUsers((prev) =>
      prev.map((u) =>
        u.id === userId ? { ...u, organizations: [...u.organizations, org] } : u
      )
    );
  };

  const handleOrgRemoved = (userId: number, orgId: number) => {
    setUsers((prev) =>
      prev.map((u) =>
        u.id === userId
          ? { ...u, organizations: u.organizations.filter((o) => o.id !== orgId) }
          : u
      )
    );
  };

  return (
    <main className="max-w-3xl mx-auto px-6 py-10">
      <h1 className="text-3xl font-bold mb-2" style={{ color: "#003b63" }}>Users</h1>
      <p className="text-gray-500 mb-8">Assign users to programs and initiatives.</p>

      {loading && <p className="text-gray-400">Loading…</p>}

      <div className="flex flex-col gap-4">
        {users.map((u) => (
          <UserRow
            key={u.id}
            user={u}
            allOrgs={allOrgs}
            currentUserId={currentUserId}
            onOrgAdded={handleOrgAdded}
            onOrgRemoved={handleOrgRemoved}
          />
        ))}
      </div>
    </main>
  );
}
