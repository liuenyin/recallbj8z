import { useLanguage } from '../lib/i18n';
import React from 'react';

export interface FloatingTextItem {
  id: number;
  text: string;
  x: number;
  y: number;
  color: string;
}

const FloatingTextLayer: React.FC<{ items: FloatingTextItem[] }> = ({ items }) => {
    const { t: tr } = useLanguage();
  return (
    <div className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden">
      {items.map(item => (
        <div
          key={item.id}
          className="absolute font-black text-sm md:text-base animate-floatUp select-none whitespace-nowrap px-3 py-1 rounded-full bg-white/95 backdrop-blur-sm border border-slate-200/90 shadow-lg"
          style={{
            left: item.x,
            top: item.y,
            color: item.color
          }}
        >
          {tr(item.text)}
        </div>
      ))}
      <style>{`
        @keyframes floatUp {
          0% { transform: translate(-50%, 0) scale(0.85); opacity: 0; }
          18% { transform: translate(-50%, -18px) scale(1.06); opacity: 1; }
          100% { transform: translate(-50%, -72px) scale(1); opacity: 0; }
        }
        .animate-floatUp {
          animation: floatUp 1.2s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default FloatingTextLayer;
