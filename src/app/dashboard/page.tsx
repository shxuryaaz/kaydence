'use client';

import { useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import AuthGuard from '@/components/AuthGuard';
import { getUserTeams } from '@/lib/team-queries';
import { isSupabaseConfigured } from '@/lib/supabase';

function DashboardRedirect() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!user) return;
    if (!isSupabaseConfigured()) return;

    getUserTeams(user.uid).then((teams) => {
      if (teams.length === 0) {
        // No teams → go to team hub to create/join
        router.replace('/team');
      } else if (teams.length === 1) {
        // One team → go directly to that team's dashboard
        router.replace(`/team/${teams[0].id}`);
      } else {
        // Multiple teams → go to team hub to pick
        router.replace('/team');
      }
    });
  }, [user, router]);

  return (
    <div className="min-h-screen bg-[#f5f5f5] flex items-center justify-center">
      <div className="w-5 h-5 border-2 border-[#0f0f0f] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

export default function Dashboard() {
  return (
    <AuthGuard>
      <Suspense>
        <DashboardRedirect />
      </Suspense>
    </AuthGuard>
  );
}
