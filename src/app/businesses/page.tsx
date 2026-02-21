'use client';
import { useState, useEffect, useRef } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { formatDateRO } from '@/lib/schedule';
import { parseLocalDate } from '@/lib/validation';
import DatePickerModal from '@/components/DatePickerModal';
import type { Business, Employee } from '@/types';

/** Safe date display without timezone shift: 'YYYY-MM-DD' → 'DD.MM.YYYY' */
function fmtDate(dateStr: string): string {
  if (!dateStr) return '';
  const p = dateStr.split('-');
  return p.length === 3 ? `${p[2]}.${p[1]}.${p[0]}` : dateStr;
}

/* ── Toast ─────────────────────────────────────────── */
function Toast({ message, type, onDone }: { message: string; type: 'success' | 'danger'; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2800);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div className={`toast toast-${type}`}>
      {type === 'success' ? (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline', marginRight: 6 }}>
          <polyline points="20 6 9 17 4 12"/>
        </svg>
      ) : (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline', marginRight: 6 }}>
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
      )}
      {message}
    </div>
  );
}

/* ── Overflow "..." menu ───────────────────────────── */
function OverflowMenu({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        btnRef.current && !btnRef.current.contains(e.target as Node) &&
        menuRef.current && !menuRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleToggle(e: React.MouseEvent) {
    e.stopPropagation();
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setMenuPos({
        top: rect.bottom + 6,
        right: window.innerWidth - rect.right,
      });
    }
    setOpen(v => !v);
  }

  return (
    <>
      <button
        ref={btnRef}
        onClick={handleToggle}
        className="flex items-center justify-center rounded-xl transition-colors duration-150"
        style={{ width: 36, height: 36, background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
        aria-label="Opțiuni"
        onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/>
        </svg>
      </button>
      {open && menuPos && (
        <div
          ref={menuRef}
          className="rounded-xl overflow-hidden"
          style={{
            position: 'fixed',
            top: menuPos.top,
            right: menuPos.right,
            zIndex: 9000,
            background: 'var(--surface-elevated)',
            border: '1px solid var(--border)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            minWidth: 140,
          }}
        >
          <button
            onClick={e => { e.stopPropagation(); setOpen(false); onEdit(); }}
            className="flex items-center gap-2 w-full px-4 py-3 text-sm font-medium transition-colors duration-100"
            style={{ color: 'var(--text-primary)', background: 'transparent' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
            Editează
          </button>
          <div style={{ height: 1, background: 'var(--border-subtle)' }} />
          <button
            onClick={e => { e.stopPropagation(); setOpen(false); onDelete(); }}
            className="flex items-center gap-2 w-full px-4 py-3 text-sm font-medium transition-colors duration-100"
            style={{ color: 'var(--danger)', background: 'transparent' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--danger-light)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
              <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
            </svg>
            Șterge
          </button>
        </div>
      )}
    </>
  );
}

/* ── Employee Details Modal ────────────────────────── */
function EmployeeDetailsModal({
  employee,
  bizId,
  onClose,
  onSetDemisie,
  onRemoveDemisie,
  onEmployeeUpdate,
}: {
  employee: Employee;
  bizId: string;
  onClose: () => void;
  onSetDemisie: (bizId: string, empId: string, date: string) => Promise<void>;
  onRemoveDemisie: (bizId: string, empId: string) => Promise<void>;
  onEmployeeUpdate: (bizId: string, emp: Employee) => void;
}) {
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [demisieDate, setDemisieDate] = useState('');
  const [dateError, setDateError] = useState('');
  const [saving, setSaving] = useState(false);

  // Edit mode
  const [editMode, setEditMode] = useState(false);
  const [editName, setEditName] = useState(employee.fullName);
  const [editStartDate, setEditStartDate] = useState(employee.startDate ?? '');
  const [editNameError, setEditNameError] = useState('');
  const [showEditDatePicker, setShowEditDatePicker] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);

  const isActive = employee.active && !employee.terminationDate;

  async function handleSaveEdit() {
    if (!editName.trim()) { setEditNameError('Numele este obligatoriu.'); return; }
    setSavingEdit(true);
    try {
      const res = await fetch(`/api/employees/${employee.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName: editName.trim(), startDate: editStartDate || null }),
      });
      if (res.ok) {
        const updated = await res.json();
        onEmployeeUpdate(bizId, updated);
        setEditMode(false);
      } else {
        setEditNameError('Eroare la salvare. Încearcă din nou.');
      }
    } catch {
      setEditNameError('Eroare la salvare. Încearcă din nou.');
    }
    setSavingEdit(false);
  }

  async function handleSaveDemisie() {
    if (!demisieDate) { setDateError('Data demisiei este obligatorie.'); return; }
    if (employee.startDate) {
      const start = parseLocalDate(employee.startDate);
      const term = parseLocalDate(demisieDate);
      if (term < start) {
        setDateError(`Data demisiei nu poate fi înainte de data angajării (${fmtDate(employee.startDate)}).`);
        return;
      }
    }
    setSaving(true);
    await onSetDemisie(bizId, employee.id, demisieDate);
    setSaving(false);
    setShowDatePicker(false);
    setDemisieDate('');
    onClose();
  }

  async function handleRemoveDemisie() {
    setSaving(true);
    await onRemoveDemisie(bizId, employee.id);
    setSaving(false);
    onClose();
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-start justify-between p-6 pb-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-12 h-12 rounded-full text-lg font-bold flex-shrink-0"
              style={{ background: isActive ? 'var(--accent-light)' : 'var(--surface-2)', color: isActive ? 'var(--accent)' : 'var(--text-tertiary)' }}>
              {employee.fullName.charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 className="font-semibold text-base" style={{ color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
                {employee.fullName}
              </h3>
              <div className="mt-1">
                {isActive ? (
                  <span className="badge badge-success">Activ</span>
                ) : (
                  <span className="badge badge-danger">Demisie</span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-8 h-8 rounded-full flex-shrink-0 transition-colors duration-150"
            style={{ color: 'var(--text-tertiary)', background: 'var(--surface-2)' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--border)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'var(--surface-2)')}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Info section */}
        {!editMode && (
          <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
                Informații
              </p>
              <button
                onClick={() => { setEditMode(true); setEditName(employee.fullName); setEditStartDate(employee.startDate ?? ''); setEditNameError(''); }}
                className="flex items-center gap-1.5 text-xs font-medium rounded-lg transition-colors duration-150"
                style={{ padding: '4px 10px', background: 'var(--surface-2)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)', cursor: 'pointer' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--border)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'var(--surface-2)')}
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
                Editează
              </button>
            </div>
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Data început</span>
                <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  {employee.startDate ? fmtDate(employee.startDate) : '—'}
                </span>
              </div>
              {employee.terminationDate && (
                <div className="flex items-center justify-between">
                  <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Demisie</span>
                  <span className="text-sm font-medium" style={{ color: 'var(--danger)' }}>
                    {fmtDate(employee.terminationDate)}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Edit mode */}
        {editMode && (
          <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
            <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-tertiary)' }}>
              Editează angajat
            </p>
            <div className="flex flex-col gap-3">
              <div>
                <label className="form-label">Nume și prenume <span style={{ color: 'var(--danger)' }}>*</span></label>
                <input
                  type="text" value={editName}
                  onChange={e => { setEditName(e.target.value); if (editNameError) setEditNameError(''); }}
                  className="form-input"
                  style={editNameError ? { borderColor: 'var(--danger)' } : {}}
                />
                {editNameError && <p className="field-error">{editNameError}</p>}
              </div>
              <div>
                <label className="form-label">Data angajării</label>
                <button
                  onClick={() => setShowEditDatePicker(true)}
                  className="form-input flex items-center justify-between"
                  style={{ cursor: 'pointer', textAlign: 'left' }}
                >
                  <span style={{ color: editStartDate ? 'var(--text-primary)' : 'var(--text-secondary)', opacity: editStartDate ? 1 : 0.65 }}>
                    {editStartDate ? fmtDate(editStartDate) : 'Selectează data angajării'}
                  </span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, color: 'var(--text-tertiary)' }}>
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                    <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
                    <line x1="3" y1="10" x2="21" y2="10"/>
                  </svg>
                </button>
                {showEditDatePicker && (
                  <DatePickerModal
                    value={editStartDate}
                    onSelect={date => { setEditStartDate(date); setShowEditDatePicker(false); }}
                    onClose={() => setShowEditDatePicker(false)}
                  />
                )}
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                <button onClick={handleSaveEdit} disabled={savingEdit} className="btn-primary flex-1 justify-center" style={{ minHeight: 44 }}>
                  {savingEdit ? 'Se salvează…' : 'Salvează'}
                </button>
                <button onClick={() => setEditMode(false)} className="btn-ghost" style={{ minHeight: 44 }}>
                  Anulează
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Demisie action */}
        <div className="px-6 py-4">
          <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-tertiary)' }}>
            Acțiuni
          </p>

          {!showDatePicker ? (
            <div className="flex flex-wrap gap-2">
              {isActive && (
                <button
                  onClick={() => setShowDatePicker(true)}
                  className="btn-danger flex-1 justify-center"
                  style={{ minHeight: 44 }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                    <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
                    <line x1="3" y1="10" x2="21" y2="10"/>
                  </svg>
                  Setează demisia
                </button>
              )}
              {employee.terminationDate && (
                <button
                  onClick={handleRemoveDemisie}
                  disabled={saving}
                  className="btn-ghost flex-1 justify-center"
                  style={{ color: 'var(--success)', minHeight: 44 }}
                >
                  {saving ? 'Se salvează…' : 'Șterge demisia'}
                </button>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <div>
                <label className="form-label">
                  Data demisiei <span style={{ color: 'var(--danger)' }}>*</span>
                </label>
                <button
                  onClick={() => setShowCalendar(true)}
                  className="form-input flex items-center justify-between"
                  style={{
                    cursor: 'pointer',
                    textAlign: 'left',
                    ...(dateError ? { borderColor: 'var(--danger)', boxShadow: 'none' } : {}),
                  }}
                >
                  <span style={{ color: demisieDate ? 'var(--text-primary)' : 'var(--text-secondary)', opacity: demisieDate ? 1 : 0.65 }}>
                    {demisieDate ? fmtDate(demisieDate) : 'Selectează data demisiei'}
                  </span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, color: 'var(--text-tertiary)' }}>
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                    <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
                    <line x1="3" y1="10" x2="21" y2="10"/>
                  </svg>
                </button>
                {dateError && (
                  <p className="field-error">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                    {dateError}
                  </p>
                )}
                {showCalendar && (
                  <DatePickerModal
                    value={demisieDate}
                    minDate={employee.startDate ?? undefined}
                    onSelect={date => { setDemisieDate(date); setDateError(''); }}
                    onClose={() => setShowCalendar(false)}
                  />
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleSaveDemisie}
                  disabled={saving}
                  className="btn-danger flex-1 justify-center"
                >
                  {saving ? 'Se salvează…' : 'Confirmă demisia'}
                </button>
                <button onClick={() => { setShowDatePicker(false); setDemisieDate(''); setDateError(''); }} className="btn-ghost">
                  Anulează
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Business Form Modal ───────────────────────────── */
function BusinessFormModal({
  title,
  initialName,
  initialLocation,
  saving,
  onSave,
  onClose,
}: {
  title: string;
  initialName: string;
  initialLocation: string;
  saving: boolean;
  onSave: (name: string, location: string) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(initialName);
  const [location, setLocation] = useState(initialLocation);
  const [nameError, setNameError] = useState('');
  const [locationError, setLocationError] = useState('');

  function handleSave() {
    let valid = true;
    if (!name.trim()) { setNameError('Numele firmei este obligatoriu.'); valid = false; }
    if (!location.trim()) { setLocationError('Locația este obligatorie.'); valid = false; }
    if (!valid) return;
    onSave(name.trim(), location.trim());
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 pb-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <h3 className="font-semibold text-base" style={{ color: 'var(--text-primary)' }}>{title}</h3>
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
            <label className="form-label">Numele firmei <span style={{ color: 'var(--danger)' }}>*</span></label>
            <input
              type="text" value={name}
              onChange={e => { setName(e.target.value); if (nameError) setNameError(''); }}
              className="form-input"
              placeholder="ex: SC Exemplu SRL"
              style={nameError ? { borderColor: 'var(--danger)' } : {}}
            />
            {nameError && (
              <p className="field-error">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                {nameError}
              </p>
            )}
          </div>
          <div>
            <label className="form-label">Locație <span style={{ color: 'var(--danger)' }}>*</span></label>
            <input
              type="text" value={location}
              onChange={e => { setLocation(e.target.value); if (locationError) setLocationError(''); }}
              className="form-input"
              placeholder="ex: Ansamblul Petrila"
              style={locationError ? { borderColor: 'var(--danger)' } : {}}
            />
            {locationError && (
              <p className="field-error">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                {locationError}
              </p>
            )}
          </div>
          <div className="flex gap-2 pt-1">
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn-primary flex-1 justify-center"
            >
              {saving ? 'Se salvează…' : 'Salvează'}
            </button>
            <button onClick={onClose} className="btn-ghost">Anulează</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Main page ─────────────────────────────────────── */
export default function BusinessesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Business form (create / edit)
  const [showCreate, setShowCreate] = useState(false);
  const [editBiz, setEditBiz] = useState<Business | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Employees
  const [expandedBizId, setExpandedBizId] = useState<string | null>(null);
  const [bizEmployees, setBizEmployees] = useState<Record<string, Employee[]>>({});
  const [newEmpName, setNewEmpName] = useState('');
  const [newEmpStartDate, setNewEmpStartDate] = useState('');
  const [empNameError, setEmpNameError] = useState('');
  const [empStartDateError, setEmpStartDateError] = useState('');
  const [addingEmp, setAddingEmp] = useState(false);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showAddEmpModal, setShowAddEmpModal] = useState(false);

  // Employee details modal
  const [detailsEmployee, setDetailsEmployee] = useState<{ emp: Employee; bizId: string } | null>(null);

  // Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'danger' } | null>(null);

  function showToast(message: string, type: 'success' | 'danger' = 'success') {
    setToast({ message, type });
  }

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
  }, [status, router]);

  useEffect(() => {
    if (status !== 'authenticated') return;
    fetch('/api/businesses')
      .then(r => r.json())
      .then(data => {
        setBusinesses(data);
        setLoading(false);
        // Pre-load employee counts for all businesses
        if (Array.isArray(data)) {
          data.forEach((biz: Business) => {
            fetch(`/api/employees?businessId=${biz.id}&includeInactive=true`)
              .then(r => r.json())
              .then(emps => { if (Array.isArray(emps)) setBizEmployees(prev => ({ ...prev, [biz.id]: emps })); })
              .catch(() => {});
          });
        }
      })
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
      setNewEmpName(''); setNewEmpStartDate('');
      setEmpNameError(''); setEmpStartDateError('');
      setShowStartDatePicker(false);
      setShowAddEmpModal(false);
      loadEmployees(bizId);
    }
  }

  function openAddEmpModal() {
    setNewEmpName(''); setNewEmpStartDate('');
    setEmpNameError(''); setEmpStartDateError('');
    setShowStartDatePicker(false);
    setShowAddEmpModal(true);
  }

  async function handleCreate(name: string, location: string) {
    setSaving(true);
    const res = await fetch('/api/businesses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, locationName: location || undefined }),
    });
    const biz = await res.json();
    setBusinesses(prev => [...prev, biz]);
    setShowCreate(false);
    setSaving(false);
    showToast('Firmă adăugată cu succes.');
  }

  async function handleEdit(id: string, name: string, location: string) {
    setSaving(true);
    const res = await fetch(`/api/businesses/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, locationName: location || undefined }),
    });
    const updated = await res.json();
    setBusinesses(prev => prev.map(b => b.id === id ? updated : b));
    setEditBiz(null);
    setSaving(false);
    showToast('Firmă actualizată.');
  }

  async function handleDelete(id: string) {
    await fetch(`/api/businesses/${id}`, { method: 'DELETE' });
    setBusinesses(prev => prev.filter(b => b.id !== id));
    setDeleteConfirmId(null);
    if (expandedBizId === id) setExpandedBizId(null);
    showToast('Firmă ștearsă.');
  }

  function handleSelect(biz: Business) {
    try {
      localStorage.setItem('selectedBusiness', JSON.stringify({ id: biz.id, name: biz.name, locationName: biz.locationName }));
    } catch {}
    router.push('/dashboard');
  }

  function validateAddEmployee(): boolean {
    let ok = true;
    if (!newEmpName.trim()) { setEmpNameError('Numele este obligatoriu.'); ok = false; }
    if (!newEmpStartDate) { setEmpStartDateError('Data angajării este obligatorie.'); ok = false; }
    return ok;
  }

  async function handleAddEmployee(bizId: string) {
    if (!validateAddEmployee()) return;
    setAddingEmp(true);
    const res = await fetch('/api/employees', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fullName: newEmpName.trim(), businessId: bizId, startDate: newEmpStartDate }),
    });
    const emp = await res.json();
    setBizEmployees(prev => ({ ...prev, [bizId]: [...(prev[bizId] ?? []), emp] }));
    setNewEmpName(''); setNewEmpStartDate('');
    setEmpNameError(''); setEmpStartDateError('');
    setAddingEmp(false);
    setShowAddEmpModal(false);
    showToast(`${emp.fullName} a fost adăugat cu succes.`);
  }

  async function handleSetDemisie(bizId: string, empId: string, date: string) {
    await fetch(`/api/employees/${empId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ terminationDate: date, active: false }),
    });
    setBizEmployees(prev => ({
      ...prev,
      [bizId]: (prev[bizId] ?? []).map(e => e.id === empId ? { ...e, terminationDate: date, active: false } : e),
    }));
    showToast('Demisia a fost setată.');
  }

  async function handleRemoveDemisie(bizId: string, empId: string) {
    await fetch(`/api/employees/${empId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ terminationDate: null, active: true }),
    });
    setBizEmployees(prev => ({
      ...prev,
      [bizId]: (prev[bizId] ?? []).map(e => e.id === empId ? { ...e, terminationDate: null, active: true } : e),
    }));
    showToast('Demisia a fost eliminată.');
  }

  function handleEmployeeUpdate(bizId: string, updated: Employee) {
    setBizEmployees(prev => ({
      ...prev,
      [bizId]: (prev[bizId] ?? []).map(e => e.id === updated.id ? updated : e),
    }));
    setDetailsEmployee(prev => prev ? { ...prev, emp: updated } : prev);
    showToast(`${updated.fullName} a fost actualizat.`);
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
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
    <div className="min-h-screen">
      {/* Toast */}
      {toast && <Toast message={toast.message} type={toast.type} onDone={() => setToast(null)} />}

      {/* Modals */}
      {showCreate && (
        <BusinessFormModal
          title="Firmă nouă"
          initialName="" initialLocation=""
          saving={saving}
          onSave={handleCreate}
          onClose={() => setShowCreate(false)}
        />
      )}
      {editBiz && (
        <BusinessFormModal
          title="Editează firma"
          initialName={editBiz.name} initialLocation={editBiz.locationName}
          saving={saving}
          onSave={(n, l) => handleEdit(editBiz.id, n, l)}
          onClose={() => setEditBiz(null)}
        />
      )}
      {detailsEmployee && (
        <EmployeeDetailsModal
          employee={detailsEmployee.emp}
          bizId={detailsEmployee.bizId}
          onClose={() => setDetailsEmployee(null)}
          onSetDemisie={handleSetDemisie}
          onRemoveDemisie={handleRemoveDemisie}
          onEmployeeUpdate={handleEmployeeUpdate}
        />
      )}

      {/* Add Employee modal */}
      {showAddEmpModal && expandedBizId && (
        <div className="modal-overlay" onClick={() => setShowAddEmpModal(false)}>
          <div className="modal-sheet" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 pb-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <h3 className="font-semibold text-base" style={{ color: 'var(--text-primary)' }}>Adaugă angajat</h3>
              <button
                onClick={() => setShowAddEmpModal(false)}
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
                  type="text" value={newEmpName}
                  onChange={e => { setNewEmpName(e.target.value); if (empNameError) setEmpNameError(''); }}
                  placeholder="ex: Ion Popescu"
                  className="form-input"
                  style={empNameError ? { borderColor: 'var(--danger)' } : {}}
                  autoFocus
                />
                {empNameError && <p className="field-error">{empNameError}</p>}
              </div>
              <div>
                <label className="form-label">Data angajării <span style={{ color: 'var(--danger)' }}>*</span></label>
                <button
                  onClick={() => setShowStartDatePicker(true)}
                  className="form-input flex items-center justify-between"
                  style={{ cursor: 'pointer', textAlign: 'left', ...(empStartDateError ? { borderColor: 'var(--danger)', boxShadow: 'none' } : {}) }}
                >
                  <span style={{ color: newEmpStartDate ? 'var(--text-primary)' : 'var(--text-secondary)', opacity: newEmpStartDate ? 1 : 0.65 }}>
                    {newEmpStartDate ? fmtDate(newEmpStartDate) : 'Selectează data angajării'}
                  </span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, color: 'var(--text-tertiary)' }}>
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                    <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
                    <line x1="3" y1="10" x2="21" y2="10"/>
                  </svg>
                </button>
                {empStartDateError && <p className="field-error">{empStartDateError}</p>}
                {showStartDatePicker && (
                  <DatePickerModal
                    value={newEmpStartDate}
                    onSelect={date => { setNewEmpStartDate(date); setEmpStartDateError(''); }}
                    onClose={() => setShowStartDatePicker(false)}
                  />
                )}
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => handleAddEmployee(expandedBizId)}
                  disabled={addingEmp}
                  className="btn-primary flex-1 justify-center"
                >
                  {addingEmp ? 'Se adaugă…' : '+ Adaugă angajat'}
                </button>
                <button onClick={() => setShowAddEmpModal(false)} className="btn-ghost">Anulează</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleteConfirmId && (() => {
        const biz = businesses.find(b => b.id === deleteConfirmId);
        return (
          <div className="modal-overlay" onClick={() => setDeleteConfirmId(null)}>
            <div className="modal-sheet" style={{ maxWidth: 360 }} onClick={e => e.stopPropagation()}>
              <div className="p-6">
                <div className="flex items-start gap-4 mb-5">
                  <div className="flex items-center justify-center w-11 h-11 rounded-2xl flex-shrink-0"
                    style={{ background: 'var(--danger-light)' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
                      <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>Ștergeți firma <em>{biz?.name}</em>?</p>
                    <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                      Toți angajații și planificările vor fi șterse ireversibil.
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleDelete(deleteConfirmId)} className="btn-danger flex-1 justify-center">
                    Șterge definitiv
                  </button>
                  <button onClick={() => setDeleteConfirmId(null)} className="btn-ghost">Anulează</button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Navigation Bar ── */}
      <nav style={{ background: 'var(--nav-bg)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 40 }}>
        <div className="max-w-3xl mx-auto flex items-center justify-between" style={{ height: 52, paddingLeft: 16, paddingRight: 16 }}>
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-7 h-7 rounded-lg flex-shrink-0" style={{ background: 'var(--accent)' }}>
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
          <div className="flex items-center gap-1.5">
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

      {/* ── Page content ── */}
      <main className="max-w-3xl mx-auto py-6 sm:py-10" style={{ paddingLeft: 16, paddingRight: 16 }}>

        {/* Page header */}
        <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
          <div>
            <h1 className="page-title">Firmele tale</h1>
            <p className="page-subtitle">Selectează o firmă pentru a gestiona pontajul lunar.</p>
          </div>
          <button onClick={() => setShowCreate(true)} className="btn-primary">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Adaugă firmă
          </button>
        </div>

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
            <p className="font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Nu ai încă nicio firmă</p>
            <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
              Adaugă prima firmă pentru a începe planificarea.
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
              <div key={biz.id} className="card overflow-hidden">

                {/* Business card main row */}
                <div className="p-4 sm:p-5">
                  {/* Top row: icon + info + options menu */}
                  <div className="flex items-start gap-3 sm:gap-4">
                    <div className="flex-shrink-0 flex items-center justify-center w-11 h-11 sm:w-12 sm:h-12 rounded-2xl"
                      style={{ background: 'var(--accent-light)' }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
                        <polyline points="9 22 9 12 15 12 15 22"/>
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0 pt-0.5">
                      <p className="font-semibold text-base truncate" style={{ color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
                        {biz.name}
                      </p>
                      {biz.locationName && (
                        <p className="text-sm truncate mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                          {biz.locationName}
                        </p>
                      )}
                      {bizEmployees[biz.id] !== undefined && (
                        <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
                          {bizEmployees[biz.id].filter(e => e.active).length} angajați activi
                        </p>
                      )}
                    </div>
                    <div className="flex-shrink-0">
                      <OverflowMenu
                        onEdit={() => setEditBiz(biz)}
                        onDelete={() => setDeleteConfirmId(biz.id)}
                      />
                    </div>
                  </div>

                  {/* Action buttons row — wraps on narrow screens */}
                  <div className="flex flex-wrap gap-2 mt-3">
                    <button
                      onClick={() => handleSelect(biz)}
                      className="flex items-center gap-1.5 rounded-xl text-sm font-semibold transition-colors duration-150"
                      style={{ padding: '0 16px', height: 44, background: 'var(--accent)', color: '#fff', border: 'none', cursor: 'pointer', flexShrink: 0 }}
                      onMouseEnter={e => (e.currentTarget.style.opacity = '0.88')}
                      onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                    >
                      Deschide pontajul
                    </button>
                    <button
                      onClick={() => toggleExpand(biz.id)}
                      className="flex items-center gap-1.5 rounded-xl transition-colors duration-150"
                      style={{ padding: '0 14px', height: 44, background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500 }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
                        <path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>
                      </svg>
                      Angajați
                    </button>
                  </div>
                </div>

                {/* Employees panel */}
                {expandedBizId === biz.id && (
                  <div style={{ borderTop: '1px solid var(--border-subtle)', background: 'var(--surface-2)' }} className="p-5">
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
                        Angajați — {biz.name}
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={openAddEmpModal}
                          className="flex items-center gap-1.5 rounded-xl transition-colors duration-150"
                          style={{ padding: '6px 12px', minHeight: 36, background: 'var(--accent)', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '0.8125rem', fontWeight: 600 }}
                          onMouseEnter={e => (e.currentTarget.style.opacity = '0.88')}
                          onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                          </svg>
                          Adaugă
                        </button>
                        <button
                          onClick={() => setExpandedBizId(null)}
                          className="flex items-center gap-1.5 rounded-xl transition-colors duration-150"
                          style={{ padding: '6px 12px', minHeight: 36, background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.8125rem', fontWeight: 500 }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-elevated)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                          </svg>
                          Închide
                        </button>
                      </div>
                    </div>

                    {/* Employee list or empty state */}
                    {(bizEmployees[biz.id] ?? []).length === 0 ? (
                      <div className="flex flex-col items-center py-8 gap-3">
                        <div className="flex items-center justify-center w-12 h-12 rounded-2xl"
                          style={{ background: 'var(--surface)', border: '1px solid var(--border-subtle)' }}>
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
                            <path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>
                          </svg>
                        </div>
                        <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Niciun angajat adăugat</p>
                        <button
                          onClick={openAddEmpModal}
                          className="btn-primary"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                          </svg>
                          Adaugă primul angajat
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-1.5">
                        {(bizEmployees[biz.id] ?? []).map(emp => {
                          const isActive = emp.active && !emp.terminationDate;
                          return (
                            <button
                              key={emp.id}
                              onClick={() => setDetailsEmployee({ emp, bizId: biz.id })}
                              className="flex items-center justify-between px-4 py-3 rounded-xl text-left w-full transition-colors duration-150"
                              style={{
                                background: 'var(--surface)',
                                border: `1px solid var(--border-subtle)`,
                                cursor: 'pointer',
                              }}
                              onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-elevated)')}
                              onMouseLeave={e => (e.currentTarget.style.background = 'var(--surface)')}
                            >
                              <div className="flex items-center gap-3">
                                <div className="flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold flex-shrink-0"
                                  style={{ background: isActive ? 'var(--accent-light)' : 'var(--surface-2)', color: isActive ? 'var(--accent)' : 'var(--text-tertiary)' }}>
                                  {emp.fullName.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <span className="text-sm font-medium block" style={{ color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                                    {emp.fullName}
                                  </span>
                                  {emp.startDate && (
                                    <span className="text-xs block mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                                      din {fmtDate(emp.startDate)}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                {isActive ? (
                                  <span className="badge badge-success">Activ</span>
                                ) : (
                                  <span className="badge badge-danger">Demisie</span>
                                )}
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="9 18 15 12 9 6"/>
                                </svg>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}


