import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, ChevronRight, Building2, Target, Minus } from "lucide-react";
import { getGoalChildren, type Goal } from "../api/goals";
import type { Organization } from "../api/organizations";

function KRRow({ kr }: { kr: Goal }) {
  return (
    <Link
      to={`/goals/${kr.id}`}
      className="flex items-center gap-3 px-16 py-2.5 hover:bg-gray-200 text-sm border-b border-gray-200 last:border-b-0"
    >
      <Minus className="w-3 h-3 shrink-0 text-gray-400" />
      <span className="text-gray-600">{kr.title}</span>
    </Link>
  );
}

function ObjectiveRow({
  objective,
  forceOpen,
}: {
  objective: Goal;
  forceOpen: boolean;
}) {
  const [localOpen, setLocalOpen] = useState(false);
  const [krs, setKrs] = useState<Goal[] | null>(null);
  const [fetching, setFetching] = useState(false);

  const open = forceOpen || localOpen;

  const fetchKrs = () => {
    if (krs !== null) return;
    setFetching(true);
    getGoalChildren(objective.id)
      .then(setKrs)
      .finally(() => setFetching(false));
  };

  // Fetch when forceOpen first activates
  useEffect(() => {
    if (forceOpen && krs === null) fetchKrs();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [forceOpen]);

  const toggle = () => {
    if (!localOpen) fetchKrs();
    setLocalOpen((o) => !o);
  };

  return (
    <div>
      <div
        className="flex items-center gap-3 px-8 py-3 hover:bg-gray-100 cursor-pointer border-b border-gray-100"
        onClick={toggle}
      >
        <Target className="w-3.5 h-3.5 shrink-0" style={{ color: "#003b63" }} />
        <Link
          to={`/goals/${objective.id}`}
          className="text-sm flex-1 hover:underline"
          style={{ color: "#003b63" }}
          onClick={(e) => e.stopPropagation()}
        >
          {objective.title}
        </Link>
        {open ? (
          <ChevronDown className="w-3.5 h-3.5 text-gray-400 shrink-0" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />
        )}
      </div>

      {open && (
        <div className="bg-gray-100">
          {fetching && (
            <p className="px-16 py-2 text-xs text-gray-400">Loading…</p>
          )}
          {krs !== null && krs.length === 0 && (
            <p className="px-16 py-2 text-xs text-gray-400">No key results yet.</p>
          )}
          {krs?.map((kr) => <KRRow key={kr.id} kr={kr} />)}
        </div>
      )}
    </div>
  );
}

export function ProgramCard({
  program,
  objectives,
  forceOpen,
}: {
  program: Organization;
  objectives: Goal[];
  forceOpen: boolean;
}) {
  const [localOpen, setLocalOpen] = useState(false);
  const open = forceOpen || localOpen;

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
      <div
        className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 cursor-pointer"
        onClick={() => setLocalOpen((o) => !o)}
      >
        <div className="flex items-center gap-3">
          <Building2 className="w-5 h-5 shrink-0" style={{ color: "#45cfcc" }} />
          <Link
            to={`/programs/${program.id}`}
            className="font-semibold hover:underline"
            style={{ color: "#003b63" }}
            onClick={(e) => e.stopPropagation()}
          >
            {program.name}
          </Link>
          {objectives.length > 0 && (
            <span className="text-xs text-gray-400 ml-1">
              {objectives.length} objective{objectives.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        {objectives.length > 0 &&
          (open ? (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-400" />
          ))}
      </div>

      {open && objectives.length > 0 && (
        <div className="border-t border-gray-100 bg-gray-50">
          {objectives.map((obj) => (
            <ObjectiveRow key={obj.id} objective={obj} forceOpen={forceOpen} />
          ))}
        </div>
      )}
    </div>
  );
}
