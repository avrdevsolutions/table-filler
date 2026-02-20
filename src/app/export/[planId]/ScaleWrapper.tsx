'use client';
import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';

export default function ScaleWrapper({ children }: { children: ReactNode }) {
  const innerRef = useRef<HTMLDivElement>(null);
  const outerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function applyScale() {
      const scale = Math.min(1, (window.innerWidth - 32) / 1920);
      if (innerRef.current && outerRef.current) {
        innerRef.current.style.transform = `scale(${scale})`;
        innerRef.current.style.transformOrigin = 'top left';
        outerRef.current.style.height = `${Math.ceil(1080 * scale)}px`;
        outerRef.current.style.overflow = 'hidden';
      }
    }

    applyScale();
    window.addEventListener('resize', applyScale);
    return () => window.removeEventListener('resize', applyScale);
  }, []);

  return (
    <div ref={outerRef}>
      <div ref={innerRef} id="export-root" style={{ width: 1920, height: 1080 }}>
        {children}
      </div>
    </div>
  );
}
