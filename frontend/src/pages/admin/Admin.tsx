import { Link } from "react-router-dom";
import { Building2, Users } from "lucide-react";

export default function Admin() {
  return (
    <main className="max-w-2xl mx-auto px-6 py-10">
      <h1 className="text-3xl font-bold mb-2">Admin</h1>
      <p className="text-gray-500 mb-10">Manage programs, initiatives, and user memberships.</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          to="/admin/programs"
          className="flex items-center gap-4 p-6 border border-gray-200 rounded-xl bg-white hover:shadow-md transition-all"
          style={{ borderColor: "" }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#45cfcc")}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = "")}
        >
          <div
            className="p-3 rounded-full"
            style={{ backgroundColor: "rgba(0,59,99,0.1)" }}
          >
            <Building2 className="w-6 h-6" style={{ color: "#003b63" }} />
          </div>
          <div>
            <p className="font-semibold">Programs</p>
            <p className="text-sm text-gray-500">View and manage organizations</p>
          </div>
        </Link>

        <Link
          to="/admin/users"
          className="flex items-center gap-4 p-6 border border-gray-200 rounded-xl bg-white hover:shadow-md transition-all"
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#45cfcc")}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = "")}
        >
          <div
            className="p-3 rounded-full"
            style={{ backgroundColor: "rgba(0,59,99,0.1)" }}
          >
            <Users className="w-6 h-6" style={{ color: "#003b63" }} />
          </div>
          <div>
            <p className="font-semibold">Users</p>
            <p className="text-sm text-gray-500">Assign users to organizations</p>
          </div>
        </Link>
      </div>
    </main>
  );
}
