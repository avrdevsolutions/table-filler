'use client';
import { useState, useCallback, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { MONTHS_RO, getDaysInMonth } from '@/lib/schedule';
import type { MonthPlan, Employee, Business } from '@/types';
import MonthSelector from '@/components/MonthSelector';
import ScheduleGrid from '@/components/ScheduleGrid';

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [plan, setPlan] = useState<MonthPlan | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
  }, [status, router]);

  useEffect(() => {
    if (status !== 'authenticated') return;
    let biz: Business | null = null;
    try {
      const saved = localStorage.getItem('selectedBusiness');
      if (saved) biz = JSON.parse(saved);
    } catch {}
    if (!biz) { router.push('/businesses'); return; }
    setSelectedBusiness(biz);
    fetch(`/api/employees?businessId=${biz.id}&includeInactive=false`)
      .then(r => r.json())
      .then(setEmployees)
      .catch(() => { alert('Eroare la încărcarea angajaților. Vă rugăm reîncărcați pagina.'); });
  }, [status, router]);

  useEffect(() => {
    if (!selectedBusiness) return;
    setLoading(true);
    setPlan(null);
    fetch('/api/month-plans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ month, year, businessId: selectedBusiness.id }),
    })
      .then(r => r.json())
      .then(p => fetch(`/api/month-plans/${p.id}`))
      .then(r => r.json())
      .then(full => { setPlan(full); setLoading(false); })
      .catch(e => { console.error(e); setLoading(false); });
  }, [month, year, selectedBusiness]);

  const handleCellsChange = useCallback((employeeId: string, updates: Record<number, string>) => {
    if (!plan) return;
    setPlan(prev => {
      if (!prev) return prev;
      const newCells = [...prev.cells];
      for (const [dayStr, value] of Object.entries(updates)) {
        const day = Number(dayStr);
        const idx = newCells.findIndex(c => c.employeeId === employeeId && c.day === day);
        if (idx >= 0) newCells[idx] = { ...newCells[idx], value };
        else newCells.push({ id: `temp-${employeeId}-${day}`, monthPlanId: prev.id, employeeId, day, value });
      }
      return { ...prev, cells: newCells };
    });
    const cells = Object.entries(updates).map(([day, value]) => ({
      monthPlanId: plan.id, employeeId, day: Number(day), value,
    }));
    fetch('/api/cells', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cells }),
    }).catch(console.error);
  }, [plan]);

  const handleEmployeeUpdate = useCallback(async (id: string, data: Partial<Employee>) => {
    setEmployees(prev => prev.map(e => e.id === id ? { ...e, ...data } : e));
    await fetch(`/api/employees/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  }, []);

  const handleEmployeeReorder = useCallback(async (ids: string[]) => {
    if (!plan) return;
    setPlan(prev => prev ? { ...prev, employeeIds: JSON.stringify(ids) } : prev);
    await fetch(`/api/month-plans/${plan.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ employeeIds: ids }),
    });
  }, [plan]);

  async function handleExport() {
    if (!plan) return;
    window.open(`/export/${plan.id}`, '_blank');
  }

  const visibleEmployees = plan ? employees.filter(emp => {
    const effectiveStart = new Date(emp.startDate || emp.createdAt);
    if (!isNaN(effectiveStart.getTime())) {
      const startYear = effectiveStart.getFullYear();
      const startMonth = effectiveStart.getMonth() + 1;
      if (startYear > plan.year || (startYear === plan.year && startMonth > plan.month)) return false;
    }
    if (emp.terminationDate) {
      const term = new Date(emp.terminationDate);
      if (!isNaN(term.getTime())) {
        const termYear = term.getFullYear();
        const termMonth = term.getMonth() + 1;
        if (termYear < plan.year || (termYear === plan.year && termMonth < plan.month)) return false;
      }
    }
    return true;
  }) : employees;

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div className="flex flex-col items-center gap-3">
          <svg className="animate-spin" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.5">
            <path d="M21 12a9 9 0 11-6.219-8.56"/>
          </svg>
          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Se încarcă…</span>
        </div>
      </div>
    );
  }
  if (!session) return null;

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      {/* ── Navigation Bar ── */}
      <nav style={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(20px)', borderBottom: '1px solid var(--border-subtle)', position: 'sticky', top: 0, zIndex: 40 }}>
        <div className="max-w-screen-2xl mx-auto px-6 flex items-center justify-between" style={{ height: 56 }}>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2.5">
              <div className="flex items-center justify-center w-7 h-7 rounded-lg" style={{ background: 'var(--accent)' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/>
                  <line x1="8" y1="2" x2="8" y2="6"/>
                  <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
              </div>
              <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
                Pontaj Lunar
              </span>
            </div>
            {selectedBusiness && (
              <>
                <span style={{ color: 'var(--border)' }}>›</span>
                <span className="badge badge-accent">{selectedBusiness.name}</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/businesses')}
              className="text-sm font-medium px-3 py-1.5 rounded-lg transition-colors duration-150"
              style={{ color: 'var(--accent)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--accent-light)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              ← Firmele mele
            </button>
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {session.user?.name || session.user?.email}
            </span>
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="text-sm font-medium px-3 py-1.5 rounded-lg transition-colors duration-150"
              style={{ color: 'var(--danger)', background: 'transparent' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--danger-light)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              Deconectare
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-screen-2xl mx-auto px-6 py-8">
        {/* Page header + controls */}
        <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
          <div>
            <h1 className="page-title">
              Pontaj {MONTHS_RO[month - 1]} {year}
            </h1>
            <p className="page-subtitle">
              {selectedBusiness?.name}
              {plan && !loading && (
                <span className="ml-2" style={{ color: 'var(--text-tertiary)' }}>
                  · {getDaysInMonth(year, month)} zile
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <MonthSelector month={month} year={year} onMonthChange={setMonth} onYearChange={setYear} />
            {plan && !loading && (
              <button onClick={handleExport} className="btn-secondary">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                Exportă PNG
              </button>
            )}
          </div>
        </div>

        {/* Loading state */}
        {loading && (
          <div className="card p-16 flex flex-col items-center gap-3">
            <svg className="animate-spin" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.5">
              <path d="M21 12a9 9 0 11-6.219-8.56"/>
            </svg>
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Se încarcă pontajul…</span>
          </div>
        )}

        {/* Schedule grid */}
        {plan && !loading && (
          <>
            {visibleEmployees.length === 0 ? (
              <div className="card p-16 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
                  style={{ background: 'var(--surface-2)', border: '1px solid var(--border-subtle)' }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
                    <path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>
                  </svg>
                </div>
                <p className="font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
                  Niciun angajat activ
                </p>
                <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
                  Nu există angajați activi pentru această perioadă.
                </p>
                <button onClick={() => router.push('/businesses')} className="btn-primary">
                  Gestionează angajații
                </button>
              </div>
            ) : (
              <div className="card p-0 overflow-hidden">
                <ScheduleGrid
                  plan={plan}
                  employees={visibleEmployees}
                  onCellsChange={handleCellsChange}
                  onEmployeeUpdate={handleEmployeeUpdate}
                  onEmployeeReorder={handleEmployeeReorder}
                />
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

