
import React, { useEffect } from 'react';

interface ToastProps {
    message: string;
    type: 'success' | 'error';
    onClose: () => void;
}

export default function Toast({ message, type, onClose }: ToastProps) {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose();
        }, 3000);

        return () => clearTimeout(timer);
    }, [onClose]);

    return (
        <div className="fixed bottom-4 right-4 z-50 animate-fade-in-up">
            <div
                className={`flex items-center gap-3 px-6 py-4 rounded-xl shadow-2xl border ${type === 'success'
                        ? 'bg-white dark:bg-zinc-900 border-green-500/20 text-green-600 dark:text-green-400'
                        : 'bg-white dark:bg-zinc-900 border-red-500/20 text-red-600 dark:text-red-400'
                    }`}
            >
                <span className="text-xl">
                    {type === 'success' ? '✅' : '❌'}
                </span>
                <p className="font-medium">{message}</p>
                <button
                    onClick={onClose}
                    className="ml-2 p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors"
                >
                    ✕
                </button>
            </div>
        </div>
    );
}
