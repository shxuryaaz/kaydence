"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import AuthGuard from "@/components/AuthGuard";
import Navbar from "@/components/Navbar";
import {
  getTeam,
  getTeamMembers,
  getTeamStandupForDate,
  getTeamReflectionsForSprint,
} from "@/lib/team-queries";
import { utcTimeToLocalDisplay, todayUtc, currentWeekStartUtc } from "@/lib/timezone-utils";
import { isSupabaseConfigured } from "@/lib/supabase";
import type { Team, TeamMemberWithProfile } from "@/types";

function TeamHomeContent() {
  const { user } = useAuth();
  const params = useParams();
  const router = useRouter();
  const teamId = params.teamId as string;

  const [team, setTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<TeamMemberWithProfile[]>([]);
  const [checkedInToday, setCheckedInToday] = useState(0);
  const [reflectedCount, setReflectedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);

  useEffect(() => {
    const uid = user?.uid;
    if (!uid || !teamId) return;
    if (!isSupabaseConfigured()) {
      setLoading(false);
      return;
    }
    async function load() {
      const [teamData, memberList] = await Promise.all([
        getTeam(teamId),
        getTeamMembers(teamId),
      ]);
      if (!teamData) {
        setForbidden(true);
        setLoading(false);
        return;
      }
      const isMember = memberList.some((m) => m.profile.id === uid);
      if (!isMember) {
        setForbidden(true);
        setLoading(false);
        return;
      }
      setTeam(teamData);
      setMembers(memberList);

      const today = todayUtc();
      const weekStart = currentWeekStartUtc();
      const [standupEntries, reflectionEntries] = await Promise.all([
        getTeamStandupForDate(teamId, today),
        getTeamReflectionsForSprint(teamId, weekStart),
      ]);
      setCheckedInToday(standupEntries.filter((e) => e.log !== null).length);
      setReflectedCount(reflectionEntries.filter((e) => e.reflection !== null).length);
      setLoading(false);
    }
    load();
  }, [user?.uid, teamId]);

  useEffect(() => {
    if (!loading && forbidden) router.replace("/teams");
  }, [loading, forbidden, router]);

  if (loading || !team) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-[#f5f5f5]">
          <Navbar />
          <div className="max-w-2xl mx-auto px-5 pt-10 pb-16 flex justify-center py-16">
            <div className="w-5 h-5 border-2 border-[#0f0f0f] border-t-transparent rounded-full animate-spin" />
          </div>
        </div>
      </AuthGuard>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      <Navbar />
      <div className="max-w-2xl mx-auto px-5 pt-10 pb-16">
        <Link
          href="/teams"
          className="text-[13px] font-medium text-[#737373] hover:text-[#0f0f0f] mb-6 inline-block"
        >
          ← Back to teams
        </Link>

        <div className="flex items-center justify-between mb-6">
          <h1 className="text-[26px] font-bold text-[#0f0f0f] tracking-tight">
            {team.name}
          </h1>
          {user && (members.find((m) => m.profile.id === user.uid)?.role === "owner" ||
            members.find((m) => m.profile.id === user.uid)?.role === "admin") && (
            <Link
              href={`/teams/${teamId}/settings`}
              className="text-[13px] font-medium text-[#737373] hover:text-[#0f0f0f]"
            >
              Settings
            </Link>
          )}
        </div>

        <p className="text-[13px] text-[#737373] mb-8">
          Standup deadline: {utcTimeToLocalDisplay(team.standup_deadline_utc)} (your time)
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
          <Link
            href={`/teams/${teamId}/standup`}
            className="rounded-2xl bg-white border border-[#e8e8e8] p-6 hover:border-[#0f0f0f] transition-colors"
            style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}
          >
            <div className="text-[11px] font-semibold text-[#888] uppercase tracking-wider mb-1">
              Today&apos;s standup
            </div>
            <div className="text-2xl font-bold text-[#0f0f0f]">
              {checkedInToday} / {members.length} checked in
            </div>
            <div className="text-[13px] text-[#0f0f0f] font-medium mt-2 underline underline-offset-2">
              View →
            </div>
          </Link>
          <Link
            href={`/teams/${teamId}/report`}
            className="rounded-2xl bg-white border border-[#e8e8e8] p-6 hover:border-[#0f0f0f] transition-colors"
            style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}
          >
            <div className="text-[11px] font-semibold text-[#888] uppercase tracking-wider mb-1">
              This sprint
            </div>
            <div className="text-2xl font-bold text-[#0f0f0f]">
              {reflectedCount} / {members.length} reflected
            </div>
            <div className="text-[13px] text-[#0f0f0f] font-medium mt-2 underline underline-offset-2">
              View report →
            </div>
          </Link>
        </div>

        <div>
          <h2 className="text-[13px] font-semibold text-[#0f0f0f] mb-3">
            Members ({members.length})
          </h2>
          <div className="flex flex-wrap gap-2">
            {members.map((m) => (
              <span
                key={m.id}
                className="inline-flex items-center gap-1.5 rounded-full bg-white border border-[#e8e8e8] px-3 py-1.5 text-[12px]"
              >
                <span className="font-medium text-[#0f0f0f]">
                  {m.profile.display_name || m.profile.email}
                </span>
                <span className="text-[#888] uppercase">{m.role}</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TeamHomePage() {
  return (
    <AuthGuard>
      <TeamHomeContent />
    </AuthGuard>
  );
}
