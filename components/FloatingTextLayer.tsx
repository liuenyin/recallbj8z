
import React from 'react';

export interface FloatingTextItem {
  id: number;
  text: string;
  x: number;
  y: number;
  color: string;
}

const FloatingTextLayer: React.FC<{ items: FloatingTextItem[] }> = ({ items }) => {
  return (
    <div className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden">
      {items.map(item => (
        <div
          key={item.id}
          className="absolute font-black text-xl md:text-2xl drop-shadow-md animate-floatUp select-none whitespace-nowrap"
          style={{ 
            left: item.x, 
            top: item.y, 
            color: item.color,
            textShadow: '2px 0 #fff, -2px 0 #fff, 0 2px #fff, 0 -2px #fff, 1px 1px #fff, -1px -1px #fff, 1px -1px #fff, -1px 1px #fff' 
          }}
        >
          {item.text}
        </div>
      ))}
      <style>{`
        @keyframes floatUp {
          0% { transform: translateY(0) scale(0.5); opacity: 0; }
          20% { transform: translateY(-20px) scale(1.2); opacity: 1; }
          100% { transform: translateY(-80px) scale(1); opacity: 0; }
        }
        .animate-floatUp {
          animation: floatUp 1.2s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default FloatingTextLayer;
