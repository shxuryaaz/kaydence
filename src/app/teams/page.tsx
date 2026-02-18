"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import AuthGuard from "@/components/AuthGuard";
import Navbar from "@/components/Navbar";
import { getTeamsForUser, getTeamMembers } from "@/lib/team-queries";
import { utcTimeToLocalDisplay } from "@/lib/timezone-utils";
import { isSupabaseConfigured } from "@/lib/supabase";
import type { TeamWithRole } from "@/types";

function TeamsContent() {
  const { user } = useAuth();
  const [teams, setTeams] = useState<TeamWithRole[]>([]);
  const [memberCounts, setMemberCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const uid = user?.uid;
    if (!uid) return;
    if (!isSupabaseConfigured()) {
      setLoading(false);
      return;
    }
    getTeamsForUser(uid)
      .then(async (list) => {
        setTeams(list);
        const counts: Record<string, number> = {};
        await Promise.all(
          list.map(async (t) => {
            const members = await getTeamMembers(t.id);
            counts[t.id] = members.length;
          })
        );
        setMemberCounts(counts);
      })
      .catch(() => setTeams([]))
      .finally(() => setLoading(false));
  }, [user?.uid]);

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      <Navbar />
      <div className="max-w-2xl mx-auto px-5 pt-10 pb-16">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-[26px] font-bold text-[#0f0f0f] tracking-tight">
            Your Teams
          </h1>
          <Link
            href="/teams/new"
            className="px-4 py-2 bg-[#0f0f0f] text-white text-[13px] font-medium rounded-lg hover:bg-[#262626] transition-colors"
          >
            + Create a team
          </Link>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-5 h-5 border-2 border-[#0f0f0f] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : teams.length === 0 ? (
          <div className="rounded-2xl bg-white border border-[#e8e8e8] px-6 py-12 text-center">
            <p className="text-[14px] text-[#737373] mb-4">
              You&apos;re not in any team yet.
            </p>
            <Link
              href="/teams/new"
              className="inline-flex px-4 py-2 bg-[#0f0f0f] text-white text-[13px] font-medium rounded-lg hover:bg-[#262626] transition-colors"
            >
              Create your first team →
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {teams.map((team) => (
              <div
                key={team.id}
                className="rounded-2xl bg-white border border-[#e8e8e8] p-6"
                style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-[17px] font-semibold text-[#0f0f0f] mb-0.5">
                      {team.name}
                    </h2>
                    <p className="text-[11px] font-medium text-[#888] uppercase tracking-wide">
                      {team.role}
                    </p>
                    <p className="text-[13px] text-[#737373] mt-2">
                      {memberCounts[team.id] ?? "…"} members · Standup:{" "}
                      {utcTimeToLocalDisplay(team.standup_deadline_utc)}
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 shrink-0">
                    <Link
                      href={`/teams/${team.id}/standup`}
                      className="text-[13px] font-medium text-[#0f0f0f] hover:underline underline-offset-2"
                    >
                      View standup →
                    </Link>
                    {(team.role === "owner" || team.role === "admin") && (
                      <Link
                        href={`/teams/${team.id}/settings`}
                        className="text-[13px] font-medium text-[#737373] hover:text-[#0f0f0f]"
                      >
                        Settings
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function TeamsPage() {
  return (
    <AuthGuard>
      <TeamsContent />
    </AuthGuard>
  );
}
