"use client";

import { useRouter, usePathname } from "next/navigation";
import type { TeamWithRole } from "@/types";

interface TeamSwitcherProps {
  teams: TeamWithRole[];
  currentTeamId?: string;
}

export default function TeamSwitcher({ teams, currentTeamId }: TeamSwitcherProps) {
  const router = useRouter();
  const pathname = usePathname();

  if (teams.length === 0) return null;

  const value =
    pathname?.startsWith("/teams/") && currentTeamId ? currentTeamId : "personal";

  return (
    <select
      className="text-[13px] border border-[#e8e8e8] rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:border-[#0f0f0f]"
      value={value}
      onChange={(e) => {
        const val = e.target.value;
        if (val === "personal") router.push("/dashboard");
        else router.push(`/teams/${val}`);
      }}
    >
      <option value="personal">Personal</option>
      {teams.map((t) => (
        <option key={t.id} value={t.id}>
          {t.name}
        </option>
      ))}
    </select>
  );
}
