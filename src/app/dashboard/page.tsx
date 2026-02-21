'use client';
import { useState, useCallback, useEffect, useRef } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { MONTHS_RO, getDaysInMonth } from '@/lib/schedule';
import type { MonthPlan, Employee, Business } from '@/types';
import MonthSelector from '@/components/MonthSelector';
import ScheduleGrid from '@/components/ScheduleGrid';
import DatePickerModal from '@/components/DatePickerModal';

/* ── Quick-add employee modal ─────────────────────────────── */
function QuickAddEmployeeModal({
  businessId,
  onClose,
  onAdded,
}: {
  businessId: string;
  onClose: () => void;
  onAdded: (emp: Employee) => void;
}) {
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [nameError, setNameError] = useState('');
  const [dateError, setDateError] = useState('');
  const [adding, setAdding] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  function fmtDate(d: string) {
    const p = d.split('-');
    return p.length === 3 ? `${p[2]}.${p[1]}.${p[0]}` : d;
  }

  async function handleAdd() {
    let valid = true;
    if (!name.trim()) { setNameError('Numele este obligatoriu.'); valid = false; }
    if (!startDate) { setDateError('Data de început este obligatorie.'); valid = false; }
    if (!valid) return;
    setAdding(true);
    try {
      const res = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName: name.trim(), businessId, startDate }),
      });
      if (!res.ok) {
        setNameError('Eroare la adăugarea angajatului. Încearcă din nou.');
        setAdding(false);
        return;
      }
      const emp = await res.json();
      setAdding(false);
      onAdded(emp);
    } catch {
      setNameError('Eroare la adăugarea angajatului. Încearcă din nou.');
      setAdding(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 pb-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <h3 className="font-semibold text-base" style={{ color: 'var(--text-primary)' }}>Adaugă angajat</h3>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-8 h-8 rounded-full transition-colors duration-150"
            style={{ color: 'var(--text-tertiary)', background: 'var(--surface-2)' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--border)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'var(--surface-2)')}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <div className="p-6 flex flex-col gap-4">
          <div>
            <label className="form-label">Nume și prenume <span style={{ color: 'var(--danger)' }}>*</span></label>
            <input
              type="text" value={name}
              onChange={e => { setName(e.target.value); if (nameError) setNameError(''); }}
              placeholder="ex: Ion Popescu"
              className="form-input"
              style={nameError ? { borderColor: 'var(--danger)', boxShadow: 'none' } : {}}
            />
            {nameError && <p className="field-error">{nameError}</p>}
          </div>
          <div>
            <label className="form-label">Data început <span style={{ color: 'var(--danger)' }}>*</span></label>
            <button
              onClick={() => setShowDatePicker(true)}
              className="form-input flex items-center justify-between"
              style={{ cursor: 'pointer', textAlign: 'left', ...(dateError ? { borderColor: 'var(--danger)', boxShadow: 'none' } : {}) }}
            >
              <span style={{ color: startDate ? 'var(--text-primary)' : 'var(--text-secondary)', opacity: startDate ? 1 : 0.65 }}>
                {startDate ? fmtDate(startDate) : 'Selectează data angajării'}
              </span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, color: 'var(--text-tertiary)' }}>
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
            </button>
            {dateError && <p className="field-error">{dateError}</p>}
            {showDatePicker && (
              <DatePickerModal
                value={startDate}
                onSelect={date => { setStartDate(date); setDateError(''); }}
                onClose={() => setShowDatePicker(false)}
              />
            )}
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={handleAdd} disabled={adding} className="btn-primary flex-1 justify-center">
              {adding ? 'Se adaugă…' : 'Adaugă'}
            </button>
            <button onClick={onClose} className="btn-ghost">Anulează</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [plan, setPlan] = useState<MonthPlan | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [showBizPicker, setShowBizPicker] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const bizPickerRef = useRef<HTMLDivElement>(null);

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
  }, [status, router]);

  useEffect(() => {
    if (status !== 'authenticated') return;
    fetch('/api/businesses')
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setBusinesses(data); })
      .catch(() => {});
  }, [status]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (bizPickerRef.current && !bizPickerRef.current.contains(e.target as Node)) {
        setShowBizPicker(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!selectedBusiness) return;
    setLoading(true);
    setPlan(null);
    setEmployees([]);
    const bizId = selectedBusiness.id;
    Promise.all([
      fetch('/api/month-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month, year, businessId: bizId }),
      })
        .then(r => r.json())
        .then(p => fetch(`/api/month-plans/${p.id}`))
        .then(r => r.json()),
      fetch(`/api/employees?businessId=${bizId}&includeInactive=false`)
        .then(r => r.json()),
    ])
      .then(([planData, employeesData]) => {
        setPlan(planData);
        setEmployees(Array.isArray(employeesData) ? employeesData : []);
        setLoading(false);
      })
      .catch(e => { console.error(e); setLoading(false); });
  }, [month, year, selectedBusiness]);

  function selectBusiness(biz: Business) {
    try {
      localStorage.setItem('selectedBusiness', JSON.stringify({ id: biz.id, name: biz.name, locationName: biz.locationName }));
    } catch {}
    setSelectedBusiness(biz);
    setShowBizPicker(false);
  }

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

  async function handleExport() {
    if (!plan) return;
    setExporting(true);
    try {
      // Pure canvas-based export — no html2canvas, no DOM capture
      const { buildSchedulePNG } = await import('@/lib/exportCanvas');
      const dataUrl = buildSchedulePNG(
        plan,
        visibleEmployees,
        selectedBusiness?.name,
        selectedBusiness?.locationName,
      );
      if (!dataUrl) throw new Error('Canvas context unavailable');
      const link = document.createElement('a');
      const monthName = MONTHS_RO[month - 1].toLowerCase();
      link.download = `pontaj-${monthName}-${year}.png`;
      link.href = dataUrl;
      link.click();
    } catch (e) {
      console.error(e);
      alert('Eroare la export');
    }
    setExporting(false);
  }

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
      {/* Toast */}
      {toast && (
        <div className="toast toast-success" onClick={() => setToast(null)} style={{ cursor: 'pointer' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline', marginRight: 6 }}>
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          {toast}
        </div>
      )}

      {/* Quick-add employee modal */}
      {showQuickAdd && selectedBusiness && (
        <QuickAddEmployeeModal
          businessId={selectedBusiness.id}
          onClose={() => setShowQuickAdd(false)}
          onAdded={emp => {
            setEmployees(prev => [...prev, emp]);
            setShowQuickAdd(false);
            setToast(`${emp.fullName} a fost adăugat cu succes.`);
            setTimeout(() => setToast(null), 2800);
            // Also update the plan's employeeIds to include the new employee
            if (plan) {
              const ids: string[] = JSON.parse(plan.employeeIds || '[]');
              if (!ids.includes(emp.id)) {
                const newIds = [...ids, emp.id];
                handleEmployeeReorder(newIds);
              }
            }
          }}
        />
      )}

      {/* ── Navigation Bar ── */}
      <nav style={{ background: 'var(--nav-bg)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 40 }}>
        <div className="max-w-screen-2xl mx-auto flex items-center justify-between flex-wrap gap-2" style={{ minHeight: 52, paddingLeft: 16, paddingRight: 16, paddingTop: 6, paddingBottom: 6 }}>
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex items-center justify-center w-7 h-7 rounded-lg flex-shrink-0" style={{ background: 'var(--accent)' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
            </div>
            <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)', letterSpacing: '-0.01em', flexShrink: 0 }}>
              Pontaj Lunar
            </span>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap justify-end">
            {/* Business switcher dropdown */}
            <div style={{ position: 'relative' }} ref={bizPickerRef}>
              <button
                onClick={() => setShowBizPicker(v => !v)}
                className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg transition-colors duration-150"
                style={{
                  color: 'var(--text-primary)',
                  whiteSpace: 'nowrap',
                  border: '1px solid var(--border)',
                  background: showBizPicker ? 'var(--surface-2)' : 'var(--surface)',
                }}
                title="Schimbă firma"
              >
                <span className="truncate" style={{ maxWidth: 140 }}>
                  {selectedBusiness?.name ?? 'Selectează firma'}
                </span>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                  style={{ flexShrink: 0, opacity: 0.5, transform: showBizPicker ? 'rotate(180deg)' : 'none', transition: 'transform 150ms' }}>
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </button>
              {showBizPicker && (
                <div style={{
                  position: 'absolute',
                  top: 'calc(100% + 6px)',
                  right: 0,
                  background: 'var(--surface-elevated)',
                  border: '1px solid var(--border)',
                  borderRadius: 12,
                  boxShadow: '0 8px 32px rgba(0,0,0,0.55)',
                  minWidth: 220,
                  zIndex: 200,
                  overflow: 'hidden',
                }}>
                  {businesses.map(biz => (
                    <button
                      key={biz.id}
                      onClick={() => selectBusiness(biz)}
                      className="flex items-center justify-between w-full transition-colors duration-100"
                      style={{
                        padding: '10px 16px',
                        background: biz.id === selectedBusiness?.id ? 'var(--accent-light)' : 'transparent',
                        color: biz.id === selectedBusiness?.id ? 'var(--accent)' : 'var(--text-primary)',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '0.875rem',
                        fontWeight: 500,
                        textAlign: 'left',
                      }}
                      onMouseEnter={e => { if (biz.id !== selectedBusiness?.id) e.currentTarget.style.background = 'var(--surface-2)'; }}
                      onMouseLeave={e => { if (biz.id !== selectedBusiness?.id) e.currentTarget.style.background = 'transparent'; }}
                    >
                      <span className="truncate" style={{ maxWidth: 160 }}>{biz.name}</span>
                      {biz.id === selectedBusiness?.id && (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                      )}
                    </button>
                  ))}
                  <div style={{ height: 1, background: 'var(--border-subtle)' }} />
                  <button
                    onClick={() => { router.push('/businesses'); setShowBizPicker(false); }}
                    className="flex items-center gap-2 w-full transition-colors duration-100"
                    style={{
                      padding: '10px 16px',
                      background: 'transparent',
                      color: 'var(--text-secondary)',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '0.8125rem',
                      textAlign: 'left',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                    </svg>
                    Adaugă firmă
                  </button>
                </div>
              )}
            </div>
            {/* Gestionează angajați */}
            {selectedBusiness && (
              <button
                onClick={() => setShowQuickAdd(true)}
                className="flex items-center gap-1.5 text-sm font-medium rounded-xl transition-colors duration-150"
                style={{ padding: '0 12px', height: 44, background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-secondary)', cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-2)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'var(--surface)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
                  <line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/>
                </svg>
                Gestionează angajați
              </button>
            )}
            {/* Back to businesses */}
            <button
              onClick={() => router.push('/businesses')}
              className="flex items-center gap-1.5 text-sm font-medium rounded-xl transition-colors duration-150"
              style={{ padding: '0 12px', height: 44, background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-secondary)', cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-2)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'var(--surface)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <polyline points="15 18 9 12 15 6"/>
              </svg>
              Înapoi la firme
            </button>
            {/* Logout */}
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="btn-icon-logout"
              title="Ieșire din cont"
              aria-label="Ieșire din cont"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-screen-2xl mx-auto py-6" style={{ paddingLeft: 16, paddingRight: 16 }}>
        {/* Page header + controls */}
        <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
          <div className="min-w-0">
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
              <button
                onClick={handleExport}
                disabled={exporting}
                className="flex items-center gap-2 text-sm font-semibold rounded-xl transition-colors duration-150"
                style={{
                  padding: '8px 16px',
                  minHeight: 40,
                  background: 'var(--surface)',
                  border: '1.5px solid var(--border)',
                  color: 'var(--text-primary)',
                  cursor: exporting ? 'not-allowed' : 'pointer',
                  opacity: exporting ? 0.6 : 1,
                  whiteSpace: 'nowrap',
                }}
                onMouseEnter={e => { if (!exporting) e.currentTarget.style.background = 'var(--surface-2)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'var(--surface)'; }}
              >
                {exporting ? (
                  <svg className="animate-spin" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M21 12a9 9 0 11-6.219-8.56"/>
                  </svg>
                ) : (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                )}
                {exporting ? 'Se generează…' : 'Descarcă'}
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
                  style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
                    <path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>
                  </svg>
                </div>
                <p className="font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
                  Nu există date pentru luna selectată.
                </p>
                <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
                  Adaugă angajați sau completează pontajul.
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

