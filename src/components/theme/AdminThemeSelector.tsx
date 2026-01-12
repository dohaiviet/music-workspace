'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '@/providers/ThemeProvider';

export default function AdminThemeSelector() {
  const { theme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const themes = [
    { id: 'normal', name: 'Thường', icon: '🎵', color: 'text-zinc-900 dark:text-white', bg: 'bg-white dark:bg-zinc-800' },
    { id: 'tet', name: 'Tết', icon: '🧧', color: 'text-red-600', bg: 'bg-red-50' },
    { id: 'valentine', name: 'Valentine', icon: '💖', color: 'text-pink-600', bg: 'bg-pink-50' },
    { id: 'children', name: 'Thiếu nhi', icon: '🎈', color: 'text-blue-600', bg: 'bg-blue-50' },
  ];

  const currentTheme = themes.find(t => t.id === theme) || themes[0];

  const handleSelect = async (newThemeId: string) => {
    if (theme === newThemeId) {
        setIsOpen(false);
        return;
    }
    
    // Optimistic update
    setTheme(newThemeId as any);
    setIsOpen(false);

    try {
        await fetch('/api/settings/theme', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ theme: newThemeId })
        });
    } catch (error) {
        console.error('Failed to persist theme:', error);
        // We could revert here, but usually it's fine
    }
  };

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-2 sm:px-4 py-2 rounded-xl border transition-all duration-200 ${isOpen ? 'ring-2 ring-purple-500 border-transparent' : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600'} bg-white dark:bg-zinc-800 shadow-sm`}
      >
        <span className="text-lg">{currentTheme.icon}</span>
        <span className={`font-medium ${currentTheme.color} hidden sm:inline`}>{currentTheme.name}</span>
        <span className="text-zinc-400 text-xs ml-1">▼</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-zinc-900 rounded-xl shadow-xl border border-zinc-100 dark:border-zinc-800 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-100">
          <div className="p-1">
            {themes.map((t) => (
              <button
                key={t.id}
                onClick={() => handleSelect(t.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${theme === t.id ? 'bg-zinc-100 dark:bg-zinc-800' : 'hover:bg-zinc-50 dark:hover:bg-zinc-800'}`}
              >
                <span className="text-lg">{t.icon}</span>
                <span className={t.color}>{t.name}</span>
                {theme === t.id && <span className="ml-auto text-purple-600">✓</span>}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
