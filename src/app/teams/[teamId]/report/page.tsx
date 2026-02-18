"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import AuthGuard from "@/components/AuthGuard";
import Navbar from "@/components/Navbar";
import {
  getTeam,
  getTeamMembers,
  getTeamWeeklyReport,
  getTeamReflectionsForSprint,
} from "@/lib/team-queries";
import { currentWeekStartUtc } from "@/lib/timezone-utils";
import { isSupabaseConfigured } from "@/lib/supabase";
import type { Team, TeamWeeklyReport as TeamWeeklyReportType, TeamReflectionEntry } from "@/types";

function getPrevMonday(weekStart: string): string {
  const d = new Date(weekStart + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() - 7);
  return d.toISOString().split("T")[0];
}

function getNextMonday(weekStart: string): string {
  const d = new Date(weekStart + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + 7);
  return d.toISOString().split("T")[0];
}

function formatWeekRange(weekStart: string): string {
  const start = new Date(weekStart + "T00:00:00Z");
  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 6);
  return `${start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
}

function TeamReportContent() {
  const { user } = useAuth();
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const teamId = params.teamId as string;

  const weekParam = searchParams.get("week");
  const currentWeek = currentWeekStartUtc();
  const weekStart =
    weekParam && /^\d{4}-\d{2}-\d{2}$/.test(weekParam) ? weekParam : currentWeek;

  const [team, setTeam] = useState<Team | null>(null);
  const [report, setReport] = useState<TeamWeeklyReportType | null>(null);
  const [reflections, setReflections] = useState<TeamReflectionEntry[]>([]);
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
      const [teamData, memberList, reportData, reflectionData] = await Promise.all([
        getTeam(teamId),
        getTeamMembers(teamId),
        getTeamWeeklyReport(teamId, weekStart),
        getTeamReflectionsForSprint(teamId, weekStart),
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
      setReport(reportData);
      setReflections(reflectionData);
      setLoading(false);
    }
    load();
  }, [user?.uid, teamId, weekStart]);

  useEffect(() => {
    if (!loading && forbidden) router.replace("/teams");
  }, [loading, forbidden, router]);

  const possibleCheckIns = report ? report.memberCount * 5 : 0;
  const isCurrentOrFutureWeek = weekStart >= currentWeek;

  if (loading || !team) {
    return (
      <div className="min-h-screen bg-[#f5f5f5]">
        <Navbar />
        <div className="max-w-2xl mx-auto px-5 pt-10 pb-16 flex justify-center py-16">
          <div className="w-5 h-5 border-2 border-[#0f0f0f] border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
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
          Team Report — {team.name}
        </h1>
        <p className="text-[14px] text-[#737373] mb-6">
          Week of {formatWeekRange(weekStart)}
        </p>

        <div className="flex items-center gap-4 mb-8">
          <Link
            href={`/teams/${teamId}/report?week=${getPrevMonday(weekStart)}`}
            className="text-[13px] font-medium text-[#0f0f0f] hover:underline"
          >
            ◀ Prev week
          </Link>
          <span className="flex-1" />
          {!isCurrentOrFutureWeek && (
            <Link
              href={`/teams/${teamId}/report?week=${getNextMonday(weekStart)}`}
              className="text-[13px] font-medium text-[#0f0f0f] hover:underline"
            >
              Next week ▶
            </Link>
          )}
          {isCurrentOrFutureWeek && (
            <span className="text-[13px] text-[#888]">Next week ▶</span>
          )}
        </div>

        {report && (
          <>
            <div className="rounded-2xl bg-white border border-[#e8e8e8] p-6 mb-8">
              <h2 className="text-[13px] font-semibold text-[#888] uppercase tracking-wider mb-4">
                Team Summary
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-[14px]">
                <div>
                  <span className="text-[#737373]">Total check-ins this week: </span>
                  <span className="font-semibold text-[#0f0f0f]">
                    {report.totalCheckIns} / {possibleCheckIns} possible
                  </span>
                </div>
                <div>
                  <span className="text-[#737373]">Team average score: </span>
                  <span className="font-semibold text-[#0f0f0f]">
                    {report.avgScore != null ? `${report.avgScore} / 5` : "—"}
                  </span>
                </div>
                <div>
                  <span className="text-[#737373]">Members: </span>
                  <span className="font-semibold text-[#0f0f0f]">
                    {reflections.filter((e) => e.reflection !== null).length} of{" "}
                    {report.memberCount} reflected this sprint
                  </span>
                </div>
              </div>
            </div>

            <h2 className="text-[13px] font-semibold text-[#888] uppercase tracking-wider mb-4">
              Sprint Reflections
            </h2>
            <div className="space-y-4">
              {reflections.map((entry) => (
                <div
                  key={entry.profile.id}
                  className="rounded-2xl bg-white border border-[#e8e8e8] p-5"
                  style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-semibold text-[#0f0f0f]">
                      {entry.reflection ? "✅" : "⏳"}{" "}
                      {entry.profile.display_name || entry.profile.email}
                    </span>
                  </div>
                  {entry.reflection ? (
                    <div className="text-[13px] text-[#555]">
                      <p className="whitespace-pre-wrap leading-relaxed">
                        {entry.reflection.finished_this_sprint}
                      </p>
                      {entry.reflection.doc_link && (
                        <a
                          href={entry.reflection.doc_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[13px] text-blue-600 hover:underline mt-2 inline-block"
                        >
                          View full reflection →
                        </a>
                      )}
                    </div>
                  ) : (
                    <p className="text-[13px] text-[#888]">(no reflection yet)</p>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function TeamReportPage() {
  return (
    <AuthGuard>
      <Suspense
        fallback={
          <div className="min-h-screen bg-[#f5f5f5] flex items-center justify-center">
            <div className="w-5 h-5 border-2 border-[#0f0f0f] border-t-transparent rounded-full animate-spin" />
          </div>
        }
      >
        <TeamReportContent />
      </Suspense>
    </AuthGuard>
  );
}
