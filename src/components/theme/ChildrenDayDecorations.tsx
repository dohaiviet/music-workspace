'use client';

import React, { useEffect, useState } from 'react';

export default function ChildrenDayDecorations() {
  const [items, setItems] = useState<Array<{ id: number; left: number; delay: number; duration: number; type: string; size: number }>>([]);
  const [clouds, setClouds] = useState<Array<{ id: number; top: number; delay: number; duration: number; scale: number }>>([]);

  useEffect(() => {
    // Balloons and Toys
    const count = 25;
    const types = ['🎈', '🪁', '🧸', '🚂', '🎨', '🎠'];
    const newItems = Array.from({ length: count }).map((_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 20,
      duration: 15 + Math.random() * 15,
      type: types[Math.floor(Math.random() * types.length)],
      size: 1.5 + Math.random(),
    }));
    setItems(newItems);

    // Clouds
    const cloudCount = 5;
    const newClouds = Array.from({ length: cloudCount }).map((_, i) => ({
        id: i,
        top: 5 + Math.random() * 30, // Top 30% of screen
        delay: Math.random() * 10,
        duration: 30 + Math.random() * 20, // Slow moving
        scale: 0.5 + Math.random() * 1,
    }));
    setClouds(newClouds);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden children-only">
      {/* Sun */}
      <div className="absolute top-8 left-8 text-7xl animate-spin-slow origin-center opacity-90">🌞</div>

      {/* Moving Clouds */}
      {clouds.map((cloud) => (
          <div
            key={`cloud-${cloud.id}`}
            className="absolute -left-32 text-6xl opacity-60"
            style={{
                top: `${cloud.top}%`,
                fontSize: `${cloud.scale * 4}rem`,
                animation: `floatRight ${cloud.duration}s linear infinite`,
                animationDelay: `-${cloud.delay}s`, // Negative delay to start mid-screen
            }}
          >
            ☁️
          </div>
      ))}

      {/* Floating Items */}
      {items.map((item) => (
        <div
          key={item.id}
          className="absolute -bottom-20"
          style={{
            left: `${item.left}%`,
            fontSize: `${item.size}rem`,
            animation: `floatUp ${item.duration}s linear infinite, wiggle ${item.duration / 5}s ease-in-out infinite alternate`,
            animationDelay: `${item.delay}s, ${item.delay}s`,
            filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))'
          }}
        >
          {item.type}
        </div>
      ))}
      
      <style jsx>{`
        @keyframes floatUp {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 0;
          }
          10% {
            opacity: 1;
            transform: translateY(-10vh) rotate(5deg);
          }
          100% {
            transform: translateY(-110vh) rotate(-5deg);
            opacity: 0;
          }
        }
        @keyframes wiggle {
            from { transform: rotate(-5deg); }
            to { transform: rotate(5deg); }
        }
        @keyframes floatRight {
            from { transform: translateX(-20vw); }
            to { transform: translateX(120vw); }
        }
        @keyframes spin-slow {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
            animation: spin-slow 20s linear infinite;
        }
      `}</style>
    </div>
  );
}
