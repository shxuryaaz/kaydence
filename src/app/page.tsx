'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import ShaderCanvas from '@/components/ShaderCanvas';

export default function LandingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) router.replace('/dashboard');
  }, [user, loading, router]);

  if (loading) return null;
  if (user) return null;

  return (
    <div className="min-h-screen bg-[#f5f5f5] text-[#0f0f0f]">

      {/* ── Sticky Nav ── */}
      <nav className="sticky top-0 z-50 bg-[#f5f5f5]/90 backdrop-blur-md border-b border-[#e8e8e8]">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-[#0f0f0f] flex items-center justify-center">
              <span className="text-white text-xs font-bold leading-none">K</span>
            </div>
            <span className="font-semibold text-[#0f0f0f] text-[15px] tracking-tight">Kaydence</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/auth"
              className="text-[13px] font-medium text-[#737373] hover:text-[#0f0f0f] transition-colors px-2">
              Sign in
            </Link>
            <Link href="/auth"
              className="px-4 py-2 bg-[#0f0f0f] text-white text-[13px] font-semibold rounded-full hover:bg-[#262626] transition-colors">
              Get started →
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative min-h-[88vh] overflow-hidden flex items-center grain">
        {/* WebGL shader background */}
        <ShaderCanvas className="absolute inset-0 w-full h-full" />

        {/* Content */}
        <div className="relative z-10 max-w-5xl mx-auto px-6 py-24 w-full">
          <div className="grid md:grid-cols-2 gap-12 md:gap-20 items-center">

            {/* Left — text */}
            <div>
              <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm border border-[#e8e8e8] rounded-full px-3.5 py-1.5 mb-8"
                style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                <span className="text-[12px] font-medium text-[#737373]">Daily standups · Sprint reflections · Weekly reports</span>
              </div>

              <h1 className="text-[58px] md:text-[68px] font-bold tracking-tight leading-[1.0] text-[#0f0f0f] mb-6">
                Are you<br />
                actually<br />
                <span className="text-[#737373]">making</span><br />
                progress?
              </h1>

              <p className="text-[16px] text-[#737373] leading-relaxed mb-8 max-w-sm">
                The minimal async productivity tracker. 60-second check-ins, sprint reflections, and weekly reports — no noise.
              </p>

              <div className="flex items-center gap-3 flex-wrap">
                <Link href="/auth"
                  className="px-6 py-3 bg-[#0f0f0f] text-white text-[14px] font-semibold rounded-full hover:bg-[#262626] transition-colors">
                  Start tracking free →
                </Link>
                <a href="#how-it-works"
                  className="px-6 py-3 bg-white/80 backdrop-blur-sm border border-[#e8e8e8] text-[14px] font-medium text-[#737373] rounded-full hover:text-[#0f0f0f] hover:border-[#0f0f0f] transition-colors">
                  How it works
                </a>
              </div>
            </div>

            {/* Right — tilted preview cards */}
            <div className="hidden md:block relative h-80">
              {/* Card 1 — check-in summary */}
              <div className="absolute top-0 left-0 w-64 rotate-[-2deg] rounded-2xl bg-white border border-emerald-200 p-5"
                style={{ boxShadow: '0 24px 48px rgba(0,0,0,0.12), 0 0 0 1px rgba(16,185,129,0.08)' }}>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-1">
                  ✓ Checked in
                </span>
                <p className="text-[13px] font-medium text-[#0f0f0f] mt-3 leading-snug">
                  Shipped new onboarding flow,<br />fixed the auth redirect bug
                </p>
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-[#f0f0f0]">
                  <span className="text-[11px] text-[#aaa] uppercase tracking-wide font-semibold">Score</span>
                  <span className="text-[14px] font-bold text-[#0f0f0f]">4 / 5</span>
                </div>
              </div>

              {/* Card 2 — stats */}
              <div className="absolute top-16 left-32 w-56 rotate-[1.5deg] rounded-2xl bg-white border border-[#e8e8e8] p-5"
                style={{ boxShadow: '0 20px 40px rgba(0,0,0,0.10), 0 0 0 1px rgba(0,0,0,0.03)' }}>
                <div className="flex items-end gap-1.5 mb-1">
                  <span className="text-[36px] font-bold text-[#0f0f0f] leading-none">5</span>
                  <span className="text-[13px] text-[#737373] mb-1">days</span>
                </div>
                <p className="text-[10px] text-[#aaa] uppercase tracking-widest font-semibold mb-4">
                  checked in this week
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-1">
                    ↑ improving
                  </span>
                  <span className="text-[12px] text-[#737373]">3.8 avg</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats Ribbon ── */}
      <div className="bg-[#0f0f0f] py-12 px-6">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-4">
          {[
            { value: '60s',  label: 'per check-in' },
            { value: '5×',   label: 'per week' },
            { value: '1',    label: 'weekly report' },
            { value: '0',    label: 'integrations needed' },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-[48px] md:text-[56px] font-bold text-white leading-none tracking-tight">{s.value}</p>
              <p className="text-[12px] text-white/40 mt-2 font-medium tracking-wide uppercase">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Features Bento ── */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <div className="mb-12">
          <p className="text-[11px] font-semibold text-[#aaa] uppercase tracking-wider mb-2">Features</p>
          <h2 className="text-[32px] md:text-[36px] font-bold tracking-tight leading-[1.1]">
            Everything you need.<br />Nothing you don't.
          </h2>
        </div>

        {/* Bento grid — irregular layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 md:grid-rows-2 gap-4">

          {/* Wide card — Daily standups */}
          <div className="md:col-span-2 rounded-2xl bg-white border border-[#e8e8e8] p-8"
            style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <div className="text-[32px] mb-5 leading-none">⚡</div>
            <p className="text-[18px] font-bold text-[#0f0f0f] mb-2 tracking-tight">Daily standups</p>
            <p className="text-[14px] text-[#737373] leading-relaxed max-w-sm">
              60 seconds. 4 questions. What you worked on, what's next, blockers, and a 1–5 self-grade. That's the whole thing.
            </p>
          </div>

          {/* Tall card — Sprint reflections (inverted, col 3, rows 1–2) */}
          <div className="md:col-start-3 md:row-start-1 md:row-span-2 rounded-2xl bg-[#0f0f0f] p-8 flex flex-col justify-between">
            <div>
              <div className="text-[32px] mb-5 leading-none">🏁</div>
              <p className="text-[18px] font-bold text-white mb-3 tracking-tight">Sprint reflections</p>
              <p className="text-[14px] text-white/60 leading-relaxed">
                Every Saturday, document what you actually finished. Link the Google Doc. Close the loop on the week with honesty.
              </p>
            </div>
            <p className="text-[10px] font-bold text-white/25 uppercase tracking-widest mt-6">Every saturday</p>
          </div>

          {/* Small card — Progress */}
          <div className="md:col-start-1 md:row-start-2 rounded-2xl bg-[#f5f5f5] border border-[#e8e8e8] p-6">
            <div className="text-[28px] mb-4 leading-none">📈</div>
            <p className="text-[15px] font-bold text-[#0f0f0f] mb-1.5">Progress tracking</p>
            <p className="text-[13px] text-[#737373] leading-relaxed">Streak, avg score, trend direction. Auto-computed from your logs.</p>
          </div>

          {/* Small card — Weekly reports */}
          <div className="md:col-start-2 md:row-start-2 rounded-2xl bg-[#f5f5f5] border border-[#e8e8e8] p-6">
            <div className="text-[28px] mb-4 leading-none">📊</div>
            <p className="text-[15px] font-bold text-[#0f0f0f] mb-1.5">Weekly reports</p>
            <p className="text-[13px] text-[#737373] leading-relaxed">Auto-generated from your daily logs. Review what mattered.</p>
          </div>
        </div>
      </section>

      {/* ── How it works — editorial numbered list ── */}
      <section id="how-it-works" className="max-w-5xl mx-auto px-6 pb-20">
        <div className="mb-12">
          <p className="text-[11px] font-semibold text-[#aaa] uppercase tracking-wider mb-2">How it works</p>
          <h2 className="text-[32px] md:text-[36px] font-bold tracking-tight leading-[1.1]">
            Three habits.<br />Real accountability.
          </h2>
        </div>

        <div>
          {[
            {
              step: '01',
              title: 'Check in daily',
              desc: 'Open Kaydence. Answer 4 quick questions about your day. Grade yourself 1–5. Done in under a minute.',
            },
            {
              step: '02',
              title: 'Reflect on Saturdays',
              desc: 'End the sprint with honesty. What actually shipped? Paste the Google Doc link. Close the loop.',
            },
            {
              step: '03',
              title: 'Review the weekly report',
              desc: 'See your week at a glance — trend direction, average score, completed items, unresolved blockers.',
            },
          ].map((s) => (
            <div key={s.step}
              className="flex items-start gap-6 md:gap-12 py-12 border-b border-[#e8e8e8] last:border-0">
              <span
                className="text-[72px] md:text-[96px] font-bold text-[#e8e8e8] leading-none shrink-0 select-none tabular-nums"
                style={{ minWidth: '4rem' }}>
                {s.step}
              </span>
              <div className="pt-1 md:pt-4">
                <h3 className="text-[20px] font-bold text-[#0f0f0f] mb-2 tracking-tight">{s.title}</h3>
                <p className="text-[14px] text-[#737373] leading-relaxed max-w-md">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Dark CTA ── */}
      <section className="max-w-5xl mx-auto px-6 pb-20">
        <div className="relative rounded-2xl bg-[#0f0f0f] px-8 md:px-16 py-16 text-center overflow-hidden grain">
          <h2 className="relative z-10 text-[36px] md:text-[44px] font-bold tracking-tight text-white mb-4 leading-[1.1]">
            Start showing up<br />consistently.
          </h2>
          <p className="relative z-10 text-[15px] text-white/50 mb-10 max-w-xs mx-auto leading-relaxed">
            No dashboards to configure. No integrations. Just open it and check in.
          </p>
          <Link href="/auth"
            className="relative z-10 inline-flex items-center gap-2 px-7 py-3.5 bg-white text-[#0f0f0f] text-[14px] font-bold rounded-full hover:bg-white/90 transition-colors">
            Get started — it's free →
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-[#e8e8e8] py-8">
        <div className="max-w-5xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-[#0f0f0f] flex items-center justify-center">
              <span className="text-white text-[9px] font-bold leading-none">K</span>
            </div>
            <span className="text-[13px] font-semibold text-[#0f0f0f]">Kaydence</span>
          </div>
          <p className="text-[12px] text-[#aaa]">Your execution tracker. Simple and focused.</p>
          <Link href="/auth"
            className="text-[12px] text-[#737373] hover:text-[#0f0f0f] transition-colors font-medium">
            Sign in →
          </Link>
        </div>
      </footer>
    </div>
  );
}
