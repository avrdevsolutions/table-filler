'use client';
import { useState, useCallback, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { MONTHS_RO, getDaysInMonth } from '@/lib/schedule';
import type { MonthPlan, Employee } from '@/types';
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
  const [newEmpName, setNewEmpName] = useState('');
  const [addingEmp, setAddingEmp] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
  }, [status, router]);

  useEffect(() => {
    if (status === 'authenticated') {
      fetch('/api/employees').then(r => r.json()).then(setEmployees).catch(console.error);
    }
  }, [status]);

  async function handleLoad() {
    setLoading(true);
    try {
      const res = await fetch('/api/month-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month, year }),
      });
      const p = await res.json();
      const fullRes = await fetch(`/api/month-plans/${p.id}`);
      const full = await fullRes.json();
      setPlan(full);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }

  async function handleAddEmployee() {
    if (!newEmpName.trim() || !plan) return;
    setAddingEmp(true);
    const res = await fetch('/api/employees', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fullName: newEmpName.trim() }),
    });
    const emp = await res.json();
    const newEmployees = [...employees, emp];
    setEmployees(newEmployees);
    const newIds = [...JSON.parse(plan.employeeIds || '[]'), emp.id];
    await fetch(`/api/month-plans/${plan.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ employeeIds: newIds }),
    });
    setPlan(prev => prev ? { ...prev, employeeIds: JSON.stringify(newIds) } : prev);
    setNewEmpName('');
    setAddingEmp(false);
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

  const handleEmployeeRemove = useCallback(async (id: string) => {
    if (!plan) return;
    const newIds = JSON.parse(plan.employeeIds || '[]').filter((eid: string) => eid !== id);
    setPlan(prev => prev ? { ...prev, employeeIds: JSON.stringify(newIds) } : prev);
    await fetch(`/api/month-plans/${plan.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ employeeIds: newIds }),
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
          <h1 className="text-xl font-bold text-gray-800">📅 Pontaj Lunar</h1>
          <div className="flex items-center gap-3 text-sm">
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
            onMonthChange={setMonth} onYearChange={setYear}
            onLoad={handleLoad} loading={loading}
          />
          {plan && (
            <button onClick={handleExport} className="ml-auto bg-purple-600 text-white px-4 py-2 rounded text-sm hover:bg-purple-700">
              📷 Exportă PNG
            </button>
          )}
        </div>

        {plan && (
          <>
            {/* Add employee */}
            <div className="bg-white rounded-lg shadow p-4 mb-4">
              <h2 className="font-semibold mb-3 text-gray-700">Adaugă angajat</h2>
              <div className="flex gap-2">
                <input
                  type="text" value={newEmpName} onChange={e => setNewEmpName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddEmployee()}
                  placeholder="Nume complet angajat"
                  className="border rounded px-3 py-2 text-sm flex-1"
                />
                <button onClick={handleAddEmployee} disabled={addingEmp || !newEmpName.trim()} className="bg-green-600 text-white px-4 py-2 rounded text-sm hover:bg-green-700 disabled:opacity-50">
                  {addingEmp ? '...' : 'Adaugă'}
                </button>
              </div>
            </div>

            {/* Schedule grid */}
            <div className="bg-white rounded-lg shadow p-4">
              <h2 className="font-semibold mb-3 text-gray-700">
                Pontaj {MONTHS_RO[month - 1]} {year}
                <span className="ml-2 text-xs text-gray-400">({getDaysInMonth(year, month)} zile)</span>
              </h2>
              {JSON.parse(plan.employeeIds || '[]').length === 0 ? (
                <p className="text-gray-400 text-sm py-4 text-center">Adaugă angajați pentru a începe.</p>
              ) : (
                <ScheduleGrid
                  plan={plan}
                  employees={employees}
                  onCellsChange={handleCellsChange}
                  onEmployeeUpdate={handleEmployeeUpdate}
                  onEmployeeReorder={handleEmployeeReorder}
                  onEmployeeRemove={handleEmployeeRemove}
                />
              )}
            </div>
          </>
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
