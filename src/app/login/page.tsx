'use client';
import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const res = await signIn('credentials', { email, password, redirect: false });
    setLoading(false);
    if (res?.ok) router.push('/businesses');
    else setError('Email sau parolă incorectă.');
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ background: 'var(--bg)' }}>
      {/* Logo / App name */}
      <div className="mb-8 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
          style={{ background: 'var(--accent)', boxShadow: '0 8px 24px rgba(0,113,227,0.35)' }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/>
            <line x1="8" y1="2" x2="8" y2="6"/>
            <line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
        </div>
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
          Pontaj Lunar
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          Gestionează programul lunar al echipei tale
        </p>
      </div>

      {/* Card */}
      <div className="card w-full max-w-sm p-8">
        <h2 className="text-xl font-semibold mb-6" style={{ color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
          Autentificare
        </h2>

        {error && (
          <div className="flex items-center gap-2 rounded-xl px-4 py-3 mb-4 text-sm font-medium"
            style={{ background: 'var(--danger-light)', color: 'var(--danger)', border: '1px solid rgba(255,59,48,0.2)' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="form-label">Email</label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              className="form-input" placeholder="adresa@email.com" required
            />
          </div>
          <div>
            <label className="form-label">Parolă</label>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)}
              className="form-input" placeholder="••••••••" required
            />
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full justify-center mt-2">
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M21 12a9 9 0 11-6.219-8.56"/>
                </svg>
                Se încarcă…
              </span>
            ) : 'Intră în cont'}
          </button>
        </form>

        <p className="mt-6 text-sm text-center" style={{ color: 'var(--text-secondary)' }}>
          Nu ai cont?{' '}
          <Link href="/register" className="font-semibold" style={{ color: 'var(--accent)' }}>
            Înregistrează-te
          </Link>
        </p>
      </div>
    </div>
  );
}
