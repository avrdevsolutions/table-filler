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

      // Temporarily remove CSS transform so html2canvas captures the full 1920×1080
      const prevTransform = el.style.transform;
      el.style.transform = 'none';
      // Two rAF ticks to let the browser repaint before capturing
      await new Promise(r => requestAnimationFrame(r));
      await new Promise(r => requestAnimationFrame(r));

      const canvas = await html2canvas(el, {
        width: 1920,
        height: 1080,
        scale: 1,
        useCORS: true,
        logging: false,
      });

      // Restore visual scale
      el.style.transform = prevTransform;

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
