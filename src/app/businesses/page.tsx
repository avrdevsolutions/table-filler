'use client';
import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import type { Business, Employee } from '@/types';

export default function BusinessesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const [expandedBizId, setExpandedBizId] = useState<string | null>(null);
  const [bizEmployees, setBizEmployees] = useState<Record<string, Employee[]>>({});
  const [newEmpName, setNewEmpName] = useState('');
  const [newEmpStartDate, setNewEmpStartDate] = useState('');
  const [addingEmp, setAddingEmp] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
  }, [status, router]);

  useEffect(() => {
    if (status !== 'authenticated') return;
    fetch('/api/businesses')
      .then(r => r.json())
      .then(data => { setBusinesses(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [status]);

  async function loadEmployees(bizId: string) {
    const res = await fetch(`/api/employees?businessId=${bizId}&includeInactive=true`);
    const emps = await res.json();
    setBizEmployees(prev => ({ ...prev, [bizId]: emps }));
  }

  function toggleExpand(bizId: string) {
    if (expandedBizId === bizId) {
      setExpandedBizId(null);
    } else {
      setExpandedBizId(bizId);
      setNewEmpName('');
      setNewEmpStartDate('');
      loadEmployees(bizId);
    }
  }

  async function handleCreate() {
    if (!newName.trim()) return;
    setCreating(true);
    const res = await fetch('/api/businesses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim(), locationName: newLocation.trim() || undefined }),
    });
    const biz = await res.json();
    setBusinesses(prev => [...prev, biz]);
    setNewName('');
    setNewLocation('');
    setShowCreate(false);
    setCreating(false);
  }

  async function handleEdit(id: string) {
    if (!editName.trim()) return;
    const res = await fetch(`/api/businesses/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editName.trim(), locationName: editLocation.trim() || undefined }),
    });
    const updated = await res.json();
    setBusinesses(prev => prev.map(b => b.id === id ? updated : b));
    setEditId(null);
  }

  async function handleDelete(id: string) {
    await fetch(`/api/businesses/${id}`, { method: 'DELETE' });
    setBusinesses(prev => prev.filter(b => b.id !== id));
    setDeleteConfirmId(null);
    if (expandedBizId === id) setExpandedBizId(null);
  }

  function handleSelect(biz: Business) {
    try {
      localStorage.setItem('selectedBusiness', JSON.stringify({ id: biz.id, name: biz.name, locationName: biz.locationName }));
    } catch {}
    router.push('/dashboard');
  }

  async function handleAddEmployee(bizId: string) {
    if (!newEmpName.trim()) return;
    setAddingEmp(true);
    const res = await fetch('/api/employees', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fullName: newEmpName.trim(), businessId: bizId, startDate: newEmpStartDate || null }),
    });
    const emp = await res.json();
    setBizEmployees(prev => ({ ...prev, [bizId]: [...(prev[bizId] ?? []), emp] }));
    setNewEmpName('');
    setNewEmpStartDate('');
    setAddingEmp(false);
  }

  async function handleDeactivateEmployee(bizId: string, empId: string) {
    await fetch(`/api/employees/${empId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: false }),
    });
    setBizEmployees(prev => ({
      ...prev,
      [bizId]: (prev[bizId] ?? []).map(e => e.id === empId ? { ...e, active: false } : e),
    }));
  }

  async function handleReactivateEmployee(bizId: string, empId: string) {
    await fetch(`/api/employees/${empId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: true, terminationDate: null }),
    });
    setBizEmployees(prev => ({
      ...prev,
      [bizId]: (prev[bizId] ?? []).map(e => e.id === empId ? { ...e, active: true, terminationDate: null } : e),
    }));
  }

  if (status === 'loading' || loading) {
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
        <div className="max-w-3xl mx-auto px-6 py-0 flex items-center justify-between" style={{ height: 56 }}>
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
          <div className="flex items-center gap-3">
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

      {/* ── Page content ── */}
      <main className="max-w-3xl mx-auto px-6 py-10">

        {/* Page header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="page-title">Firmele tale</h1>
            <p className="page-subtitle">Selectează o firmă pentru a gestiona pontajul lunar.</p>
          </div>
          <button
            onClick={() => setShowCreate(v => !v)}
            className="btn-primary"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Adaugă firmă
          </button>
        </div>

        {/* Create firm form */}
        {showCreate && (
          <div className="card p-6 mb-6" style={{ border: '1.5px solid var(--accent-light)' }}>
            <h3 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Firmă nouă</h3>
            <div className="flex flex-col gap-3">
              <input
                type="text" value={newName} onChange={e => setNewName(e.target.value)}
                placeholder="Numele firmei *"
                className="form-input"
              />
              <input
                type="text" value={newLocation} onChange={e => setNewLocation(e.target.value)}
                placeholder="Locație (ex: Ansamblul Petrila)"
                className="form-input"
              />
              <div className="flex gap-2 mt-1">
                <button onClick={handleCreate} disabled={creating || !newName.trim()} className="btn-primary">
                  {creating ? 'Se salvează…' : 'Salvează firma'}
                </button>
                <button onClick={() => { setShowCreate(false); setNewName(''); setNewLocation(''); }} className="btn-ghost">
                  Anulează
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Empty state */}
        {businesses.length === 0 ? (
          <div className="card p-16 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
              style={{ background: 'var(--surface-2)', border: '1px solid var(--border-subtle)' }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
            </div>
            <p className="font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Nicio firmă adăugată</p>
            <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
              Adaugă prima firmă pentru a începe să gestionezi pontajele.
            </p>
            <button onClick={() => setShowCreate(true)} className="btn-primary">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Adaugă prima firmă
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {businesses.map(biz => (
              <div key={biz.id} className="card overflow-hidden" style={{ transition: 'box-shadow 150ms ease' }}>

                {editId === biz.id ? (
                  /* Edit form */
                  <div className="p-6 flex flex-col gap-3">
                    <p className="text-sm font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>Editează firma</p>
                    <input
                      type="text" value={editName} onChange={e => setEditName(e.target.value)}
                      className="form-input font-medium"
                    />
                    <input
                      type="text" value={editLocation} onChange={e => setEditLocation(e.target.value)}
                      placeholder="Locație"
                      className="form-input"
                    />
                    <div className="flex gap-2">
                      <button onClick={() => handleEdit(biz.id)} disabled={!editName.trim()} className="btn-primary">
                        Salvează
                      </button>
                      <button onClick={() => setEditId(null)} className="btn-ghost">Anulează</button>
                    </div>
                  </div>

                ) : deleteConfirmId === biz.id ? (
                  /* Delete confirmation */
                  <div className="p-6" style={{ background: 'var(--danger-light)' }}>
                    <div className="flex items-start gap-3 mb-4">
                      <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-xl"
                        style={{ background: 'rgba(255,59,48,0.15)' }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
                          <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                        </svg>
                      </div>
                      <div>
                        <p className="font-semibold text-sm" style={{ color: 'var(--danger)' }}>
                          Ștergeți firma <strong>{biz.name}</strong>?
                        </p>
                        <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                          Toți angajații și planificările vor fi șterse ireversibil.
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleDelete(biz.id)} className="btn-danger">
                        Șterge definitiv
                      </button>
                      <button onClick={() => setDeleteConfirmId(null)} className="btn-ghost">Anulează</button>
                    </div>
                  </div>

                ) : (
                  <>
                    {/* Business card main row */}
                    <div className="p-5 flex items-center gap-4">
                      {/* Icon */}
                      <div className="flex-shrink-0 flex items-center justify-center w-12 h-12 rounded-2xl"
                        style={{ background: 'var(--accent-light)' }}>
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
                          <polyline points="9 22 9 12 15 12 15 22"/>
                        </svg>
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-base truncate" style={{ color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
                          {biz.name}
                        </p>
                        {biz.locationName && (
                          <p className="text-sm truncate mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                            {biz.locationName}
                          </p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={() => toggleExpand(biz.id)}
                          className="btn-ghost text-xs px-3 py-2"
                          style={{ minHeight: 36 }}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
                            <path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>
                          </svg>
                          Angajați {expandedBizId === biz.id ? '▲' : '▼'}
                        </button>
                        <button
                          onClick={() => { setEditId(biz.id); setEditName(biz.name); setEditLocation(biz.locationName); }}
                          className="btn-ghost text-xs px-3 py-2"
                          style={{ minHeight: 36, color: 'var(--accent)', borderColor: 'var(--accent-light)' }}
                        >
                          Editează
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(biz.id)}
                          className="btn-ghost text-xs px-3 py-2"
                          style={{ minHeight: 36, color: 'var(--danger)', borderColor: 'rgba(255,59,48,0.2)' }}
                        >
                          Șterge
                        </button>
                        <button onClick={() => handleSelect(biz)} className="btn-primary text-xs px-4 py-2" style={{ minHeight: 36 }}>
                          Deschide →
                        </button>
                      </div>
                    </div>

                    {/* Employees panel */}
                    {expandedBizId === biz.id && (
                      <div style={{ borderTop: '1px solid var(--border-subtle)', background: 'var(--surface-2)' }} className="p-5">
                        <p className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--text-tertiary)' }}>
                          Angajați — {biz.name}
                        </p>

                        {/* Add employee */}
                        <div className="flex gap-2 mb-4 flex-wrap">
                          <input
                            type="text" value={newEmpName} onChange={e => setNewEmpName(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleAddEmployee(biz.id)}
                            placeholder="Nume complet angajat nou"
                            className="form-input flex-1" style={{ minWidth: 180, minHeight: 40, fontSize: '0.875rem', padding: '8px 14px' }}
                          />
                          <input
                            type="date" value={newEmpStartDate} onChange={e => setNewEmpStartDate(e.target.value)}
                            title="Data angajării"
                            className="form-input" style={{ width: 150, minHeight: 40, fontSize: '0.875rem', padding: '8px 14px' }}
                          />
                          <button
                            onClick={() => handleAddEmployee(biz.id)}
                            disabled={addingEmp || !newEmpName.trim()}
                            className="btn-primary text-xs px-4"
                            style={{ minHeight: 40 }}
                          >
                            {addingEmp ? '…' : '+ Adaugă'}
                          </button>
                        </div>

                        {/* Employee list */}
                        {(bizEmployees[biz.id] ?? []).length === 0 ? (
                          <p className="text-sm text-center py-4" style={{ color: 'var(--text-tertiary)' }}>
                            Niciun angajat adăugat.
                          </p>
                        ) : (
                          <div className="flex flex-col gap-1.5">
                            {(bizEmployees[biz.id] ?? []).map(emp => (
                              <div
                                key={emp.id}
                                className="flex items-center justify-between px-4 py-2.5 rounded-xl"
                                style={{
                                  background: emp.active ? 'var(--surface)' : 'transparent',
                                  border: `1px solid ${emp.active ? 'var(--border-subtle)' : 'var(--border-subtle)'}`,
                                  opacity: emp.active ? 1 : 0.55,
                                }}
                              >
                                <div className="flex items-center gap-2.5">
                                  <div className="flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold"
                                    style={{ background: emp.active ? 'var(--accent-light)' : 'var(--border-subtle)', color: emp.active ? 'var(--accent)' : 'var(--text-tertiary)' }}>
                                    {emp.fullName.charAt(0).toUpperCase()}
                                  </div>
                                  <div>
                                    <span className={`text-sm font-medium ${!emp.active ? 'line-through' : ''}`} style={{ color: emp.active ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>
                                      {emp.fullName}
                                    </span>
                                    <div className="flex items-center gap-2 mt-0.5">
                                      {emp.startDate && (
                                        <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>din {emp.startDate}</span>
                                      )}
                                      {emp.terminationDate && (
                                        <span className="badge badge-warning">Demisie</span>
                                      )}
                                      {!emp.active && !emp.terminationDate && (
                                        <span className="badge" style={{ background: 'var(--border-subtle)', color: 'var(--text-tertiary)' }}>Inactiv</span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <div>
                                  {emp.active ? (
                                    <button
                                      onClick={() => handleDeactivateEmployee(biz.id, emp.id)}
                                      className="text-xs font-medium px-3 py-1.5 rounded-lg transition-colors duration-150"
                                      style={{ color: 'var(--danger)', background: 'var(--danger-light)', border: '1px solid rgba(255,59,48,0.15)' }}
                                    >
                                      Dezactivează
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => handleReactivateEmployee(biz.id, emp.id)}
                                      className="text-xs font-medium px-3 py-1.5 rounded-lg transition-colors duration-150"
                                      style={{ color: '#1a7f3c', background: 'var(--success-light)', border: '1px solid rgba(48,209,88,0.2)' }}
                                    >
                                      Reactivează
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

