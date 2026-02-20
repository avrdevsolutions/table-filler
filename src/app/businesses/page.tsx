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

  // Employee management state per business
  const [expandedBizId, setExpandedBizId] = useState<string | null>(null);
  const [bizEmployees, setBizEmployees] = useState<Record<string, Employee[]>>({});
  const [newEmpName, setNewEmpName] = useState('');
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
      body: JSON.stringify({ fullName: newEmpName.trim(), businessId: bizId }),
    });
    const emp = await res.json();
    setBizEmployees(prev => ({ ...prev, [bizId]: [...(prev[bizId] ?? []), emp] }));
    setNewEmpName('');
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
    return <div className="min-h-screen flex items-center justify-center">Se încarcă...</div>;
  }
  if (!session) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-800">📅 Pontaj Lunar</h1>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-gray-600">{session.user?.name || session.user?.email}</span>
            <button onClick={() => signOut({ callbackUrl: '/login' })} className="text-red-500 hover:text-red-700">Deconectare</button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Selectează firma</h2>
          <button
            onClick={() => setShowCreate(v => !v)}
            className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700"
          >
            + Adaugă firmă
          </button>
        </div>

        {showCreate && (
          <div className="bg-white rounded-lg shadow p-4 mb-6 border border-blue-200">
            <h3 className="font-semibold mb-3 text-gray-700">Firmă nouă</h3>
            <div className="flex flex-col gap-2">
              <input
                type="text" value={newName} onChange={e => setNewName(e.target.value)}
                placeholder="Numele firmei *"
                className="border rounded px-3 py-2 text-sm"
              />
              <input
                type="text" value={newLocation} onChange={e => setNewLocation(e.target.value)}
                placeholder="Locație (ex: Ansamblul Petrila)"
                className="border rounded px-3 py-2 text-sm"
              />
              <div className="flex gap-2 mt-1">
                <button onClick={handleCreate} disabled={creating || !newName.trim()}
                  className="bg-green-600 text-white px-4 py-2 rounded text-sm hover:bg-green-700 disabled:opacity-50">
                  {creating ? '...' : 'Salvează'}
                </button>
                <button onClick={() => { setShowCreate(false); setNewName(''); setNewLocation(''); }}
                  className="bg-gray-200 text-gray-700 px-4 py-2 rounded text-sm hover:bg-gray-300">
                  Anulează
                </button>
              </div>
            </div>
          </div>
        )}

        {businesses.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-400">
            Nu există firme. Adăugați una pentru a începe.
          </div>
        ) : (
          <div className="grid gap-4">
            {businesses.map(biz => (
              <div key={biz.id} className="bg-white rounded-lg shadow border border-gray-200">
                {editId === biz.id ? (
                  <div className="p-4 flex flex-col gap-2">
                    <input
                      type="text" value={editName} onChange={e => setEditName(e.target.value)}
                      className="border rounded px-3 py-2 text-sm font-medium"
                    />
                    <input
                      type="text" value={editLocation} onChange={e => setEditLocation(e.target.value)}
                      placeholder="Locație"
                      className="border rounded px-3 py-2 text-sm"
                    />
                    <div className="flex gap-2">
                      <button onClick={() => handleEdit(biz.id)} disabled={!editName.trim()}
                        className="bg-green-600 text-white px-3 py-1.5 rounded text-sm hover:bg-green-700 disabled:opacity-50">
                        Salvează
                      </button>
                      <button onClick={() => setEditId(null)}
                        className="bg-gray-200 text-gray-700 px-3 py-1.5 rounded text-sm hover:bg-gray-300">
                        Anulează
                      </button>
                    </div>
                  </div>
                ) : deleteConfirmId === biz.id ? (
                  <div className="p-4">
                    <p className="text-red-600 font-medium mb-2">
                      Ștergeți firma <strong>{biz.name}</strong>? Toți angajații și planificările vor fi șterse ireversibil.
                    </p>
                    <div className="flex gap-2">
                      <button onClick={() => handleDelete(biz.id)}
                        className="bg-red-600 text-white px-3 py-1.5 rounded text-sm hover:bg-red-700">
                        Șterge definitiv
                      </button>
                      <button onClick={() => setDeleteConfirmId(null)}
                        className="bg-gray-200 text-gray-700 px-3 py-1.5 rounded text-sm hover:bg-gray-300">
                        Anulează
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="p-4 flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-gray-800 text-lg">{biz.name}</p>
                        <p className="text-sm text-gray-500">{biz.locationName}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => toggleExpand(biz.id)}
                          className="text-sm text-gray-600 hover:text-gray-800 border border-gray-200 px-3 py-1.5 rounded hover:bg-gray-50">
                          👥 Angajați {expandedBizId === biz.id ? '▲' : '▼'}
                        </button>
                        <button onClick={() => { setEditId(biz.id); setEditName(biz.name); setEditLocation(biz.locationName); }}
                          className="text-sm text-blue-600 hover:text-blue-800 border border-blue-200 px-3 py-1.5 rounded hover:bg-blue-50">
                          Editează
                        </button>
                        <button onClick={() => setDeleteConfirmId(biz.id)}
                          className="text-sm text-red-500 hover:text-red-700 border border-red-200 px-3 py-1.5 rounded hover:bg-red-50">
                          Șterge
                        </button>
                        <button onClick={() => handleSelect(biz)}
                          className="bg-blue-600 text-white px-4 py-1.5 rounded text-sm hover:bg-blue-700 font-medium">
                          Intră →
                        </button>
                      </div>
                    </div>

                    {/* Employee management panel */}
                    {expandedBizId === biz.id && (
                      <div className="border-t border-gray-100 p-4 bg-gray-50">
                        <h4 className="font-medium text-gray-700 mb-3 text-sm">Angajați — {biz.name}</h4>

                        {/* Add employee form */}
                        <div className="flex gap-2 mb-3">
                          <input
                            type="text" value={newEmpName} onChange={e => setNewEmpName(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleAddEmployee(biz.id)}
                            placeholder="Nume complet angajat nou"
                            className="border rounded px-3 py-1.5 text-sm flex-1 bg-white"
                          />
                          <button onClick={() => handleAddEmployee(biz.id)} disabled={addingEmp || !newEmpName.trim()}
                            className="bg-green-600 text-white px-3 py-1.5 rounded text-sm hover:bg-green-700 disabled:opacity-50">
                            {addingEmp ? '...' : '+ Adaugă'}
                          </button>
                        </div>

                        {/* Employee list */}
                        {(bizEmployees[biz.id] ?? []).length === 0 ? (
                          <p className="text-gray-400 text-sm text-center py-2">Nu există angajați.</p>
                        ) : (
                          <div className="space-y-1">
                            {(bizEmployees[biz.id] ?? []).map(emp => (
                              <div key={emp.id} className={`flex items-center justify-between px-3 py-2 rounded text-sm ${emp.active ? 'bg-white border border-gray-200' : 'bg-gray-100 border border-gray-200 opacity-60'}`}>
                                <div>
                                  <span className={emp.active ? 'font-medium text-gray-800' : 'text-gray-500 line-through'}>
                                    {emp.fullName}
                                  </span>
                                  {emp.terminationDate && (
                                    <span className="ml-2 text-xs text-orange-600">Demisie</span>
                                  )}
                                  {!emp.active && !emp.terminationDate && (
                                    <span className="ml-2 text-xs text-gray-400">Inactiv</span>
                                  )}
                                </div>
                                <div className="flex gap-2">
                                  {emp.active ? (
                                    <button onClick={() => handleDeactivateEmployee(biz.id, emp.id)}
                                      className="text-xs text-red-500 hover:text-red-700 border border-red-200 px-2 py-1 rounded hover:bg-red-50">
                                      Dezactivează
                                    </button>
                                  ) : (
                                    <button onClick={() => handleReactivateEmployee(biz.id, emp.id)}
                                      className="text-xs text-green-600 hover:text-green-800 border border-green-200 px-2 py-1 rounded hover:bg-green-50">
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
