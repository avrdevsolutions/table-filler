'use client';
import { useState } from 'react';

export default function ExportButton() {
  const [loading, setLoading] = useState(false);

  async function handleExport() {
    setLoading(true);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const el = document.getElementById('export-root');
      if (!el) return;
      const canvas = await html2canvas(el, { width: 1920, height: 1080, scale: 1, useCORS: true });
      const link = document.createElement('a');
      link.download = 'pontaj.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (e) {
      console.error(e);
      alert('Eroare la export');
    }
    setLoading(false);
  }

  return (
    <button
      onClick={handleExport}
      disabled={loading}
      className="bg-purple-600 text-white px-4 py-2 rounded text-sm hover:bg-purple-700 disabled:opacity-50"
    >
      {loading ? 'Se generează...' : '📷 Descarcă PNG'}
    </button>
  );
}
