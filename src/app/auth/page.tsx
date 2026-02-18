'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signInWithEmail, signUpWithEmail, signInWithGoogle } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { acceptInvite } from '@/lib/team-queries';

function AuthPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) router.replace('/dashboard');
  }, [user, loading, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      let uid: string;
      if (mode === 'signin') {
        const cred = await signInWithEmail(email, password);
        uid = cred.user.uid;
      } else {
        const cred = await signUpWithEmail(email, password, name);
        uid = cred.user.uid;
      }
      const invite = searchParams.get('invite');
      if (invite) {
        try {
          const teamId = await acceptInvite(invite, uid);
          router.replace(`/teams/${teamId}`);
          return;
        } catch {
          // Invite invalid or already used — proceed to normal redirect
        }
      }
      router.replace('/dashboard');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Authentication failed.';
      setError(msg.replace('Firebase: ', '').replace(/\(auth\/.*\)\.?/, '').trim());
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGoogle() {
    setError('');
    setSubmitting(true);
    try {
      const cred = await signInWithGoogle();
      const uid = cred.user.uid;
      const invite = searchParams.get('invite');
      if (invite) {
        try {
          const teamId = await acceptInvite(invite, uid);
          router.replace(`/teams/${teamId}`);
          return;
        } catch {
          // Invite invalid or already used — proceed to normal redirect
        }
      }
      router.replace('/dashboard');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Google sign-in failed.';
      setError(msg.replace('Firebase: ', '').trim());
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return null;

  return (
    <div className="min-h-screen bg-[#f5f5f5] flex items-center justify-center px-4">
      <div className="w-full max-w-[400px]">

        {/* Card */}
        <div
          className="bg-white rounded-2xl border border-[#e8e8e8] p-8 space-y-6"
          style={{ boxShadow: '0 0 0 1px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.06)' }}
        >
          {/* Header */}
          <div className="space-y-1">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-7 h-7 rounded-lg bg-[#0f0f0f] flex items-center justify-center">
                <span className="text-white text-sm font-bold leading-none">K</span>
              </div>
              <span className="font-semibold text-[#0f0f0f] text-[15px] tracking-tight">Kaydence</span>
            </div>
            <h1 className="text-[22px] font-semibold text-[#0f0f0f] tracking-tight leading-snug">
              {mode === 'signin' ? 'Welcome back.' : 'Create account.'}
            </h1>
            <p className="text-[13px] text-[#737373]">
              {mode === 'signin'
                ? 'Sign in to continue tracking your progress.'
                : 'Start tracking your daily execution.'}
            </p>
          </div>

          {/* Google */}
          <button
            onClick={handleGoogle}
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2.5 py-2.5 bg-[#f5f5f5] hover:bg-[#ebebeb] border border-[#e8e8e8] rounded-xl text-[13px] font-medium text-[#0f0f0f] transition-colors disabled:opacity-50"
          >
            <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
              <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
              <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-[#e8e8e8]" />
            <span className="text-[12px] text-[#bbb]">or</span>
            <div className="flex-1 h-px bg-[#e8e8e8]" />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {mode === 'signup' && (
              <div className="space-y-1.5">
                <label className="block text-[13px] font-medium text-[#0f0f0f]">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  required
                  className="w-full rounded-xl border border-[#e8e8e8] bg-[#fafafa] px-3.5 py-2.5 text-[13px] text-[#0f0f0f] placeholder:text-[#bbb] focus:outline-none focus:bg-white focus:border-[#0f0f0f] transition-all"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <label className="block text-[13px] font-medium text-[#0f0f0f]">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full rounded-xl border border-[#e8e8e8] bg-[#fafafa] px-3.5 py-2.5 text-[13px] text-[#0f0f0f] placeholder:text-[#bbb] focus:outline-none focus:bg-white focus:border-[#0f0f0f] transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-[13px] font-medium text-[#0f0f0f]">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                className="w-full rounded-xl border border-[#e8e8e8] bg-[#fafafa] px-3.5 py-2.5 text-[13px] text-[#0f0f0f] placeholder:text-[#bbb] focus:outline-none focus:bg-white focus:border-[#0f0f0f] transition-all"
              />
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
              {submitting ? 'Loading...' : mode === 'signin' ? 'Sign in' : 'Create account'}
            </button>
          </form>

          <p className="text-center text-[13px] text-[#737373]">
            {mode === 'signin' ? "No account? " : 'Already have one? '}
            <button
              onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(''); }}
              className="text-[#0f0f0f] font-medium hover:underline underline-offset-2"
            >
              {mode === 'signin' ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </div>

        <p className="text-center text-[12px] text-[#bbb] mt-5">
          Your execution tracker. Simple and focused.
        </p>
      </div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#f5f5f5] flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-[#0f0f0f] border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <AuthPageContent />
    </Suspense>
  );
}
