'use client';

import React, { useEffect, useState } from 'react';

export default function ValentineDecorations() {
  const [hearts, setHearts] = useState<Array<{ id: number; left: number; delay: number; duration: number; type: string; size: number }>>([]);

  useEffect(() => {
    const count = 30; // Increased count
    const types = ['❤️', '💖', '💘', '💝', '🫶', '🩷'];
    const newHearts = Array.from({ length: count }).map((_, i) => ({
      id: i,
      left: Math.random() * 100, // Random horizontal position
      delay: Math.random() * 15, // Random start delay
      duration: 10 + Math.random() * 10, // Slower float
      type: types[Math.floor(Math.random() * types.length)],
      size: 1 + Math.random() * 1.5, // Random size scale
    }));
    setHearts(newHearts);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden valentine-only">
      {/* Corner Roses / Cupids */}
      <div className="absolute top-4 left-4 text-5xl animate-pulse">🏹</div>
      <div className="absolute top-4 right-4 text-5xl animate-pulse" style={{ animationDelay: '1s' }}>💌</div>

      {/* Floating Hearts */}
      {hearts.map((heart) => (
        <div
          key={heart.id}
          className="absolute -bottom-10 opacity-70"
          style={{
            left: `${heart.left}%`,
            fontSize: `${heart.size}rem`,
            animation: `floatUp ${heart.duration}s linear infinite, sway ${heart.duration / 3}s ease-in-out infinite alternate`,
            animationDelay: `${heart.delay}s, ${heart.delay}s`,
          }}
        >
          {heart.type}
        </div>
      ))}
      
      <style jsx>{`
        @keyframes floatUp {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 0;
          }
          10% {
            opacity: 0.8;
          }
          90% {
            opacity: 0.8;
          }
          100% {
            transform: translateY(-110vh) rotate(20deg);
            opacity: 0;
          }
        }
        @keyframes sway {
            from { margin-left: -20px; }
            to { margin-left: 20px; }
        }
      `}</style>
    </div>
  );
}
