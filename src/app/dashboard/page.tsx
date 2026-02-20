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

    // Load selected business from localStorage
    let biz: Business | null = null;
    try {
      const saved = localStorage.getItem('selectedBusiness');
      if (saved) biz = JSON.parse(saved);
    } catch {}
    if (!biz) { router.push('/businesses'); return; }
    setSelectedBusiness(biz);

    // Load employees for this business
    fetch(`/api/employees?businessId=${biz.id}`).then(r => r.json()).then(setEmployees).catch(() => {
      alert('Eroare la încărcarea angajaților. Vă rugăm reîncărcați pagina.');
    });

    // Auto-restore last opened plan
    try {
      const saved = localStorage.getItem(`lastPlan_${biz.id}`);
      if (saved) {
        const { planId, month: m, year: y } = JSON.parse(saved);
        setMonth(m);
        setYear(y);
        setLoading(true);
        fetch(`/api/month-plans/${planId}`)
          .then(r => { if (!r.ok) throw new Error('not found'); return r.json(); })
          .then(full => { setPlan(full); setLoading(false); })
          .catch(() => { localStorage.removeItem(`lastPlan_${biz?.id}`); setLoading(false); });
      }
    } catch {
      // localStorage unavailable or corrupted — ignore
    }
  }, [status, router]);

  async function handleLoad() {
    if (!selectedBusiness) return;
    setLoading(true);
    try {
      const res = await fetch('/api/month-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month, year, businessId: selectedBusiness.id }),
      });
      const p = await res.json();
      const fullRes = await fetch(`/api/month-plans/${p.id}`);
      const full = await fullRes.json();
      setPlan(full);
      // Sync employees list from the loaded plan (plan may include employees added since last load)
      const planEmpIds: string[] = JSON.parse(full.employeeIds || '[]');
      setEmployees(prev => {
        const existing = new Set(prev.map(e => e.id));
        const missing = planEmpIds.filter(id => !existing.has(id));
        if (missing.length === 0) return prev;
        // Refetch full list to ensure we have all employees in plan
        fetch(`/api/employees?businessId=${selectedBusiness.id}`).then(r => r.json()).then(setEmployees).catch(console.error);
        return prev;
      });
      try { localStorage.setItem(`lastPlan_${selectedBusiness.id}`, JSON.stringify({ planId: full.id, month, year })); } catch {}
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }

  const handleCellsChange = useCallback((employeeId: string, updates: Record<number, string>) => {
    if (!plan) return;
    // Optimistic update
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
    // Persist
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
    // Optimistic
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
    const url = `/export/${plan.id}`;
    window.open(url, '_blank');
  }

  if (status === 'loading') return <div className="min-h-screen flex items-center justify-center">Se încarcă...</div>;
  if (!session) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-screen-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-gray-800">📅 Pontaj Lunar</h1>
            {selectedBusiness && (
              <span className="text-sm bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-medium">
                {selectedBusiness.name}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 text-sm">
            <button onClick={() => router.push('/businesses')} className="text-blue-600 hover:text-blue-800 border border-blue-200 px-3 py-1.5 rounded hover:bg-blue-50">
              Schimbă firma
            </button>
            <span className="text-gray-600">{session.user?.name || session.user?.email}</span>
            <button onClick={() => signOut({ callbackUrl: '/login' })} className="text-red-500 hover:text-red-700">Deconectare</button>
          </div>
        </div>
      </header>

      <main className="max-w-screen-2xl mx-auto px-4 py-6">
        {/* Month selector */}
        <div className="bg-white rounded-lg shadow p-4 mb-4 flex items-center gap-4 flex-wrap">
          <MonthSelector
            month={month} year={year}
            onMonthChange={(m) => { setMonth(m); setPlan(null); }}
            onYearChange={(y) => { setYear(y); setPlan(null); }}
            onLoad={handleLoad} loading={loading}
          />
          {plan && (
            <button onClick={handleExport} className="ml-auto bg-purple-600 text-white px-4 py-2 rounded text-sm hover:bg-purple-700">
              📷 Exportă PNG
            </button>
          )}
        </div>

        {plan && (
          <div className="bg-white rounded-lg shadow p-4">
            <h2 className="font-semibold mb-3 text-gray-700">
              Pontaj {MONTHS_RO[month - 1]} {year}
              <span className="ml-2 text-xs text-gray-400">({getDaysInMonth(year, month)} zile)</span>
            </h2>
            {JSON.parse(plan.employeeIds || '[]').length === 0 ? (
              <p className="text-gray-400 text-sm py-4 text-center">
                Nu există angajați activi pentru această firmă. Adăugați angajați din pagina firmei.
              </p>
            ) : (
              <ScheduleGrid
                plan={plan}
                employees={employees}
                onCellsChange={handleCellsChange}
                onEmployeeUpdate={handleEmployeeUpdate}
                onEmployeeReorder={handleEmployeeReorder}
              />
            )}
          </div>
        )}

        {!plan && !loading && (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-400">
            Selectați luna și apăsați &quot;Încarcă / Creează&quot; pentru a începe.
          </div>
        )}
      </main>
    </div>
  );
}
