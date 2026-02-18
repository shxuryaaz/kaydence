"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import AuthGuard from "@/components/AuthGuard";
import Navbar from "@/components/Navbar";
import { createTeam } from "@/lib/team-queries";
import { localTimeToUtc } from "@/lib/timezone-utils";

export default function NewTeamPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [deadline, setDeadline] = useState("18:30");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!name.trim()) {
      setError("Team name is required.");
      return;
    }
    if (slug && !/^[a-z0-9-]+$/.test(slug)) {
      setError("Slug can only contain lowercase letters, numbers, and hyphens.");
      return;
    }
    if (!user) return;
    setSubmitting(true);
    try {
      const utcTime = localTimeToUtc(deadline);
      const team = await createTeam(user.uid, {
        name: name.trim(),
        slug: slug.trim() || undefined,
        standupDeadlineUtc: utcTime,
      });
      router.push(`/teams/${team.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create team.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-[#f5f5f5]">
        <Navbar />
        <div className="max-w-xl mx-auto px-5 pt-10 pb-16">
          <Link
            href="/teams"
            className="text-[13px] font-medium text-[#737373] hover:text-[#0f0f0f] mb-6 inline-block"
          >
            ← Back to teams
          </Link>
          <h1 className="text-[26px] font-bold text-[#0f0f0f] tracking-tight mb-6">
            Create a team
          </h1>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-[13px] font-medium text-[#0f0f0f] mb-1.5">
                Team name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Acme"
                className="w-full rounded-xl border border-[#e8e8e8] bg-white px-3.5 py-2.5 text-[13px] text-[#0f0f0f] placeholder:text-[#bbb] focus:outline-none focus:border-[#0f0f0f]"
              />
            </div>
            <div>
              <label className="block text-[13px] font-medium text-[#0f0f0f] mb-1.5">
                Slug (optional)
              </label>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/\s/g, ""))}
                placeholder="acme"
                className="w-full rounded-xl border border-[#e8e8e8] bg-white px-3.5 py-2.5 text-[13px] text-[#0f0f0f] placeholder:text-[#bbb] focus:outline-none focus:border-[#0f0f0f]"
              />
              <p className="text-[12px] text-[#737373] mt-1">
                Used for /t/[slug] URL (optional)
              </p>
            </div>
            <div>
              <label className="block text-[13px] font-medium text-[#0f0f0f] mb-1.5">
                Standup deadline *
              </label>
              <input
                type="time"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full rounded-xl border border-[#e8e8e8] bg-white px-3.5 py-2.5 text-[13px] text-[#0f0f0f] focus:outline-none focus:border-[#0f0f0f]"
              />
              <p className="text-[12px] text-[#737373] mt-1">
                Set the time in YOUR local timezone. Your team will see it in their own local time.
              </p>
            </div>
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5">
                <p className="text-[13px] text-red-600">{error}</p>
              </div>
            )}
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 bg-[#0f0f0f] hover:bg-[#262626] text-white text-[13px] font-medium rounded-xl transition-colors disabled:opacity-50"
            >
              {submitting ? "Creating…" : "Create team"}
            </button>
          </form>
        </div>
      </div>
    </AuthGuard>
  );
}
