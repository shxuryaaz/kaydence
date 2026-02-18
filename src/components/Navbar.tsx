'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { signOut } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';

const links = [
  { href: '/dashboard', label: 'Home' },
  { href: '/standup', label: 'Check-in' },
  { href: '/reflection', label: 'Reflection' },
  { href: '/report', label: 'Report' },
  { href: '/team', label: 'Team' },
];

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();

  async function handleSignOut() {
    await signOut();
    router.replace('/auth');
  }

  return (
    <nav className="sticky top-0 z-50 bg-[#f5f5f5]/90 backdrop-blur-md border-b border-[#e8e8e8]">
      <div className="max-w-4xl mx-auto px-5 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-[#0f0f0f] flex items-center justify-center">
            <span className="text-white text-xs font-bold leading-none">K</span>
          </div>
          <span className="font-semibold text-[#0f0f0f] text-[15px] tracking-tight">Kaydence</span>
        </Link>

        {/* Nav links — pill container */}
        <div className="flex items-center bg-white rounded-full border border-[#e8e8e8] px-1 py-1 gap-0.5"
          style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`px-3.5 py-1.5 rounded-full text-[13px] font-medium transition-all duration-150 ${
                pathname === link.href
                  ? 'bg-[#0f0f0f] text-white'
                  : 'text-[#737373] hover:text-[#0f0f0f] hover:bg-[#f5f5f5]'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Sign out */}
        {user && (
          <button
            onClick={handleSignOut}
            className="text-[13px] font-medium text-[#737373] hover:text-[#0f0f0f] transition-colors px-2"
          >
            Sign out
          </button>
        )}
      </div>
    </nav>
  );
}
