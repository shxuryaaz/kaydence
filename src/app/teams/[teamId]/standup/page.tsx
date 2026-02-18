"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import AuthGuard from "@/components/AuthGuard";
import Navbar from "@/components/Navbar";
import { getTeam, getTeamMembers, getTeamStandupForDate } from "@/lib/team-queries";
import { utcTimeToLocalDisplay, todayUtc } from "@/lib/timezone-utils";
import { isSupabaseConfigured } from "@/lib/supabase";
import type { Team, TeamStandupEntry } from "@/types";

const SCORE_CLASSES: Record<number, string> = {
  5: "bg-green-100 text-green-800",
  4: "bg-lime-100 text-lime-800",
  3: "bg-yellow-100 text-yellow-800",
  2: "bg-orange-100 text-orange-800",
  1: "bg-red-100 text-red-800",
};

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00Z");
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function prevDay(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().split("T")[0];
}

function nextDay(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().split("T")[0];
}

function TeamStandupContent() {
  const { user } = useAuth();
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const teamId = params.teamId as string;

  const dateParam = searchParams.get("date");
  const today = todayUtc();
  const displayDate = dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? dateParam : today;

  const [team, setTeam] = useState<Team | null>(null);
  const [entries, setEntries] = useState<TeamStandupEntry[]>([]);
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
      const [teamData, memberList, standupData] = await Promise.all([
        getTeam(teamId),
        getTeamMembers(teamId),
        getTeamStandupForDate(teamId, displayDate),
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
      setEntries(standupData);
      setLoading(false);
    }
    load();
  }, [user?.uid, teamId, displayDate]);

  useEffect(() => {
    if (!loading && forbidden) router.replace("/teams");
  }, [loading, forbidden, router]);

  const checkedInCount = entries.filter((e) => e.log !== null).length;
  const isFutureOrToday = displayDate >= today;
  const nextDateStr = nextDay(displayDate);

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
          href={`/teams/${teamId}`}
          className="text-[13px] font-medium text-[#737373] hover:text-[#0f0f0f] mb-6 inline-block"
        >
          ← Team home
        </Link>

        <h1 className="text-[26px] font-bold text-[#0f0f0f] tracking-tight mb-1">
          Team Standup — {team.name}
        </h1>
        <p className="text-[14px] text-[#737373] mb-2">
          {formatDateLabel(displayDate)}
        </p>
        <p className="text-[13px] text-[#737373] mb-6">
          Deadline: {utcTimeToLocalDisplay(team.standup_deadline_utc)} (your time)
        </p>

        <div className="flex items-center gap-4 mb-8">
          <Link
            href={`/teams/${teamId}/standup?date=${prevDay(displayDate)}`}
            className="text-[13px] font-medium text-[#0f0f0f] hover:underline"
          >
            ◀ Prev day
          </Link>
          <span className="flex-1" />
          {!isFutureOrToday && (
            <Link
              href={`/teams/${teamId}/standup?date=${nextDateStr}`}
              className="text-[13px] font-medium text-[#0f0f0f] hover:underline"
            >
              Next day ▶
            </Link>
          )}
          {isFutureOrToday && (
            <span className="text-[13px] text-[#888]">Next day ▶</span>
          )}
        </div>

        <div className="space-y-4">
          {entries.map((entry) => (
            <div
              key={entry.profile.id}
              className="rounded-2xl bg-white border border-[#e8e8e8] p-5"
              style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}
            >
              <div className="flex items-center justify-between gap-3 mb-2">
                <span className="font-semibold text-[#0f0f0f]">
                  {entry.log ? "✅" : "⏳"}{" "}
                  {entry.profile.display_name || entry.profile.email}
                </span>
                {entry.log && (
                  <span
                    className={`text-[12px] font-semibold px-2 py-0.5 rounded ${
                      SCORE_CLASSES[entry.log.score] ?? "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {entry.log.score}/5
                  </span>
                )}
              </div>
              {entry.log ? (
                <div className="space-y-2 text-[13px] text-[#555]">
                  <div>
                    <span className="font-medium text-[#888]">Worked on: </span>
                    {entry.log.worked_on}
                  </div>
                  <div>
                    <span className="font-medium text-[#888]">Next: </span>
                    {entry.log.working_next}
                  </div>
                  {entry.log.blockers && entry.log.blockers.toLowerCase() !== "none" && (
                    <div>
                      <span className="font-medium text-[#888]">Blockers: </span>
                      {entry.log.blockers}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-[13px] text-[#888]">(not checked in yet)</p>
              )}
            </div>
          ))}
        </div>

        <p className="text-[13px] text-[#737373] mt-8">
          Summary: {checkedInCount} / {entries.length} checked in
        </p>
      </div>
    </div>
  );
}

export default function TeamStandupPage() {
  return (
    <AuthGuard>
      <Suspense
        fallback={
          <div className="min-h-screen bg-[#f5f5f5] flex items-center justify-center">
            <div className="w-5 h-5 border-2 border-[#0f0f0f] border-t-transparent rounded-full animate-spin" />
          </div>
        }
      >
        <TeamStandupContent />
      </Suspense>
    </AuthGuard>
  );
}
