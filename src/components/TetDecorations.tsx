'use client';

import React, { useEffect, useState } from 'react';

export default function TetDecorations() {
  const [blossoms, setBlossoms] = useState<Array<{ id: number; left: number; delay: number; duration: number; type: 'peach' | 'apricot' }>>([]);

  useEffect(() => {
    // Generate random falling blossoms
    const count = 30;
    const newBlossoms = Array.from({ length: count }).map((_, i) => ({
      id: i,
      left: Math.random() * 100, // Random horizontal position
      delay: Math.random() * 10, // Random start delay
      duration: 10 + Math.random() * 10, // Random duration (10-20s)
      type: Math.random() > 0.5 ? 'peach' : 'apricot' as 'peach' | 'apricot',
    }));
    setBlossoms(newBlossoms);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {/* Corner Lanterns (CSS drawing or emoji for simplicity) */}
      <div className="absolute top-0 left-4 text-4xl animate-swing origin-top">🏮</div>
      <div className="absolute top-0 right-4 text-4xl animate-swing origin-top" style={{ animationDelay: '1s' }}>🏮</div>

      {/* Falling Blossoms */}
      {blossoms.map((blossom) => (
        <div
          key={blossom.id}
          className="absolute -top-10 text-2xl animate-fall"
          style={{
            left: `${blossom.left}%`,
            animationDelay: `${blossom.delay}s`,
            animationDuration: `${blossom.duration}s`,
          }}
        >
          {blossom.type === 'peach' ? '🌸' : '🌼'}
        </div>
      ))}
      
      {/* CSS for animations */}
      <style jsx>{`
        @keyframes fall {
          0% {
            transform: translateY(-10vh) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(110vh) rotate(360deg);
            opacity: 0;
          }
        }
        .animate-fall {
          animation-name: fall;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
        }
        
        @keyframes swing {
          0%, 100% { transform: rotate(-5deg); }
          50% { transform: rotate(5deg); }
        }
        .animate-swing {
          animation: swing 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
