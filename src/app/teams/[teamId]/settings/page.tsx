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
  getPendingInvitesForTeam,
  updateTeam,
  removeMember,
  setMemberRole,
  createInvite,
  revokeInvite,
  deleteTeam,
} from "@/lib/team-queries";
import { utcTimeToLocalInputValue, localTimeToUtc } from "@/lib/timezone-utils";
import { isSupabaseConfigured } from "@/lib/supabase";
import type { Team, TeamMemberWithProfile, TeamInvite, TeamRole } from "@/types";

function TeamSettingsContent() {
  const { user } = useAuth();
  const params = useParams();
  const router = useRouter();
  const teamId = params.teamId as string;

  const [team, setTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<TeamMemberWithProfile[]>([]);
  const [invites, setInvites] = useState<TeamInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);

  const [nameEdit, setNameEdit] = useState("");
  const [slugEdit, setSlugEdit] = useState("");
  const [deadlineEdit, setDeadlineEdit] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<Exclude<TeamRole, "owner">>("member");
  const [saveError, setSaveError] = useState("");
  const [inviteError, setInviteError] = useState("");

  const currentMember = members.find((m) => m.profile.id === user?.uid);
  const isOwnerOrAdmin = currentMember?.role === "owner" || currentMember?.role === "admin";
  const isOwner = currentMember?.role === "owner";

  useEffect(() => {
    const uid = user?.uid;
    if (!uid || !teamId) return;
    if (!isSupabaseConfigured()) {
      setLoading(false);
      return;
    }
    async function load() {
      const [teamData, memberList, inviteList] = await Promise.all([
        getTeam(teamId),
        getTeamMembers(teamId),
        getPendingInvitesForTeam(teamId),
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
      const myRole = memberList.find((m) => m.profile.id === uid)?.role;
      if (myRole === "member") {
        setForbidden(true);
        setLoading(false);
        return;
      }
      setTeam(teamData);
      setMembers(memberList);
      setInvites(inviteList);
      setNameEdit(teamData.name);
      setSlugEdit(teamData.slug ?? "");
      setDeadlineEdit(utcTimeToLocalInputValue(teamData.standup_deadline_utc));
      setLoading(false);
    }
    load();
  }, [user?.uid, teamId]);

  useEffect(() => {
    if (!loading && forbidden) router.replace(`/teams/${teamId}`);
  }, [loading, forbidden, router, teamId]);

  async function handleSaveName() {
    if (!team || !nameEdit.trim()) return;
    setSaveError("");
    try {
      await updateTeam(teamId, { name: nameEdit.trim() });
      setTeam({ ...team, name: nameEdit.trim() });
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Failed to save");
    }
  }

  async function handleSaveSlug() {
    if (!team) return;
    if (slugEdit && !/^[a-z0-9-]+$/.test(slugEdit)) {
      setSaveError("Slug can only contain lowercase letters, numbers, and hyphens.");
      return;
    }
    setSaveError("");
    try {
      await updateTeam(teamId, { slug: slugEdit.trim() || undefined });
      setTeam({ ...team, slug: slugEdit.trim() || null });
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Failed to save");
    }
  }

  async function handleSaveDeadline() {
    if (!team) return;
    setSaveError("");
    try {
      const utc = localTimeToUtc(deadlineEdit);
      await updateTeam(teamId, { standupDeadlineUtc: utc });
      setTeam({ ...team, standup_deadline_utc: utc });
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Failed to save");
    }
  }

  async function handleSendInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviteError("");
    const email = inviteEmail.trim().toLowerCase();
    if (!email) return;
    if (!user) return;
    try {
      await createInvite(teamId, email, inviteRole, user.uid);
      const list = await getPendingInvitesForTeam(teamId);
      setInvites(list);
      setInviteEmail("");
    } catch (e) {
      setInviteError(e instanceof Error ? e.message : "Failed to send invite");
    }
  }

  async function handleRevokeInvite(inviteId: string) {
    try {
      await revokeInvite(inviteId);
      setInvites((prev) => prev.filter((i) => i.id !== inviteId));
    } catch {
      // ignore
    }
  }

  async function handleRemoveMember(memberUserId: string, displayName: string) {
    if (!confirm(`Remove ${displayName} from team?`)) return;
    try {
      await removeMember(teamId, memberUserId);
      setMembers((prev) => prev.filter((m) => m.profile.id !== memberUserId));
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to remove");
    }
  }

  async function handleSetRole(memberUserId: string, newRole: TeamRole) {
    try {
      await setMemberRole(teamId, memberUserId, newRole);
      setMembers((prev) =>
        prev.map((m) =>
          m.profile.id === memberUserId ? { ...m, role: newRole } : m
        )
      );
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to update role");
    }
  }

  async function handleDeleteTeam() {
    if (!team) return;
    const confirmed = prompt('Type the team name to confirm deletion:');
    if (confirmed !== team.name) return;
    try {
      await deleteTeam(teamId);
      router.replace("/teams");
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to delete team");
    }
  }

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

        <h1 className="text-[26px] font-bold text-[#0f0f0f] tracking-tight mb-8">
          Team settings
        </h1>

        {saveError && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 mb-6 text-[13px] text-red-600">
            {saveError}
          </div>
        )}

        {isOwner && (
          <>
            <div className="mb-8">
              <h2 className="text-[13px] font-semibold text-[#0f0f0f] mb-3">
                General (owner only)
              </h2>
              <div className="space-y-4">
                <div className="flex gap-2 items-center">
                  <input
                    type="text"
                    value={nameEdit}
                    onChange={(e) => setNameEdit(e.target.value)}
                    className="flex-1 rounded-xl border border-[#e8e8e8] bg-white px-3.5 py-2 text-[13px]"
                  />
                  <button
                    type="button"
                    onClick={handleSaveName}
                    className="px-3 py-2 bg-[#0f0f0f] text-white text-[13px] font-medium rounded-lg hover:bg-[#262626]"
                  >
                    Save
                  </button>
                </div>
                <div className="flex gap-2 items-center">
                  <input
                    type="text"
                    value={slugEdit}
                    onChange={(e) => setSlugEdit(e.target.value.toLowerCase().replace(/\s/g, ""))}
                    placeholder="slug"
                    className="flex-1 rounded-xl border border-[#e8e8e8] bg-white px-3.5 py-2 text-[13px]"
                  />
                  <button
                    type="button"
                    onClick={handleSaveSlug}
                    className="px-3 py-2 bg-[#0f0f0f] text-white text-[13px] font-medium rounded-lg hover:bg-[#262626]"
                  >
                    Save
                  </button>
                </div>
                <div className="flex gap-2 items-center">
                  <input
                    type="time"
                    value={deadlineEdit}
                    onChange={(e) => setDeadlineEdit(e.target.value)}
                    className="flex-1 rounded-xl border border-[#e8e8e8] bg-white px-3.5 py-2 text-[13px]"
                  />
                  <button
                    type="button"
                    onClick={handleSaveDeadline}
                    className="px-3 py-2 bg-[#0f0f0f] text-white text-[13px] font-medium rounded-lg hover:bg-[#262626]"
                  >
                    Save
                  </button>
                </div>
                <p className="text-[12px] text-[#737373]">
                  You&apos;re setting this in your local timezone. Your team will see their local equivalent.
                </p>
              </div>
            </div>
          </>
        )}

        <div className="mb-8">
          <h2 className="text-[13px] font-semibold text-[#0f0f0f] mb-3">Members</h2>
          <div className="rounded-xl border border-[#e8e8e8] bg-white overflow-hidden">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-[#e8e8e8] bg-[#fafafa]">
                  <th className="text-left py-3 px-4 font-semibold text-[#0f0f0f]">Name</th>
                  <th className="text-left py-3 px-4 font-semibold text-[#0f0f0f]">Role</th>
                  {isOwnerOrAdmin && (
                    <th className="text-right py-3 px-4 font-semibold text-[#0f0f0f]">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <tr key={m.id} className="border-b border-[#e8e8e8]">
                    <td className="py-3 px-4">
                      {m.profile.display_name || m.profile.email}
                    </td>
                    <td className="py-3 px-4 text-[#737373] uppercase">{m.role}</td>
                    {isOwnerOrAdmin && (
                      <td className="py-3 px-4 text-right">
                        {m.role === "owner" && (
                          <span className="text-[#888]">(no actions)</span>
                        )}
                        {m.role === "admin" && isOwner && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleSetRole(m.profile.id, "member")}
                              className="text-[#0f0f0f] hover:underline mr-2"
                            >
                              Make member
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                handleRemoveMember(
                                  m.profile.id,
                                  m.profile.display_name || m.profile.email
                                )
                              }
                              className="text-red-600 hover:underline"
                            >
                              Remove
                            </button>
                          </>
                        )}
                        {m.role === "member" && isOwnerOrAdmin && m.profile.id !== user?.uid && (
                          <>
                            {isOwner && (
                              <button
                                type="button"
                                onClick={() => handleSetRole(m.profile.id, "admin")}
                                className="text-[#0f0f0f] hover:underline mr-2"
                              >
                                Make admin
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() =>
                                handleRemoveMember(
                                  m.profile.id,
                                  m.profile.display_name || m.profile.email
                                )
                              }
                              className="text-red-600 hover:underline"
                            >
                              Remove
                            </button>
                          </>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {isOwnerOrAdmin && (
          <>
            <div className="mb-8">
              <h2 className="text-[13px] font-semibold text-[#0f0f0f] mb-3">Invite by email</h2>
              <form onSubmit={handleSendInvite} className="flex gap-2 flex-wrap items-end">
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="email@example.com"
                  className="rounded-xl border border-[#e8e8e8] bg-white px-3.5 py-2 text-[13px] w-48"
                />
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as Exclude<TeamRole, "owner">)}
                  className="rounded-xl border border-[#e8e8e8] bg-white px-3.5 py-2 text-[13px]"
                >
                  <option value="member">member</option>
                  <option value="admin">admin</option>
                </select>
                <button
                  type="submit"
                  className="px-3 py-2 bg-[#0f0f0f] text-white text-[13px] font-medium rounded-lg hover:bg-[#262626]"
                >
                  Send invite
                </button>
              </form>
              {inviteError && (
                <p className="text-[13px] text-red-600 mt-2">{inviteError}</p>
              )}
            </div>

            {invites.length > 0 && (
              <div className="mb-8">
                <h2 className="text-[13px] font-semibold text-[#0f0f0f] mb-3">Pending invites</h2>
                <ul className="space-y-2">
                  {invites.map((inv) => (
                    <li
                      key={inv.id}
                      className="flex items-center justify-between rounded-xl border border-[#e8e8e8] bg-white px-4 py-2 text-[13px]"
                    >
                      <span>
                        {inv.email} <span className="text-[#888]">({inv.role})</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRevokeInvite(inv.id)}
                        className="text-red-600 hover:underline"
                      >
                        Revoke
                      </button>
                    </li>
                  ))}
                </ul>
                <p className="text-[12px] text-[#737373] mt-2">
                  Share this link with the invitee:{" "}
                  <span className="break-all">
                    {typeof window !== "undefined"
                      ? `${window.location.origin}/invite/${invites[0]?.id}`
                      : `/invite/[id]`}
                  </span>
                </p>
              </div>
            )}
          </>
        )}

        {isOwner && (
          <div className="border-t border-[#e8e8e8] pt-8">
            <h2 className="text-[13px] font-semibold text-red-600 mb-2">Danger Zone</h2>
            <p className="text-[13px] text-[#737373] mb-3">
              This will permanently delete the team and remove all members. Your individual
              check-ins and reports are not affected.
            </p>
            <button
              type="button"
              onClick={handleDeleteTeam}
              className="px-4 py-2 border border-red-300 text-red-600 text-[13px] font-medium rounded-lg hover:bg-red-50"
            >
              Delete team
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function TeamSettingsPage() {
  return (
    <AuthGuard>
      <TeamSettingsContent />
    </AuthGuard>
  );
}
