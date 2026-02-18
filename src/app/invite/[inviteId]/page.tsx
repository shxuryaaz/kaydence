"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { getInvite, acceptInvite } from "@/lib/team-queries";
import { isSupabaseConfigured } from "@/lib/supabase";

function InviteContent() {
  const { user, loading: authLoading } = useAuth();
  const params = useParams();
  const router = useRouter();
  const inviteId = params.inviteId as string;

  const [teamName, setTeamName] = useState<string | null>(null);
  const [inviteRole, setInviteRole] = useState<string>("member");
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState("");
  const [invalid, setInvalid] = useState(false);

  useEffect(() => {
    if (!inviteId) {
      setInvalid(true);
      setLoading(false);
      return;
    }
    if (!isSupabaseConfigured()) {
      setLoading(false);
      return;
    }
    getInvite(inviteId)
      .then((data) => {
        if (!data) {
          setInvalid(true);
        } else {
          setTeamName(data.teamName);
          setInviteRole(data.invite.role);
        }
      })
      .catch(() => setInvalid(true))
      .finally(() => setLoading(false));
  }, [inviteId]);

  async function handleAccept() {
    if (!user) return;
    setError("");
    setAccepting(true);
    try {
      const teamId = await acceptInvite(inviteId, user.uid);
      router.replace(`/teams/${teamId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to accept invite.");
    } finally {
      setAccepting(false);
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[#f5f5f5] flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-[#0f0f0f] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (invalid || !teamName) {
    return (
      <div className="min-h-screen bg-[#f5f5f5] flex items-center justify-center px-4">
        <div className="rounded-2xl bg-white border border-[#e8e8e8] p-8 max-w-md text-center">
          <p className="text-[15px] text-[#0f0f0f] mb-4">
            This invite is invalid or has already been used.
          </p>
          <Link
            href="/dashboard"
            className="text-[13px] font-medium text-[#0f0f0f] underline underline-offset-2"
          >
            Go to dashboard →
          </Link>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#f5f5f5] flex items-center justify-center px-4">
        <div className="rounded-2xl bg-white border border-[#e8e8e8] p-8 max-w-md text-center">
          <p className="text-[15px] text-[#0f0f0f] mb-4">
            You&apos;ve been invited to join <strong>{teamName}</strong>. Create an account or sign
            in to accept.
          </p>
          <Link
            href={`/auth?invite=${inviteId}`}
            className="inline-flex px-4 py-2 bg-[#0f0f0f] text-white text-[13px] font-medium rounded-lg hover:bg-[#262626] transition-colors"
          >
            Sign in / Sign up
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f5f5] flex items-center justify-center px-4">
      <div className="rounded-2xl bg-white border border-[#e8e8e8] p-8 max-w-md text-center">
        <p className="text-[15px] text-[#0f0f0f] mb-4">
          You&apos;ve been invited to join <strong>{teamName}</strong> as{" "}
          <strong>{inviteRole}</strong>.
        </p>
        {error && (
          <p className="text-[13px] text-red-600 mb-4">{error}</p>
        )}
        <button
          type="button"
          onClick={handleAccept}
          disabled={accepting}
          className="inline-flex px-4 py-2 bg-[#0f0f0f] text-white text-[13px] font-medium rounded-lg hover:bg-[#262626] transition-colors disabled:opacity-50"
        >
          {accepting ? "Accepting…" : "Accept invite"}
        </button>
      </div>
    </div>
  );
}

export default function InvitePage() {
  return <InviteContent />;
}
